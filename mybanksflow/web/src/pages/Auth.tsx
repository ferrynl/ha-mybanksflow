import { useState, type FormEvent } from "react";
import { PiggyBank, LogIn } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LocalAuth() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function signIn(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const { error: failure } = await supabase.auth.signInWithPassword({ email, password });
      if (failure) setError("Inloggen mislukt. Controleer je e-mailadres en wachtwoord.");
    } catch {
      setError("Inloggen is nu niet mogelijk. Probeer het opnieuw.");
    } finally {
      setBusy(false);
    }
  }
  return <main className="flex min-h-screen items-center justify-center bg-background px-6">
    <form onSubmit={signIn} className="w-full max-w-sm space-y-6">
      <div className="text-center"><PiggyBank className="mx-auto mb-4 h-10 w-10 text-primary" />
        <h1 className="text-2xl font-bold">MyBanksFlow</h1><p className="mt-2 text-muted-foreground">Inloggen</p></div>
      <div className="space-y-2"><Label htmlFor="email">E-mailadres</Label><Input id="email" type="email" autoComplete="username" required value={email} onChange={e => setEmail(e.target.value)} /></div>
      <div className="space-y-2"><Label htmlFor="password">Wachtwoord</Label><Input id="password" type="password" autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)} /></div>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <Button type="submit" disabled={busy} className="w-full"><LogIn />{busy ? "Bezig…" : "Inloggen"}</Button>
    </form>
  </main>;
}