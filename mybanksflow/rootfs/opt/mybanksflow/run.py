#!/usr/bin/env python3
"""PID 1: initialize once, migrate transactionally, supervise and stop cleanly."""
import hashlib
import json
import os
import signal
import subprocess
import threading
import time
import urllib.request
import pwd
from pathlib import Path

import psycopg2
from psycopg2 import sql
from admin_api import start_admin_api
from runtime import load_secrets, validate_options

DATA = Path("/data")
APP = Path("/opt/mybanksflow")
children = []
stopping = False


def stop(_signal=None, _frame=None):
    global stopping
    stopping = True
    # Gate traffic first; stop API services before PostgreSQL.
    for process in reversed(children):
        if process.poll() is None:
            process.send_signal(signal.SIGINT if process is children[0] else signal.SIGTERM)
            try:
                process.wait(timeout=40)
            except subprocess.TimeoutExpired:
                process.kill()
                process.wait()


def launch(command, extra=None, cwd=None):
    env = {**os.environ, **(extra or {})}
    # Third-party services may echo their config on fatal errors. Do not forward
    # credential-bearing output to Home Assistant logs; report service failures here.
    process = subprocess.Popen(command, env=env, cwd=cwd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    children.append(process)
    return process


def wait_ready(url, process):
    for _ in range(120):
        if stopping or process.poll() is not None:
            raise RuntimeError("Een lokale dienst is gestopt tijdens het starten")
        try:
            with urllib.request.urlopen(url, timeout=2) as response:
                if response.status == 200:
                    return
        except Exception:
            pass
        time.sleep(1)
    raise RuntimeError("Een lokale dienst is niet op tijd gestart")


def main():
    os.umask(0o077)
    DATA.mkdir(parents=True, exist_ok=True)
    # Allow the database user to reach its own private subdirectory, without
    # permitting directory listing or exposing root-owned secrets.
    os.chmod(DATA, 0o711)
    secrets = load_secrets(DATA)
    initialized = (DATA / "admin.json").exists()
    options = json.loads((DATA / "options.json").read_text())
    admin = None if initialized else validate_options(options)
    pg = DATA / "postgres"
    pg.mkdir(exist_ok=True)
    subprocess.run(["chown", "-R", "postgres:postgres", str(pg), "/run/postgresql"], check=True)
    if not (pg / "PG_VERSION").exists():
        subprocess.run(["su", "postgres", "-s", "/bin/sh", "-c", f"initdb -D {pg} --auth-local=trust --auth-host=scram-sha-256"], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    pg_user = pwd.getpwnam("postgres")
    postgres = subprocess.Popen(["postgres", "-D", str(pg), "-c", "listen_addresses=127.0.0.1", "-c", "unix_socket_directories=/run/postgresql"],
                                user=pg_user.pw_uid, group=pg_user.pw_gid,
                                stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    children.append(postgres)

    def connect():
        return psycopg2.connect(dbname="postgres", user="postgres", host="/run/postgresql")

    for _ in range(60):
        try:
            with connect():
                break
        except psycopg2.OperationalError:
            if postgres.poll() is not None:
                raise RuntimeError("De lokale database is gestopt")
            time.sleep(1)
    else:
        raise RuntimeError("Database niet beschikbaar")

    with connect() as db, db.cursor() as cursor:
        cursor.execute("SELECT EXISTS(SELECT 1 FROM pg_roles WHERE rolname = 'authenticator')")
        if not cursor.fetchone()[0]:
            cursor.execute((APP / "bootstrap.sql").read_text())
        for role in ["authenticator", "supabase_auth_admin", "supabase_storage_admin"]:
            cursor.execute(sql.SQL("ALTER ROLE {} PASSWORD %s").format(sql.Identifier(role)), (secrets["db_password"],))
        cursor.execute("GRANT anon, authenticated, service_role TO supabase_storage_admin")

    password = secrets["db_password"]
    auth = launch(["auth"], {
        "GOTRUE_API_HOST": "127.0.0.1", "GOTRUE_API_PORT": "9999", "API_EXTERNAL_URL": "http://127.0.0.1:8099/auth/v1",
        "GOTRUE_DB_DRIVER": "postgres", "GOTRUE_DB_DATABASE_URL": f"postgres://supabase_auth_admin:{password}@127.0.0.1:5432/postgres",
        "GOTRUE_DB_MIGRATIONS_PATH": "/opt/auth/migrations", "GOTRUE_SITE_URL": "http://127.0.0.1:8099",
        "GOTRUE_JWT_SECRET": secrets["jwt_secret"], "GOTRUE_JWT_AUD": "authenticated", "GOTRUE_JWT_ADMIN_ROLES": "service_role",
        "GOTRUE_DISABLE_SIGNUP": "true", "GOTRUE_EXTERNAL_EMAIL_ENABLED": "true", "GOTRUE_MAILER_AUTOCONFIRM": "false",
    })
    wait_ready("http://127.0.0.1:9999/health", auth)
    with connect() as db, db.cursor() as cursor:
        cursor.execute("GRANT EXECUTE ON FUNCTION auth.uid(), auth.role(), auth.jwt() TO anon, authenticated, service_role, supabase_storage_admin")
    storage = launch(["node", "dist/start/server.js"], {
        "PORT": "5000", "HOST": "127.0.0.1", "ANON_KEY": secrets["anon_key"], "SERVICE_KEY": secrets["service_key"],
        "PGRST_JWT_SECRET": secrets["jwt_secret"], "JWT_SECRET": secrets["jwt_secret"],
        "DATABASE_URL": f"postgres://supabase_storage_admin:{password}@127.0.0.1:5432/postgres",
        "DB_INSTALL_ROLES": "false", "DB_SUPER_USER": "supabase_storage_admin", "IS_MULTITENANT": "false",
        "DATABASE_SEARCH_PATH": "storage,public,extensions",
        "PG_QUEUE_ENABLE": "false", "REQUEST_ALLOW_X_FORWARDED_PATH": "true",
        "STORAGE_BACKEND": "file", "FILE_STORAGE_BACKEND_PATH": "/data/storage", "FILE_SIZE_LIMIT": "52428800",
        "TENANT_ID": "mybanksflow", "REGION": "local", "GLOBAL_S3_BUCKET": "local", "IMAGE_TRANSFORMATION_ENABLED": "false",
        "POSTGREST_URL": "http://127.0.0.1:3000",
    }, cwd="/opt/storage")
    wait_ready("http://127.0.0.1:5000/status", storage)

    # Ledger lives outside exposed public schemas; each migration is atomic.
    with connect() as db, db.cursor() as cursor:
        cursor.execute("SELECT pg_advisory_xact_lock(819102)")
        cursor.execute("CREATE SCHEMA IF NOT EXISTS mybanksflow_meta")
        cursor.execute("CREATE TABLE IF NOT EXISTS mybanksflow_meta.migrations (name text PRIMARY KEY, checksum text NOT NULL)")
        for migration in sorted((APP / "migrations").glob("*.sql")):
            text = migration.read_text()
            checksum = hashlib.sha256(text.encode()).hexdigest()
            cursor.execute("SELECT checksum FROM mybanksflow_meta.migrations WHERE name = %s", (migration.name,))
            previous = cursor.fetchone()
            if previous:
                if previous[0] != checksum:
                    raise RuntimeError("Een toegepaste databaseversie is gewijzigd; herstel de vorige uitgave")
                continue
            cursor.execute(text)
            cursor.execute("INSERT INTO mybanksflow_meta.migrations VALUES (%s, %s)", (migration.name, checksum))
        cursor.execute("GRANT USAGE ON SCHEMA storage TO anon, authenticated, service_role")
        cursor.execute("GRANT SELECT ON ALL TABLES IN SCHEMA storage TO anon")
        cursor.execute("GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA storage TO authenticated")
        cursor.execute("GRANT ALL ON ALL TABLES IN SCHEMA storage TO service_role")
        cursor.execute("GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA storage TO anon, authenticated, service_role")

    if admin:
        email, admin_password = admin
        # A retry after interruption reuses the account, rather than promoting
        # an arbitrary first signup. Only the configured account is provisioned.
        request = urllib.request.Request("http://127.0.0.1:9999/admin/users?per_page=1000", headers={"Authorization": "Bearer " + secrets["service_key"]})
        with urllib.request.urlopen(request, timeout=10) as response:
            users = json.load(response)["users"]
        account = next((user for user in users if user.get("email", "").lower() == email.lower()), None)
        if account is None:
            request = urllib.request.Request("http://127.0.0.1:9999/admin/users", data=json.dumps({"email": email, "password": admin_password, "email_confirm": True}).encode(), headers={"Authorization": "Bearer " + secrets["service_key"], "Content-Type": "application/json"})
            with urllib.request.urlopen(request, timeout=10) as response:
                account = json.load(response)
        with connect() as db, db.cursor() as cursor:
            cursor.execute("INSERT INTO public.user_roles (user_id, role) VALUES (%s, 'admin') ON CONFLICT DO NOTHING", (account["id"],))
        (DATA / "admin.json").write_text(json.dumps({"id": account["id"]}))

    rest = launch(["postgrest"], {
        "PGRST_DB_URI": f"postgres://authenticator:{password}@127.0.0.1:5432/postgres", "PGRST_DB_SCHEMAS": "public",
        "PGRST_DB_ANON_ROLE": "anon", "PGRST_JWT_SECRET": secrets["jwt_secret"], "PGRST_SERVER_HOST": "127.0.0.1", "PGRST_SERVER_PORT": "3000",
    })
    wait_ready("http://127.0.0.1:3000/", rest)
    Path("/web/runtime-config.js").write_text("window.MYBANKSFLOW_LOCAL=" + json.dumps({"anonKey": secrets["anon_key"]}) + ";")
    os.chmod("/web/runtime-config.js", 0o644)
    threading.Thread(target=start_admin_api, args=(secrets["service_key"], secrets["anon_key"], connect), daemon=True).start()
    launch(["nginx", "-g", "daemon off;"])
    print("MyBanksFlow gestart; alle gegevens worden lokaal opgeslagen.")
    while not stopping:
        if any(process.poll() is not None for process in children):
            raise RuntimeError("Een lokale dienst is gestopt; de app sluit veilig af")
        time.sleep(2)


if __name__ == "__main__":
    signal.signal(signal.SIGTERM, stop)
    signal.signal(signal.SIGINT, stop)
    try:
        main()
    except Exception as error:
        # Avoid dumping upstream responses/SQL containing credentials.
        print("MyBanksFlow kon niet starten. Controleer instellingen of herstel de laatste volledige back-up.")
        stop()
        raise SystemExit(1) from None
    finally:
        stop()