import { useMemo } from "react";
import { TrendingUp, TrendingDown, Target } from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

interface Props {
  currentMonth: string;
  totalBalance: number;
  getMonthTotals: (month: string) => { income: number; expense: number; balance: number };
  getMonthTransactions: (month: string) => { date: string; type: string; amount: number }[];
  plannedTransactions?: { date: string; type: string; amount: number }[];
  fmt: (n: number) => string;
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

export default function BalanceForecast({ currentMonth, totalBalance, getMonthTotals, getMonthTransactions, plannedTransactions = [], fmt }: Props) {
  const forecast = useMemo(() => {
    // Analyze past 6 months
    const pastMonths = Array.from({ length: 6 }, (_, i) => shiftMonth(currentMonth, -(i + 1)));
    const pastTotals = pastMonths.map((m) => getMonthTotals(m)).filter((t) => t.income > 0 || t.expense > 0);

    if (pastTotals.length === 0) return null;

    const avgIncome = pastTotals.reduce((s, t) => s + t.income, 0) / pastTotals.length;
    const avgExpense = pastTotals.reduce((s, t) => s + t.expense, 0) / pastTotals.length;

    // Current month progress
    const now = new Date();
    const totalDays = daysInMonth(currentMonth);
    const [curY, curM] = currentMonth.split("-").map(Number);
    const isCurrentMonth = now.getFullYear() === curY && now.getMonth() + 1 === curM;
    const daysPassed = isCurrentMonth ? now.getDate() : totalDays;
    const daysRemaining = totalDays - daysPassed;

    const currentTotals = getMonthTotals(currentMonth);
    const currentTx = getMonthTransactions(currentMonth);

    // Daily rate from current month so far
    const dailyIncomeRate = daysPassed > 0 ? currentTotals.income / daysPassed : avgIncome / totalDays;
    const dailyExpenseRate = daysPassed > 0 ? currentTotals.expense / daysPassed : avgExpense / totalDays;

    // Blend current month rate with historical average (70/30)
    const blendedDailyIncome = daysPassed > 5
      ? dailyIncomeRate * 0.7 + (avgIncome / 30) * 0.3
      : avgIncome / 30;
    const blendedDailyExpense = daysPassed > 5
      ? dailyExpenseRate * 0.7 + (avgExpense / 30) * 0.3
      : avgExpense / 30;


    // Build a map of planned transaction impacts per day (only future days)
    const plannedByDay = new Map<number, number>();
    let totalPlannedIncome = 0;
    let totalPlannedExpense = 0;
    plannedTransactions.forEach((pt) => {
      const ptDay = parseInt(pt.date.slice(8, 10), 10);
      if (ptDay > daysPassed) {
        const net = pt.type === "income" ? Number(pt.amount) : -Number(pt.amount);
        plannedByDay.set(ptDay, (plannedByDay.get(ptDay) || 0) + net);
        if (pt.type === "income") totalPlannedIncome += Number(pt.amount);
        else totalPlannedExpense += Number(pt.amount);
      }
    });

    // Adjust blended rates: subtract planned amounts from remaining predicted amounts
    const remainingPredictedIncome = Math.max(0, blendedDailyIncome * daysRemaining - totalPlannedIncome);
    const remainingPredictedExpense = Math.max(0, blendedDailyExpense * daysRemaining - totalPlannedExpense);
    const adjustedDailyIncome = daysRemaining > 0 ? remainingPredictedIncome / daysRemaining : 0;
    const adjustedDailyExpense = daysRemaining > 0 ? remainingPredictedExpense / daysRemaining : 0;

    const predictedIncome = currentTotals.income + totalPlannedIncome + adjustedDailyIncome * daysRemaining;
    const predictedExpense = currentTotals.expense + totalPlannedExpense + adjustedDailyExpense * daysRemaining;
    const predictedBalance = totalBalance + (predictedIncome - currentTotals.income) - (predictedExpense - currentTotals.expense);

    // Build chart: actual daily cumulative + predicted
    const chartData: { day: number; actual?: number; predicted?: number; planned?: number }[] = [];
    let cumBalance = totalBalance - currentTotals.income + currentTotals.expense; // balance at start of month

    // Accumulate actual days
    for (let d = 1; d <= totalDays; d++) {
      const dayStr = `${currentMonth}-${String(d).padStart(2, "0")}`;
      const dayTxs = currentTx.filter((t) => t.date === dayStr);
      const dayNet = dayTxs.reduce((s, t) => {
        const amt = Number(t.amount);
        return t.type === "income" ? s + amt : s - amt;
      }, 0);

      if (d <= daysPassed) {
        cumBalance += dayNet;
        chartData.push({ day: d, actual: Math.round(cumBalance * 100) / 100 });
      } else {
        // Future: add planned transactions for this day + adjusted daily rate
        const plannedNet = plannedByDay.get(d) || 0;
        const projectedNet = adjustedDailyIncome - adjustedDailyExpense + plannedNet;
        cumBalance += projectedNet;
        const hasPlanned = plannedNet !== 0;
        chartData.push({
          day: d,
          ...(d === daysPassed + 1 ? { actual: chartData[d - 2]?.actual } : {}),
          predicted: Math.round(cumBalance * 100) / 100,
          ...(hasPlanned ? { planned: Math.round(cumBalance * 100) / 100 } : {}),
        });
      }
    }

    // Add overlap point for smooth transition
    if (daysPassed < totalDays && daysPassed > 0) {
      chartData[daysPassed] = {
        ...chartData[daysPassed],
        predicted: chartData[daysPassed - 1]?.actual,
      };
    }

    return {
      avgIncome,
      avgExpense,
      predictedIncome,
      predictedExpense,
      predictedBalance,
      currentTotals,
      daysRemaining,
      daysPassed,
      totalDays,
      chartData,
    };
  }, [currentMonth, totalBalance, getMonthTotals, getMonthTransactions]);

  if (!forecast) {
    return (
      <div className="glass-card p-5">
        <h3 className="mb-2 text-sm font-semibold text-muted-foreground uppercase tracking-wider">Saldovoorspelling</h3>
        <p className="text-sm text-muted-foreground text-center py-4">Niet genoeg data voor een voorspelling. Importeer transacties van eerdere maanden.</p>
      </div>
    );
  }

  const diff = forecast.predictedBalance - totalBalance;

  return (
    <div className="glass-card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Saldovoorspelling</h3>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Target className="h-3.5 w-3.5" />
          <span>Einde maand</span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 mb-4">
        <div className="rounded-xl border border-border/50 p-3 bg-secondary/30">
          <p className="text-[11px] text-muted-foreground mb-1">Verwacht inkomen</p>
          <p className="text-lg font-bold text-income">{fmt(forecast.predictedIncome)}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            Nu: {fmt(forecast.currentTotals.income)} · Gem: {fmt(forecast.avgIncome)}
          </p>
        </div>
        <div className="rounded-xl border border-border/50 p-3 bg-secondary/30">
          <p className="text-[11px] text-muted-foreground mb-1">Verwachte uitgaven</p>
          <p className="text-lg font-bold text-expense">{fmt(forecast.predictedExpense)}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            Nu: {fmt(forecast.currentTotals.expense)} · Gem: {fmt(forecast.avgExpense)}
          </p>
        </div>
        <div className="rounded-xl border border-border/50 p-3 bg-secondary/30">
          <p className="text-[11px] text-muted-foreground mb-1">Voorspeld saldo</p>
          <p className={`text-lg font-bold ${forecast.predictedBalance >= 0 ? "text-income" : "text-expense"}`}>
            {fmt(forecast.predictedBalance)}
          </p>
          <p className={`text-[10px] mt-0.5 flex items-center gap-0.5 ${diff >= 0 ? "text-income" : "text-expense"}`}>
            {diff >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {diff >= 0 ? "+" : ""}{fmt(diff)} verwacht
          </p>
        </div>
      </div>

      <div className="h-40">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={forecast.chartData} margin={{ top: 5, right: 5, bottom: 0, left: 5 }}>
            <defs>
              <linearGradient id="actualGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(210 100% 55%)" stopOpacity={0.3} />
                <stop offset="100%" stopColor="hsl(210 100% 55%)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="predictGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(38 92% 55%)" stopOpacity={0.25} />
                <stop offset="100%" stopColor="hsl(38 92% 55%)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="day"
              stroke="hsl(220 10% 50%)"
              fontSize={10}
              tickLine={false}
              axisLine={false}
              tickFormatter={(d) => (d % 5 === 0 || d === 1 ? String(d) : "")}
            />
            <YAxis stroke="hsl(220 10% 50%)" fontSize={10} tickLine={false} axisLine={false} width={50} tickFormatter={(v) => `€${(v / 1000).toFixed(1)}k`} />
            <Tooltip
              contentStyle={{
                background: "hsl(228 20% 11%)",
                border: "1px solid hsl(228 15% 22%)",
                borderRadius: "8px",
                color: "hsl(220 20% 95%)",
                fontSize: "12px",
              }}
              formatter={(value: number, name: string) => [
                fmt(value),
                name === "actual" ? "Werkelijk" : name === "planned" ? "Gepland" : "Voorspeld",
              ]}
              labelFormatter={(day) => `Dag ${day}`}
            />
            {forecast.daysPassed < forecast.totalDays && (
              <ReferenceLine
                x={forecast.daysPassed}
                stroke="hsl(228 15% 35%)"
                strokeDasharray="4 4"
                label={{ value: "Vandaag", position: "top", fill: "hsl(220 10% 50%)", fontSize: 10 }}
              />
            )}
            <Area
              type="monotone"
              dataKey="actual"
              stroke="hsl(210 100% 55%)"
              strokeWidth={2}
              fill="url(#actualGrad)"
              connectNulls={false}
              dot={false}
            />
            <Area
              type="monotone"
              dataKey="predicted"
              stroke="hsl(38 92% 55%)"
              strokeWidth={2}
              strokeDasharray="6 3"
              fill="url(#predictGrad)"
              connectNulls={false}
              dot={false}
            />
            <Area
              type="monotone"
              dataKey="planned"
              stroke="hsl(142 70% 45%)"
              strokeWidth={0}
              fill="none"
              connectNulls={false}
              dot={{ r: 4, fill: "hsl(142 70% 45%)", stroke: "hsl(142 70% 45%)" }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="flex items-center justify-center gap-4 mt-2 text-[10px] text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <div className="h-0.5 w-4 rounded" style={{ background: "hsl(210 100% 55%)" }} />
          <span>Werkelijk</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-0.5 w-4 rounded" style={{ background: "hsl(38 92% 55%)", backgroundImage: "repeating-linear-gradient(90deg, hsl(38 92% 55%) 0 4px, transparent 4px 7px)" }} />
          <span>Voorspeld</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-2 w-2 rounded-full" style={{ background: "hsl(142 70% 45%)" }} />
          <span>Gepland</span>
        </div>
        <span>· Gebaseerd op 6 maanden + geplande transacties</span>
      </div>
    </div>
  );
}
