import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useContracts } from "@/hooks/useContracts";
import { useFinanceStore } from "@/hooks/useFinanceData";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, ArrowUpRight, ArrowDownRight, Upload, Trash2, FileText, Download, Image } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

const STATUS_COLORS: Record<string, string> = {
  actief: "bg-green-500/10 text-green-600 border-green-500/20",
  binnenkort: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  opzegbaar: "bg-orange-500/10 text-orange-600 border-orange-500/20",
  vervallen: "bg-muted text-muted-foreground border-border",
};

const fmt = (n: number) =>
  `€${n.toLocaleString("nl-NL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

interface Attachment {
  id: string;
  file_name: string;
  file_path: string;
  file_type: string;
  created_at: string;
}

export default function ContractDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { contracts } = useContracts();
  const { transactions, categories, contacts } = useFinanceStore();
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const contract = contracts.find((c) => c.id === id);

  const linkedTransactions = useMemo(() => {
    if (!contract?.planned_transaction_id) return [];
    return transactions
      .filter((t) => !t.is_planned && t.planned_transaction_id === contract.planned_transaction_id)
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [contract, transactions]);

  const fetchAttachments = useCallback(async () => {
    if (!id || !user) return;
    const { data } = await (supabase.from as any)("contract_attachments")
      .select("*")
      .eq("contract_id", id)
      .order("created_at", { ascending: false });
    setAttachments((data ?? []) as Attachment[]);
  }, [id, user]);

  useEffect(() => {
    fetchAttachments();
  }, [fetchAttachments]);

  const handleUpload = async (file: File) => {
    if (!user || !id) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const filePath = `${user.id}/${id}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("contract-files")
        .upload(filePath, file);
      if (uploadError) throw uploadError;

      await (supabase.from as any)("contract_attachments").insert({
        contract_id: id,
        user_id: user.id,
        file_name: file.name,
        file_path: filePath,
        file_type: file.type,
      });
      await fetchAttachments();
      toast.success("Bestand geüpload");
    } catch (e: any) {
      toast.error(e.message || "Upload mislukt");
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteAttachment = async (att: Attachment) => {
    await supabase.storage.from("contract-files").remove([att.file_path]);
    await (supabase.from as any)("contract_attachments").delete().eq("id", att.id);
    await fetchAttachments();
    toast.success("Bestand verwijderd");
  };

  const getDownloadUrl = async (filePath: string) => {
    const { data } = await supabase.storage
      .from("contract-files")
      .createSignedUrl(filePath, 3600);
    return data?.signedUrl;
  };

  if (!contract) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => navigate("/contracts")} className="gap-2">
          <ArrowLeft className="h-4 w-4" /> Terug
        </Button>
        <p className="text-sm text-muted-foreground text-center py-8">Contract niet gevonden</p>
      </div>
    );
  }

  const cat = categories.find((c) => c.id === contract.category_id);
  const contact = contacts.find((c) => c.id === contract.contact_id);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/contracts")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">{contract.name}</h1>
            <Badge variant="outline" className={STATUS_COLORS[contract.status] ?? ""}>
              {contract.status}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {fmt(Number(contract.amount))} / {contract.payment_frequency === "jaar" ? "jaar" : "maand"}
            {contact && ` · ${contact.name}`}
            {cat && ` · ${cat.name}`}
          </p>
        </div>
      </div>

      {/* Contract details */}
      <div className="glass-card p-5">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Details</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          <div><span className="text-muted-foreground">Startdatum</span><p className="font-medium">{new Date(contract.start_date).toLocaleDateString("nl-NL")}</p></div>
          <div><span className="text-muted-foreground">Einddatum</span><p className="font-medium">{contract.end_date ? new Date(contract.end_date).toLocaleDateString("nl-NL") : "—"}</p></div>
          <div><span className="text-muted-foreground">Opzegtermijn</span><p className="font-medium">{contract.cancellation_period}</p></div>
          <div><span className="text-muted-foreground">Status</span><p className="font-medium">{contract.status}</p></div>
          {contract.customer_number && <div><span className="text-muted-foreground">Klantnummer</span><p className="font-medium">{contract.customer_number}</p></div>}
          {contract.policy_number && <div><span className="text-muted-foreground">Polisnummer</span><p className="font-medium">{contract.policy_number}</p></div>}
          {contract.notes && <div className="col-span-2"><span className="text-muted-foreground">Notities</span><p className="font-medium">{contract.notes}</p></div>}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-card p-5 text-center">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Betaald totaal</span>
          <p className="text-2xl font-bold text-expense mt-1">
            {fmt(linkedTransactions.reduce((s, t) => s + Number(t.amount), 0))}
          </p>
        </div>
        <div className="glass-card p-5 text-center">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Transacties</span>
          <p className="text-2xl font-bold mt-1">{linkedTransactions.length}</p>
        </div>
        <div className="glass-card p-5 text-center">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Bestanden</span>
          <p className="text-2xl font-bold mt-1">{attachments.length}</p>
        </div>
      </div>

      {/* File uploads */}
      <div className="glass-card p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Documenten</h3>
          <div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*,.pdf"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleUpload(f);
                if (fileRef.current) fileRef.current.value = "";
              }}
            />
            <Button size="sm" variant="outline" disabled={uploading} onClick={() => fileRef.current?.click()}>
              <Upload className="h-4 w-4 mr-1" /> {uploading ? "Uploaden..." : "Upload"}
            </Button>
          </div>
        </div>
        {attachments.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">Geen documenten geüpload</p>
        ) : (
          <div className="space-y-2">
            {attachments.map((att) => (
              <div key={att.id} className="flex items-center justify-between rounded-lg bg-secondary/50 px-4 py-3">
                <div className="flex items-center gap-3">
                  {att.file_type.startsWith("image/") ? (
                    <Image className="h-5 w-5 text-primary" />
                  ) : (
                    <FileText className="h-5 w-5 text-primary" />
                  )}
                  <div>
                    <p className="text-sm font-medium">{att.file_name}</p>
                    <p className="text-xs text-muted-foreground">{new Date(att.created_at).toLocaleDateString("nl-NL")}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={async () => {
                      const url = await getDownloadUrl(att.file_path);
                      if (url) window.open(url, "_blank");
                    }}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDeleteAttachment(att)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Transaction list */}
      <div className="glass-card divide-y divide-border/50">
        <div className="px-5 py-3">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Gekoppelde transacties</h3>
        </div>
        {linkedTransactions.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            {contract.planned_transaction_id
              ? "Nog geen betaalde transacties gekoppeld aan dit contract"
              : "Koppel een geplande transactie aan dit contract om transacties te zien"}
          </p>
        ) : (
          linkedTransactions.map((tx) => {
            const txCat = categories.find((c) => c.id === tx.category_id);
            return (
              <div key={tx.id} className="flex items-center justify-between px-5 py-3 hover:bg-accent/30 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg" style={{ background: txCat ? `hsl(${txCat.color} / 0.15)` : undefined }}>
                    {tx.type === "income" ? <ArrowUpRight className="h-4 w-4 text-income" /> : <ArrowDownRight className="h-4 w-4 text-expense" />}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{tx.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {txCat?.name ?? "Geen categorie"} · {new Date(tx.date).toLocaleDateString("nl-NL")}
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
  );
}
