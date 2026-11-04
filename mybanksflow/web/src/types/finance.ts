export type TransactionType = "income" | "expense";

export type Currency = "EUR" | "USD" | "GBP" | "PLN" | "CHF";

export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  type: TransactionType;
}

export interface Transaction {
  id: string;
  description: string;
  amount: number;
  currency: Currency;
  type: TransactionType;
  categoryId: string;
  date: string;
  isRecurring?: boolean;
  isPlanned?: boolean;
  bank?: string;
}

export interface Budget {
  id: string;
  categoryId: string;
  amount: number;
  currency: Currency;
  month: string; // YYYY-MM
  spent: number;
}

export interface MonthlyOverview {
  month: string;
  totalIncome: number;
  totalExpense: number;
  balance: number;
}

export const CURRENCIES: { code: Currency; symbol: string; name: string }[] = [
  { code: "EUR", symbol: "€", name: "Euro" },
  { code: "USD", symbol: "$", name: "US Dollar" },
  { code: "GBP", symbol: "£", name: "Brits Pond" },
  { code: "PLN", symbol: "zł", name: "Poolse Zloty" },
  { code: "CHF", symbol: "CHF", name: "Zwitserse Frank" },
];

export const getCurrencySymbol = (code: Currency): string => {
  return CURRENCIES.find((c) => c.code === code)?.symbol ?? code;
};
