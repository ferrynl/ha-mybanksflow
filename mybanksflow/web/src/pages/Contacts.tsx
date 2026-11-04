import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Building2, User, Search, Trash2, Pencil, Check, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";

interface Contact {
  id: string;
  name: string;
  iban: string | null;
  created_at: string;
  transaction_count?: number;
}

export default function ContactsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: "", iban: "" });

  const fetchContacts = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("contacts_decrypted" as any)
      .select("*")
      .eq("user_id", user.id)
      .order("name");

    if (data) {
      // Get transaction counts per contact
      const { data: txCounts } = await supabase
        .from("transactions")
        .select("contact_id")
        .eq("user_id", user.id)
        .not("contact_id", "is", null);

      const countMap = new Map<string, number>();
      txCounts?.forEach((t: any) => {
        if (t.contact_id) countMap.set(t.contact_id, (countMap.get(t.contact_id) || 0) + 1);
      });

      setContacts(data.map((c: any) => ({ ...c, transaction_count: countMap.get(c.id) || 0 })));
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  const filtered = contacts.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.iban && c.iban.toLowerCase().includes(search.toLowerCase()))
  );

  const startEdit = (c: Contact) => {
    setEditingId(c.id);
    setEditForm({ name: c.name, iban: c.iban || "" });
  };

  const saveEdit = async () => {
    if (!editingId || !editForm.name.trim()) return;
    const { error } = await supabase
      .from("contacts")
      .update({ name: editForm.name.trim(), iban: editForm.iban.trim() || null })
      .eq("id", editingId);
    if (error) {
      toast({ title: "Fout bij opslaan", description: error.message, variant: "destructive" });
    } else {
      setEditingId(null);
      fetchContacts();
    }
  };

  const deleteContact = async (id: string) => {
    await supabase.from("contacts").delete().eq("id", id);
    setContacts((prev) => prev.filter((c) => c.id !== id));
    toast({ title: "Contact verwijderd" });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Contacten</h1>
        <p className="text-sm text-muted-foreground">
          Bedrijven en personen uit je transacties
        </p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Zoek op naam of IBAN..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10 bg-secondary border-border"
        />
      </div>

      <div className="glass-card divide-y divide-border/50">
        {loading && (
          <p className="py-8 text-center text-sm text-muted-foreground">Laden...</p>
        )}
        {!loading && filtered.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">
            {search ? "Geen contacten gevonden" : "Nog geen contacten. Importeer transacties om contacten automatisch aan te maken."}
          </p>
        )}
        {filtered.map((c) => {
          if (editingId === c.id) {
            return (
              <div key={c.id} className="px-4 py-3 space-y-3 bg-accent/20">
                <div className="flex gap-2">
                  <Input
                    value={editForm.name}
                    onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                    className="bg-secondary border-border text-sm flex-1"
                    placeholder="Naam"
                  />
                  <Input
                    value={editForm.iban}
                    onChange={(e) => setEditForm((f) => ({ ...f, iban: e.target.value.toUpperCase() }))}
                    className="bg-secondary border-border text-sm w-56"
                    placeholder="IBAN"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setEditingId(null)} className="gap-1 text-muted-foreground">
                    <X className="h-3.5 w-3.5" /> Annuleren
                  </Button>
                  <Button size="sm" onClick={saveEdit} className="gap-1 gradient-primary border-0 text-primary-foreground">
                    <Check className="h-3.5 w-3.5" /> Opslaan
                  </Button>
                </div>
              </div>
            );
          }

          return (
            <div
              key={c.id}
              className="flex items-center justify-between px-4 py-3 transition-colors hover:bg-accent/30 cursor-pointer"
              onClick={() => navigate(`/contacts/${c.id}`)}
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  {c.iban ? (
                    <Building2 className="h-4 w-4 text-primary" />
                  ) : (
                    <User className="h-4 w-4 text-primary" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium">{c.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {c.iban || "Geen IBAN"} · {c.transaction_count || 0} transactie{(c.transaction_count || 0) !== 1 ? "s" : ""}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => startEdit(c)} className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button onClick={() => deleteContact(c.id)} className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/20 hover:text-destructive transition-colors">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
