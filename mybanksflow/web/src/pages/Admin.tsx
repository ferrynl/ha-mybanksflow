import { useIsAdmin } from "@/hooks/useIsAdmin";
import { Navigate } from "react-router-dom";
import { Shield, Users, ArrowLeftRight, Tag, RefreshCw, AlertTriangle, Trash2, ImageIcon, Upload } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { FINANCE_QUERY_KEYS } from "@/hooks/useFinanceData";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { toast } from "sonner";

interface AdminUser {
  id: string;
  email: string;
  full_name: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  transaction_count: number;
  rule_count: number;
}

const CACHE_SECTIONS = [
  { key: FINANCE_QUERY_KEYS.transactions, label: "Transacties", icon: "📊" },
  { key: FINANCE_QUERY_KEYS.categories, label: "Categorieën", icon: "🏷️" },
  { key: FINANCE_QUERY_KEYS.budgets, label: "Budgetten", icon: "💰" },
  { key: FINANCE_QUERY_KEYS.bankAccounts, label: "Bankrekeningen", icon: "🏦" },
  { key: FINANCE_QUERY_KEYS.contacts, label: "Contacten", icon: "👤" },
];

const BANK_IDS = ["ing", "abnamro", "rabobank", "asn", "revolut", "triodos", "knab", "bunq", "n26", "sns", "regiobank"];

export default function Admin() {
  const { isAdmin, loading } = useIsAdmin();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [importErrors, setImportErrors] = useState<any[]>([]);
  const [loadingErrors, setLoadingErrors] = useState(true);
  const [logoUrls, setLogoUrls] = useState<Record<string, string>>({});
  const [uploadingLogo, setUploadingLogo] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const fetchLogos = async () => {
    const urls: Record<string, string> = {};
    for (const bankId of BANK_IDS) {
      const { data } = supabase.storage.from("bank-logos").getPublicUrl(`${bankId}.png`);
      // Check if file actually exists by trying to fetch it
      try {
        const res = await fetch(data.publicUrl, { method: "HEAD" });
        if (res.ok) urls[bankId] = data.publicUrl + "?t=" + Date.now();
      } catch {}
    }
    setLogoUrls(urls);
  };

  useEffect(() => {
    if (!isAdmin || loading) return;

    const fetchUsers = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) {
          setError("Geen actieve sessie gevonden. Log opnieuw in.");
          return;
        }
        const res = await supabase.functions.invoke("admin-users", {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (res.error) {
          const errMsg = typeof res.error === "object" && "message" in res.error
            ? (res.error as any).message
            : String(res.error);
          throw new Error(errMsg);
        }
        if (!Array.isArray(res.data)) {
          throw new Error("Onverwacht antwoord van de server");
        }
        setUsers(res.data);
      } catch (err: any) {
        setError(err.message || "Kon gebruikers niet ophalen");
      } finally {
        setLoadingUsers(false);
      }
    };
    fetchUsers();

    // Fetch import errors
    supabase
      .from("import_errors" as any)
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50)
      .then(({ data }) => {
        setImportErrors((data as any[]) ?? []);
        setLoadingErrors(false);
      });

    fetchLogos();
  }, [isAdmin, loading]);

  const handleLogoUpload = async (bankId: string, file: File) => {
    setUploadingLogo(bankId);
    const { error } = await supabase.storage
      .from("bank-logos")
      .upload(`${bankId}.png`, file, { upsert: true, contentType: file.type });
    setUploadingLogo(null);
    if (error) {
      toast.error(`Upload mislukt: ${error.message}`);
      return;
    }
    toast.success(`Logo voor ${bankId} bijgewerkt`);
    fetchLogos();
  };

  const clearCache = (key: string, label: string) => {
    queryClient.invalidateQueries({ queryKey: [key] });
    toast.success(`Cache voor ${label} gewist`);
  };

  const clearAllCache = () => {
    queryClient.clear();
    toast.success("Volledige cache gewist");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!isAdmin) return <Navigate to="/" replace />;

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl">
      <div className="flex items-center gap-3">
        <Shield className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Admin</h1>
          <p className="text-sm text-muted-foreground">Beheerderspaneel</p>
        </div>
      </div>

      {/* Cache management */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Cache beheer</h2>
          </div>
          <Button variant="destructive" size="sm" onClick={clearAllCache} className="gap-2">
            <RefreshCw className="h-3.5 w-3.5" /> Alles wissen
          </Button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {CACHE_SECTIONS.map((s) => (
            <button
              key={s.key}
              onClick={() => clearCache(s.key, s.label)}
              className="flex flex-col items-center gap-2 rounded-xl bg-secondary/50 p-4 text-center transition-colors hover:bg-secondary"
            >
              <span className="text-2xl">{s.icon}</span>
              <span className="text-xs font-medium text-foreground">{s.label}</span>
              <RefreshCw className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          ))}
        </div>
      </div>

      {/* Users table */}
      <div className="glass-card p-6">
        <div className="flex items-center gap-2 mb-4">
          <Users className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Gebruikers ({users.length})</h2>
        </div>

        {loadingUsers ? (
          <div className="flex items-center justify-center py-10">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Naam</TableHead>
                  <TableHead>E-mail</TableHead>
                  <TableHead className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <ArrowLeftRight className="h-3.5 w-3.5" /> Transacties
                    </div>
                  </TableHead>
                  <TableHead className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Tag className="h-3.5 w-3.5" /> Regels
                    </div>
                  </TableHead>
                  <TableHead>Aangemeld</TableHead>
                  <TableHead>Laatst ingelogd</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">
                      {u.full_name || <span className="text-muted-foreground italic">—</span>}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">{u.email}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary" className="tabular-nums">{u.transaction_count}</Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className="tabular-nums">{u.rule_count}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(u.created_at), "d MMM yyyy", { locale: nl })}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {u.last_sign_in_at
                        ? format(new Date(u.last_sign_in_at), "d MMM yyyy HH:mm", { locale: nl })
                        : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Import Errors */}
      <div className="glass-card p-6">
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle className="h-5 w-5 text-destructive" />
          <h2 className="text-lg font-semibold">Mislukte imports ({importErrors.length})</h2>
        </div>

        {loadingErrors ? (
          <div className="flex items-center justify-center py-6">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : importErrors.length === 0 ? (
          <p className="text-sm text-muted-foreground">Geen mislukte imports gevonden.</p>
        ) : (
          <div className="space-y-3">
            {importErrors.map((err: any) => (
              <div key={err.id} className="rounded-lg border border-destructive/20 bg-destructive/5 p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="destructive" className="text-[10px]">{err.bank}</Badge>
                      <span className="text-xs text-muted-foreground">{err.file_name}</span>
                      <span className="text-xs text-muted-foreground">·</span>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(err.created_at), "d MMM yyyy HH:mm", { locale: nl })}
                      </span>
                    </div>
                    <p className="text-sm text-destructive font-medium">{err.error_message}</p>
                    {err.file_preview && (
                      <details className="mt-2">
                        <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">Bestandspreview</summary>
                        <pre className="mt-1 text-[10px] text-muted-foreground bg-secondary/50 rounded p-2 overflow-x-auto max-h-32">{err.file_preview}</pre>
                      </details>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    onClick={async () => {
                      await supabase.from("import_errors" as any).delete().eq("id", err.id);
                      setImportErrors((prev) => prev.filter((e: any) => e.id !== err.id));
                      toast.success("Verwijderd");
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bank Logos */}
      <div className="glass-card p-6">
        <div className="flex items-center gap-2 mb-4">
          <ImageIcon className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Banklogo's beheren</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-4">Upload een nieuw logo (PNG) per bank. Het overschrijft het bestaande logo.</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {BANK_IDS.map((bankId) => (
            <div key={bankId} className="flex flex-col items-center gap-2 rounded-xl bg-secondary/50 p-4">
              <div className="h-12 w-12 rounded-lg bg-background flex items-center justify-center overflow-hidden border border-border">
                {logoUrls[bankId] ? (
                  <img src={logoUrls[bankId]} alt={bankId} className="h-10 w-10 object-contain" />
                ) : (
                  <ImageIcon className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
              <span className="text-xs font-medium text-foreground capitalize">{bankId}</span>
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleLogoUpload(bankId, file);
                    e.target.value = "";
                  }}
                />
                <span className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                  uploadingLogo === bankId
                    ? "bg-muted text-muted-foreground"
                    : "bg-primary/10 text-primary hover:bg-primary/20 cursor-pointer"
                }`}>
                  <Upload className="h-3 w-3" />
                  {uploadingLogo === bankId ? "Uploaden..." : "Upload"}
                </span>
              </label>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
