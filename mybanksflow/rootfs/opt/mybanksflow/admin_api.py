"""Local equivalent of the existing admin-users function, with server-side authorization."""
import json
import urllib.request
from http.server import BaseHTTPRequestHandler, HTTPServer


def start_admin_api(service_key, anon_key, connect):
    class Handler(BaseHTTPRequestHandler):
        def log_message(self, *_args):
            pass

        def do_GET(self):
            self.do_POST()

        def do_POST(self):
            if self.path != "/admin-users":
                return self.respond(404, {"error": "Not found"})
            authorization = self.headers.get("Authorization", "")
            if not authorization.startswith("Bearer "):
                return self.respond(401, {"error": "Unauthorized"})
            try:
                req = urllib.request.Request("http://127.0.0.1:9999/user", headers={"Authorization": authorization, "apikey": anon_key})
                with urllib.request.urlopen(req, timeout=10) as response:
                    user = json.load(response)
            except Exception:
                return self.respond(401, {"error": "Unauthorized"})
            try:
                with connect() as db, db.cursor() as cursor:
                    cursor.execute("SELECT 1 FROM public.user_roles WHERE user_id = %s AND role = 'admin'", (user["id"],))
                    if cursor.fetchone() is None:
                        return self.respond(403, {"error": "Forbidden"})
                    req = urllib.request.Request("http://127.0.0.1:9999/admin/users?per_page=1000", headers={"Authorization": "Bearer " + service_key})
                    with urllib.request.urlopen(req, timeout=10) as response:
                        users = json.load(response)["users"]
                    cursor.execute("SELECT user_id, count(*) FROM public.transactions GROUP BY user_id")
                    transactions = dict(cursor.fetchall())
                    cursor.execute("SELECT user_id, count(*) FROM public.categorization_rules GROUP BY user_id")
                    rules = dict(cursor.fetchall())
                result = [{"id": u["id"], "email": u.get("email"), "full_name": u.get("user_metadata", {}).get("full_name"),
                           "created_at": u.get("created_at"), "last_sign_in_at": u.get("last_sign_in_at"),
                           "transaction_count": transactions.get(u["id"], 0), "rule_count": rules.get(u["id"], 0)} for u in users]
                self.respond(200, result)
            except Exception:
                self.respond(500, {"error": "Accountoverzicht niet beschikbaar"})

        def respond(self, status, payload):
            self.send_response(status)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps(payload).encode())

    HTTPServer(("127.0.0.1", 9000), Handler).serve_forever()