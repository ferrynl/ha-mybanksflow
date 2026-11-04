import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useFinanceStore } from "@/hooks/useFinanceData";
import { Plus, Trash2, Building2, Pencil, X, Check, Tag, FolderPlus, GripVertical, Download, Upload, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";
import { FINANCE_QUERY_KEYS } from "@/hooks/useFinanceData";
import { useQueryClient } from "@tanstack/react-query";

const BANK_OPTIONS = [
  { id: "ing", name: "ING", color: "25 95% 50%" },
  { id: "abnamro", name: "ABN AMRO", color: "163 80% 35%" },
  { id: "rabobank", name: "Rabobank", color: "25 90% 50%" },
  { id: "asn", name: "ASN Bank", color: "152 60% 40%" },
  { id: "sns", name: "SNS", color: "25 80% 50%" },
  { id: "regiobank", name: "RegioBank", color: "210 70% 45%" },
  { id: "triodos", name: "Triodos Bank", color: "140 60% 35%" },
  { id: "knab", name: "Knab", color: "270 60% 50%" },
  { id: "bunq", name: "bunq", color: "152 70% 45%" },
  { id: "revolut", name: "Revolut", color: "228 15% 25%" },
  { id: "n26", name: "N26", color: "170 50% 40%" },
  { id: "other", name: "Overig", color: "228 15% 40%" },
];

const ACCOUNT_TYPES = [
  { id: "betaalrekening", name: "Betaalrekening" },
  { id: "spaarrekening", name: "Spaarrekening" },
  { id: "beleggingsrekening", name: "Beleggingsrekening" },
  { id: "creditcard", name: "Creditcard" },
  { id: "deposito", name: "Depositorekening" },
];

interface BankAccount {
  id: string;
  name: string;
  bank: string;
  iban: string | null;
  color: string;
  created_at: string;
  account_type: string;
  starting_balance: number;
}

export default function SettingsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { categories } = useFinanceStore();
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [name, setName] = useState("");
  const [bank, setBank] = useState("ing");
  const [iban, setIban] = useState("");
  const [accountType, setAccountType] = useState("betaalrekening");
  const [startingBalance, setStartingBalance] = useState("");
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: "", bank: "", iban: "", account_type: "", starting_balance: "" });

  // Category management
  const [catDialogOpen, setCatDialogOpen] = useState(false);
  const [catName, setCatName] = useState("");
  const [catType, setCatType] = useState<"expense" | "income">("expense");
  const [catIcon, setCatIcon] = useState("Tag");
  const [catColor, setCatColor] = useState("210 100% 55%");
  const [catParentId, setCatParentId] = useState("");
  const [catSaving, setCatSaving] = useState(false);
  // Backup & Restore
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);
  const [pendingRestore, setPendingRestore] = useState<any>(null);

  // Drag state
  const dragItem = useRef<string | null>(null);
  const dragOverItem = useRef<string | null>(null);

  const fetchAccounts = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("bank_accounts")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true });
    setAccounts((data as any as BankAccount[]) ?? []);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  const handleAdd = async () => {
    if (!user || !name.trim()) return;
    setSaving(true);
    const bankOption = BANK_OPTIONS.find((b) => b.id === bank);
    const { error } = await supabase.from("bank_accounts").insert({
      user_id: user.id,
      name: name.trim(),
      bank,
      iban: iban.trim(),
      color: bankOption?.color ?? "228 15% 40%",
      account_type: accountType,
      starting_balance: parseFloat(startingBalance) || 0,
    } as any);
    if (error) {
      toast({ title: "Fout", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Bankrekening toegevoegd" });
      setName(""); setIban(""); setBank("ing"); setAccountType("betaalrekening"); setStartingBalance("");
      setDialogOpen(false);
      fetchAccounts();
      queryClient.invalidateQueries({ queryKey: [FINANCE_QUERY_KEYS.bankAccounts] });
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    await supabase.from("bank_accounts").delete().eq("id", id);
    setAccounts((prev) => prev.filter((a) => a.id !== id));
    toast({ title: "Bankrekening verwijderd" });
  };

  const startEdit = (account: BankAccount) => {
    setEditingId(account.id);
    setEditForm({
      name: account.name,
      bank: account.bank,
      iban: account.iban ?? "",
      account_type: account.account_type,
      starting_balance: String(account.starting_balance ?? 0),
    });
  };

  const saveEdit = async () => {
    if (!editingId) return;
    const bankOption = BANK_OPTIONS.find((b) => b.id === editForm.bank);
    const { error } = await supabase
      .from("bank_accounts")
      .update({
        name: editForm.name.trim(),
        bank: editForm.bank,
        iban: editForm.iban.trim(),
        account_type: editForm.account_type,
        color: bankOption?.color ?? "228 15% 40%",
        starting_balance: parseFloat(editForm.starting_balance) || 0,
      } as any)
      .eq("id", editingId);
    if (error) {
      toast({ title: "Fout", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Bankrekening bijgewerkt" });
      setEditingId(null);
      fetchAccounts();
      queryClient.invalidateQueries({ queryKey: [FINANCE_QUERY_KEYS.bankAccounts] });
    }
  };

  const handleAddCategory = async () => {
    if (!user || !catName.trim()) return;
    setCatSaving(true);
    // Get max sort_order for this type
    const sametype = categories.filter((c) => c.type === catType);
    const maxOrder = sametype.length > 0 ? Math.max(...sametype.map((c) => (c as any).sort_order ?? 0)) : -1;
    const { error } = await supabase.from("categories").insert({
      user_id: user.id,
      name: catName.trim(),
      type: catType,
      icon: catIcon,
      color: catColor,
      parent_category_id: catParentId || null,
      sort_order: maxOrder + 1,
    } as any);
    if (error) {
      toast({ title: "Fout", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Categorie toegevoegd" });
      setCatName(""); setCatParentId("");
      setCatDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: [FINANCE_QUERY_KEYS.categories] });
    }
    setCatSaving(false);
  };

  const handleDeleteCategory = async (id: string) => {
    await supabase.from("categories").delete().eq("id", id);
    queryClient.invalidateQueries({ queryKey: [FINANCE_QUERY_KEYS.categories] });
    toast({ title: "Categorie verwijderd" });
  };

  // Drag and drop for categories
  const handleDragStart = (catId: string) => {
    dragItem.current = catId;
  };

  const handleDragOver = (e: React.DragEvent, catId: string) => {
    e.preventDefault();
    dragOverItem.current = catId;
  };

  const handleDrop = async (typeFilter: string) => {
    if (!dragItem.current || !dragOverItem.current || dragItem.current === dragOverItem.current) return;

    const parentCats = categories
      .filter((c) => c.type === typeFilter && !(c as any).parent_category_id)
      .sort((a, b) => ((a as any).sort_order ?? 0) - ((b as any).sort_order ?? 0));

    const fromIdx = parentCats.findIndex((c) => c.id === dragItem.current);
    const toIdx = parentCats.findIndex((c) => c.id === dragOverItem.current);

    if (fromIdx === -1 || toIdx === -1) return;

    const reordered = [...parentCats];
    const [moved] = reordered.splice(fromIdx, 1);
    reordered.splice(toIdx, 0, moved);

    // Update sort_order in DB
    const updates = reordered.map((cat, i) =>
      supabase.from("categories").update({ sort_order: i } as any).eq("id", cat.id)
    );
    await Promise.all(updates);
    queryClient.invalidateQueries({ queryKey: [FINANCE_QUERY_KEYS.categories] });

    dragItem.current = null;
    dragOverItem.current = null;
  };

  // Group accounts by type
  const groupedAccounts = ACCOUNT_TYPES.map((type) => ({
    ...type,
    accounts: accounts.filter((a) => a.account_type === type.id),
  })).filter((g) => g.accounts.length > 0);

  // Group categories: parent categories (no parent_category_id) with their children, sorted by sort_order
  const parentCategories = categories
    .filter((c) => !(c as any).parent_category_id)
    .sort((a, b) => ((a as any).sort_order ?? 0) - ((b as any).sort_order ?? 0));
  const childCategories = categories.filter((c) => (c as any).parent_category_id);

  const CAT_COLORS = [
    { label: "Blauw", value: "210 100% 55%" },
    { label: "Groen", value: "152 70% 45%" },
    { label: "Oranje", value: "38 92% 55%" },
    { label: "Rood", value: "4 80% 60%" },
    { label: "Paars", value: "280 65% 60%" },
    { label: "Roze", value: "340 75% 55%" },
    { label: "Teal", value: "170 60% 45%" },
    { label: "Grijs", value: "228 15% 40%" },
  ];

  const BACKUP_TABLES = ["transactions", "categories", "budgets", "bank_accounts", "contacts", "categorization_rules"] as const;

  // Use decrypted views for backup so exported data is readable
  const BACKUP_READ_MAP: Record<string, string> = {
    transactions: "transactions_decrypted",
    contacts: "contacts_decrypted",
  };

  const handleBackup = async () => {
    if (!user) return;
    const backup: Record<string, any[]> = {};
    for (const table of BACKUP_TABLES) {
      const readTable = BACKUP_READ_MAP[table] || table;
      const { data } = await supabase.from(readTable as any).select("*").eq("user_id", user.id);
      backup[table] = data ?? [];
    }
    const blob = new Blob([JSON.stringify({ version: 1, created_at: new Date().toISOString(), data: backup }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `mijnoverzicht-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Backup gedownload", description: "Je backup is succesvol opgeslagen." });
  };

  const handleRestore = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target?.result as string);
        if (!parsed.data) throw new Error("Ongeldig bestand");
        setPendingRestore(parsed.data);
        setRestoreDialogOpen(true);
      } catch {
        toast({ title: "Ongeldig bestand", description: "Het bestand kon niet worden gelezen.", variant: "destructive" });
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const confirmRestore = async () => {
    if (!user || !pendingRestore) return;
    try {
      // Delete in reverse order to respect foreign key constraints
      const deleteOrder = ["budgets", "categorization_rules", "transactions", "contacts", "categories", "bank_accounts"] as const;
      for (const table of deleteOrder) {
        await supabase.from(table).delete().eq("user_id", user.id);
      }
      // Insert in correct order: independent tables first, then dependent ones
      const insertOrder = ["bank_accounts", "categories", "contacts", "categorization_rules", "transactions", "budgets"] as const;
      for (const table of insertOrder) {
        const rows = pendingRestore[table];
        if (rows && rows.length > 0) {
          // Clean rows: remove any view-only fields and ensure user_id matches
          const cleanedRows = rows.map((row: any) => {
            const cleaned = { ...row, user_id: user.id };
            // Remove id to let DB generate new ones if needed, but keep for FK refs
            return cleaned;
          });
          for (let i = 0; i < cleanedRows.length; i += 200) {
            const batch = cleanedRows.slice(i, i + 200);
            const { error } = await supabase.from(table).insert(batch as any);
            if (error) {
              console.error(`Restore error for ${table}:`, error);
              toast({ title: `Fout bij ${table}`, description: error.message, variant: "destructive" });
            }
          }
        }
      }
      Object.values(FINANCE_QUERY_KEYS).forEach((key) =>
        queryClient.invalidateQueries({ queryKey: [key] })
      );
      fetchAccounts();
      toast({ title: "Backup hersteld", description: "Al je gegevens zijn succesvol hersteld." });
    } catch (e: any) {
      toast({ title: "Fout bij herstellen", description: e?.message || "Er ging iets mis bij het herstellen van de backup.", variant: "destructive" });
    }
    setRestoreDialogOpen(false);
    setPendingRestore(null);
  };

  const renderCategoryList = (typeFilter: "expense" | "income", title: string) => {
    const cats = parentCategories.filter((c) => c.type === typeFilter);
    return (
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">{title}</h3>
        <div className="glass-card divide-y divide-border/50">
          {cats.map((cat) => {
            const children = childCategories
              .filter((c) => (c as any).parent_category_id === cat.id)
              .sort((a, b) => ((a as any).sort_order ?? 0) - ((b as any).sort_order ?? 0));
            return (
              <div key={cat.id}>
                <div
                  draggable
                  onDragStart={() => handleDragStart(cat.id)}
                  onDragOver={(e) => handleDragOver(e, cat.id)}
                  onDrop={() => handleDrop(typeFilter)}
                  className="flex items-center justify-between px-4 py-3 hover:bg-accent/30 transition-colors cursor-grab active:cursor-grabbing"
                >
                  <div className="flex items-center gap-3">
                    <GripVertical className="h-4 w-4 text-muted-foreground/50" />
                    <div className="h-3 w-3 rounded-full" style={{ background: `hsl(${cat.color})` }} />
                    <span className="text-sm font-medium">{cat.name}</span>
                  </div>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => handleDeleteCategory(cat.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
                {children.length > 0 && (
                  <div className="pl-12 pb-1">
                    {children.map((sub) => (
                      <div key={sub.id} className="flex items-center justify-between px-4 py-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground text-xs">└</span>
                          <div className="h-2 w-2 rounded-full" style={{ background: `hsl(${sub.color})` }} />
                          <span className="text-xs text-muted-foreground">{sub.name}</span>
                        </div>
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive" onClick={() => handleDeleteCategory(sub.id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Instellingen</h1>
        <p className="text-sm text-muted-foreground">Beheer je bankrekeningen, categorieën en voorkeuren</p>
      </div>

      {/* Bank Accounts Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Bankrekeningen</h2>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2"><Plus className="h-4 w-4" /> Rekening toevoegen</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Nieuwe bankrekening</DialogTitle></DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label>Naam</Label>
                  <Input placeholder="bijv. ING Betaalrekening" value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Bank</Label>
                  <Select value={bank} onValueChange={setBank}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {BANK_OPTIONS.map((b) => (<SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Type rekening</Label>
                  <Select value={accountType} onValueChange={setAccountType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ACCOUNT_TYPES.map((t) => (<SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>IBAN</Label>
                  <Input placeholder="NL00 XXXX 0000 0000 00" value={iban} onChange={(e) => setIban(e.target.value.toUpperCase())} />
                </div>
                <div className="space-y-2">
                  <Label>Startsaldo</Label>
                  <Input type="number" step="0.01" placeholder="0.00" value={startingBalance} onChange={(e) => setStartingBalance(e.target.value)} />
                </div>
                <Button onClick={handleAdd} disabled={!name.trim() || saving} className="w-full">Toevoegen</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : accounts.length === 0 ? (
          <div className="glass-card p-8 text-center">
            <Building2 className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">Nog geen bankrekeningen toegevoegd.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {groupedAccounts.map((group) => (
              <div key={group.id}>
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">{group.name}</h3>
                <div className="grid gap-3">
                  {group.accounts.map((account) => {
                    const bankOption = BANK_OPTIONS.find((b) => b.id === account.bank);
                    const isEditing = editingId === account.id;

                    if (isEditing) {
                      return (
                        <div key={account.id} className="glass-card p-4 space-y-3 bg-accent/20">
                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                              <Label className="text-xs">Naam</Label>
                              <Input value={editForm.name} onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))} className="bg-secondary border-border text-sm" />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">IBAN</Label>
                              <Input value={editForm.iban} onChange={(e) => setEditForm((f) => ({ ...f, iban: e.target.value.toUpperCase() }))} className="bg-secondary border-border text-sm" />
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                              <Label className="text-xs">Bank</Label>
                              <Select value={editForm.bank} onValueChange={(v) => setEditForm((f) => ({ ...f, bank: v }))}>
                                <SelectTrigger className="bg-secondary border-border text-sm"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  {BANK_OPTIONS.map((b) => (<SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Type</Label>
                              <Select value={editForm.account_type} onValueChange={(v) => setEditForm((f) => ({ ...f, account_type: v }))}>
                                <SelectTrigger className="bg-secondary border-border text-sm"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  {ACCOUNT_TYPES.map((t) => (<SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                              <Label className="text-xs">Startsaldo</Label>
                              <Input type="number" step="0.01" value={editForm.starting_balance} onChange={(e) => setEditForm((f) => ({ ...f, starting_balance: e.target.value }))} className="bg-secondary border-border text-sm" />
                            </div>
                          </div>
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="sm" onClick={() => setEditingId(null)} className="gap-1 text-muted-foreground"><X className="h-3.5 w-3.5" /> Annuleren</Button>
                            <Button size="sm" onClick={saveEdit} className="gap-1 gradient-primary border-0 text-primary-foreground"><Check className="h-3.5 w-3.5" /> Opslaan</Button>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div key={account.id} className="glass-card p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: `hsl(${account.color} / 0.2)` }}>
                              <Building2 className="h-5 w-5" style={{ color: `hsl(${account.color})` }} />
                            </div>
                            <div>
                              <h3 className="font-medium text-sm">{account.name}</h3>
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-muted-foreground">{bankOption?.name ?? account.bank}</span>
                                {account.iban && <span className="text-xs text-muted-foreground">· {account.iban}</span>}
                                {account.starting_balance !== 0 && (
                                  <span className="text-xs text-muted-foreground">· Start: €{Number(account.starting_balance).toLocaleString("nl-NL", { minimumFractionDigits: 2 })}</span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground" onClick={() => startEdit(account)}><Pencil className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive" onClick={() => handleDelete(account.id)}><Trash2 className="h-4 w-4" /></Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Separator />

      {/* Categories Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Categorieën</h2>
            <p className="text-xs text-muted-foreground">Sleep categorieën om de volgorde te wijzigen</p>
          </div>
          <Dialog open={catDialogOpen} onOpenChange={setCatDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2"><FolderPlus className="h-4 w-4" /> Categorie toevoegen</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Nieuwe categorie</DialogTitle></DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label>Naam</Label>
                  <Input placeholder="bijv. Sport, Huisdieren" value={catName} onChange={(e) => setCatName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select value={catType} onValueChange={(v) => setCatType(v as any)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="expense">Uitgave</SelectItem>
                      <SelectItem value="income">Inkomst</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Kleur</Label>
                  <Select value={catColor} onValueChange={setCatColor}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CAT_COLORS.map((c) => (
                        <SelectItem key={c.value} value={c.value}>
                          <div className="flex items-center gap-2">
                            <div className="h-3 w-3 rounded-full" style={{ background: `hsl(${c.value})` }} />
                            {c.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Hoofdcategorie (optioneel, voor subcategorie)</Label>
                  <Select value={catParentId} onValueChange={setCatParentId}>
                    <SelectTrigger><SelectValue placeholder="Geen (hoofdcategorie)" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Geen (hoofdcategorie)</SelectItem>
                      {parentCategories.filter((c) => c.type === catType).map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleAddCategory} disabled={!catName.trim() || catSaving} className="w-full">Toevoegen</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {renderCategoryList("expense", "Uitgaven categorieën")}
        {renderCategoryList("income", "Inkomsten categorieën")}
      </div>

      <Separator />

      {/* Categorization Rules Section */}
      <CategorizationRulesSection user={user} categories={categories} />


      <div className="glass-card p-6 space-y-4">
        <h2 className="text-lg font-bold flex items-center gap-2"><Download className="h-5 w-5 text-primary" /> Backup & Herstel</h2>
        <p className="text-sm text-muted-foreground">Exporteer al je gegevens als backup of herstel een eerdere backup.</p>
        <div className="flex flex-wrap gap-3">
          <Button onClick={handleBackup} className="gap-2"><Download className="h-4 w-4" /> Backup downloaden</Button>
          <label>
            <Button variant="outline" className="gap-2 cursor-pointer" asChild>
              <span><Upload className="h-4 w-4" /> Backup herstellen</span>
            </Button>
            <input type="file" accept=".json" className="hidden" onChange={handleRestore} />
          </label>
        </div>
      </div>

      {/* Restore confirm dialog */}
      <Dialog open={restoreDialogOpen} onOpenChange={setRestoreDialogOpen}>
        <DialogContent className="bg-card border-border sm:max-w-md">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-destructive" /> Backup herstellen</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            Dit vervangt al je huidige gegevens met de backup. Dit kan niet ongedaan worden gemaakt. Weet je het zeker?
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => { setRestoreDialogOpen(false); setPendingRestore(null); }}>Annuleren</Button>
            <Button variant="destructive" onClick={confirmRestore}>Ja, herstellen</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CategorizationRulesSection({ user, categories }: { user: any; categories: any[] }) {
  const [rules, setRules] = useState<{ id: string; pattern: string; category_id: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("categorization_rules")
      .select("id, pattern, category_id")
      .eq("user_id", user.id)
      .order("pattern", { ascending: true })
      .then(({ data }) => {
        setRules((data as any[]) ?? []);
        setLoading(false);
      });
  }, [user]);

  const handleDelete = async (id: string) => {
    await supabase.from("categorization_rules").delete().eq("id", id);
    setRules((prev) => prev.filter((r) => r.id !== id));
    toast({ title: "Regel verwijderd" });
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Tag className="h-5 w-5 text-primary" /> Automatische categorisatieregels
        </h2>
        <p className="text-xs text-muted-foreground">
          Regels die automatisch worden toegepast bij het importeren en bewerken van transacties
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-4">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : rules.length === 0 ? (
        <div className="glass-card p-6 text-center">
          <p className="text-sm text-muted-foreground">Nog geen regels. Regels worden aangemaakt wanneer je een categorie toepast op transacties.</p>
        </div>
      ) : (
        <div className="glass-card divide-y divide-border/50">
          {rules.map((rule) => {
            const cat = categories.find((c: any) => c.id === rule.category_id);
            return (
              <div key={rule.id} className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-3">
                  <code className="text-xs bg-secondary px-2 py-1 rounded font-mono">{rule.pattern}</code>
                  <span className="text-xs text-muted-foreground">→</span>
                  {cat ? (
                    <div className="flex items-center gap-1.5">
                      <div className="h-2.5 w-2.5 rounded-full" style={{ background: `hsl(${cat.color})` }} />
                      <span className="text-sm">{cat.name}</span>
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground italic">Verwijderde categorie</span>
                  )}
                </div>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => handleDelete(rule.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
