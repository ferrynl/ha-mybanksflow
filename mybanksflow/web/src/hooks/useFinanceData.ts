import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { DEFAULT_CATEGORIES } from "@/data/categories";
import { matchCategoryByKeywords } from "@/data/categorizationKeywords";
import { useCallback } from "react";
import type { Tables } from "@/integrations/supabase/types";

type DbTransaction = Tables<"transactions">;
type DbCategory = Tables<"categories">;
type DbBudget = Tables<"budgets">;
type DbBankAccount = Tables<"bank_accounts">;
type DbContact = Tables<"contacts">;

export const FINANCE_QUERY_KEYS = {
  transactions: "transactions",
  categories: "categories",
  budgets: "budgets",
  bankAccounts: "bank_accounts",
  contacts: "contacts",
} as const;

// Use decrypted views for encrypted tables
const READ_VIEW_MAP: Record<string, string> = {
  transactions: "transactions_decrypted",
  contacts: "contacts_decrypted",
};

function useFinanceQuery<T>(key: string, table: "transactions" | "categories" | "budgets" | "bank_accounts" | "contacts", orderBy?: { column: string; ascending: boolean }) {
  const { user } = useAuth();
  return useQuery<T[]>({
    queryKey: [key, user?.id],
    queryFn: async () => {
      if (!user) return [];
      const readTable = READ_VIEW_MAP[table] || table;
      let query: any = (supabase.from as any)(readTable).select("*").eq("user_id", user.id);
      if (orderBy) query = query.order(orderBy.column, { ascending: orderBy.ascending });
      // Override default 1000 row limit
      query = query.limit(50000);
      const { data } = await query;
      return (data ?? []) as T[];
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

export function useFinanceStore() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: transactions = [], isLoading: txLoading } = useFinanceQuery<DbTransaction>(
    FINANCE_QUERY_KEYS.transactions, "transactions", { column: "date", ascending: false }
  );
  const { data: categories = [], isLoading: catLoading } = useFinanceQuery<DbCategory>(
    FINANCE_QUERY_KEYS.categories, "categories", { column: "sort_order", ascending: true }
  );
  const { data: budgets = [], isLoading: budLoading } = useFinanceQuery<DbBudget>(
    FINANCE_QUERY_KEYS.budgets, "budgets"
  );
  const { data: bankAccounts = [] } = useFinanceQuery<DbBankAccount>(
    FINANCE_QUERY_KEYS.bankAccounts, "bank_accounts"
  );
  const { data: contacts = [] } = useFinanceQuery<DbContact>(
    FINANCE_QUERY_KEYS.contacts, "contacts"
  );

  const loading = txLoading || catLoading || budLoading;

  // Seed default categories
  useQuery({
    queryKey: ["seed-categories", user?.id, categories.length, catLoading],
    queryFn: async () => {
      if (!user || categories.length > 0) return null;
      const rows = DEFAULT_CATEGORIES.map((c) => ({
        user_id: user.id, name: c.name, icon: c.icon, color: c.color, type: c.type,
      }));
      await supabase.from("categories").insert(rows);
      queryClient.invalidateQueries({ queryKey: [FINANCE_QUERY_KEYS.categories] });
      return null;
    },
    enabled: !!user && !catLoading && categories.length === 0,
    staleTime: Infinity,
  });

  const invalidate = (key: string) =>
    queryClient.invalidateQueries({ queryKey: [key] });

  const addTransaction = useCallback(
    async (tx: { description: string; amount: number; currency: string; type: string; category_id: string | null; date: string; bank_account_id?: string | null; contact_id?: string | null; transaction_code?: string | null; transaction_type?: string | null; payment_reference?: string | null; original_description?: string | null; is_planned?: boolean; frequency?: string | null; end_date?: string | null }) => {
      if (!user) return;
      await supabase.from("transactions").insert({ ...tx, user_id: user.id } as any);
      if (tx.category_id && tx.description) {
        await supabase.from("categorization_rules").upsert(
          { user_id: user.id, pattern: tx.description.toLowerCase(), category_id: tx.category_id },
          { onConflict: "user_id,pattern" }
        );
      }
      invalidate(FINANCE_QUERY_KEYS.transactions);
    },
    [user, queryClient]
  );

  const deleteTransaction = useCallback(async (id: string) => {
    await supabase.from("transactions").delete().eq("id", id);
    invalidate(FINANCE_QUERY_KEYS.transactions);
  }, [queryClient]);

  const deleteAllTransactions = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("transactions").delete().eq("user_id", user.id);
    invalidate(FINANCE_QUERY_KEYS.transactions);
  }, [queryClient]);

  const updateTransaction = useCallback(
    async (id: string, updates: { description?: string; amount?: number; currency?: string; type?: string; category_id?: string | null; date?: string; transaction_code?: string | null; transaction_type?: string | null; payment_reference?: string | null; original_description?: string | null; is_planned?: boolean; frequency?: string | null; end_date?: string | null; bank_account_id?: string | null }) => {
      await supabase.from("transactions").update(updates as any).eq("id", id);
      invalidate(FINANCE_QUERY_KEYS.transactions);
    },
    [queryClient]
  );

  const addBudget = useCallback(
    async (budget: { amount: number; month: string; category_id?: string | null; contact_id?: string | null }) => {
      if (!user) return;
      await supabase.from("budgets").insert({ ...budget, user_id: user.id } as any);
      invalidate(FINANCE_QUERY_KEYS.budgets);
    },
    [user, queryClient]
  );

  const deleteBudget = useCallback(async (id: string) => {
    await supabase.from("budgets").delete().eq("id", id);
    invalidate(FINANCE_QUERY_KEYS.budgets);
  }, [queryClient]);

  const suggestCategory = useCallback(
    async (description: string, originalDescription?: string | null): Promise<string | null> => {
      if (!user) return null;
      const { data } = await supabase
        .from("categorization_rules")
        .select("category_id")
        .eq("user_id", user.id)
        .eq("pattern", description.toLowerCase())
        .maybeSingle();
      if (data?.category_id) return data.category_id;
      const matchedName = matchCategoryByKeywords(description, originalDescription);
      if (matchedName) {
        const cat = categories.find((c) => c.name.toLowerCase() === matchedName.toLowerCase());
        if (cat) return cat.id;
      }
      return null;
    },
    [user, categories]
  );

  // Exclude transfer and planned transactions from regular overviews
  const nonTransferTx = transactions.filter((t) => t.type !== "transfer" && !t.is_planned);

  const getMonthTransactions = useCallback(
    (month: string) => nonTransferTx.filter((t) => t.date.startsWith(month)),
    [nonTransferTx]
  );

  const getMonthTotals = useCallback(
    (month: string) => {
      const txs = nonTransferTx.filter((t) => t.date.startsWith(month));
      const income = txs.filter((t) => t.type === "income").reduce((s, t) => s + Number(t.amount), 0);
      const expense = txs.filter((t) => t.type === "expense").reduce((s, t) => s + Number(t.amount), 0);
      return { income, expense, balance: income - expense };
    },
    [nonTransferTx]
  );

  const getCategorySpending = useCallback(
    (month: string) => {
      const txs = nonTransferTx.filter((t) => t.date.startsWith(month) && t.type === "expense");
      const map = new Map<string, number>();
      txs.forEach((t) => {
        if (t.category_id) map.set(t.category_id, (map.get(t.category_id) || 0) + Number(t.amount));
      });
      return Array.from(map.entries())
        .map(([categoryId, amount]) => ({
          categoryId,
          category: categories.find((c) => c.id === categoryId),
          amount,
        }))
        .sort((a, b) => b.amount - a.amount);
    },
    [nonTransferTx, categories]
  );

  const getPlannedForMonth = useCallback(
    (month: string) => {
      const allPlanned = transactions.filter((t) => t.is_planned);
      const result: DbTransaction[] = [];

      // Build set of paid planned+month combos
      const paidKeys = new Set<string>();
      transactions.forEach((t) => {
        if (!t.is_planned && t.planned_transaction_id) {
          paidKeys.add(`${t.planned_transaction_id}:${t.date.slice(0, 7)}`);
        }
      });

      allPlanned.forEach((tx) => {
        const freq = tx.frequency || "eenmalig";
        const endDate = (tx as any).end_date ? new Date((tx as any).end_date) : null;
        if (freq === "eenmalig") {
          if (tx.date.startsWith(month) && !paidKeys.has(`${tx.id}:${month}`)) {
            result.push(tx);
          }
        } else {
          const [y, m, day] = tx.date.split("-").map(Number);
          const step = freq === "per_kwartaal" ? 3 : freq === "wekelijks" ? 0 : 1;
          const [targetY, targetM] = month.split("-").map(Number);
          const monthEnd = new Date(targetY, targetM, 0);

          if (freq === "wekelijks") {
            let current = new Date(y, m - 1, day);
            while (current <= monthEnd) {
              if (endDate && current > endDate) break;
              if (current.toISOString().slice(0, 7) === month) {
                const dateStr = current.toISOString().slice(0, 10);
                if (!paidKeys.has(`${tx.id}:${month}`)) {
                  result.push({ ...tx, date: dateStr });
                }
              }
              current = new Date(current.getTime() + 7 * 24 * 60 * 60 * 1000);
            }
          } else {
            let curMonth = m - 1;
            let curYear = y;
            while (curYear < targetY || (curYear === targetY && curMonth <= targetM - 1)) {
              if (curYear === targetY && curMonth === targetM - 1) {
                const daysInM = new Date(curYear, curMonth + 1, 0).getDate();
                const actualDay = Math.min(day, daysInM);
                const dateStr = `${curYear}-${String(curMonth + 1).padStart(2, "0")}-${String(actualDay).padStart(2, "0")}`;
                if (endDate && new Date(dateStr) > endDate) break;
                if (!paidKeys.has(`${tx.id}:${month}`)) {
                  result.push({ ...tx, date: dateStr });
                }
                break;
              }
              curMonth += step;
              if (curMonth > 11) {
                curYear += Math.floor(curMonth / 12);
                curMonth = curMonth % 12;
              }
            }
          }
        }
      });

      return result;
    },
    [transactions]
  );

  // Get account balance (starting_balance + sum of all transactions)
  const getAccountBalance = useCallback(
    (accountId: string) => {
      const account = bankAccounts.find((a) => a.id === accountId);
      const startBalance = Number((account as any)?.starting_balance ?? 0);
      const acTxs = transactions.filter((t) => t.bank_account_id === accountId && !t.is_planned);
      return acTxs.reduce((sum, t) => {
        const amt = Number(t.amount);
        if (t.type === "income") return sum + amt;
        if (t.type === "expense" || t.type === "transfer") return sum - amt;
        return sum;
      }, startBalance);
    },
    [transactions, bankAccounts]
  );

  const refetch = useCallback(async () => {
    await Promise.all(
      Object.values(FINANCE_QUERY_KEYS).map((key) =>
        queryClient.invalidateQueries({ queryKey: [key] })
      )
    );
  }, [queryClient]);

  return {
    transactions, categories, budgets, bankAccounts, contacts, loading,
    addTransaction, deleteTransaction, deleteAllTransactions, updateTransaction,
    addBudget, deleteBudget, suggestCategory,
    getMonthTransactions, getMonthTotals, getCategorySpending,
    getPlannedForMonth, getAccountBalance, refetch,
  };
}
