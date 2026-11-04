import { useState, useMemo } from "react";
import { useFinanceStore } from "@/hooks/useFinanceData";
import { useContracts } from "@/hooks/useContracts";
import { CalendarClock, ArrowDownRight, ArrowUpRight, Plus, Check, ChevronLeft, ChevronRight, Pencil, Trash2, X, ScrollText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import CategorySelect from "@/components/CategorySelect";

const MONTH_NAMES = [
  "Januari", "Februari", "Maart", "April", "Mei", "Juni",
  "Juli", "Augustus", "September", "Oktober", "November", "December",
];

const FREQUENCIES = [
  { id: "eenmalig", label: "Eenmalig" },
  { id: "wekelijks", label: "Per week" },
  { id: "maandelijks", label: "Per maand" },
  { id: "per_kwartaal", label: "Per kwartaal" },
] as const;

function formatMonth(month: string) {
  const [year, m] = month.split("-");
  return `${MONTH_NAMES[parseInt(m, 10) - 1]} ${year}`;
}

function shiftMonth(month: string, delta: number) {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function generateRecurrences(
  baseDate: string,
  frequency: string,
  monthsAhead: number,
  endDate?: string | null
): string[] {
  const dates: string[] = [baseDate];
  if (frequency === "eenmalig") return dates;

  const [y, m, day] = baseDate.split("-").map(Number);
  const maxDate = new Date();
  maxDate.setMonth(maxDate.getMonth() + monthsAhead);
  const stopDate = endDate ? new Date(Math.min(new Date(endDate).getTime(), maxDate.getTime())) : maxDate;

  if (frequency === "wekelijks") {
    let current = new Date(y, m - 1, day);
    while (true) {
      current = new Date(current.getTime() + 7 * 24 * 60 * 60 * 1000);
      if (current > stopDate) break;
      dates.push(current.toISOString().slice(0, 10));
    }
  } else {
    const step = frequency === "per_kwartaal" ? 3 : 1;
    let currentMonth = m - 1 + step;
    let currentYear = y;
    while (true) {
      if (currentMonth > 11) {
        currentYear += Math.floor(currentMonth / 12);
        currentMonth = currentMonth % 12;
      }
      const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
      const actualDay = Math.min(day, daysInMonth);
      const d = new Date(currentYear, currentMonth, actualDay);
      if (d > stopDate) break;
      dates.push(`${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(actualDay).padStart(2, "0")}`);
      currentMonth += step;
    }
  }
  return dates;
}

export default function PlannedPage() {
  const now = new Date();
  const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const [selectedMonth, setSelectedMonth] = useState(defaultMonth);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    description: "", amount: "", type: "expense" as string, category_id: "",
    date: "", frequency: "maandelijks", bank_account_id: "", end_date: "",
  });

  const { transactions, categories, bankAccounts, addTransaction, updateTransaction, deleteTransaction } = useFinanceStore();
  const { contracts } = useContracts();

  const fmt = (n: number) =>
    `€${n.toLocaleString("nl-NL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const allPlanned = useMemo(() => transactions.filter((t) => t.is_planned), [transactions]);

  const plannedWithRecurrences = useMemo(() => {
    const result: Array<typeof transactions[0] & { isVirtual?: boolean; virtualDate?: string }> = [];
    const months = [selectedMonth, shiftMonth(selectedMonth, 1), shiftMonth(selectedMonth, 2)];

    allPlanned.forEach((tx) => {
      const freq = (tx as any).frequency || "eenmalig";
      const txEndDate = (tx as any).end_date;
      if (freq === "eenmalig") {
        const txMonth = tx.date.slice(0, 7);
        if (months.includes(txMonth)) {
          result.push(tx);
        }
      } else {
        const recurrences = generateRecurrences(tx.date, freq, 24, txEndDate);
        recurrences.forEach((date) => {
          const dateMonth = date.slice(0, 7);
          if (months.includes(dateMonth)) {
            result.push({
              ...tx,
              isVirtual: date !== tx.date,
              virtualDate: date,
              date: date,
            } as any);
          }
        });
      }
    });

    return result;
  }, [allPlanned, transactions, selectedMonth]);

  const linkedTxMap = useMemo(() => {
    const map = new Map<string, typeof transactions[0]>();
    transactions.forEach((t) => {
      if ((t as any).planned_transaction_id && !t.is_planned) {
        const monthKey = `${(t as any).planned_transaction_id}:${t.date.slice(0, 7)}`;
        map.set(monthKey, t);
      }
    });
    return map;
  }, [transactions]);

  const months = [selectedMonth, shiftMonth(selectedMonth, 1), shiftMonth(selectedMonth, 2)];

  const plannedByMonth = months.map((month) => {
    const txs = plannedWithRecurrences.filter((t) => t.date.startsWith(month));
    const unpaidTotal = txs
      .filter((t) => !linkedTxMap.has(`${t.id}:${t.date.slice(0, 7)}`))
      .reduce((s, t) => s + Number(t.amount), 0);
    return { month, txs, total: unpaidTotal };
  });

  const totalPlanned = plannedByMonth.reduce((s, m) => s + m.total, 0);

  const startEdit = (tx: typeof transactions[0]) => {
    setEditingId(tx.id);
    setEditForm({
      description: tx.description,
      amount: String(tx.amount),
      type: tx.type,
      category_id: tx.category_id || "",
      date: tx.date,
      frequency: (tx as any).frequency || "eenmalig",
      bank_account_id: tx.bank_account_id || "",
      end_date: (tx as any).end_date || "",
    });
  };

  const saveEdit = async () => {
    if (!editingId || !editForm.description || !editForm.amount) return;
    await updateTransaction(editingId, {
      description: editForm.description,
      amount: parseFloat(editForm.amount),
      type: editForm.type,
      category_id: editForm.category_id || null,
      date: editForm.date,
      frequency: editForm.frequency,
      bank_account_id: editForm.bank_account_id || null,
      end_date: editForm.end_date || null,
    });
    setEditingId(null);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Geplande uitgaven</h1>
          <p className="text-sm text-muted-foreground">
            Totaal gepland: {fmt(totalPlanned)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 gradient-primary border-0 text-primary-foreground hover:opacity-90">
                <Plus className="h-4 w-4" /> Toevoegen
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border">
              <DialogHeader>
                <DialogTitle>Geplande transactie</DialogTitle>
              </DialogHeader>
              <PlannedForm
                categories={categories}
                bankAccounts={bankAccounts}
                onSubmit={async (tx) => {
                  await addTransaction(tx);
                  setDialogOpen(false);
                }}
              />
            </DialogContent>
          </Dialog>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSelectedMonth(shiftMonth(selectedMonth, -1))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" className="text-xs min-w-[120px]" onClick={() => setSelectedMonth(defaultMonth)}>
              {formatMonth(selectedMonth)}
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSelectedMonth(shiftMonth(selectedMonth, 1))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Cash flow forecast card */}
      <div className="glass-card p-5">
        <div className="flex items-center gap-2 mb-3">
          <CalendarClock className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Cash flow voorspelling
          </h3>
        </div>
        <div className="grid grid-cols-3 gap-4">
          {plannedByMonth.map(({ month, txs, total }) => (
            <div key={month} className="rounded-lg bg-secondary/50 p-4 text-center">
              <p className="text-xs text-muted-foreground mb-1">{formatMonth(month)}</p>
              <p className="text-lg font-bold text-expense">{total > 0 ? `-${fmt(total)}` : fmt(0)}</p>
              <p className="text-xs text-muted-foreground">{txs.length} transacties</p>
            </div>
          ))}
        </div>
      </div>

      {/* Transactions list per month */}
      {plannedByMonth.map(({ month, txs }) => {
        if (txs.length === 0) return null;
        return (
          <div key={month}>
            <h3 className="mb-2 text-sm font-semibold text-muted-foreground">
              {formatMonth(month)}
            </h3>
            <div className="glass-card divide-y divide-border/50">
              {txs.map((tx, i) => {
                const cat = categories.find((c) => c.id === tx.category_id);
                const isPaid = linkedTxMap.has(`${tx.id}:${tx.date.slice(0, 7)}`);
                const freq = (tx as any).frequency || "eenmalig";
                const freqLabel = FREQUENCIES.find((f) => f.id === freq)?.label ?? freq;
                const account = bankAccounts.find((a) => a.id === tx.bank_account_id);
                const isEditing = editingId === tx.id && !(tx as any).isVirtual;

                if (isEditing) {
                  return (
                    <div key={`${tx.id}-${i}`} className="p-4 space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label className="text-xs font-semibold text-muted-foreground">Omschrijving</Label>
                          <Input value={editForm.description} onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))} className="bg-secondary border-border text-sm" />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-semibold text-muted-foreground">Bedrag</Label>
                          <Input type="number" step="0.01" value={editForm.amount} onChange={(e) => setEditForm((f) => ({ ...f, amount: e.target.value }))} className="bg-secondary border-border text-sm" />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label className="text-xs font-semibold text-muted-foreground">Type</Label>
                          <Select value={editForm.type} onValueChange={(v) => { setEditForm((f) => ({ ...f, type: v, category_id: "" })); }}>
                            <SelectTrigger className="bg-secondary border-border text-sm"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="expense">Uitgave</SelectItem>
                              <SelectItem value="income">Inkomst</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-semibold text-muted-foreground">Frequentie</Label>
                          <Select value={editForm.frequency} onValueChange={(v) => setEditForm((f) => ({ ...f, frequency: v }))}>
                            <SelectTrigger className="bg-secondary border-border text-sm"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {FREQUENCIES.map((f) => (
                                <SelectItem key={f.id} value={f.id}>{f.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label className="text-xs font-semibold text-muted-foreground">Categorie</Label>
                          <CategorySelect
                            categories={categories as any}
                            value={editForm.category_id}
                            onValueChange={(v) => setEditForm((f) => ({ ...f, category_id: v }))}
                            filterType={editForm.type as "income" | "expense"}
                            placeholder="Kies categorie"
                            className="bg-secondary border-border"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-semibold text-muted-foreground">Bankrekening</Label>
                          <Select value={editForm.bank_account_id} onValueChange={(v) => setEditForm((f) => ({ ...f, bank_account_id: v === "none" ? "" : v }))}>
                            <SelectTrigger className="bg-secondary border-border text-sm"><SelectValue placeholder="Optioneel" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">Geen</SelectItem>
                              {bankAccounts.map((a) => (
                                <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label className="text-xs font-semibold text-muted-foreground">Startdatum</Label>
                          <Input type="date" value={editForm.date} onChange={(e) => setEditForm((f) => ({ ...f, date: e.target.value }))} className="bg-secondary border-border text-sm" />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-semibold text-muted-foreground">Einddatum</Label>
                          <Input type="date" value={editForm.end_date} onChange={(e) => setEditForm((f) => ({ ...f, end_date: e.target.value }))} className="bg-secondary border-border text-sm" />
                        </div>
                      </div>
                      <div className="flex justify-end gap-2 pt-2 border-t border-border/50">
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
                    key={`${tx.id}-${i}`}
                    className={`flex items-center justify-between px-4 py-3 hover:bg-accent/30 transition-colors ${isPaid ? "opacity-50" : ""}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${isPaid ? "bg-income/10" : "bg-expense/10"}`}>
                        {isPaid ? <Check className="h-4 w-4 text-income" /> : tx.type === "income" ? <ArrowUpRight className="h-4 w-4 text-income" /> : <ArrowDownRight className="h-4 w-4 text-expense" />}
                      </div>
                      <div>
                        <p className="text-sm font-medium">
                          {tx.description}
                          {isPaid && (
                            <span className="ml-2 inline-block rounded bg-income/15 px-1.5 py-0.5 text-[10px] font-semibold text-income">Betaald</span>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {cat?.name ?? "Geen categorie"} · {new Date(tx.date).toLocaleDateString("nl-NL")}
                          {" · "}{freqLabel}
                          {account ? ` · ${account.name}` : ""}
                          {(tx as any).end_date && ` · t/m ${new Date((tx as any).end_date).toLocaleDateString("nl-NL")}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-semibold ${tx.type === "income" ? "text-income" : "text-expense"}`}>
                        {tx.type === "income" ? "+" : "-"}{fmt(Number(tx.amount))}
                      </span>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => startEdit(tx)}>
                        <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                      </Button>
                      {!(tx as any).isVirtual && (
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteTransaction(tx.id)}>
                          <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {plannedByMonth.every((m) => m.txs.length === 0) && (
        <div className="glass-card p-8 text-center">
          <CalendarClock className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">Geen geplande transacties gevonden.</p>
          <p className="text-xs text-muted-foreground mt-1">
            Klik op "Toevoegen" om een geplande transactie aan te maken.
          </p>
        </div>
      )}
    </div>
  );
}

function PlannedForm({
  categories,
  bankAccounts,
  onSubmit,
  initial,
}: {
  categories: { id: string; name: string; type: string; color: string; parent_category_id?: string | null }[];
  bankAccounts: { id: string; name: string }[];
  onSubmit: (tx: any) => Promise<void>;
  initial?: { description: string; amount: string; type: string; category_id: string; date: string; frequency: string; bank_account_id: string; end_date: string };
}) {
  const [type, setType] = useState<"expense" | "income">((initial?.type as any) || "expense");
  const [description, setDescription] = useState(initial?.description || "");
  const [amount, setAmount] = useState(initial?.amount || "");
  const [categoryId, setCategoryId] = useState(initial?.category_id || "");
  const [date, setDate] = useState(initial?.date || new Date().toISOString().slice(0, 10));
  const [frequency, setFrequency] = useState(initial?.frequency || "maandelijks");
  const [bankAccountId, setBankAccountId] = useState(initial?.bank_account_id || "");
  const [endDate, setEndDate] = useState(initial?.end_date || "");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description || !amount) return;
    setSaving(true);
    await onSubmit({
      description,
      amount: parseFloat(amount),
      currency: "EUR",
      type,
      category_id: categoryId || null,
      date,
      is_planned: true,
      frequency,
      bank_account_id: bankAccountId || null,
      end_date: endDate || null,
    });
    setSaving(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex gap-2">
        {(["expense", "income"] as const).map((t) => (
          <button
            type="button"
            key={t}
            onClick={() => { setType(t); setCategoryId(""); }}
            className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${
              type === t
                ? (t === "income" ? "gradient-income text-income-foreground" : "gradient-expense text-expense-foreground")
                : "bg-secondary text-secondary-foreground"
            }`}
          >
            {t === "expense" ? "Uitgave" : "Inkomst"}
          </button>
        ))}
      </div>
      <div className="space-y-2">
        <Label>Omschrijving</Label>
        <Input placeholder="bijv. Huur, Salaris" value={description} onChange={(e) => setDescription(e.target.value)} className="bg-secondary border-border" />
      </div>
      <div className="space-y-2">
        <Label>Bedrag</Label>
        <Input type="number" placeholder="0.00" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} className="bg-secondary border-border" />
      </div>
      <div className="space-y-2">
        <Label>Frequentie</Label>
        <Select value={frequency} onValueChange={setFrequency}>
          <SelectTrigger className="bg-secondary border-border"><SelectValue /></SelectTrigger>
          <SelectContent>
            {FREQUENCIES.map((f) => (
              <SelectItem key={f.id} value={f.id}>{f.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Categorie</Label>
        <CategorySelect
          categories={categories as any}
          value={categoryId}
          onValueChange={setCategoryId}
          filterType={type}
          placeholder="Kies categorie"
          className="bg-secondary border-border"
        />
      </div>
      <div className="space-y-2">
        <Label>Bankrekening</Label>
        <Select value={bankAccountId} onValueChange={setBankAccountId}>
          <SelectTrigger className="bg-secondary border-border"><SelectValue placeholder="Optioneel" /></SelectTrigger>
          <SelectContent>
            {bankAccounts.map((a) => (
              <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Startdatum</Label>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="bg-secondary border-border" />
        </div>
        <div className="space-y-2">
          <Label>Einddatum <span className="text-muted-foreground font-normal">(optioneel)</span></Label>
          <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="bg-secondary border-border" />
        </div>
      </div>
      <Button type="submit" disabled={!description || !amount || saving} className="w-full gradient-primary border-0 text-primary-foreground hover:opacity-90">
        Opslaan
      </Button>
    </form>
  );
}
