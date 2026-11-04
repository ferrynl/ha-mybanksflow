import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  TrendingUp, TrendingDown, Wallet, ArrowUpRight, ArrowDownRight,
  ChevronLeft, ChevronRight, PiggyBank, Building2, LayoutDashboard,
  ArrowLeftRight, CalendarClock, Users, Upload, FileText, Settings,
  BarChart3, LogOut, Search, Check, Filter,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

// ─── Shared dummy data ─────────────────────────────────────────────
const demoCategories = [
  { id: "c1", name: "Salaris", color: "152 70% 45%", type: "income" },
  { id: "c2", name: "Boodschappen", color: "38 92% 55%", type: "expense" },
  { id: "c3", name: "Huur", color: "4 80% 60%", type: "expense" },
  { id: "c4", name: "Abonnementen", color: "280 65% 60%", type: "expense" },
  { id: "c5", name: "Transport", color: "210 100% 55%", type: "expense" },
  { id: "c6", name: "Eten & drinken", color: "340 75% 55%", type: "expense" },
  { id: "c7", name: "Kleding", color: "170 60% 45%", type: "expense" },
  { id: "c8", name: "Verzekeringen", color: "228 15% 40%", type: "expense" },
];

const demoAccounts = [
  { id: "1", name: "Betaalrekening", bank: "ING", account_type: "betaalrekening", color: "210 100% 55%", balance: 2320.50 },
  { id: "2", name: "Spaarrekening", bank: "Rabobank", account_type: "spaarrekening", color: "152 70% 45%", balance: 2500.00 },
];

const demoTransactions = [
  { id: "t1", description: "Salarisuitbetaling", amount: 3250, type: "income", date: "2026-03-01", category_id: "c1", bank_account_id: "1" },
  { id: "t2", description: "Albert Heijn", amount: 67.45, type: "expense", date: "2026-03-02", category_id: "c2", bank_account_id: "1" },
  { id: "t3", description: "Huur maart", amount: 1150, type: "expense", date: "2026-03-01", category_id: "c3", bank_account_id: "1" },
  { id: "t4", description: "Netflix", amount: 15.99, type: "expense", date: "2026-03-03", category_id: "c4", bank_account_id: "1" },
  { id: "t5", description: "NS Reiskosten", amount: 43.20, type: "expense", date: "2026-03-04", category_id: "c5", bank_account_id: "1" },
  { id: "t6", description: "Thuisbezorgd", amount: 28.50, type: "expense", date: "2026-03-05", category_id: "c6", bank_account_id: "1" },
  { id: "t7", description: "Jumbo Supermarkt", amount: 52.30, type: "expense", date: "2026-03-06", category_id: "c2", bank_account_id: "1" },
  { id: "t8", description: "Spotify Premium", amount: 10.99, type: "expense", date: "2026-03-03", category_id: "c4", bank_account_id: "1" },
  { id: "t9", description: "Shell tankstation", amount: 65.00, type: "expense", date: "2026-03-07", category_id: "c5", bank_account_id: "1" },
  { id: "t10", description: "H&M", amount: 89.95, type: "expense", date: "2026-03-08", category_id: "c7", bank_account_id: "1" },
  { id: "t11", description: "Freelance opdracht", amount: 450, type: "income", date: "2026-03-10", category_id: "c1", bank_account_id: "1" },
  { id: "t12", description: "Zorgverzekering", amount: 135, type: "expense", date: "2026-03-01", category_id: "c8", bank_account_id: "1" },
];

const demoPlanned = [
  { id: "p1", description: "Huur", amount: 1150, type: "expense", frequency: "maandelijks", category_id: "c3" },
  { id: "p2", description: "Netflix", amount: 15.99, type: "expense", frequency: "maandelijks", category_id: "c4" },
  { id: "p3", description: "Spotify", amount: 10.99, type: "expense", frequency: "maandelijks", category_id: "c4" },
  { id: "p4", description: "Zorgverzekering", amount: 135, type: "expense", frequency: "maandelijks", category_id: "c8" },
  { id: "p5", description: "Salaris", amount: 3250, type: "income", frequency: "maandelijks", category_id: "c1" },
];

const demoContacts = [
  { id: "k1", name: "Albert Heijn", iban: "NL12ABNA0123456789", count: 24 },
  { id: "k2", name: "Jumbo", iban: "NL45RABO9876543210", count: 18 },
  { id: "k3", name: "Netflix", iban: null, count: 12 },
  { id: "k4", name: "Spotify", iban: null, count: 12 },
  { id: "k5", name: "NS", iban: "NL89INGB0001234567", count: 8 },
  { id: "k6", name: "Shell", iban: "NL34ABNA0987654321", count: 6 },
  { id: "k7", name: "Thuisbezorgd", iban: null, count: 5 },
  { id: "k8", name: "H&M", iban: null, count: 3 },
];

const demoBudgets = [
  { id: "b1", category_id: "c2", amount: 300, spent: 119.75 },
  { id: "b2", category_id: "c6", amount: 100, spent: 28.50 },
  { id: "b3", category_id: "c5", amount: 150, spent: 108.20 },
  { id: "b4", category_id: "c7", amount: 100, spent: 89.95 },
];

const PIE_COLORS = [
  "hsl(210 100% 55%)", "hsl(152 70% 45%)", "hsl(38 92% 55%)", "hsl(4 80% 60%)",
  "hsl(280 65% 60%)", "hsl(340 75% 55%)", "hsl(170 60% 45%)", "hsl(228 15% 40%)",
];

const fmt = (n: number) =>
  `€${n.toLocaleString("nl-NL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  betaalrekening: "Betaalrekening",
  spaarrekening: "Spaarrekening",
};

type DemoPage = "dashboard" | "transactions" | "planned" | "contacts" | "budget" | "reports" | "import" | "changelog" | "settings";

const demoNavItems: { id: DemoPage; icon: any; label: string; indent?: boolean }[] = [
  { id: "dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { id: "transactions", icon: ArrowLeftRight, label: "Transacties" },
  { id: "planned", icon: CalendarClock, label: "Gepland", indent: true },
  { id: "contacts", icon: Users, label: "Contacten" },
  { id: "budget", icon: PiggyBank, label: "Budget" },
  { id: "reports", icon: BarChart3, label: "Rapporten" },
  { id: "import", icon: Upload, label: "Importeren" },
  { id: "changelog", icon: FileText, label: "Versies" },
  { id: "settings", icon: Settings, label: "Instellingen" },
];

// ─── Sub-page components ────────────────────────────────────────────

function DemoDashboard() {
  const income = demoTransactions.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const expense = demoTransactions.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const totalBalance = 4820.50;

  const spending = useMemo(() => {
    const map: Record<string, number> = {};
    demoTransactions.filter((t) => t.type === "expense").forEach((t) => {
      map[t.category_id] = (map[t.category_id] || 0) + t.amount;
    });
    return Object.entries(map)
      .map(([catId, amount]) => ({ category: demoCategories.find((c) => c.id === catId)!, amount }))
      .sort((a, b) => b.amount - a.amount);
  }, []);

  const pieData = spending.map((s, i) => ({ name: s.category.name, value: s.amount, color: PIE_COLORS[i % PIE_COLORS.length] }));

  const chartData = [
    { day: "1", inkomsten: 3250, uitgaven: 1285 },
    { day: "2", inkomsten: 0, uitgaven: 67.45 },
    { day: "3", inkomsten: 0, uitgaven: 26.98 },
    { day: "4", inkomsten: 0, uitgaven: 43.20 },
    { day: "5", inkomsten: 0, uitgaven: 28.50 },
    { day: "6", inkomsten: 0, uitgaven: 52.30 },
    { day: "7", inkomsten: 0, uitgaven: 65 },
    { day: "8", inkomsten: 0, uitgaven: 89.95 },
    { day: "10", inkomsten: 450, uitgaven: 0 },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Maart 2026 — Demo overzicht</p>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" disabled><ChevronLeft className="h-4 w-4" /></Button>
          <Button variant="outline" size="sm" className="text-xs min-w-[120px]" disabled>Maart 2026</Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" disabled><ChevronRight className="h-4 w-4" /></Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <SummaryCard label="Inkomsten" value={fmt(income)} change="+2.3%" icon={<TrendingUp className="h-4 w-4 text-income" />} bg="bg-income/10" />
        <SummaryCard label="Uitgaven" value={fmt(expense)} change="-5.1%" icon={<TrendingDown className="h-4 w-4 text-expense" />} bg="bg-expense/10" />
        <SummaryCard label="Totaal saldo" value={fmt(totalBalance)} icon={<Wallet className="h-4 w-4 text-primary" />} bg="bg-primary/10" />
      </div>

      <div className="glass-card p-5">
        <h3 className="mb-4 text-sm font-semibold text-muted-foreground uppercase tracking-wider">Rekeningen</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {demoAccounts.map((acc) => (
            <div key={acc.id} className="rounded-xl border border-border/50 p-4 bg-secondary/30">
              <div className="flex items-center gap-2 mb-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: `hsl(${acc.color} / 0.2)` }}>
                  <Building2 className="h-4 w-4" style={{ color: `hsl(${acc.color})` }} />
                </div>
                <div>
                  <p className="text-xs font-medium">{acc.name}</p>
                  <p className="text-[10px] text-muted-foreground">{ACCOUNT_TYPE_LABELS[acc.account_type]}</p>
                </div>
              </div>
              <p className="text-lg font-bold text-income">{fmt(acc.balance)}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <div className="glass-card p-5 lg:col-span-3">
          <h3 className="mb-4 text-sm font-semibold text-muted-foreground uppercase tracking-wider">Cash flow</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} barGap={1} barCategoryGap="20%">
                <defs>
                  <linearGradient id="dIncG" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(152 70% 55%)" stopOpacity={0.95} />
                    <stop offset="100%" stopColor="hsl(152 70% 30%)" stopOpacity={0.8} />
                  </linearGradient>
                  <linearGradient id="dExpG" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(4 80% 65%)" stopOpacity={0.95} />
                    <stop offset="100%" stopColor="hsl(4 80% 40%)" stopOpacity={0.8} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(228 15% 18%)" vertical={false} />
                <XAxis dataKey="day" stroke="hsl(220 10% 50%)" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="hsl(220 10% 50%)" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ background: "hsl(228 20% 11%)", border: "1px solid hsl(228 15% 22%)", borderRadius: "10px", color: "hsl(220 20% 95%)" }} />
                <Bar dataKey="inkomsten" fill="url(#dIncG)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="uitgaven" fill="url(#dExpG)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-card p-5 lg:col-span-2">
          <h3 className="mb-4 text-sm font-semibold text-muted-foreground uppercase tracking-wider">Uitgaven per categorie</h3>
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={35} outerRadius={65} paddingAngle={3} dataKey="value">
                  {pieData.map((entry, i) => (<Cell key={i} fill={entry.color} />))}
                </Pie>
                <Tooltip formatter={(value: number) => fmt(value)} contentStyle={{ background: "hsl(228 20% 11%)", border: "1px solid hsl(228 15% 18%)", borderRadius: "8px", color: "hsl(220 20% 95%)" }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 space-y-1.5">
            {spending.map((s, i) => (
              <div key={s.category.id} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="h-2.5 w-2.5 rounded-full" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                  <span className="text-muted-foreground">{s.category.name}</span>
                </div>
                <span className="font-medium">{fmt(s.amount)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="glass-card p-5">
        <h3 className="mb-4 text-sm font-semibold text-muted-foreground uppercase tracking-wider">Recente transacties</h3>
        <div className="space-y-2">
          {demoTransactions.slice(0, 10).map((tx) => {
            const cat = demoCategories.find((c) => c.id === tx.category_id);
            return (
              <div key={tx.id} className="flex items-center justify-between rounded-lg px-3 py-2.5 hover:bg-accent/50">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg" style={{ background: cat ? `hsl(${cat.color} / 0.15)` : undefined }}>
                    {tx.type === "income" ? <ArrowUpRight className="h-4 w-4 text-income" /> : <ArrowDownRight className="h-4 w-4 text-expense" />}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{tx.description}</p>
                    <p className="text-[11px] text-muted-foreground">{cat?.name} · {tx.date}</p>
                  </div>
                </div>
                <span className={`text-sm font-semibold tabular-nums ${tx.type === "income" ? "text-income" : "text-expense"}`}>
                  {tx.type === "income" ? "+" : "-"}{fmt(tx.amount)}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function DemoTransactions() {
  const [filter, setFilter] = useState<"all" | "income" | "expense">("all");
  const [search, setSearch] = useState("");

  const filtered = demoTransactions.filter((tx) => {
    if (filter !== "all" && tx.type !== filter) return false;
    if (search && !tx.description.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Transacties</h1>
        <p className="text-sm text-muted-foreground">{filtered.length} transacties</p>
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        {(["all", "income", "expense"] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${filter === f ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-accent"}`}>
            {f === "all" ? "Alles" : f === "income" ? "Inkomsten" : "Uitgaven"}
          </button>
        ))}
        <div className="flex-1" />
        <Input placeholder="Zoeken..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-48 h-9 text-sm bg-secondary border-border" />
        <Button variant="outline" size="sm" className="gap-1"><Filter className="h-3.5 w-3.5" /> Filters</Button>
      </div>

      <div className="glass-card divide-y divide-border/50">
        {filtered.map((tx) => {
          const cat = demoCategories.find((c) => c.id === tx.category_id);
          return (
            <div key={tx.id} className="flex items-center justify-between px-5 py-3.5 hover:bg-accent/30 transition-colors">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg" style={{ background: cat ? `hsl(${cat.color} / 0.15)` : undefined }}>
                  {tx.type === "income" ? <ArrowUpRight className="h-4 w-4 text-income" /> : <ArrowDownRight className="h-4 w-4 text-expense" />}
                </div>
                <div>
                  <p className="text-sm font-medium">{tx.description}</p>
                  <p className="text-xs text-muted-foreground">{cat?.name} · {tx.date} · {demoAccounts.find(a => a.id === tx.bank_account_id)?.name}</p>
                </div>
              </div>
              <span className={`text-sm font-semibold tabular-nums ${tx.type === "income" ? "text-income" : "text-expense"}`}>
                {tx.type === "income" ? "+" : "-"}{fmt(tx.amount)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DemoPlanned() {
  const totalPlanned = demoPlanned.filter(p => p.type === "expense").reduce((s, t) => s + t.amount, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Geplande uitgaven</h1>
        <p className="text-sm text-muted-foreground">Totaal gepland: {fmt(totalPlanned)}</p>
      </div>

      <div className="glass-card p-5">
        <div className="flex items-center gap-2 mb-3">
          <CalendarClock className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Cash flow voorspelling</h3>
        </div>
        <div className="grid grid-cols-3 gap-4">
          {["Maart 2026", "April 2026", "Mei 2026"].map((month, i) => (
            <div key={month} className="rounded-lg bg-secondary/50 p-4 text-center">
              <p className="text-xs text-muted-foreground mb-1">{month}</p>
              <p className="text-lg font-bold text-expense">-{fmt(totalPlanned)}</p>
              <p className="text-xs text-muted-foreground">{demoPlanned.filter(p => p.type === "expense").length} transacties</p>
            </div>
          ))}
        </div>
      </div>

      <div className="glass-card divide-y divide-border/50">
        {demoPlanned.map((tx) => {
          const cat = demoCategories.find((c) => c.id === tx.category_id);
          const isPaid = tx.id === "p1" || tx.id === "p2" || tx.id === "p4";
          return (
            <div key={tx.id} className={`flex items-center justify-between px-4 py-3 hover:bg-accent/30 transition-colors ${isPaid ? "opacity-50" : ""}`}>
              <div className="flex items-center gap-3">
                <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${isPaid ? "bg-income/10" : "bg-expense/10"}`}>
                  {isPaid ? <Check className="h-4 w-4 text-income" /> : tx.type === "income" ? <ArrowUpRight className="h-4 w-4 text-income" /> : <ArrowDownRight className="h-4 w-4 text-expense" />}
                </div>
                <div>
                  <p className="text-sm font-medium">
                    {tx.description}
                    {isPaid && <span className="ml-2 inline-block rounded bg-income/15 px-1.5 py-0.5 text-[10px] font-semibold text-income">Betaald</span>}
                  </p>
                  <p className="text-xs text-muted-foreground">{cat?.name} · {tx.frequency === "maandelijks" ? "Per maand" : tx.frequency}</p>
                </div>
              </div>
              <span className={`text-sm font-semibold ${tx.type === "income" ? "text-income" : "text-expense"}`}>
                {tx.type === "income" ? "+" : "-"}{fmt(tx.amount)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DemoContacts() {
  const [search, setSearch] = useState("");
  const filtered = demoContacts.filter(c => c.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Contacten</h1>
        <p className="text-sm text-muted-foreground">Bedrijven en personen uit je transacties</p>
      </div>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Zoek op naam of IBAN..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10 bg-secondary border-border" />
      </div>
      <div className="glass-card divide-y divide-border/50">
        {filtered.map((c) => (
          <div key={c.id} className="flex items-center justify-between px-4 py-3 hover:bg-accent/30 transition-colors">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                {c.iban ? <Building2 className="h-4 w-4 text-primary" /> : <Users className="h-4 w-4 text-primary" />}
              </div>
              <div>
                <p className="text-sm font-medium">{c.name}</p>
                <p className="text-xs text-muted-foreground">{c.iban || "Geen IBAN"} · {c.count} transacties</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function DemoBudget() {
  const totalBudget = demoBudgets.reduce((s, b) => s + b.amount, 0);
  const totalSpent = demoBudgets.reduce((s, b) => s + b.spent, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Budget</h1>
        <p className="text-sm text-muted-foreground">Maart 2026</p>
      </div>

      <div className="glass-card p-5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Totaal budget</span>
          <span className="text-sm text-muted-foreground">{fmt(totalSpent)} / {fmt(totalBudget)}</span>
        </div>
        <Progress value={(totalSpent / totalBudget) * 100} className="h-3 bg-secondary" />
        <p className="mt-2 text-xs text-muted-foreground">Nog {fmt(totalBudget - totalSpent)} beschikbaar</p>
      </div>

      <div className="grid gap-3">
        {demoBudgets.map((b) => {
          const cat = demoCategories.find((c) => c.id === b.category_id)!;
          const pct = (b.spent / b.amount) * 100;
          const over = pct > 100;
          return (
            <div key={b.id} className="glass-card p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full" style={{ background: `hsl(${cat.color})` }} />
                  <span className="text-sm font-medium">{cat.name}</span>
                </div>
                <span className="text-xs text-muted-foreground">{fmt(b.spent)} / {fmt(b.amount)}</span>
              </div>
              <Progress value={Math.min(pct, 100)} className={`h-2 bg-secondary ${over ? "[&>div]:bg-destructive" : ""}`} />
              {over && <p className="mt-1 text-xs text-expense">{fmt(b.spent - b.amount)} over budget</p>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DemoReports() {
  const income = demoTransactions.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const expense = demoTransactions.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);

  const chartData = useMemo(() => {
    let bal = 0;
    return Array.from({ length: 8 }, (_, i) => {
      const day = String(i + 1);
      const dayTx = demoTransactions.filter(t => t.date.endsWith(`-0${i + 1}`) || t.date.endsWith(`-${i + 1}`));
      const inc = dayTx.filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0);
      const exp = dayTx.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0);
      bal += inc - exp;
      return { day, inkomsten: inc, uitgaven: exp, saldo: bal };
    });
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Rapporten</h1>
        <p className="text-sm text-muted-foreground">Betaalrekening overzicht — Maart 2026</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <SummaryCard label="Inkomsten" value={fmt(income)} icon={<TrendingUp className="h-4 w-4 text-income" />} bg="bg-income/10" />
        <SummaryCard label="Uitgaven" value={fmt(expense)} icon={<TrendingDown className="h-4 w-4 text-expense" />} bg="bg-expense/10" />
        <SummaryCard label="Balans" value={fmt(income - expense)} icon={<Wallet className="h-4 w-4 text-primary" />} bg="bg-primary/10" />
      </div>

      <div className="glass-card p-5">
        <h3 className="mb-4 text-sm font-semibold text-muted-foreground uppercase tracking-wider">Dagelijks overzicht</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} barGap={1} barCategoryGap="20%">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(228 15% 18%)" vertical={false} />
              <XAxis dataKey="day" stroke="hsl(220 10% 50%)" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="hsl(220 10% 50%)" fontSize={11} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ background: "hsl(228 20% 11%)", border: "1px solid hsl(228 15% 22%)", borderRadius: "10px", color: "hsl(220 20% 95%)" }} />
              <Bar dataKey="inkomsten" fill="hsl(152 70% 45%)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="uitgaven" fill="hsl(4 80% 60%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="glass-card p-5">
        <h3 className="mb-4 text-sm font-semibold text-muted-foreground uppercase tracking-wider">Saldo verloop</h3>
        <div className="h-40">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(228 15% 18%)" vertical={false} />
              <XAxis dataKey="day" stroke="hsl(220 10% 50%)" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="hsl(220 10% 50%)" fontSize={11} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ background: "hsl(228 20% 11%)", border: "1px solid hsl(228 15% 18%)", borderRadius: "8px", color: "hsl(220 20% 95%)" }} />
              <Line type="monotone" dataKey="saldo" stroke="hsl(210 100% 55%)" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

function DemoImport() {
  const banks = [
    { name: "ING", format: "CSV" },
    { name: "ABN AMRO", format: "TXT" },
    { name: "Rabobank", format: "CSV" },
    { name: "ASN Bank", format: "CSV" },
    { name: "Triodos Bank", format: "CSV" },
    { name: "Knab", format: "CSV" },
    { name: "bunq", format: "CSV" },
    { name: "Revolut", format: "CSV" },
    { name: "N26", format: "CSV" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Importeren</h1>
        <p className="text-sm text-muted-foreground">Importeer je banktransacties — ondersteunt alle grote Nederlandse banken</p>
      </div>
      <div className="grid gap-3">
        {banks.map((bank) => (
          <div key={bank.name} className="glass-card p-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary/50">
                <Building2 className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-sm">{bank.name}</h3>
                  <span className="rounded bg-secondary px-1.5 py-0.5 text-[10px] text-secondary-foreground font-medium">{bank.format}</span>
                </div>
              </div>
            </div>
            <Button variant="outline" size="sm" className="gap-2" disabled>
              <Upload className="h-4 w-4" /> Import
            </Button>
          </div>
        ))}
      </div>
      <div className="glass-card p-5">
        <h3 className="mb-4 text-sm font-semibold text-muted-foreground uppercase tracking-wider">Hoe werkt het?</h3>
        <div className="space-y-3">
          {["Exporteer je transacties als CSV uit je bank-app", "Upload het bestand via de importknop", "Transacties worden automatisch gecategoriseerd", "Duplicaten worden automatisch overgeslagen"].map((step, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="flex h-7 w-7 items-center justify-center rounded-full gradient-primary text-xs font-bold text-primary-foreground">{i + 1}</div>
              <span className="text-sm">{step}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function DemoChangelog() {
  const releases = [
    { version: "1.08", date: "8 maart 2026", title: "Saldo, Kleuren & Geplande fixes", changes: [
      { type: "fix" as const, text: "Pie chart kleuren zijn nu uniek per categorie" },
      { type: "fix" as const, text: "Balans kaart toont nu het totale saldo" },
      { type: "improvement" as const, text: "Maandelijkse herhalingen met vaste dag" },
    ]},
    { version: "1.07", date: "8 maart 2026", title: "Categorievolgorde & Overboekingen", changes: [
      { type: "feature" as const, text: "Categorieën herordenen via drag & drop" },
      { type: "feature" as const, text: "Overboekingen met twee gekoppelde transacties" },
      { type: "improvement" as const, text: "Transactie bewerken: groter dialoog" },
    ]},
  ];

  const typeBadge = (type: "feature" | "fix" | "improvement") => {
    switch (type) {
      case "feature": return <Badge className="bg-primary/15 text-primary border-primary/30 text-[10px]">Nieuw</Badge>;
      case "fix": return <Badge className="bg-destructive/15 text-destructive border-destructive/30 text-[10px]">Fix</Badge>;
      case "improvement": return <Badge className="bg-accent/50 text-accent-foreground border-accent text-[10px]">Verbeterd</Badge>;
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Versies</h1>
        <p className="text-sm text-muted-foreground">Changelog en release-overzicht</p>
      </div>
      <div className="space-y-8">
        {releases.map((r) => (
          <div key={r.version} className="glass-card p-6">
            <div className="flex items-center gap-3 mb-1">
              <h2 className="text-lg font-bold">v{r.version}</h2>
              <Badge variant="outline" className="text-xs">{r.title}</Badge>
            </div>
            <p className="text-xs text-muted-foreground mb-4">{r.date}</p>
            <Separator className="mb-4" />
            <ul className="space-y-2.5">
              {r.changes.map((c, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm">
                  {typeBadge(c.type)}
                  <span className="text-muted-foreground">{c.text}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

function DemoSettings() {
  const expenseCats = demoCategories.filter(c => c.type === "expense");
  const incomeCats = demoCategories.filter(c => c.type === "income");

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Instellingen</h1>
        <p className="text-sm text-muted-foreground">Beheer je bankrekeningen, categorieën en voorkeuren</p>
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Bankrekeningen</h2>
        <div className="grid gap-3">
          {demoAccounts.map((acc) => (
            <div key={acc.id} className="glass-card p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg" style={{ background: `hsl(${acc.color} / 0.2)` }}>
                  <Building2 className="h-5 w-5" style={{ color: `hsl(${acc.color})` }} />
                </div>
                <div>
                  <p className="text-sm font-medium">{acc.name}</p>
                  <p className="text-xs text-muted-foreground">{acc.bank} · {ACCOUNT_TYPE_LABELS[acc.account_type]}</p>
                </div>
              </div>
              <p className="text-sm font-semibold">{fmt(acc.balance)}</p>
            </div>
          ))}
        </div>
      </div>

      <Separator />

      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Categorieën</h2>
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Uitgaven</h3>
          <div className="glass-card divide-y divide-border/50">
            {expenseCats.map((cat) => (
              <div key={cat.id} className="flex items-center gap-3 px-4 py-3">
                <div className="h-3 w-3 rounded-full" style={{ background: `hsl(${cat.color})` }} />
                <span className="text-sm font-medium">{cat.name}</span>
              </div>
            ))}
          </div>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Inkomsten</h3>
          <div className="glass-card divide-y divide-border/50">
            {incomeCats.map((cat) => (
              <div key={cat.id} className="flex items-center gap-3 px-4 py-3">
                <div className="h-3 w-3 rounded-full" style={{ background: `hsl(${cat.color})` }} />
                <span className="text-sm font-medium">{cat.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Helpers ────────────────────────────────────────────────────────

function SummaryCard({ label, value, change, icon, bg }: { label: string; value: string; change?: string; icon: React.ReactNode; bg: string }) {
  return (
    <div className="glass-card p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</span>
        <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${bg}`}>{icon}</div>
      </div>
      <p className="text-2xl font-bold">{value}</p>
      {change && <p className="text-xs text-muted-foreground mt-1">{change} t.o.v. vorige maand</p>}
    </div>
  );
}

// ─── Main Demo Page ─────────────────────────────────────────────────

export default function DemoPage() {
  const [activePage, setActivePage] = useState<DemoPage>("dashboard");

  const renderPage = () => {
    switch (activePage) {
      case "dashboard": return <DemoDashboard />;
      case "transactions": return <DemoTransactions />;
      case "planned": return <DemoPlanned />;
      case "contacts": return <DemoContacts />;
      case "budget": return <DemoBudget />;
      case "reports": return <DemoReports />;
      case "import": return <DemoImport />;
      case "changelog": return <DemoChangelog />;
      case "settings": return <DemoSettings />;
    }
  };

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 flex w-64 flex-col border-r border-border/50 bg-sidebar">
        <div className="flex h-16 items-center gap-3 px-6">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg gradient-primary">
            <PiggyBank className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-lg font-bold text-foreground tracking-tight">MyBanksFlow</span>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4">
          {demoNavItems.map(({ id, icon: Icon, label, indent }) => (
            <button
              key={id}
              onClick={() => setActivePage(id)}
              className={cn(
                "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all text-left",
                activePage === id
                  ? "bg-sidebar-accent text-sidebar-primary"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                indent && "ml-4 text-xs"
              )}
            >
              <Icon className="h-4.5 w-4.5" />
              {label}
            </button>
          ))}
        </nav>

        <div className="border-t border-sidebar-border p-4 space-y-2">
          <div className="flex items-center justify-between px-2">
            <span className="text-xs text-muted-foreground truncate max-w-[140px]">demo@mybanksflow.com</span>
            <div className="rounded-md p-1.5 text-muted-foreground"><LogOut className="h-4 w-4" /></div>
          </div>
          <p className="text-[10px] text-muted-foreground/50 text-center">Demo</p>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 pl-64">
        <div className="bg-primary/10 border-b border-primary/20">
          <div className="flex items-center justify-between px-6 py-2.5">
            <span className="text-xs font-medium text-primary">Demo modus — fictieve data</span>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" className="h-7 text-xs" asChild>
                <Link to="/landing">Terug</Link>
              </Button>
              <Button size="sm" className="h-7 text-xs" asChild>
                <Link to="/auth">Account aanmaken</Link>
              </Button>
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-6xl px-6 py-8 animate-fade-in">
          {renderPage()}

          <div className="text-center py-8 mt-8 border-t border-border/30">
            <p className="text-muted-foreground mb-4">Wil je dit met jouw eigen data? Maak gratis een account aan.</p>
            <Button size="lg" asChild>
              <Link to="/auth">
                Gratis starten
                <ChevronRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
