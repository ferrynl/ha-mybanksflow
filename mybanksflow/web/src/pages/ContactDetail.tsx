import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Building2, User, ArrowUpRight, ArrowDownRight, ArrowLeftRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Contact {
  id: string;
  name: string;
  iban: string | null;
  created_at: string;
}

interface Transaction {
  id: string;
  description: string;
  amount: number;
  type: string;
  date: string;
  category_id: string | null;
}

export default function ContactDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [contact, setContact] = useState<Contact | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string; color: string }[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!user || !id) return;
    setLoading(true);

    const [contactRes, txRes, catRes] = await Promise.all([
      supabase.from("contacts_decrypted" as any).select("*").eq("id", id).maybeSingle(),
      supabase.from("transactions_decrypted" as any).select("id, description, amount, type, date, category_id").eq("user_id", user.id).eq("contact_id", id).order("date", { ascending: false }).limit(50000),
      supabase.from("categories").select("id, name, color").eq("user_id", user.id),
    ]);

    setContact(contactRes.data as any);
    setTransactions((txRes.data as any) ?? []);
    setCategories((catRes.data as any) ?? []);
    setLoading(false);
  }, [user, id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const fmt = (n: number) =>
    `€${n.toLocaleString("nl-NL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const stats = useMemo(() => {
    const income = transactions.filter((t) => t.type === "income").reduce((s, t) => s + Number(t.amount), 0);
    const expense = transactions.filter((t) => t.type === "expense").reduce((s, t) => s + Number(t.amount), 0);
    return { income, expense, total: transactions.length };
  }, [transactions]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!contact) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => navigate("/contacts")} className="gap-2">
          <ArrowLeft className="h-4 w-4" /> Terug
        </Button>
        <p className="text-sm text-muted-foreground text-center py-8">Contact niet gevonden</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/contacts")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
            {contact.iban ? <Building2 className="h-5 w-5 text-primary" /> : <User className="h-5 w-5 text-primary" />}
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{contact.name}</h1>
            <p className="text-sm text-muted-foreground">{contact.iban || "Geen IBAN"}</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="glass-card p-5">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Totaal ontvangen</span>
          <p className="text-2xl font-bold text-income mt-1">{fmt(stats.income)}</p>
        </div>
        <div className="glass-card p-5">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Totaal betaald</span>
          <p className="text-2xl font-bold text-expense mt-1">{fmt(stats.expense)}</p>
        </div>
        <div className="glass-card p-5">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Transacties</span>
          <p className="text-2xl font-bold mt-1">{stats.total}</p>
        </div>
      </div>

      {/* Transaction list */}
      <div className="glass-card divide-y divide-border/50">
        <div className="px-5 py-3">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Transacties</h3>
        </div>
        {transactions.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Geen transacties gevonden</p>
        ) : (
          transactions.map((tx) => {
            const cat = categories.find((c) => c.id === tx.category_id);
            const txIcon = tx.type === "transfer"
              ? <ArrowLeftRight className="h-4 w-4 text-primary" />
              : tx.type === "income"
              ? <ArrowUpRight className="h-4 w-4 text-income" />
              : <ArrowDownRight className="h-4 w-4 text-expense" />;
            return (
              <div key={tx.id} className="flex items-center justify-between px-5 py-3 transition-colors hover:bg-accent/30">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg" style={{ background: cat ? `hsl(${cat.color} / 0.15)` : undefined }}>
                    {txIcon}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{tx.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {cat?.name ?? "Geen categorie"} · {new Date(tx.date).toLocaleDateString("nl-NL")}
                    </p>
                  </div>
                </div>
                <span className={`text-sm font-semibold ${tx.type === "income" ? "text-income" : "text-expense"}`}>
                  {tx.type === "income" ? "+" : "-"}{fmt(Number(tx.amount))}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
