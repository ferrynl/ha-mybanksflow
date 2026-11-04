import { useState, useMemo } from "react";
import { useFinanceStore } from "@/hooks/useFinanceData";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, ChevronRight, TrendingUp, TrendingDown, Wallet, ArrowUpRight, ArrowDownRight, CalendarClock, PiggyBank } from "lucide-react";
import CategorySelect from "@/components/CategorySelect";

const MONTH_NAMES = [
  "Januari", "Februari", "Maart", "April", "Mei", "Juni",
  "Juli", "Augustus", "September", "Oktober", "November", "December",
];

function formatMonth(month: string) {
  const [year, m] = month.split("-");
  return `${MONTH_NAMES[parseInt(m, 10) - 1]} ${year}`;
}

function shiftMonth(month: string, delta: number) {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default function ReportsPage() {
  const now = new Date();
  const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const { transactions, categories, bankAccounts, contacts, budgets, getPlannedForMonth, loading } = useFinanceStore();
  const [selectedMonth, setSelectedMonth] = useState(defaultMonth);
  const [selectedAccount, setSelectedAccount] = useState<string>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedContact, setSelectedContact] = useState<string>("all");

  const checkingAccounts = bankAccounts.filter((a) => (a as any).account_type === "betaalrekening");

  const filtered = useMemo(() => {
    return transactions.filter((tx) => {
      if (tx.type === "transfer") return false;
      if (!tx.date.startsWith(selectedMonth)) return false;
      if (selectedAccount !== "all" && tx.bank_account_id !== selectedAccount) return false;
      if (selectedCategory !== "all" && tx.category_id !== selectedCategory) return false;
      if (selectedContact !== "all" && tx.contact_id !== selectedContact) return false;
      if (selectedAccount === "all") {
        const acct = bankAccounts.find((a) => a.id === tx.bank_account_id);
        if (acct && (acct as any).account_type !== "betaalrekening") return false;
      }
      return true;
    });
  }, [transactions, selectedMonth, selectedAccount, selectedCategory, selectedContact, bankAccounts]);

  const income = filtered.filter((t) => t.type === "income").reduce((s, t) => s + Number(t.amount), 0);
  const expense = filtered.filter((t) => t.type === "expense").reduce((s, t) => s + Number(t.amount), 0);

  const chartData = useMemo(() => {
    const [y, m] = selectedMonth.split("-").map(Number);
    const numDays = new Date(y, m, 0).getDate();
    const days: { day: string; inkomsten: number; uitgaven: number; saldo: number }[] = [];
    let runningBalance = 0;
    for (let d = 1; d <= numDays; d++) {
      const dayStr = `${selectedMonth}-${String(d).padStart(2, "0")}`;
      const dayTx = filtered.filter((t) => t.date === dayStr);
      const dayIncome = dayTx.filter((t) => t.type === "income").reduce((s, t) => s + Number(t.amount), 0);
      const dayExpense = dayTx.filter((t) => t.type === "expense").reduce((s, t) => s + Number(t.amount), 0);
      runningBalance += dayIncome - dayExpense;
      days.push({ day: String(d), inkomsten: dayIncome, uitgaven: dayExpense, saldo: runningBalance });
    }
    return days;
  }, [filtered, selectedMonth]);

  // Category breakdown with subcategory awareness
  const categoryBreakdown = useMemo(() => {
    const map = new Map<string, number>();
    filtered.filter((t) => t.type === "expense").forEach((t) => {
      const key = t.category_id || "uncategorized";
      map.set(key, (map.get(key) || 0) + Number(t.amount));
    });

    // Group by parent category, showing subcategories
    const result: Array<{ id: string; name: string; amount: number; color?: string; isChild: boolean; parentName?: string }> = [];
    const parentCats = categories
      .filter((c) => c.type === "expense" && !(c as any).parent_category_id)
      .sort((a, b) => ((a as any).sort_order ?? 0) - ((b as any).sort_order ?? 0));

    parentCats.forEach((parent) => {
      const childCats = categories.filter((c) => (c as any).parent_category_id === parent.id);
      const parentAmount = map.get(parent.id) || 0;
      const childAmounts = childCats.reduce((s, c) => s + (map.get(c.id) || 0), 0);
      const totalAmount = parentAmount + childAmounts;

      if (totalAmount > 0) {
        result.push({ id: parent.id, name: parent.name, amount: totalAmount, color: parent.color, isChild: false });
        childCats.forEach((child) => {
          const amt = map.get(child.id) || 0;
          if (amt > 0) {
            result.push({ id: child.id, name: child.name, amount: amt, color: child.color, isChild: true, parentName: parent.name });
          }
        });
      }
    });

    // Add uncategorized
    const uncatAmt = map.get("uncategorized") || 0;
    if (uncatAmt > 0) {
      result.push({ id: "uncategorized", name: "Overig", amount: uncatAmt, isChild: false });
    }

    return result;
  }, [filtered, categories]);

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
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Rapporten</h1>
          <p className="text-sm text-muted-foreground">Betaalrekening overzicht — {formatMonth(selectedMonth)}</p>
        </div>
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

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Select value={selectedAccount} onValueChange={setSelectedAccount}>
          <SelectTrigger className="w-48 bg-secondary border-border">
            <SelectValue placeholder="Alle betaalrekeningen" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle betaalrekeningen</SelectItem>
            {checkingAccounts.map((a) => (
              <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <CategorySelect
          categories={categories as any}
          value={selectedCategory}
          onValueChange={setSelectedCategory}
          placeholder="Alle categorieën"
          className="w-48 bg-secondary border-border"
          includeAll
        />
        <Select value={selectedContact} onValueChange={setSelectedContact}>
          <SelectTrigger className="w-48 bg-secondary border-border">
            <SelectValue placeholder="Alle contacten" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle contacten</SelectItem>
            {contacts.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Inkomsten</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg gradient-income">
              <TrendingUp className="h-5 w-5" />
            </div>
          </div>
          <p className="text-2xl font-bold">{fmt(income)}</p>
        </div>
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Uitgaven</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg gradient-expense">
              <TrendingDown className="h-5 w-5" />
            </div>
          </div>
          <p className="text-2xl font-bold">{fmt(expense)}</p>
        </div>
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Balans</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg gradient-primary">
              <Wallet className="h-5 w-5" />
            </div>
          </div>
          <p className="text-2xl font-bold">{fmt(income - expense)}</p>
        </div>
      </div>

      {/* Chart */}
      <div className="glass-card p-5">
        <h3 className="mb-4 text-sm font-semibold text-muted-foreground uppercase tracking-wider">Dagelijks overzicht</h3>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} barGap={1} barCategoryGap="20%">
              <defs>
                <linearGradient id="rptIncGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(152 70% 55%)" stopOpacity={0.95} />
                  <stop offset="100%" stopColor="hsl(152 70% 30%)" stopOpacity={0.8} />
                </linearGradient>
                <linearGradient id="rptExpGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(4 80% 65%)" stopOpacity={0.95} />
                  <stop offset="100%" stopColor="hsl(4 80% 40%)" stopOpacity={0.8} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(228 15% 18%)" vertical={false} />
              <XAxis dataKey="day" stroke="hsl(220 10% 50%)" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="hsl(220 10% 50%)" fontSize={11} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ background: "hsl(228 20% 11%)", border: "1px solid hsl(228 15% 22%)", borderRadius: "10px", color: "hsl(220 20% 95%)" }} />
              <Bar dataKey="inkomsten" fill="url(#rptIncGrad)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="uitgaven" fill="url(#rptExpGrad)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Saldo trend */}
      <div className="glass-card p-5">
        <h3 className="mb-4 text-sm font-semibold text-muted-foreground uppercase tracking-wider">Saldo verloop</h3>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(228 15% 18%)" vertical={false} />
              <XAxis dataKey="day" stroke="hsl(220 10% 50%)" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="hsl(220 10% 50%)" fontSize={11} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ background: "hsl(228 20% 11%)", border: "1px solid hsl(228 15% 22%)", borderRadius: "10px", color: "hsl(220 20% 95%)" }} />
              <Line type="monotone" dataKey="saldo" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Category breakdown with subcategories */}
      <div className="glass-card p-5">
        <h3 className="mb-4 text-sm font-semibold text-muted-foreground uppercase tracking-wider">Uitgaven per categorie</h3>
        {categoryBreakdown.length > 0 ? (
          <div className="space-y-1.5">
            {categoryBreakdown.map((cat) => {
              const pct = expense > 0 ? (cat.amount / expense) * 100 : 0;
              return (
                <div key={cat.id} className={`flex items-center gap-3 ${cat.isChild ? "ml-6" : ""}`}>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {cat.isChild && <span className="text-muted-foreground text-xs">└</span>}
                    <div className={`rounded-full flex-shrink-0 ${cat.isChild ? "h-2 w-2" : "h-3 w-3"}`} style={{ background: cat.color ? `hsl(${cat.color})` : "hsl(228 15% 40%)" }} />
                  </div>
                  <span className={`flex-1 ${cat.isChild ? "text-xs text-muted-foreground" : "text-sm"}`}>{cat.name}</span>
                  {!cat.isChild && (
                    <div className="w-32 h-2 bg-secondary rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: cat.color ? `hsl(${cat.color})` : "hsl(228 15% 40%)" }} />
                    </div>
                  )}
                  <span className={`font-medium w-24 text-right ${cat.isChild ? "text-xs" : "text-sm"}`}>{fmt(cat.amount)}</span>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">Geen uitgaven in deze periode</p>
        )}
      </div>

      {/* Geplande uitgaven */}
      {(() => {
        const planned = getPlannedForMonth(selectedMonth);
        const plannedExpenses = planned.filter((t) => t.type === "expense");
        const plannedIncome = planned.filter((t) => t.type === "income");
        const totalPlannedExpense = plannedExpenses.reduce((s, t) => s + Number(t.amount), 0);
        const totalPlannedIncome = plannedIncome.reduce((s, t) => s + Number(t.amount), 0);
        return (
          <div className="glass-card p-5">
            <div className="flex items-center gap-2 mb-4">
              <CalendarClock className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Geplande transacties</h3>
            </div>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="p-3 rounded-lg bg-secondary/50">
                <p className="text-xs text-muted-foreground mb-1">Geplande inkomsten</p>
                <p className="text-lg font-bold text-income">{fmt(totalPlannedIncome)}</p>
                <p className="text-xs text-muted-foreground">{plannedIncome.length} transacties</p>
              </div>
              <div className="p-3 rounded-lg bg-secondary/50">
                <p className="text-xs text-muted-foreground mb-1">Geplande uitgaven</p>
                <p className="text-lg font-bold text-expense">{fmt(totalPlannedExpense)}</p>
                <p className="text-xs text-muted-foreground">{plannedExpenses.length} transacties</p>
              </div>
            </div>
            {planned.length > 0 ? (
              <div className="divide-y divide-border/50">
                {planned.map((tx, idx) => {
                  const cat = categories.find((c) => c.id === tx.category_id);
                  return (
                    <div key={`${tx.id}-${idx}`} className="flex items-center justify-between py-2.5">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: cat ? `hsl(${cat.color} / 0.15)` : undefined }}>
                          {tx.type === "income" ? <ArrowUpRight className="h-4 w-4 text-income" /> : <ArrowDownRight className="h-4 w-4 text-expense" />}
                        </div>
                        <div>
                          <p className="text-sm font-medium">{tx.description}</p>
                          <p className="text-xs text-muted-foreground">
                            {cat?.name} · {new Date(tx.date).toLocaleDateString("nl-NL")}
                            {tx.frequency && tx.frequency !== "eenmalig" && (
                              <span className="ml-1 text-primary">· {tx.frequency === "maandelijks" ? "Maandelijks" : tx.frequency === "wekelijks" ? "Wekelijks" : tx.frequency === "per_kwartaal" ? "Per kwartaal" : tx.frequency}</span>
                            )}
                          </p>
                        </div>
                      </div>
                      <span className={`text-sm font-semibold ${tx.type === "income" ? "text-income" : "text-expense"}`}>
                        {tx.type === "income" ? "+" : "-"}{fmt(Number(tx.amount))}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">Geen geplande transacties voor deze maand</p>
            )}
          </div>
        );
      })()}

      {/* Budget overzicht */}
      {(() => {
        const monthBudgets = budgets.filter((b) => b.month === selectedMonth);
        const totalBudget = monthBudgets.reduce((s, b) => s + Number(b.amount), 0);
        const budgetItems = monthBudgets.map((b) => {
          const cat = b.category_id ? categories.find((c) => c.id === b.category_id) : null;
          const contact = b.contact_id ? contacts.find((c) => c.id === b.contact_id) : null;
          const spent = filtered
            .filter((t) => t.type === "expense" && (
              (b.category_id && t.category_id === b.category_id) ||
              (b.contact_id && t.contact_id === b.contact_id)
            ))
            .reduce((s, t) => s + Number(t.amount), 0);
          const pct = Number(b.amount) > 0 ? Math.min((spent / Number(b.amount)) * 100, 100) : 0;
          const over = spent > Number(b.amount);
          return { ...b, cat, contact, spent, pct, over, label: cat?.name || contact?.name || "Onbekend" };
        });
        const totalSpent = budgetItems.reduce((s, b) => s + b.spent, 0);
        const totalPct = totalBudget > 0 ? Math.min((totalSpent / totalBudget) * 100, 100) : 0;

        return (
          <div className="glass-card p-5">
            <div className="flex items-center gap-2 mb-4">
              <PiggyBank className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Budget overzicht</h3>
            </div>
            {monthBudgets.length > 0 ? (
              <>
                <div className="p-3 rounded-lg bg-secondary/50 mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs text-muted-foreground">Totaal budget</p>
                    <p className="text-xs text-muted-foreground">{fmt(totalSpent)} / {fmt(totalBudget)}</p>
                  </div>
                  <div className="w-full h-3 bg-secondary rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${totalPct}%`,
                        background: totalSpent > totalBudget ? "hsl(4 80% 60%)" : "hsl(var(--primary))",
                      }}
                    />
                  </div>
                </div>
                <div className="space-y-3">
                  {budgetItems.map((b) => (
                    <div key={b.id}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          {b.cat && <div className="h-2.5 w-2.5 rounded-full" style={{ background: `hsl(${b.cat.color})` }} />}
                          <span className="text-sm">{b.label}</span>
                        </div>
                        <span className={`text-xs font-medium ${b.over ? "text-expense" : "text-muted-foreground"}`}>
                          {fmt(b.spent)} / {fmt(Number(b.amount))}
                        </span>
                      </div>
                      <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${b.pct}%`,
                            background: b.over
                              ? "hsl(4 80% 60%)"
                              : b.cat ? `hsl(${b.cat.color})` : "hsl(var(--primary))",
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">Geen budgetten voor deze maand</p>
            )}
          </div>
        );
      })()}

      {/* Transaction list */}
      <div className="glass-card p-5">
        <h3 className="mb-4 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          Transacties ({filtered.length})
        </h3>
        <div className="divide-y divide-border/50">
          {filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Geen transacties gevonden</p>
          ) : (
            filtered.slice(0, 50).map((tx) => {
              const cat = categories.find((c) => c.id === tx.category_id);
              const parentCat = cat && (cat as any).parent_category_id
                ? categories.find((c) => c.id === (cat as any).parent_category_id)
                : null;
              return (
                <div key={tx.id} className="flex items-center justify-between py-2.5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: cat ? `hsl(${cat.color} / 0.15)` : undefined }}>
                      {tx.type === "income" ? <ArrowUpRight className="h-4 w-4 text-income" /> : <ArrowDownRight className="h-4 w-4 text-expense" />}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{tx.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {parentCat ? `${parentCat.name} › ${cat?.name}` : cat?.name} · {new Date(tx.date).toLocaleDateString("nl-NL")}
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
    </div>
  );
}
