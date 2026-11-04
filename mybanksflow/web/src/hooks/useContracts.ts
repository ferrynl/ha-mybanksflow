import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCallback } from "react";

export interface Contract {
  id: string;
  user_id: string;
  name: string;
  start_date: string;
  end_date: string | null;
  cancellation_period: string;
  status: string;
  payment_frequency: string;
  amount: number;
  customer_number: string | null;
  policy_number: string | null;
  contact_id: string | null;
  category_id: string | null;
  planned_transaction_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

const QUERY_KEY = "contracts";

export function useContracts() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: contracts = [], isLoading } = useQuery<Contract[]>({
    queryKey: [QUERY_KEY, user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await (supabase.from as any)("contracts")
        .select("*")
        .eq("user_id", user.id)
        .order("end_date", { ascending: true });
      return (data ?? []) as Contract[];
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });

  const addContract = useCallback(async (c: Omit<Contract, "id" | "user_id" | "created_at" | "updated_at">) => {
    if (!user) return;
    await (supabase.from as any)("contracts").insert({ ...c, user_id: user.id });
    invalidate();
  }, [user, queryClient]);

  const updateContract = useCallback(async (id: string, updates: Partial<Contract>) => {
    await (supabase.from as any)("contracts").update(updates).eq("id", id);
    invalidate();
  }, [queryClient]);

  const deleteContract = useCallback(async (id: string) => {
    await (supabase.from as any)("contracts").delete().eq("id", id);
    invalidate();
  }, [queryClient]);

  // Contracts expiring within N months
  const getExpiringContracts = useCallback((months: number = 2) => {
    const now = new Date();
    const future = new Date(now);
    future.setMonth(future.getMonth() + months);
    return contracts.filter((c) => {
      if (!c.end_date || c.status === "vervallen") return false;
      const end = new Date(c.end_date);
      return end >= now && end <= future;
    });
  }, [contracts]);

  // Monthly cost of all active contracts
  const getMonthlyTotal = useCallback(() => {
    return contracts
      .filter((c) => c.status === "actief" || c.status === "binnenkort")
      .reduce((sum, c) => {
        const amt = Number(c.amount);
        return sum + (c.payment_frequency === "jaar" ? amt / 12 : amt);
      }, 0);
  }, [contracts]);

  const getYearlyTotal = useCallback(() => {
    return contracts
      .filter((c) => c.status === "actief" || c.status === "binnenkort")
      .reduce((sum, c) => {
        const amt = Number(c.amount);
        return sum + (c.payment_frequency === "jaar" ? amt : amt * 12);
      }, 0);
  }, [contracts]);

  return {
    contracts, isLoading,
    addContract, updateContract, deleteContract,
    getExpiringContracts, getMonthlyTotal, getYearlyTotal,
  };
}
