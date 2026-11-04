"""Pure configuration helpers; never log credentials."""
import base64
import hashlib
import hmac
import json
import os
import secrets
import time
from pathlib import Path


def b64(value):
    return base64.urlsafe_b64encode(value).decode().rstrip("=")


def jwt(secret, role):
    now = int(time.time())
    header = b64(json.dumps({"alg": "HS256", "typ": "JWT"}).encode())
    payload = b64(json.dumps({"role": role, "iss": "mybanksflow-local", "iat": now, "exp": now + 315360000}).encode())
    body = f"{header}.{payload}"
    return body + "." + b64(hmac.new(secret.encode(), body.encode(), hashlib.sha256).digest())


def load_secrets(data):
    path = Path(data) / "secrets.json"
    if path.exists():
        result = json.loads(path.read_text())
        if not all(result.get(k) for k in ["jwt_secret", "db_password", "anon_key", "service_key"]):
            raise ValueError("Stored configuration is incomplete; restore a backup")
        return result
    # Fail closed if database data exists but the signing keys are missing.
    if (Path(data) / "postgres/PG_VERSION").exists():
        raise ValueError("Existing database without secrets; restore a complete backup")
    result = {"jwt_secret": secrets.token_hex(32), "db_password": secrets.token_hex(32)}
    result["anon_key"] = jwt(result["jwt_secret"], "anon")
    result["service_key"] = jwt(result["jwt_secret"], "service_role")
    Path(data).mkdir(parents=True, exist_ok=True)
    temporary = path.with_name(f".secrets.{secrets.token_hex(8)}.tmp")
    with os.fdopen(os.open(temporary, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600), "w") as file:
        json.dump(result, file)
    temporary.replace(path)
    return result


def validate_options(options):
    email = options.get("admin_email", "").strip()
    password = options.get("admin_password", "")
    if "@" not in email or len(password) < 12:
        raise ValueError("Stel een geldig e-mailadres en een wachtwoord van minimaal 12 tekens in")
    return email, password