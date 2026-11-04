import { useState } from "react";
import { useFinanceStore } from "@/hooks/useFinanceData";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Trash2 } from "lucide-react";
import HelpTooltip from "@/components/HelpTooltip";

const now = new Date();
const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

const MONTH_NAMES = [
  "Januari", "Februari", "Maart", "April", "Mei", "Juni",
  "Juli", "Augustus", "September", "Oktober", "November", "December",
];

function formatMonth(month: string) {
  const [year, m] = month.split("-");
  return `${MONTH_NAMES[parseInt(m, 10) - 1]} ${year}`;
}

export default function BudgetPage() {
  const { budgets, categories, contacts, getCategorySpending, addBudget, deleteBudget, loading } = useFinanceStore();
  const [currentMonth] = useState(defaultMonth);
  const [open, setOpen] = useState(false);

  const spending = getCategorySpending(currentMonth);
  const monthBudgets = budgets.filter((b) => b.month === currentMonth);
  const totalBudget = monthBudgets.reduce((s, b) => s + Number(b.amount), 0);
  const totalSpent = spending.reduce((s, c) => s + c.amount, 0);

  const fmt = (n: number) =>
    `€${n.toLocaleString("nl-NL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Budget</h1>
            <p className="text-sm text-muted-foreground">{formatMonth(currentMonth)}</p>
          </div>
          <HelpTooltip
            title="Budget"
            lines={[
              "Stel budgetten in per categorie of contact",
              "Budgetten op een hoofdcategorie tellen subcategorieën automatisch mee",
              "De voortgangsbalk wordt rood als je over budget gaat",
            ]}
          />
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 gradient-primary border-0 text-primary-foreground hover:opacity-90">
              <Plus className="h-4 w-4" /> Budget toevoegen
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border">
            <DialogHeader>
              <DialogTitle>Nieuw budget</DialogTitle>
            </DialogHeader>
            <AddBudgetForm
              categories={categories}
              contacts={contacts}
              month={currentMonth}
              onAdd={async (b) => {
                await addBudget(b);
                setOpen(false);
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      <div className="glass-card p-5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Totaal budget</span>
          <span className="text-sm text-muted-foreground">{fmt(totalSpent)} / {fmt(totalBudget)}</span>
        </div>
        <Progress value={totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0} className="h-3 bg-secondary" />
        <p className="mt-2 text-xs text-muted-foreground">
          {totalBudget > totalSpent ? `Nog ${fmt(totalBudget - totalSpent)} beschikbaar` : totalBudget > 0 ? `${fmt(totalSpent - totalBudget)} over budget` : "Geen budget ingesteld"}
        </p>
      </div>

      <div className="grid gap-3">
        {monthBudgets.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">Nog geen budgetten ingesteld voor deze maand</p>
        )}
        {monthBudgets.map((budget) => {
          const cat = categories.find((c) => c.id === budget.category_id);
          const contact = contacts.find((c) => c.id === (budget as any).contact_id);
          // Include subcategory spending for parent categories
          const subcategoryIds = categories
            .filter((c) => (c as any).parent_category_id === budget.category_id)
            .map((c) => c.id);
          const relevantIds = [budget.category_id, ...subcategoryIds];
          const spent = spending
            .filter((s) => relevantIds.includes(s.categoryId))
            .reduce((sum, s) => sum + s.amount, 0);
          const pct = Number(budget.amount) > 0 ? (spent / Number(budget.amount)) * 100 : 0;
          const overBudget = pct > 100;
          const label = cat?.name ?? contact?.name ?? "Onbekend";
          const color = cat ? `hsl(${cat.color})` : "hsl(228 15% 50%)";

          return (
            <div key={budget.id} className="glass-card p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full" style={{ background: color }} />
                  <span className="text-sm font-medium">{label}</span>
                  {contact && <span className="text-xs text-muted-foreground">(contact)</span>}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">{fmt(spent)} / {fmt(Number(budget.amount))}</span>
                  <button onClick={() => deleteBudget(budget.id)} className="rounded-md p-1 text-muted-foreground hover:bg-destructive/20 hover:text-destructive transition-colors">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              <Progress value={Math.min(pct, 100)} className={`h-2 bg-secondary ${overBudget ? "[&>div]:bg-destructive" : ""}`} />
              {overBudget && <p className="mt-1 text-xs text-expense">{fmt(spent - Number(budget.amount))} over budget</p>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AddBudgetForm({
  categories,
  contacts,
  month,
  onAdd,
}: {
  categories: { id: string; name: string; type: string }[];
  contacts: { id: string; name: string }[];
  month: string;
  onAdd: (b: { amount: number; month: string; category_id?: string | null; contact_id?: string | null }) => Promise<void>;
}) {
  const [mode, setMode] = useState<"category" | "contact">("category");
  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [contactId, setContactId] = useState("");

  const expenseCategories = categories.filter((c) => c.type === "expense");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || (mode === "category" && !categoryId) || (mode === "contact" && !contactId)) return;
    await onAdd({
      amount: parseFloat(amount),
      month,
      category_id: mode === "category" ? categoryId : null,
      contact_id: mode === "contact" ? contactId : null,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex gap-2">
        {(["category", "contact"] as const).map((m) => (
          <button
            type="button"
            key={m}
            onClick={() => setMode(m)}
            className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${
              mode === m ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
            }`}
          >
            {m === "category" ? "Per categorie" : "Per contact"}
          </button>
        ))}
      </div>

      {mode === "category" ? (
        <Select value={categoryId} onValueChange={setCategoryId}>
          <SelectTrigger className="bg-secondary border-border">
            <SelectValue placeholder="Categorie kiezen" />
          </SelectTrigger>
          <SelectContent>
            {expenseCategories.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : (
        <Select value={contactId} onValueChange={setContactId}>
          <SelectTrigger className="bg-secondary border-border">
            <SelectValue placeholder="Contact kiezen" />
          </SelectTrigger>
          <SelectContent>
            {contacts.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      <Input
        type="number"
        step="0.01"
        placeholder="Bedrag"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        className="bg-secondary border-border"
      />

      <Button type="submit" className="w-full gradient-primary border-0 text-primary-foreground hover:opacity-90">
        Opslaan
      </Button>
    </form>
  );
}
