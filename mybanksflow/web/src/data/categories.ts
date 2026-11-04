import { Category } from "@/types/finance";

export const DEFAULT_CATEGORIES: Category[] = [
  // Uitgaven
  { id: "wonen", name: "Wonen", icon: "Home", color: "210 100% 55%", type: "expense" },
  { id: "boodschappen", name: "Boodschappen", icon: "ShoppingCart", color: "152 70% 45%", type: "expense" },
  { id: "vervoer", name: "Vervoer", icon: "Car", color: "38 92% 55%", type: "expense" },
  { id: "eten-drinken", name: "Eten & Drinken", icon: "UtensilsCrossed", color: "4 80% 60%", type: "expense" },
  { id: "entertainment", name: "Entertainment", icon: "Gamepad2", color: "280 65% 60%", type: "expense" },
  { id: "gezondheid", name: "Gezondheid", icon: "Heart", color: "340 75% 55%", type: "expense" },
  { id: "kleding", name: "Kleding", icon: "Shirt", color: "200 70% 50%", type: "expense" },
  { id: "abonnementen", name: "Abonnementen", icon: "RefreshCw", color: "170 60% 45%", type: "expense" },
  { id: "verzekeringen", name: "Verzekeringen", icon: "Shield", color: "220 60% 50%", type: "expense" },
  { id: "overig-uitgave", name: "Overig", icon: "MoreHorizontal", color: "228 15% 40%", type: "expense" },
  // Inkomsten
  { id: "salaris", name: "Salaris", icon: "Banknote", color: "152 70% 45%", type: "income" },
  { id: "freelance", name: "Freelance", icon: "Briefcase", color: "210 100% 55%", type: "income" },
  { id: "investering", name: "Investering", icon: "TrendingUp", color: "38 92% 55%", type: "income" },
  { id: "overig-inkomen", name: "Overig", icon: "Plus", color: "280 65% 60%", type: "income" },
];
