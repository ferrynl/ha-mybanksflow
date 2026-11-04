import { useRef, useState, useEffect, useCallback } from "react";
import HelpTooltip from "@/components/HelpTooltip";
import { Upload, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { useFinanceStore } from "@/hooks/useFinanceData";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { parseCSVForBank, type ParsedTransaction } from "@/lib/csvParsers";
import { toast } from "@/hooks/use-toast";

import bankIngLogo from "@/assets/bank-ing.png";
import bankAbnLogo from "@/assets/bank-abnamro.png";
import bankRaboLogo from "@/assets/bank-rabobank.png";
import bankAsnLogo from "@/assets/bank-asn.png";
import bankRevolutLogo from "@/assets/bank-revolut.png";
import bankTriodosLogo from "@/assets/bank-triodos.png";
import bankKnabLogo from "@/assets/bank-knab.png";
import bankBunqLogo from "@/assets/bank-bunq.png";
import bankN26Logo from "@/assets/bank-n26.png";

const banks = [
  { id: "ing", name: "ING", format: "CSV", logo: bankIngLogo, description: "Download je transacties via Mijn ING > Af- en bijschrijvingen" },
  { id: "abnamro", name: "ABN AMRO", format: "TXT (Tab)", logo: bankAbnLogo, description: "Exporteer via Internet Bankieren > Mutaties downloaden" },
  { id: "rabobank", name: "Rabobank", format: "CSV", logo: bankRaboLogo, description: "Download je transacties via Rabo Bankieren > Transacties" },
  { id: "asn", name: "ASN Bank", format: "CSV", logo: bankAsnLogo, description: "Exporteer via ASN Online Bankieren > Transacties" },
  { id: "triodos", name: "Triodos Bank", format: "CSV", logo: bankTriodosLogo, description: "Exporteer via Triodos Internet Bankieren > Transacties" },
  { id: "knab", name: "Knab", format: "CSV", logo: bankKnabLogo, description: "Download je transacties via Knab Online > Transacties" },
  { id: "bunq", name: "bunq", format: "CSV", logo: bankBunqLogo, description: "Exporteer je transacties vanuit de bunq app" },
  { id: "revolut", name: "Revolut", format: "CSV", logo: bankRevolutLogo, description: "Exporteer je transacties als CSV vanuit de Revolut app" },
  { id: "n26", name: "N26", format: "CSV", logo: bankN26Logo, description: "Download je transacties als CSV vanuit de N26 app" },
];

export default function ImportPage() {
  const { user } = useAuth();
  const { addTransaction, suggestCategory, refetch } = useFinanceStore();
  const [importing, setImporting] = useState<string | null>(null);
  const [results, setResults] = useState<{ bankId: string; count: number } | null>(null);
  const [bankAccounts, setBankAccounts] = useState<{ id: string; name: string; bank: string; iban: string }[]>([]);
  const [selectedAccounts, setSelectedAccounts] = useState<Record<string, string>>({});
  const [progress, setProgress] = useState({ current: 0, total: 0, phase: "" });
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const fetchBankAccounts = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("bank_accounts")
      .select("id, name, bank, iban")
      .eq("user_id", user.id);
    setBankAccounts((data as { id: string; name: string; bank: string; iban: string }[]) ?? []);
  }, [user]);

  useEffect(() => {
    fetchBankAccounts();
  }, [fetchBankAccounts]);

  const handleImport = async (bankId: string, file: File) => {
    setImporting(bankId);
    setResults(null);
    setProgress({ current: 0, total: 0, phase: "Bestand lezen..." });

    try {
      const text = await file.text();
      setProgress({ current: 0, total: 0, phase: "Transacties verwerken..." });
      const parsed = parseCSVForBank(bankId, text);

      if (parsed.length === 0) {
        toast({ title: "Geen transacties gevonden", description: "Het bestand bevat geen herkenbare transacties.", variant: "destructive" });
        setImporting(null);
        return;
      }

      setProgress({ current: 0, total: parsed.length, phase: `${parsed.length} transacties gevonden. Duplicaten controleren...` });

      const csvIban = parsed[0]?.iban?.replace(/\s/g, "").toUpperCase();
      let matchedAccount: typeof bankAccounts[0] | undefined;

      if (csvIban) {
        matchedAccount = bankAccounts.find((a) => a.iban.replace(/\s/g, "").toUpperCase() === csvIban);
        if (!matchedAccount) {
          toast({ title: "IBAN niet gevonden", description: `Het CSV-bestand bevat IBAN ${csvIban}, maar deze is nog niet aangemaakt. Ga naar Instellingen om deze bankrekening eerst toe te voegen.`, variant: "destructive" });
          setImporting(null);
          return;
        }
      } else {
        const accountId = selectedAccounts[bankId];
        if (!accountId) {
          toast({ title: "Selecteer een bankrekening", description: "Dit bestandsformaat bevat geen IBAN. Kies handmatig een rekening.", variant: "destructive" });
          setImporting(null);
          return;
        }
        matchedAccount = bankAccounts.find((a) => a.id === accountId);
      }

      if (!matchedAccount) { setImporting(null); return; }

      // Batch: fetch all existing transactions for this account to check duplicates locally
      setProgress({ current: 0, total: parsed.length, phase: "Bestaande transacties ophalen..." });
      const { data: existingTx } = await supabase
        .from("transactions_decrypted" as any)
        .select("date, amount, description, original_description")
        .eq("user_id", user!.id)
        .eq("bank_account_id", matchedAccount.id)
        .limit(50000);

      const existingSet = new Set(
        (existingTx ?? []).map((t: any) =>
          `${t.date}|${t.amount}|${t.description}|${t.original_description || ""}`
        )
      );

      let imported = 0;
      let skipped = 0;
      const toInsert: any[] = [];

      // First pass: check duplicates and prepare contacts
      for (let idx = 0; idx < parsed.length; idx++) {
        const tx = parsed[idx];
        setProgress({
          current: idx + 1,
          total: parsed.length,
          phase: `Verwerken... ${idx + 1}/${parsed.length}`,
        });

        const dupKey = `${tx.date}|${tx.amount}|${tx.counterpartyName || tx.description}|${tx.originalDescription || ""}`;
        if (existingSet.has(dupKey)) {
          skipped++;
          continue;
        }

        let contactId: string | null = null;
        if (tx.counterpartyName && user) {
          const { data: existingContact } = await supabase
            .from("contacts").select("id").eq("user_id", user.id).eq("name", tx.counterpartyName).maybeSingle();

          if (existingContact) {
            contactId = existingContact.id;
            if (tx.counterpartyIban) await supabase.from("contacts").update({ iban: tx.counterpartyIban }).eq("id", contactId);
          } else {
            const { data: newContact } = await supabase
              .from("contacts").insert({ user_id: user.id, name: tx.counterpartyName, iban: tx.counterpartyIban || null }).select("id").single();
            if (newContact) contactId = newContact.id;
          }
        }

        const categoryId = await suggestCategory(tx.counterpartyName || tx.description, tx.originalDescription);
        toInsert.push({
          description: tx.counterpartyName || tx.description,
          amount: tx.amount, currency: tx.currency, type: tx.type,
          category_id: categoryId, date: tx.date,
          bank_account_id: matchedAccount.id, contact_id: contactId,
          transaction_code: tx.transactionCode || null,
          transaction_type: tx.transactionType || null,
          payment_reference: tx.paymentReference || null,
          original_description: tx.originalDescription || null,
          user_id: user!.id,
        });
      }

      // Auto-link to planned transactions
      if (toInsert.length > 0) {
        setProgress({ current: 0, total: toInsert.length, phase: "Geplande transacties koppelen..." });
        
        // Fetch planned transactions for matching
        const { data: plannedTx } = await supabase
          .from("transactions_decrypted" as any)
          .select("id, amount, date, bank_account_id, description, frequency")
          .eq("user_id", user!.id)
          .eq("is_planned", true)
          .limit(50000);
        
        const planned = (plannedTx ?? []) as any[];
        
        for (const tx of toInsert) {
          if (tx.bank_account_id) {
            const txDay = new Date(tx.date).getDate();
            const match = planned.find((p: any) => 
              p.bank_account_id === tx.bank_account_id &&
              Math.abs(Number(p.amount) - tx.amount) < 0.01 &&
              Math.abs(new Date(p.date).getDate() - txDay) <= 2
            );
            if (match) {
              tx.planned_transaction_id = match.id;
            }
          }
        }
      }

      // Batch insert transactions
      if (toInsert.length > 0) {
        setProgress({ current: 0, total: toInsert.length, phase: "Transacties opslaan..." });
        for (let i = 0; i < toInsert.length; i += 200) {
          const batch = toInsert.slice(i, i + 200);
          await supabase.from("transactions").insert(batch as any);
          imported += batch.length;
          setProgress({ current: Math.min(i + 200, toInsert.length), total: toInsert.length, phase: `Opslaan... ${Math.min(i + 200, toInsert.length)}/${toInsert.length}` });
        }
      }

      await refetch();
      setResults({ bankId, count: imported });

      const parts: string[] = [];
      if (imported > 0) parts.push(`${imported} nieuwe transacties geïmporteerd`);
      if (skipped > 0) parts.push(`${skipped} duplicaten overgeslagen`);

      toast({ title: imported > 0 ? "Import geslaagd!" : "Geen nieuwe transacties", description: parts.join(", ") + "." });
    } catch (e: any) {
      toast({ title: "Import mislukt", description: e.message || "Er ging iets mis bij het importeren.", variant: "destructive" });
      // Log failed import for admin debugging
      try {
        const fileText = await file.text().catch(() => "");
        await supabase.from("import_errors" as any).insert({
          user_id: user!.id,
          bank: bankId,
          file_name: file.name,
          error_message: e.message || String(e),
          file_preview: fileText.substring(0, 2000),
        });
      } catch { /* silent */ }
    } finally {
      setImporting(null);
      setProgress({ current: 0, total: 0, phase: "" });
      const input = fileInputRefs.current[bankId];
      if (input) input.value = "";
    }
  };

  const progressPercent = progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Importeren</h1>
          <p className="text-sm text-muted-foreground">
            Importeer je banktransacties — ondersteunt alle grote Nederlandse banken
          </p>
        </div>
        <HelpTooltip
          title="Importeren"
          lines={[
            "Selecteer eerst je bankrekening in de dropdown",
            "Upload daarna het CSV-bestand van je bank",
            "Duplicaten worden automatisch herkend en overgeslagen",
            "Transacties worden automatisch gecategoriseerd op basis van je regels",
          ]}
        />
      </div>

      {/* Progress bar */}
      {importing && (
        <div className="glass-card p-4 space-y-3">
          <div className="flex items-center gap-3">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <div className="flex-1">
              <p className="text-sm font-medium">{progress.phase || "Bezig met importeren..."}</p>
              {progress.total > 0 && (
                <p className="text-xs text-muted-foreground">{progressPercent}% voltooid</p>
              )}
            </div>
          </div>
          {progress.total > 0 && (
            <Progress value={progressPercent} className="h-2" />
          )}
        </div>
      )}

      <div className="grid gap-3">
        {banks.map((bank) => (
          <div key={bank.id} className="glass-card p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-secondary/50 overflow-hidden">
                  <img src={bank.logo} alt={bank.name} className="h-10 w-10 object-contain" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-sm">{bank.name}</h3>
                    <span className="rounded bg-secondary px-1.5 py-0.5 text-[10px] text-secondary-foreground font-medium">
                      {bank.format}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">{bank.description}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {results?.bankId === bank.id && (
                  <span className="flex items-center gap-1 text-xs text-income">
                    <CheckCircle2 className="h-4 w-4" />
                    {results.count} geïmporteerd
                  </span>
                )}
                <Select
                  value={selectedAccounts[bank.id] ?? ""}
                  onValueChange={(v) => setSelectedAccounts((prev) => ({ ...prev, [bank.id]: v }))}
                >
                  <SelectTrigger className="w-[160px] text-xs">
                    <SelectValue placeholder="Kies rekening..." />
                  </SelectTrigger>
                  <SelectContent>
                    {bankAccounts
                      .filter((a) => a.bank === bank.id || a.bank === "other")
                      .map((a) => (
                        <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                      ))}
                    {bankAccounts.filter((a) => a.bank === bank.id || a.bank === "other").length === 0 && (
                      <div className="px-2 py-1.5 text-xs text-muted-foreground">
                        Voeg eerst een rekening toe via Instellingen
                      </div>
                    )}
                  </SelectContent>
                </Select>
                <input
                  type="file"
                  accept=".csv,.txt"
                  className="hidden"
                  ref={(el) => (fileInputRefs.current[bank.id] = el)}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleImport(bank.id, file);
                  }}
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 border-border hover:bg-accent"
                  disabled={importing !== null}
                  onClick={() => fileInputRefs.current[bank.id]?.click()}
                >
                  {importing === bank.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4" />
                  )}
                  {importing === bank.id ? "Bezig..." : "Import"}
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="glass-card p-5">
        <h3 className="mb-4 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          Hoe werkt het?
        </h3>
        <div className="space-y-3">
          {[
            "Exporteer je transacties als CSV uit je bank-app",
            "Upload het bestand via de importknop hierboven",
            "Transacties worden automatisch gecategoriseerd",
            "Duplicaten worden automatisch overgeslagen",
          ].map((step, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="flex h-7 w-7 items-center justify-center rounded-full gradient-primary text-xs font-bold text-primary-foreground">
                {i + 1}
              </div>
              <span className="text-sm">{step}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
