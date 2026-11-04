import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import HelpTooltip from "@/components/HelpTooltip";
import { useFinanceStore } from "@/hooks/useFinanceData";
import BalanceForecast from "@/components/BalanceForecast";
import { useBankLogos } from "@/hooks/useBankLogos";
import { useContracts } from "@/hooks/useContracts";
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  ChevronLeft,
  ChevronRight,
  Search,
  AlertTriangle,
} from "lucide-react";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const MONTH_NAMES = [
  "Januari", "Februari", "Maart", "April", "Mei", "Juni",
  "Juli", "Augustus", "September", "Oktober", "November", "December",
];

const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  betaalrekening: "Betaalrekening",
  spaarrekening: "Spaarrekening",
  beleggingsrekening: "Beleggingsrekening",
  creditcard: "Creditcard",
  deposito: "Depositorekening",
};

// Aanpasbare aantal transacties per pagina op homepage
const DASHBOARD_TX_PER_PAGE = 10;

function formatMonth(month: string) {
  const [year, m] = month.split("-");
  return `${MONTH_NAMES[parseInt(m, 10) - 1]} ${year}`;
}

function shiftMonth(month: string, delta: number) {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function daysInMonth(month: string) {
  const [y, m] = month.split("-").map(Number);
  return new Date(y, m, 0).getDate();
}

export default function Dashboard() {
  const BANK_LOGOS = useBankLogos();
  const navigate = useNavigate();
  const now = new Date();
  const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const [viewMode, setViewMode] = useState<"month" | "year">("month");
  const [selectedMonth, setSelectedMonth] = useState(defaultMonth);
  const [selectedYear, setSelectedYear] = useState(String(now.getFullYear()));
  const [txSearch, setTxSearch] = useState("");
  const [txPage, setTxPage] = useState(0);

  const periodKey = viewMode === "month" ? selectedMonth : selectedYear;
  const prevPeriodKey = viewMode === "month" ? shiftMonth(selectedMonth, -1) : String(Number(selectedYear) - 1);

  const { getMonthTotals, getCategorySpending, getMonthTransactions, getPlannedForMonth, getAccountBalance, categories, bankAccounts, transactions, loading } =
    useFinanceStore();
  const { getExpiringContracts } = useContracts();

  const totals = getMonthTotals(periodKey);
  const prevTotals = getMonthTotals(prevPeriodKey);
  const spending = getCategorySpending(periodKey);
  const allPeriodTx = getMonthTransactions(periodKey);
  const plannedTx = getPlannedForMonth(viewMode === "month" ? selectedMonth : selectedYear);

  // Total balance across all accounts
  const totalBalance = useMemo(() => {
    return bankAccounts.reduce((sum, acc) => sum + getAccountBalance(acc.id), 0);
  }, [bankAccounts, getAccountBalance]);
  const filteredTx = useMemo(() => {
    if (!txSearch.trim()) return allPeriodTx;
    const q = txSearch.toLowerCase();
    return allPeriodTx.filter((tx) =>
      tx.description.toLowerCase().includes(q) ||
      tx.original_description?.toLowerCase().includes(q) ||
      String(tx.amount).includes(q)
    );
  }, [allPeriodTx, txSearch]);
  const totalPages = Math.max(1, Math.ceil(filteredTx.length / DASHBOARD_TX_PER_PAGE));
  const pagedTx = filteredTx.slice(txPage * DASHBOARD_TX_PER_PAGE, (txPage + 1) * DASHBOARD_TX_PER_PAGE);

  const incomeChange = prevTotals.income
    ? ((totals.income - prevTotals.income) / prevTotals.income) * 100
    : 0;
  const expenseChange = prevTotals.expense
    ? ((totals.expense - prevTotals.expense) / prevTotals.expense) * 100
    : 0;

  // Unique colors palette for pie chart
  const PIE_COLORS = [
    "hsl(210 100% 55%)", "hsl(152 70% 45%)", "hsl(38 92% 55%)", "hsl(4 80% 60%)",
    "hsl(280 65% 60%)", "hsl(340 75% 55%)", "hsl(170 60% 45%)", "hsl(25 95% 50%)",
    "hsl(200 70% 50%)", "hsl(120 50% 40%)", "hsl(300 50% 50%)", "hsl(60 80% 45%)",
    "hsl(190 80% 40%)", "hsl(330 60% 50%)", "hsl(15 75% 55%)", "hsl(228 15% 40%)",
  ];

  // Group spending: aggregate subcategory amounts into parent categories
  const groupedSpending = useMemo(() => {
    // Separate parents and children from spending
    const parentItems = spending.filter((s) => !(s.category as any)?.parent_category_id);
    const childItems = spending.filter((s) => !!(s.category as any)?.parent_category_id);

    // Build a map of parent category id -> aggregated amount (parent's own + children)
    const parentMap = new Map<string, { categoryId: string; category: any; amount: number; children: typeof spending }>();

    // Initialize with existing parent spending
    parentItems.forEach((p) => {
      parentMap.set(p.categoryId, { ...p, children: [] });
    });

    // Aggregate children into parents
    childItems.forEach((c) => {
      const parentId = (c.category as any)?.parent_category_id;
      if (parentId) {
        if (parentMap.has(parentId)) {
          const parent = parentMap.get(parentId)!;
          parent.amount += c.amount;
          parent.children.push(c);
        } else {
          // Parent has no direct spending — create entry from the parent category
          const parentCat = categories.find((cat) => cat.id === parentId);
          if (parentCat) {
            parentMap.set(parentId, {
              categoryId: parentId,
              category: parentCat,
              amount: c.amount,
              children: [c],
            });
          } else {
            // Orphan child, show as-is
            parentMap.set(c.categoryId, { ...c, children: [] });
          }
        }
      }
    });

    // Sort by amount descending, then flatten with children
    const sorted = Array.from(parentMap.values()).sort((a, b) => b.amount - a.amount);
    const result: typeof spending = [];
    sorted.forEach((p) => {
      result.push({ categoryId: p.categoryId, category: p.category, amount: p.amount });
      p.children.sort((a, b) => b.amount - a.amount).forEach((c) => result.push(c));
    });
    return result;
  }, [spending, categories]);

  const pieData = groupedSpending.map((s, i) => ({
    name: s.category?.name ?? "Overig",
    value: s.amount,
    color: PIE_COLORS[i % PIE_COLORS.length],
  }));

  const chartData = useMemo(() => {
    if (viewMode === "year") {
      return MONTH_NAMES.map((name, i) => {
        const m = `${selectedYear}-${String(i + 1).padStart(2, "0")}`;
        const t = getMonthTotals(m);
        return { day: name.substring(0, 3), inkomsten: t.income, uitgaven: t.expense };
      });
    }
    const allTx = getMonthTransactions(selectedMonth);
    const numDays = daysInMonth(selectedMonth);
    const days: { day: string; inkomsten: number; uitgaven: number }[] = [];
    for (let d = 1; d <= numDays; d++) {
      const dayStr = `${selectedMonth}-${String(d).padStart(2, "0")}`;
      const dayTxs = allTx.filter((t) => t.date === dayStr);
      days.push({
        day: String(d),
        inkomsten: dayTxs.filter((t) => t.type === "income").reduce((s, t) => s + Number(t.amount), 0),
        uitgaven: dayTxs.filter((t) => t.type === "expense").reduce((s, t) => s + Number(t.amount), 0),
      });
    }
    return days;
  }, [getMonthTransactions, getMonthTotals, selectedMonth, selectedYear, viewMode]);

  const periodLabel = viewMode === "month" ? formatMonth(selectedMonth) : selectedYear;
  const comparisonLabel = viewMode === "month" ? "vorige maand" : "vorig jaar";

  const navigatePrev = () => {
    if (viewMode === "month") setSelectedMonth(shiftMonth(selectedMonth, -1));
    else setSelectedYear(String(Number(selectedYear) - 1));
    setTxPage(0);
  };
  const navigateNext = () => {
    if (viewMode === "month") setSelectedMonth(shiftMonth(selectedMonth, 1));
    else setSelectedYear(String(Number(selectedYear) + 1));
    setTxPage(0);
  };
  const navigateDefault = () => {
    if (viewMode === "month") setSelectedMonth(defaultMonth);
    else setSelectedYear(String(now.getFullYear()));
    setTxPage(0);
  };

  const fmt = (n: number) =>
    `€${n.toLocaleString("nl-NL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  // Calculate planned remaining for current month
  const plannedTotal = plannedTx.reduce((s, t) => s + Number(t.amount), 0);
  const plannedPaid = plannedTx.filter((t) => !t.is_planned).length; // is_planned means still planned/unpaid

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
            <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-sm text-muted-foreground">{periodLabel} — Overzicht</p>
          </div>
          <HelpTooltip
            title="Dashboard"
            lines={[
              "Bekijk je inkomsten, uitgaven en saldo per maand of jaar",
              "Wissel tussen maand- en jaaroverzicht met de knoppen rechtsboven",
              "De saldovoorspelling schat je eindsaldo op basis van eerdere maanden",
              "Zoek door je transacties met de zoekbalk onderaan",
            ]}
          />
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-border/50 overflow-hidden">
            <button
              onClick={() => { setViewMode("month"); setTxPage(0); }}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${viewMode === "month" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              Maand
            </button>
            <button
              onClick={() => { setViewMode("year"); setTxPage(0); }}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${viewMode === "year" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              Jaar
            </button>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={navigatePrev}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" className="text-xs min-w-[120px]" onClick={navigateDefault}>
              {periodLabel}
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={navigateNext}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <SummaryCard label="Inkomsten" value={fmt(totals.income)} change={incomeChange} icon={<TrendingUp className="h-5 w-5" />} variant="income" comparisonLabel={comparisonLabel} />
        <SummaryCard label="Uitgaven" value={fmt(totals.expense)} change={expenseChange} icon={<TrendingDown className="h-5 w-5" />} variant="expense" comparisonLabel={comparisonLabel} />
        <SummaryCard label="Totaal saldo" value={fmt(totalBalance)} icon={<Wallet className="h-5 w-5" />} variant="balance" />
      </div>

      {/* Account balances */}
      {bankAccounts.length > 0 && (
        <div className="glass-card p-5">
          <h3 className="mb-4 text-sm font-semibold text-muted-foreground uppercase tracking-wider">Rekeningen</h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {bankAccounts.map((acc) => {
              const balance = getAccountBalance(acc.id);
              // Planned expenses still to come this month - subtract already paid ones
              const plannedForAcc = plannedTx.filter((t) => t.bank_account_id === acc.id && t.type === "expense");
              const plannedRemaining = plannedForAcc.reduce((s, t) => s + Number(t.amount), 0);
              return (
                <div
                  key={acc.id}
                  className="rounded-xl border border-border/50 p-4 bg-secondary/30 cursor-pointer hover:bg-secondary/50 transition-colors"
                  onClick={() => navigate(`/reports?account=${acc.id}`)}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div
                      className="flex h-8 w-8 items-center justify-center rounded-lg overflow-hidden"
                      style={{ background: `hsl(${acc.color} / 0.2)` }}
                    >
                      {BANK_LOGOS[acc.bank] ? (
                        <img src={BANK_LOGOS[acc.bank]} alt={acc.bank} className="h-6 w-6 object-contain" />
                      ) : (
                        <span className="text-xs font-bold" style={{ color: `hsl(${acc.color})` }}>{acc.bank.substring(0, 2).toUpperCase()}</span>
                      )}
                    </div>
                    <div>
                      <p className="text-xs font-medium">{acc.name}</p>
                      <p className="text-[10px] text-muted-foreground">{ACCOUNT_TYPE_LABELS[acc.account_type] ?? acc.account_type}</p>
                    </div>
                  </div>
                  <p className={`text-lg font-bold ${balance >= 0 ? "text-income" : "text-expense"}`}>
                    {fmt(balance)}
                  </p>
                  {plannedRemaining > 0 && (
                    <p className="text-[11px] text-muted-foreground mt-1">
                      Nog gepland: <span className="text-expense font-medium">-{fmt(plannedRemaining)}</span>
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Expiring contracts alert */}
      {getExpiringContracts(2).length > 0 && (
        <div className="rounded-xl border border-orange-500/30 bg-orange-500/5 p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            <h3 className="font-semibold text-sm">Contracten die binnenkort verlopen</h3>
          </div>
          <div className="space-y-1">
            {getExpiringContracts(2).map((c) => (
              <div key={c.id} className="flex items-center justify-between text-sm">
                <span>{c.name}</span>
                <span className="text-muted-foreground">Verloopt {c.end_date}</span>
              </div>
            ))}
          </div>
          <Button variant="link" size="sm" className="px-0 mt-1 text-orange-600" onClick={() => navigate("/contracts")}>
            Bekijk contracten →
          </Button>
        </div>
      )}

      {/* Balance Forecast */}
      <BalanceForecast
        currentMonth={selectedMonth}
        totalBalance={totalBalance}
        getMonthTotals={getMonthTotals}
        getMonthTransactions={getMonthTransactions}
        plannedTransactions={plannedTx}
        fmt={fmt}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <div className="glass-card p-5 lg:col-span-3">
          <h3 className="mb-4 text-sm font-semibold text-muted-foreground uppercase tracking-wider">Cash flow</h3>
          <div className="h-72" style={{ perspective: "800px" }}>
            <div style={{ transform: "rotateX(8deg) rotateY(-3deg)", transformOrigin: "center bottom", height: "100%" }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} barGap={1} barCategoryGap="20%">
                  <defs>
                    <linearGradient id="incGrad3d" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(152 70% 55%)" stopOpacity={0.95} />
                      <stop offset="100%" stopColor="hsl(152 70% 30%)" stopOpacity={0.8} />
                    </linearGradient>
                    <linearGradient id="expGrad3d" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(4 80% 65%)" stopOpacity={0.95} />
                      <stop offset="100%" stopColor="hsl(4 80% 40%)" stopOpacity={0.8} />
                    </linearGradient>
                    <filter id="bar3dShadow">
                      <feDropShadow dx="2" dy="3" stdDeviation="3" floodColor="hsl(228 20% 5%)" floodOpacity="0.4" />
                    </filter>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(228 15% 18%)" vertical={false} />
                  <XAxis dataKey="day" stroke="hsl(220 10% 50%)" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="hsl(220 10% 50%)" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip
                    cursor={{ fill: "hsl(228 15% 15% / 0.4)", radius: 4 }}
                    contentStyle={{ background: "hsl(228 20% 11%)", border: "1px solid hsl(228 15% 22%)", borderRadius: "10px", color: "hsl(220 20% 95%)", boxShadow: "0 8px 32px hsl(228 20% 5% / 0.5)" }}
                  />
                  <Bar dataKey="inkomsten" fill="url(#incGrad3d)" radius={[4, 4, 0, 0]} style={{ filter: "url(#bar3dShadow)" }} />
                  <Bar dataKey="uitgaven" fill="url(#expGrad3d)" radius={[4, 4, 0, 0]} style={{ filter: "url(#bar3dShadow)" }} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="glass-card p-5 lg:col-span-2">
          <h3 className="mb-4 text-sm font-semibold text-muted-foreground uppercase tracking-wider">Uitgaven per categorie</h3>
          {pieData.length > 0 ? (
            <>
              <div className="h-48" style={{ perspective: "600px" }}>
                <div style={{ transform: "rotateX(25deg)", transformOrigin: "center center", height: "100%" }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <defs>
                        {pieData.map((entry, i) => (
                          <linearGradient key={i} id={`pieGrad${i}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={entry.color} stopOpacity={1} />
                            <stop offset="100%" stopColor={entry.color} stopOpacity={0.6} />
                          </linearGradient>
                        ))}
                        <filter id="pie3dShadow">
                          <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="hsl(228 20% 5%)" floodOpacity="0.5" />
                        </filter>
                      </defs>
                      <Pie data={pieData} cx="50%" cy="50%" innerRadius={40} outerRadius={75} paddingAngle={3} dataKey="value" style={{ filter: "url(#pie3dShadow)" }}>
                        {pieData.map((entry, i) => (<Cell key={i} fill={`url(#pieGrad${i})`} stroke={entry.color} strokeWidth={1} />))}
                      </Pie>
                      <Tooltip formatter={(value: number) => fmt(value)} contentStyle={{ background: "hsl(228 20% 11%)", border: "1px solid hsl(228 15% 18%)", borderRadius: "8px", color: "hsl(220 20% 95%)" }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="mt-3 space-y-1.5">
                {groupedSpending.slice(0, 8).map((s, i) => {
                  const isChild = !!(s.category as any)?.parent_category_id;
                  const pieColor = PIE_COLORS[i % PIE_COLORS.length];
                  return (
                    <div key={s.categoryId} className={`flex items-center justify-between text-xs ${isChild ? "ml-4" : ""}`}>
                      <div className="flex items-center gap-2">
                        {isChild && <span className="text-muted-foreground text-[10px]">└</span>}
                        <div className={`rounded-full ${isChild ? "h-2 w-2" : "h-2.5 w-2.5"}`} style={{ background: pieColor }} />
                        <span className={isChild ? "text-muted-foreground/70" : "text-muted-foreground"}>{s.category?.name}</span>
                      </div>
                      <span className="font-medium">{fmt(s.amount)}</span>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground py-8 text-center">Nog geen uitgaven deze maand</p>
          )}
        </div>
      </div>

      <div className="glass-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Transacties in {periodLabel}</h3>
          <div className="relative w-64">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Zoek op naam, bedrag..."
              value={txSearch}
              onChange={(e) => { setTxSearch(e.target.value); setTxPage(0); }}
              className="pl-8 h-8 text-xs"
            />
          </div>
        </div>
        {pagedTx.length > 0 ? (
          <>
            <div className="space-y-2">
              {pagedTx.map((tx) => {
                const cat = categories.find((c) => c.id === tx.category_id);
                const bank = bankAccounts.find((b) => b.id === tx.bank_account_id);
                return (
                  <div key={tx.id} className="flex items-center justify-between rounded-lg px-3 py-2.5 transition-colors hover:bg-accent/50">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg" style={{ background: cat ? `hsl(${cat.color} / 0.15)` : undefined }}>
                        {tx.type === "income" ? <ArrowUpRight className="h-4 w-4 text-income" /> : <ArrowDownRight className="h-4 w-4 text-expense" />}
                      </div>
                      <div>
                        <p className="text-sm font-medium">
                          {tx.description}
                          {tx.is_planned && (
                            <span className="ml-2 inline-block rounded bg-primary/15 px-1.5 py-0.5 text-[10px] font-semibold text-primary">Gepland</span>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {cat?.name}{bank ? ` · ${bank.name}` : ""} · {new Date(tx.date).toLocaleDateString("nl-NL")}
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
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4 pt-3 border-t border-border/50">
                <span className="text-xs text-muted-foreground">
                  {filteredTx.length} transactie{filteredTx.length !== 1 ? "s" : ""} · pagina {txPage + 1} van {totalPages}
                </span>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="h-7 w-7" disabled={txPage === 0} onClick={() => setTxPage(txPage - 1)}>
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" disabled={txPage >= totalPages - 1} onClick={() => setTxPage(txPage + 1)}>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            )}
          </>
        ) : (
          <p className="text-sm text-muted-foreground py-4 text-center">
            {txSearch ? "Geen resultaten gevonden" : `Geen transacties in ${periodLabel}`}
          </p>
        )}
      </div>
    </div>
  );
}

function SummaryCard({ label, value, change, icon, variant, comparisonLabel = "vorige maand" }: { label: string; value: string; change?: number; icon: React.ReactNode; variant: "income" | "expense" | "balance"; comparisonLabel?: string }) {
  const gradientClass = variant === "income" ? "gradient-income" : variant === "expense" ? "gradient-expense" : "gradient-primary";
  return (
    <div className="glass-card p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{label}</span>
        <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${gradientClass}`}>{icon}</div>
      </div>
      <p className="text-2xl font-bold">{value}</p>
      {change !== undefined && (
        <p className={`mt-1 text-xs ${change >= 0 ? "text-income" : "text-expense"}`}>
          {change >= 0 ? "+" : ""}{change.toFixed(1)}% t.o.v. {comparisonLabel}
        </p>
      )}
    </div>
  );
}
