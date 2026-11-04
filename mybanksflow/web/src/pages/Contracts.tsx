import { useState, useMemo } from "react";
import { useContracts, Contract } from "@/hooks/useContracts";
import { useFinanceStore } from "@/hooks/useFinanceData";
import HelpTooltip from "@/components/HelpTooltip";
import CategorySelect from "@/components/CategorySelect";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Plus, Pencil, Trash2, FileText, AlertTriangle, Eye } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

const STATUS_OPTIONS = [
  { value: "actief", label: "Actief" },
  { value: "binnenkort", label: "Binnenkort" },
  { value: "opzegbaar", label: "Opzegbaar" },
  { value: "vervallen", label: "Vervallen" },
];

const CANCEL_OPTIONS = [
  { value: "maand", label: "1 Maand" },
  { value: "jaar", label: "1 Jaar" },
  { value: "2jaar", label: "2 Jaar" },
];

const PAY_FREQ = [
  { value: "maand", label: "Per maand" },
  { value: "jaar", label: "Per jaar" },
];

const STATUS_COLORS: Record<string, string> = {
  actief: "bg-green-500/10 text-green-600 border-green-500/20",
  binnenkort: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  opzegbaar: "bg-orange-500/10 text-orange-600 border-orange-500/20",
  vervallen: "bg-muted text-muted-foreground border-border",
};

const fmt = (n: number) =>
  `€${n.toLocaleString("nl-NL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

interface ContractFormData {
  name: string;
  start_date: string;
  end_date: string;
  cancellation_period: string;
  status: string;
  payment_frequency: string;
  amount: string;
  customer_number: string;
  policy_number: string;
  contact_id: string;
  category_id: string;
  planned_transaction_id: string;
  notes: string;
}

const emptyForm: ContractFormData = {
  name: "", start_date: "", end_date: "", cancellation_period: "maand",
  status: "actief", payment_frequency: "maand", amount: "", customer_number: "",
  policy_number: "", contact_id: "", category_id: "", planned_transaction_id: "", notes: "",
};

export default function ContractsPage() {
  const { contracts, isLoading, addContract, updateContract, deleteContract, getMonthlyTotal, getYearlyTotal } = useContracts();
  const { categories, contacts, transactions } = useFinanceStore();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<ContractFormData>(emptyForm);
  const [search, setSearch] = useState("");
  const navigate = useNavigate();

  const plannedTransactions = useMemo(() =>
    transactions.filter((t) => t.is_planned),
    [transactions]
  );

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return contracts.filter((c) =>
      c.name.toLowerCase().includes(q) ||
      (c.customer_number ?? "").toLowerCase().includes(q) ||
      (c.policy_number ?? "").toLowerCase().includes(q)
    );
  }, [contracts, search]);

  const openCreate = () => { setEditId(null); setForm(emptyForm); setDialogOpen(true); };
  const openEdit = (c: Contract) => {
    setEditId(c.id);
    setForm({
      name: c.name,
      start_date: c.start_date,
      end_date: c.end_date ?? "",
      cancellation_period: c.cancellation_period,
      status: c.status,
      payment_frequency: c.payment_frequency,
      amount: String(c.amount),
      customer_number: c.customer_number ?? "",
      policy_number: c.policy_number ?? "",
      contact_id: c.contact_id ?? "",
      category_id: c.category_id ?? "",
      planned_transaction_id: c.planned_transaction_id ?? "",
      notes: c.notes ?? "",
    });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.name || !form.start_date || !form.amount) {
      toast.error("Vul naam, startdatum en bedrag in");
      return;
    }
    const payload = {
      name: form.name,
      start_date: form.start_date,
      end_date: form.end_date || null,
      cancellation_period: form.cancellation_period,
      status: form.status,
      payment_frequency: form.payment_frequency,
      amount: parseFloat(form.amount),
      customer_number: form.customer_number || null,
      policy_number: form.policy_number || null,
      contact_id: form.contact_id || null,
      category_id: form.category_id || null,
      planned_transaction_id: form.planned_transaction_id || null,
      notes: form.notes || null,
    };
    if (editId) {
      await updateContract(editId, payload);
      toast.success("Contract bijgewerkt");
    } else {
      await addContract(payload);
      toast.success("Contract toegevoegd");
    }
    setDialogOpen(false);
  };

  const handleDelete = async (id: string) => {
    await deleteContract(id);
    toast.success("Contract verwijderd");
  };

  const getCategoryName = (id: string | null) => categories.find((c) => c.id === id)?.name ?? "—";
  const getContactName = (id: string | null) => contacts.find((c) => c.id === id)?.name ?? "—";

  if (isLoading) {
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
          <h1 className="text-2xl font-bold tracking-tight">Contracten</h1>
          <HelpTooltip
            title="Contracten"
            lines={[
              "Beheer al je lopende contracten en abonnementen",
              "Koppel contracten aan contacten, categorieën en geplande transacties",
              "Bekijk je maandelijkse en jaarlijkse kosten in één overzicht",
            ]}
          />
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" onClick={openCreate}><Plus className="h-4 w-4 mr-1" /> Nieuw contract</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editId ? "Contract bewerken" : "Nieuw contract"}</DialogTitle>
              <DialogDescription>Vul de gegevens van het contract in.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-2">
              <div className="grid gap-2">
                <Label>Naam *</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Bijv. Ziggo Internet" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-2">
                  <Label>Startdatum *</Label>
                  <Input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
                </div>
                <div className="grid gap-2">
                  <Label>Einddatum</Label>
                  <Input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-2">
                  <Label>Bedrag *</Label>
                  <Input type="number" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="0.00" />
                </div>
                <div className="grid gap-2">
                  <Label>Betaling per</Label>
                  <Select value={form.payment_frequency} onValueChange={(v) => setForm({ ...form, payment_frequency: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{PAY_FREQ.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-2">
                  <Label>Status</Label>
                  <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{STATUS_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Opzegtermijn</Label>
                  <Select value={form.cancellation_period} onValueChange={(v) => setForm({ ...form, cancellation_period: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{CANCEL_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-2">
                  <Label>Klantnummer</Label>
                  <Input value={form.customer_number} onChange={(e) => setForm({ ...form, customer_number: e.target.value })} />
                </div>
                <div className="grid gap-2">
                  <Label>Polisnummer</Label>
                  <Input value={form.policy_number} onChange={(e) => setForm({ ...form, policy_number: e.target.value })} />
                </div>
              </div>
              <div className="grid gap-2">
                <Label>Contact</Label>
                <Select value={form.contact_id || "__none__"} onValueChange={(v) => setForm({ ...form, contact_id: v === "__none__" ? "" : v })}>
                  <SelectTrigger><SelectValue placeholder="Selecteer contact" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Geen</SelectItem>
                    {contacts.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Categorie</Label>
                <CategorySelect
                  categories={categories.map((c) => ({ id: c.id, name: c.name, type: c.type as "income" | "expense", color: c.color, parentId: c.parent_category_id ?? undefined, sortOrder: c.sort_order }))}
                  value={form.category_id}
                  onValueChange={(v) => setForm({ ...form, category_id: v })}
                />
              </div>
              <div className="grid gap-2">
                <Label>Gekoppelde geplande transactie</Label>
                <Select value={form.planned_transaction_id || "__none__"} onValueChange={(v) => setForm({ ...form, planned_transaction_id: v === "__none__" ? "" : v })}>
                  <SelectTrigger><SelectValue placeholder="Selecteer geplande transactie" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Geen</SelectItem>
                    {plannedTransactions.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.description} — {fmt(Number(t.amount))}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Notities</Label>
                <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Eventuele opmerkingen" />
              </div>
              <Button onClick={handleSubmit} className="w-full mt-2">
                {editId ? "Opslaan" : "Toevoegen"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Report summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-card p-5 text-center">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Actieve contracten</p>
          <p className="text-2xl font-bold">{contracts.filter((c) => c.status === "actief").length}</p>
        </div>
        <div className="glass-card p-5 text-center">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Kosten per maand</p>
          <p className="text-2xl font-bold text-expense">{fmt(getMonthlyTotal())}</p>
        </div>
        <div className="glass-card p-5 text-center">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Kosten per jaar</p>
          <p className="text-2xl font-bold text-expense">{fmt(getYearlyTotal())}</p>
        </div>
      </div>

      {/* Search */}
      <Input
        placeholder="Zoek op naam, klantnummer of polisnummer..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-sm"
      />

      {/* Contract list */}
      <div className="space-y-3">
        {filtered.length === 0 && (
          <div className="glass-card p-8 text-center text-muted-foreground">
            <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>Nog geen contracten. Voeg je eerste contract toe!</p>
          </div>
        )}
        {filtered.map((c) => {
          const isExpiring = c.end_date && new Date(c.end_date) <= new Date(Date.now() + 60 * 24 * 60 * 60 * 1000) && new Date(c.end_date) >= new Date();
          return (
            <div key={c.id} className="glass-card p-4 flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-semibold truncate">{c.name}</p>
                  <Badge variant="outline" className={STATUS_COLORS[c.status] ?? ""}>
                    {STATUS_OPTIONS.find((o) => o.value === c.status)?.label ?? c.status}
                  </Badge>
                  {isExpiring && (
                    <Badge variant="outline" className="bg-orange-500/10 text-orange-600 border-orange-500/20">
                      <AlertTriangle className="h-3 w-3 mr-1" /> Verloopt binnenkort
                    </Badge>
                  )}
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <span>{fmt(Number(c.amount))} / {c.payment_frequency === "jaar" ? "jaar" : "maand"}</span>
                  <span>Start: {c.start_date}</span>
                  {c.end_date && <span>Eind: {c.end_date}</span>}
                  <span>Opzeg: {CANCEL_OPTIONS.find((o) => o.value === c.cancellation_period)?.label}</span>
                  {c.contact_id && <span>Contact: {getContactName(c.contact_id)}</span>}
                  {c.category_id && <span>Categorie: {getCategoryName(c.category_id)}</span>}
                  {c.customer_number && <span>Klant#: {c.customer_number}</span>}
                  {c.policy_number && <span>Polis#: {c.policy_number}</span>}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(`/contracts/${c.id}`)}>
                  <Eye className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(c)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(c.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
