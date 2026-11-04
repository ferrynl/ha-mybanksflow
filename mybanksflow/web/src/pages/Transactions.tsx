import { useState, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useFinanceStore } from "@/hooks/useFinanceData";
import { toast } from "@/hooks/use-toast";
import { ArrowUpRight, ArrowDownRight, ArrowLeftRight, Plus, Trash2, Pencil, X, Check, AlertTriangle, Filter, Link2 } from "lucide-react";
import HelpTooltip from "@/components/HelpTooltip";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { CURRENCIES, Currency } from "@/types/finance";
import CategorySelect from "@/components/CategorySelect";

const TRANSACTION_CODE_LABELS: Record<string, string> = {
  EIC: "Europese incasso", IC: "Incasso", OVB: "Overboeking", GEA: "Geldautomaat",
  BEA: "Betaalautomaat", DV: "Diversen", GT: "Telegrafisch", VZ: "Verzamelbetaling",
  ST: "Storting", SBA: "Spaarrekening", BA: "Betaalautomaat",
};

function getTransactionCodeLabel(code: string | null | undefined): string {
  if (!code) return "";
  return TRANSACTION_CODE_LABELS[code.toUpperCase().trim()] ?? code;
}

const TX_TYPES = [
  { id: "expense", label: "Uitgaven" },
  { id: "income", label: "Inkomsten" },
  { id: "transfer", label: "Overboeking" },
] as const;

export default function Transactions() {
  const { user } = useAuth();
  const { transactions, categories, bankAccounts, contacts, addTransaction, deleteTransaction, deleteAllTransactions, updateTransaction, suggestCategory } = useFinanceStore();
  const [filter, setFilter] = useState<"all" | "income" | "expense" | "transfer" | "uncategorized">("all");
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [filterAccount, setFilterAccount] = useState<string>("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterContact, setFilterContact] = useState<string>("all");
  const [filterMonth, setFilterMonth] = useState<string>("all");
  const [showFilters, setShowFilters] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{
    description: string; amount: string; category_id: string; date: string; type: string;
    transaction_code: string; transaction_type: string; payment_reference: string;
    original_description: string; is_planned: boolean; planned_transaction_id: string;
    bank_account_id: string; target_bank_account_id: string;
  }>({ description: "", amount: "", category_id: "", date: "", type: "expense", transaction_code: "", transaction_type: "", payment_reference: "", original_description: "", is_planned: false, planned_transaction_id: "", bank_account_id: "", target_bank_account_id: "" });

  const availableMonths = useMemo(() => {
    const months = new Set(transactions.map((t) => t.date.slice(0, 7)));
    return Array.from(months).sort().reverse();
  }, [transactions]);

  const plannedTransactions = useMemo(() => transactions.filter((t) => t.is_planned), [transactions]);

  // For the "Koppel aan gepland" dropdown: only show planned items for the same month that aren't already linked
  const availablePlannedForEdit = useMemo(() => {
    if (!editingId) return [];
    const editMonth = editForm.date.slice(0, 7);
    // Find all actual transactions already linked to a planned one in this month
    const linkedPlannedIds = new Set(
      transactions
        .filter((t) => !t.is_planned && t.planned_transaction_id && t.date.startsWith(editMonth) && t.id !== editingId)
        .map((t) => t.planned_transaction_id)
    );
    return plannedTransactions.filter((p) => {
      // Check if this planned tx has a recurrence in editMonth
      const freq = p.frequency || "eenmalig";
      if (freq === "eenmalig") {
        if (!p.date.startsWith(editMonth)) return false;
      } else {
        // Check if editMonth is a valid recurrence month
        const [py, pm, pday] = p.date.split("-").map(Number);
        const [ty, tm] = editMonth.split("-").map(Number);
        const step = freq === "per_kwartaal" ? 3 : freq === "wekelijks" ? 1 : 1;
        if (freq === "wekelijks") {
          // Approximate: allow if month matches any week
          // Just allow it for simplicity
        } else {
          let curMonth = pm - 1;
          let curYear = py;
          let found = false;
          while (curYear < ty || (curYear === ty && curMonth <= tm - 1)) {
            if (curYear === ty && curMonth === tm - 1) { found = true; break; }
            curMonth += step;
            if (curMonth > 11) { curYear += Math.floor(curMonth / 12); curMonth = curMonth % 12; }
          }
          if (!found) return false;
        }
      }
      // Exclude if already linked by another transaction
      if (linkedPlannedIds.has(p.id)) return false;
      return true;
    });
  }, [editingId, editForm.date, plannedTransactions, transactions]);

   const filtered = useMemo(() => {
     // Build set of paid planned+month combos (geplande transacties die al betaald zijn)
     const paidKeys = new Set<string>();
     transactions.forEach((t) => {
       if (!t.is_planned && t.planned_transaction_id) {
         paidKeys.add(`${t.planned_transaction_id}:${t.date.slice(0, 7)}`);
       }
     });

     return transactions.filter((tx) => {
       // Hide planned transactions that are already paid
       if (tx.is_planned && paidKeys.has(`${tx.id}:${tx.date.slice(0, 7)}`)) return false;

        if (filter === "uncategorized") {
          if (tx.category_id) return false;
        } else if (filter !== "all" && tx.type !== filter) return false;
       if (filterAccount !== "all" && tx.bank_account_id !== filterAccount) return false;
       if (filterCategory !== "all" && tx.category_id !== filterCategory) return false;
       if (filterContact !== "all" && tx.contact_id !== filterContact) return false;
       if (filterMonth !== "all" && !tx.date.startsWith(filterMonth)) return false;
       if (search) {
         const q = search.toLowerCase();
         if (!tx.description.toLowerCase().includes(q) && !tx.original_description?.toLowerCase().includes(q) && !String(tx.amount).includes(q)) return false;
       }
       return true;
     });
   }, [transactions, filter, filterAccount, filterCategory, filterContact, filterMonth, search]);

  const fmt = (n: number) =>
    `€${n.toLocaleString("nl-NL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const startEdit = (tx: typeof transactions[0]) => {
    setEditingId(tx.id);
    // Find counter-account for transfers
    let targetAccountId = "";
    if (tx.type === "transfer") {
      const counterTx = transactions.find(
        (t) => t.type === "transfer" && t.id !== tx.id &&
          t.description === tx.description && t.date === tx.date &&
          Number(t.amount) === Number(tx.amount) && t.bank_account_id !== tx.bank_account_id
      );
      targetAccountId = counterTx?.bank_account_id ?? "";
    }
    setEditForm({
      description: tx.description, amount: Number(tx.amount).toFixed(2), category_id: tx.category_id ?? "",
      date: tx.date, type: tx.type, transaction_code: (tx as any).transaction_code ?? "",
      transaction_type: (tx as any).transaction_type ?? "", payment_reference: (tx as any).payment_reference ?? "",
      original_description: (tx as any).original_description ?? "", is_planned: tx.is_planned ?? false,
      planned_transaction_id: (tx as any).planned_transaction_id ?? "",
      bank_account_id: tx.bank_account_id ?? "",
      target_bank_account_id: targetAccountId,
    });
  };

  const [applyDialog, setApplyDialog] = useState<{ category_id: string; contact_id: string | null; description: string } | null>(null);

  const saveEdit = async () => {
    if (!editingId) return;
    const originalTx = transactions.find((t) => t.id === editingId);
    const categoryChanged = originalTx && editForm.category_id && editForm.category_id !== (originalTx.category_id ?? "");

    await updateTransaction(editingId, {
      description: editForm.description, amount: parseFloat(editForm.amount),
      category_id: editForm.category_id || null, date: editForm.date, type: editForm.type,
      transaction_code: editForm.transaction_code || null, transaction_type: editForm.transaction_type || null,
      payment_reference: editForm.payment_reference || null, original_description: editForm.original_description || null,
      is_planned: editForm.is_planned, bank_account_id: editForm.bank_account_id || null,
    });
    if (editForm.planned_transaction_id) {
      await supabase.from("transactions").update({ planned_transaction_id: editForm.planned_transaction_id } as any).eq("id", editingId);
    }
    // Update counter-transaction's bank_account_id for transfers
    if (editForm.type === "transfer" && editForm.target_bank_account_id) {
      if (originalTx) {
        const counterTx = transactions.find(
          (t) => t.type === "transfer" && t.id !== originalTx.id &&
            t.description === originalTx.description && t.date === originalTx.date &&
            Number(t.amount) === Number(originalTx.amount) && t.bank_account_id !== editForm.bank_account_id
        );
        if (counterTx) {
          await updateTransaction(counterTx.id, { bank_account_id: editForm.target_bank_account_id });
        }
      }
    }

    // If category was changed, ask to apply to similar transactions
    if (categoryChanged && editForm.category_id) {
      setApplyDialog({
        category_id: editForm.category_id,
        contact_id: originalTx.contact_id,
        description: editForm.description,
      });
    }

    setEditingId(null);
  };

  const applyToAll = async () => {
    if (!applyDialog || !user) return;
    const { category_id, contact_id, description } = applyDialog;

    // Apply category to all transactions with same contact or description that have no category
    let query = supabase.from("transactions").update({ category_id } as any).eq("user_id", user.id).is("category_id", null);
    if (contact_id) {
      query = query.eq("contact_id", contact_id);
    } else {
      query = query.eq("description", description);
    }
    await query;

    // Save as categorization rule

    // Save as categorization rule
    await supabase.from("categorization_rules").upsert(
      { user_id: user.id, pattern: description.toLowerCase(), category_id } as any,
      { onConflict: "user_id,pattern" }
    );

    toast({ title: "Categorie toegepast", description: "Transacties bijgewerkt en regel opgeslagen." });
    setApplyDialog(null);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Transacties</h1>
            <p className="text-sm text-muted-foreground">{filtered.length} transacties</p>
          </div>
          <HelpTooltip
            title="Transacties"
            lines={[
              "Bekijk, bewerk en verwijder je transacties",
              "Filter op type, maand, rekening, categorie of contact",
              "Gebruik 'Onverwerkt' om transacties zonder categorie te vinden",
              "Koppel transacties aan geplande transacties via het bewerkscherm",
            ]}
          />
        </div>
        <div className="flex items-center gap-2">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" className="gap-2 text-destructive border-destructive/30 hover:bg-destructive/10" disabled={transactions.length === 0}>
                <Trash2 className="h-4 w-4" /> Alles verwijderen
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-destructive" />Alle transacties verwijderen?</AlertDialogTitle>
                <AlertDialogDescription>Dit verwijdert alle {transactions.length} transacties permanent.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Annuleren</AlertDialogCancel>
                <AlertDialogAction onClick={deleteAllTransactions} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Verwijderen</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 gradient-primary border-0 text-primary-foreground hover:opacity-90"><Plus className="h-4 w-4" /> Toevoegen</Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border sm:max-w-lg">
              <DialogHeader><DialogTitle>Nieuwe transactie</DialogTitle></DialogHeader>
              <AddTransactionForm categories={categories} bankAccounts={bankAccounts} suggestCategory={suggestCategory} onAdd={async (tx) => { await addTransaction(tx); setOpen(false); }} />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Type filter + search */}
      <div className="flex flex-wrap gap-2 items-center">
        {(["all", "income", "expense", "transfer", "uncategorized"] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f as any)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${filter === f ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-accent"}`}>
            {f === "all" ? "Alles" : f === "income" ? "Inkomsten" : f === "expense" ? "Uitgaven" : f === "transfer" ? "Overboekingen" : "Onverwerkt"}
          </button>
        ))}
        <div className="flex-1" />
        <Input placeholder="Zoeken..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-48 h-9 text-sm bg-secondary border-border" />
        <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)} className={`gap-1 ${showFilters ? "bg-primary text-primary-foreground" : ""}`}>
          <Filter className="h-3.5 w-3.5" /> Filters
        </Button>
      </div>

      {/* Advanced filters */}
      {showFilters && (
        <div className="flex flex-wrap gap-3 p-4 glass-card">
          <Select value={filterMonth} onValueChange={setFilterMonth}>
            <SelectTrigger className="w-40 bg-secondary border-border text-sm"><SelectValue placeholder="Maand" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle maanden</SelectItem>
              {availableMonths.map((m) => (<SelectItem key={m} value={m}>{m}</SelectItem>))}
            </SelectContent>
          </Select>
          <Select value={filterAccount} onValueChange={setFilterAccount}>
            <SelectTrigger className="w-40 bg-secondary border-border text-sm"><SelectValue placeholder="Rekening" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle rekeningen</SelectItem>
              {bankAccounts.map((a) => (<SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>))}
            </SelectContent>
          </Select>
          <CategorySelect
            categories={categories as any}
            value={filterCategory}
            onValueChange={setFilterCategory}
            placeholder="Alle categorieën"
            className="w-48 bg-secondary border-border text-sm"
            includeAll
          />
          <Select value={filterContact} onValueChange={setFilterContact}>
            <SelectTrigger className="w-40 bg-secondary border-border text-sm"><SelectValue placeholder="Contact" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle contacten</SelectItem>
              {contacts.map((c) => (<SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>))}
            </SelectContent>
          </Select>
          {(filterMonth !== "all" || filterAccount !== "all" || filterCategory !== "all" || filterContact !== "all") && (
            <Button variant="ghost" size="sm" onClick={() => { setFilterMonth("all"); setFilterAccount("all"); setFilterCategory("all"); setFilterContact("all"); }}>
              Wis filters
            </Button>
          )}
        </div>
      )}

      <div className="glass-card divide-y divide-border/50">
        {filtered.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">Geen transacties gevonden</p>
        )}
        {filtered.map((tx) => {
          const cat = categories.find((c) => c.id === tx.category_id);
          const parentCat = cat && (cat as any).parent_category_id
            ? categories.find((c) => c.id === (cat as any).parent_category_id)
            : null;
          const isEditing = editingId === tx.id;
          const account = bankAccounts.find((a) => a.id === tx.bank_account_id);

          if (isEditing) {
            return (
              <div key={tx.id} className="px-5 py-4 space-y-4 bg-accent/20">
                {/* Type selection */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground">Type</Label>
                  <div className="flex gap-2">
                    {TX_TYPES.map((t) => (
                      <button type="button" key={t.id} onClick={() => setEditForm((f) => ({ ...f, type: t.id, category_id: "" }))}
                        className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${editForm.type === t.id
                          ? t.id === "income" ? "bg-income text-income-foreground" : t.id === "transfer" ? "bg-primary text-primary-foreground" : "bg-expense text-expense-foreground"
                          : "bg-secondary text-secondary-foreground"}`}>{t.label}</button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-muted-foreground">Omschrijving</Label>
                    <Input value={editForm.description} onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))} className="bg-secondary border-border text-sm" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-muted-foreground">Bedrag</Label>
                    <Input type="number" step="0.01" value={editForm.amount} onChange={(e) => setEditForm((f) => ({ ...f, amount: e.target.value }))} className="bg-secondary border-border text-sm" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {editForm.type !== "transfer" ? (
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-muted-foreground">Categorie</Label>
                      <CategorySelect
                        categories={categories as any}
                        value={editForm.category_id}
                        onValueChange={(v) => setEditForm((f) => ({ ...f, category_id: v }))}
                        filterType={editForm.type}
                        placeholder="Categorie"
                        className="bg-secondary border-border text-sm"
                      />
                    </div>
                  ) : (
                    <>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-muted-foreground">Van rekening</Label>
                        <Select value={editForm.bank_account_id} onValueChange={(v) => setEditForm((f) => ({ ...f, bank_account_id: v }))}>
                          <SelectTrigger className="bg-secondary border-border text-sm"><SelectValue placeholder="Bronrekening" /></SelectTrigger>
                          <SelectContent>
                            {bankAccounts.map((a) => (<SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-muted-foreground">Naar rekening</Label>
                        <Select value={editForm.target_bank_account_id} onValueChange={(v) => setEditForm((f) => ({ ...f, target_bank_account_id: v }))}>
                          <SelectTrigger className="bg-secondary border-border text-sm"><SelectValue placeholder="Doelrekening" /></SelectTrigger>
                          <SelectContent>
                            {bankAccounts.filter((a) => a.id !== editForm.bank_account_id).map((a) => (<SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>))}
                          </SelectContent>
                        </Select>
                      </div>
                    </>
                  )}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-muted-foreground">Datum</Label>
                    <Input type="date" value={editForm.date} onChange={(e) => setEditForm((f) => ({ ...f, date: e.target.value }))} className="bg-secondary border-border text-sm" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-muted-foreground">Originele omschrijving</Label>
                    <Input value={editForm.original_description} onChange={(e) => setEditForm((f) => ({ ...f, original_description: e.target.value }))} className="bg-secondary border-border text-sm" placeholder="Optioneel" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-muted-foreground">Betalingskenmerk</Label>
                    <Input value={editForm.payment_reference} onChange={(e) => setEditForm((f) => ({ ...f, payment_reference: e.target.value }))} className="bg-secondary border-border text-sm" placeholder="Optioneel" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-muted-foreground">Gepland</Label>
                    <div className="flex items-center gap-2 h-9">
                      <input type="checkbox" checked={editForm.is_planned} onChange={(e) => setEditForm((f) => ({ ...f, is_planned: e.target.checked }))} className="rounded border-border" />
                      <span className="text-sm text-muted-foreground">Geplande transactie</span>
                    </div>
                  </div>
                  {!editForm.is_planned && availablePlannedForEdit.length > 0 && (
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-muted-foreground">Koppel aan gepland</Label>
                      <Select value={editForm.planned_transaction_id} onValueChange={(v) => setEditForm((f) => ({ ...f, planned_transaction_id: v === "none" ? "" : v }))}>
                        <SelectTrigger className="bg-secondary border-border text-sm"><SelectValue placeholder="Geen koppeling" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Geen koppeling</SelectItem>
                          {availablePlannedForEdit.map((p) => (
                            <SelectItem key={p.id} value={p.id}>{p.description} ({fmt(Number(p.amount))})</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-border/50">
                  <Button variant="ghost" size="sm" onClick={() => setEditingId(null)} className="gap-1 text-muted-foreground"><X className="h-3.5 w-3.5" /> Annuleren</Button>
                  <Button size="sm" onClick={saveEdit} className="gap-1 gradient-primary border-0 text-primary-foreground"><Check className="h-3.5 w-3.5" /> Opslaan</Button>
                </div>
              </div>
            );
          }

          const txIcon = tx.type === "transfer"
            ? <ArrowLeftRight className="h-4 w-4 text-primary" />
            : tx.type === "income"
            ? <ArrowUpRight className="h-4 w-4 text-income" />
            : <ArrowDownRight className="h-4 w-4 text-expense" />;

          // For transfers, find the counter-account transaction
          let counterAccount: typeof bankAccounts[0] | undefined;
          if (tx.type === "transfer" && account) {
            const counterTx = transactions.find(
              (t) => t.type === "transfer" && t.id !== tx.id &&
                t.description === tx.description && t.date === tx.date &&
                Number(t.amount) === Number(tx.amount) && t.bank_account_id !== tx.bank_account_id
            );
            if (counterTx) {
              counterAccount = bankAccounts.find((a) => a.id === counterTx.bank_account_id);
            }
          }

          const catLabel = parentCat
            ? `${parentCat.name} › ${cat?.name}`
            : (tx.type === "transfer"
              ? `Overboeking${counterAccount ? ` → ${counterAccount.name}` : ""}`
              : cat?.name);

          return (
            <div key={tx.id} className="flex items-center justify-between px-4 py-3 transition-colors hover:bg-accent/30">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg" style={{ background: cat ? `hsl(${cat.color} / 0.15)` : undefined }}>
                  {txIcon}
                </div>
                <div>
                  <p className="text-sm font-medium">
                    {tx.description}
                    {tx.is_planned && <span className="ml-2 inline-block rounded bg-primary/15 px-1.5 py-0.5 text-[10px] font-semibold text-primary">Gepland</span>}
                    {(tx as any).planned_transaction_id && <span className="ml-1 inline-block rounded bg-income/15 px-1.5 py-0.5 text-[10px] font-semibold text-income"><Link2 className="h-2.5 w-2.5 inline" /> Gekoppeld</span>}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {catLabel}{account ? ` · ${account.name}` : ""} · {new Date(tx.date).toLocaleDateString("nl-NL")}
                    {(tx as any).transaction_code && <> · {getTransactionCodeLabel((tx as any).transaction_code)}</>}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-sm font-semibold ${tx.type === "income" ? "text-income" : tx.type === "transfer" ? "text-primary" : "text-expense"}`}>
                  {tx.type === "income" ? "+" : "-"}{fmt(Number(tx.amount))}
                </span>
                <button onClick={() => startEdit(tx)} className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"><Pencil className="h-3.5 w-3.5" /></button>
                <button onClick={() => deleteTransaction(tx.id)} className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/20 hover:text-destructive transition-colors"><Trash2 className="h-3.5 w-3.5" /></button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Apply category dialog */}
      <Dialog open={!!applyDialog} onOpenChange={(open) => !open && setApplyDialog(null)}>
        <DialogContent className="bg-card border-border sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Categorie toepassen op vergelijkbare transacties?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Wil je deze categorie ook toepassen op alle andere transacties van{" "}
            <span className="font-medium text-foreground">{applyDialog?.description}</span>{" "}
            die nog geen categorie hebben? Dit wordt ook opgeslagen als automatische regel.
          </p>
          <div className="flex justify-end gap-2 mt-2">
            <Button variant="outline" onClick={() => setApplyDialog(null)}>Nee, bedankt</Button>
            <Button onClick={applyToAll}>Ja, toepassen</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AddTransactionForm({
  categories, bankAccounts, suggestCategory, onAdd,
}: {
  categories: { id: string; name: string; type: string; color: string; parent_category_id?: string | null }[];
  bankAccounts: { id: string; name: string }[];
  suggestCategory: (desc: string, originalDescription?: string | null) => Promise<string | null>;
  onAdd: (tx: { description: string; amount: number; currency: string; type: string; category_id: string | null; date: string; is_planned: boolean; bank_account_id?: string | null }) => Promise<void>;
}) {
  const [type, setType] = useState<"expense" | "income" | "transfer">("expense");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [currency, setCurrency] = useState<Currency>("EUR");
  const [isPlanned, setIsPlanned] = useState(false);
  const [bankAccountId, setBankAccountId] = useState("");
  const [targetAccountId, setTargetAccountId] = useState("");

  const handleDescriptionBlur = async () => {
    if (!description) return;
    const suggested = await suggestCategory(description);
    if (suggested && !categoryId) setCategoryId(suggested);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description || !amount) return;
    if (type === "transfer") {
      // Create two linked transactions for transfers
      if (bankAccountId) {
        await onAdd({ description, amount: parseFloat(amount), currency, type: "transfer", category_id: null, date, is_planned: isPlanned, bank_account_id: bankAccountId });
      }
      if (targetAccountId) {
        await onAdd({ description, amount: parseFloat(amount), currency, type: "transfer", category_id: null, date, is_planned: isPlanned, bank_account_id: targetAccountId });
      }
    } else {
      await onAdd({ description, amount: parseFloat(amount), currency, type, category_id: categoryId || null, date, is_planned: isPlanned, bank_account_id: bankAccountId || null });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex gap-2">
        {TX_TYPES.map((t) => (
          <button type="button" key={t.id} onClick={() => { setType(t.id as any); setCategoryId(""); }}
            className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${type === t.id
              ? (t.id === "income" ? "gradient-income text-income-foreground" : t.id === "transfer" ? "gradient-primary text-primary-foreground" : "gradient-expense text-expense-foreground")
              : "bg-secondary text-secondary-foreground"}`}>{t.label}</button>
        ))}
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs font-semibold text-muted-foreground">Omschrijving</Label>
        <Input placeholder="bijv. Boodschappen, Salaris" value={description} onChange={(e) => setDescription(e.target.value)} onBlur={handleDescriptionBlur} className="bg-secondary border-border" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-muted-foreground">Bedrag</Label>
          <Input type="number" placeholder="0.00" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} className="bg-secondary border-border" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-muted-foreground">Valuta</Label>
          <Select value={currency} onValueChange={(v) => setCurrency(v as Currency)}>
            <SelectTrigger className="bg-secondary border-border"><SelectValue /></SelectTrigger>
            <SelectContent>{CURRENCIES.map((c) => (<SelectItem key={c.code} value={c.code}>{c.symbol} {c.code}</SelectItem>))}</SelectContent>
          </Select>
        </div>
      </div>
      {type === "transfer" ? (
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground">Van rekening</Label>
            <Select value={bankAccountId} onValueChange={setBankAccountId}>
              <SelectTrigger className="bg-secondary border-border"><SelectValue placeholder="Bronrekening" /></SelectTrigger>
              <SelectContent>{bankAccounts.map((a) => (<SelectItem key={a.id} value={a.id}>{(a as any).name}</SelectItem>))}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground">Naar rekening</Label>
            <Select value={targetAccountId} onValueChange={setTargetAccountId}>
              <SelectTrigger className="bg-secondary border-border"><SelectValue placeholder="Doelrekening" /></SelectTrigger>
              <SelectContent>{bankAccounts.filter((a) => a.id !== bankAccountId).map((a) => (<SelectItem key={a.id} value={a.id}>{(a as any).name}</SelectItem>))}</SelectContent>
            </Select>
          </div>
        </div>
      ) : (
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-muted-foreground">Categorie</Label>
          <CategorySelect
            categories={categories as any}
            value={categoryId}
            onValueChange={setCategoryId}
            filterType={type}
            placeholder="Categorie kiezen"
            className="bg-secondary border-border"
          />
        </div>
      )}
      <div className="space-y-1.5">
        <Label className="text-xs font-semibold text-muted-foreground">Datum</Label>
        <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="bg-secondary border-border" />
      </div>
      <label className="flex items-center gap-2 text-sm cursor-pointer">
        <input type="checkbox" checked={isPlanned} onChange={(e) => setIsPlanned(e.target.checked)} className="rounded border-border" />
        <span className="text-muted-foreground">Geplande transactie</span>
      </label>
      <Button type="submit" className="w-full gradient-primary border-0 text-primary-foreground hover:opacity-90">Opslaan</Button>
    </form>
  );
}
