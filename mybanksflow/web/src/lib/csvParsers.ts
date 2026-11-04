// CSV parsers for Dutch bank exports

export interface ParsedTransaction {
  date: string; // YYYY-MM-DD
  description: string;
  amount: number;
  type: "income" | "expense";
  currency: string;
  bank: string;
  iban?: string; // source IBAN from the CSV
  counterpartyName?: string; // name of company/person
  counterpartyIban?: string; // IBAN of counterparty
  transactionCode?: string; // e.g. EIC, OVB, GEA, BEA, DV, IC
  transactionType?: string; // descriptive type from bank
  paymentReference?: string; // betalingskenmerk
  originalDescription?: string; // raw omschrijving field
}

function parseCSVLine(line: string, separator: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === separator && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

function dutchDateToISO(d: string): string {
  const parts = d.split("-");
  if (parts.length === 3 && parts[0].length <= 2) return `${parts[2]}-${parts[1]}-${parts[0]}`;
  return d;
}

function parseAmount(raw: string): number {
  const cleaned = raw.trim();
  if (cleaned.includes(",")) {
    return parseFloat(cleaned.replace(/\./g, "").replace(",", "."));
  }
  return parseFloat(cleaned);
}

function detectSeparator(line: string): string {
  if (line.includes("\t")) return "\t";
  if (line.includes(";")) return ";";
  return ",";
}

function cleanField(val: string | undefined): string {
  return (val || "").replace(/^'|'$/g, "").trim();
}

// ── Revolut ──────────────────────────────────────────
export function parseRevolutCSV(text: string): ParsedTransaction[] {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];

  const sep = detectSeparator(lines[0]);
  const headers = parseCSVLine(lines[0], sep)
    .map((h) => h.replace(/^\uFEFF/, "").toLowerCase().trim());

  const descIdx = headers.findIndex((h) => h === "description" || h === "beschrijving");
  const amountIdx = headers.findIndex((h) => h === "amount" || h === "bedrag");
  const currIdx = headers.findIndex((h) => h === "currency" || h === "valuta");
  const dateIdx = headers.findIndex(
    (h) => h.includes("completed") || h.includes("datum voltooid") || h.includes("started") || h.includes("startdatum")
  );
  const stateIdx = headers.findIndex((h) => h === "state" || h === "status");

  if (descIdx < 0 || amountIdx < 0) {
    throw new Error("Ongeldig Revolut CSV-formaat");
  }

  const completedStates = new Set(["completed", "voltooid", "done"]);
  const results: ParsedTransaction[] = [];

  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const cols = parseCSVLine(lines[i], sep);

    if (stateIdx >= 0) {
      const state = (cols[stateIdx] || "").toLowerCase().trim();
      if (state && !completedStates.has(state)) continue;
    }

    const amount = parseAmount(cols[amountIdx] ?? "0");
    if (isNaN(amount)) continue;

    let dateStr = cols[dateIdx] ?? "";
    if (dateStr.includes("-") && dateStr.length >= 10) {
      dateStr = dateStr.substring(0, 10);
    } else {
      const d = new Date(dateStr);
      if (!isNaN(d.getTime())) dateStr = d.toISOString().substring(0, 10);
    }

    results.push({
      date: dateStr,
      description: cols[descIdx] ?? "",
      amount: Math.abs(amount),
      type: amount >= 0 ? "income" : "expense",
      currency: cols[currIdx]?.toUpperCase() ?? "EUR",
      bank: "revolut",
      counterpartyName: cols[descIdx]?.trim() || undefined,
    });
  }

  return results;
}

// ── ING ──────────────────────────────────────────────
export function parseINGCSV(text: string): ParsedTransaction[] {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];

  const sep = detectSeparator(lines[0]);
  const headers = parseCSVLine(lines[0], sep).map((h) => h.toLowerCase().trim());

  const dateIdx = headers.findIndex((h) => h === "datum");
  const nameIdx = headers.findIndex((h) => h.includes("naam") || h.includes("omschrijving"));
  const rekeningIdx = headers.findIndex((h) => h === "rekening");
  const tegenrekeningIdx = headers.findIndex((h) => h === "tegenrekening");
  const codeIdx = headers.findIndex((h) => h === "code");
  const afBijIdx = headers.findIndex((h) => h.includes("af bij"));
  const bedragIdx = headers.findIndex((h) => h.includes("bedrag"));
  const mutatieIdx = headers.findIndex((h) => h.includes("mutatiesoort") || h.includes("mutatie"));
  const medIdx = headers.findIndex((h) => h.includes("mededelingen"));

  if (dateIdx < 0 || bedragIdx < 0) throw new Error("Ongeldig ING CSV-formaat");

  const results: ParsedTransaction[] = [];
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const cols = parseCSVLine(lines[i], sep);

    const rawDate = cols[dateIdx] ?? "";
    const date = rawDate.length === 8
      ? `${rawDate.substring(0, 4)}-${rawDate.substring(4, 6)}-${rawDate.substring(6, 8)}`
      : dutchDateToISO(rawDate);

    const amount = parseAmount(cols[bedragIdx] ?? "0");
    if (isNaN(amount)) continue;

    const isIncome = cols[afBijIdx]?.toLowerCase().trim() === "bij";
    const counterpartyName = nameIdx >= 0 ? cols[nameIdx]?.trim() : undefined;
    const mededelingen = medIdx >= 0 ? cols[medIdx]?.trim() : "";

    results.push({
      date,
      description: counterpartyName || mededelingen || "Onbekend",
      amount: Math.abs(amount),
      type: isIncome ? "income" : "expense",
      currency: "EUR",
      bank: "ing",
      iban: rekeningIdx >= 0 ? cols[rekeningIdx]?.trim() : undefined,
      counterpartyName: counterpartyName || undefined,
      counterpartyIban: tegenrekeningIdx >= 0 ? cols[tegenrekeningIdx]?.trim() : undefined,
      transactionCode: codeIdx >= 0 ? cols[codeIdx]?.trim() : undefined,
      transactionType: mutatieIdx >= 0 ? cols[mutatieIdx]?.trim() : undefined,
      originalDescription: mededelingen || undefined,
    });
  }
  return results;
}

// ── ASN Bank ──────────────────────────────────────────
export function parseASNCSV(text: string): ParsedTransaction[] {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];

  const sep = detectSeparator(lines[0]);
  const headers = parseCSVLine(lines[0], sep).map((h) => h.toLowerCase().trim());
  const dateIdx = headers.findIndex((h) => h === "datum");
  const accountIdx = headers.findIndex((h) => h.includes("je rekening") || h.includes("rekening"));
  const counterpartyIdx = headers.findIndex((h) => h.includes("van / naar") || h.includes("tegenrekening"));
  const nameIdx = headers.findIndex((h) => h === "naam");
  const amountIdx = headers.findIndex((h) => h.includes("bedrag"));
  const descIdx = headers.findIndex((h) => h === "omschrijving");
  const codeIdx = headers.findIndex((h) => h === "code");
  const typeIdx = headers.findIndex((h) => h === "type");
  const payRefIdx = headers.findIndex((h) => h.includes("betalingskenmerk"));

  if (dateIdx < 0 || amountIdx < 0) throw new Error("Ongeldig ASN CSV-formaat");

  const results: ParsedTransaction[] = [];
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const cols = parseCSVLine(lines[i], sep);

    const rawDate = cleanField(cols[dateIdx]);
    const date = dutchDateToISO(rawDate);
    const amount = parseAmount(cleanField(cols[amountIdx]));
    if (isNaN(amount)) continue;

    const counterpartyName = cleanField(cols[nameIdx]);
    const description = cleanField(cols[descIdx]) || counterpartyName || "Onbekend";

    results.push({
      date,
      description: counterpartyName || description,
      amount: Math.abs(amount),
      type: amount >= 0 ? "income" : "expense",
      currency: "EUR",
      bank: "asn",
      iban: cleanField(cols[accountIdx]) || undefined,
      counterpartyName: counterpartyName || undefined,
      counterpartyIban: cleanField(cols[counterpartyIdx]) || undefined,
      transactionCode: cleanField(cols[typeIdx]) || undefined,
      transactionType: cleanField(cols[codeIdx]) || undefined,
      paymentReference: cleanField(cols[payRefIdx]) || undefined,
      originalDescription: cleanField(cols[descIdx]) || undefined,
    });
  }
  return results;
}

// ── ABN AMRO ──────────────────────────────────────────
// Tab-separated: Rekeningnummer, Muntsoort, Transactiedatum, Rentedatum, Beginsaldo, Eindsaldo, Transactiebedrag, Omschrijving
export function parseABNAMROCSV(text: string): ParsedTransaction[] {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 1) return [];

  const sep = "\t";
  // ABN AMRO may or may not have headers
  const firstCols = parseCSVLine(lines[0], sep);
  const hasHeaders = firstCols[0]?.toLowerCase().includes("rekening");
  const startIdx = hasHeaders ? 1 : 0;

  const results: ParsedTransaction[] = [];
  for (let i = startIdx; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const cols = parseCSVLine(lines[i], sep);

    const iban = cols[0]?.trim();
    const rawDate = cols[2]?.trim() ?? "";
    // YYYYMMDD format
    const date = rawDate.length === 8
      ? `${rawDate.substring(0, 4)}-${rawDate.substring(4, 6)}-${rawDate.substring(6, 8)}`
      : dutchDateToISO(rawDate);

    const amount = parseAmount(cols[6] ?? "0");
    if (isNaN(amount)) continue;

    const description = cols[7]?.trim() ?? "Onbekend";
    // Try to extract counterparty name from description
    const nameMatch = description.match(/^(?:SEPA|ABN AMRO Bank)\s+.*?(?:Naam:\s*)(.+?)(?:\s+(?:IBAN|Kenmerk|Omschrijving|$))/i)
      || description.match(/^(.+?)(?:\s{2,})/);
    const counterpartyName = nameMatch?.[1]?.trim();

    // Extract counterparty IBAN
    const ibanMatch = description.match(/IBAN:\s*([A-Z]{2}\d{2}[A-Z0-9]+)/i);

    results.push({
      date,
      description: counterpartyName || description.substring(0, 60),
      amount: Math.abs(amount),
      type: amount >= 0 ? "income" : "expense",
      currency: cols[1]?.trim() || "EUR",
      bank: "abnamro",
      iban,
      counterpartyName: counterpartyName || undefined,
      counterpartyIban: ibanMatch?.[1] || undefined,
      originalDescription: description,
    });
  }
  return results;
}

// ── Rabobank ──────────────────────────────────────────
// CSV with headers: IBAN/BBAN, Munt, BIC, Volgnr, Datum, Rentedatum, Bedrag, Saldo na trn,
// Tegenrekening IBAN/BBAN, Naam tegenpartij, Naam uiteindelijke partij, Naam initiërende partij,
// BIC tegenpartij, Code, Batch ID, Transactiereferentie, Machtigingskenmerk, Incassant ID,
// Betalingskenmerk, Omschrijving-1, Omschrijving-2, Omschrijving-3, Reden retour, Oorspr bedrag, Oorspr munt, Koers
export function parseRabobankCSV(text: string): ParsedTransaction[] {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];

  const sep = detectSeparator(lines[0]);
  const headers = parseCSVLine(lines[0], sep).map((h) => h.toLowerCase().trim());

  const ibanIdx = headers.findIndex((h) => h.includes("iban") && !h.includes("tegen"));
  const dateIdx = headers.findIndex((h) => h === "datum");
  const amountIdx = headers.findIndex((h) => h === "bedrag");
  const counterIbanIdx = headers.findIndex((h) => h.includes("tegenrekening"));
  const nameIdx = headers.findIndex((h) => h.includes("naam tegenpartij"));
  const codeIdx = headers.findIndex((h) => h === "code");
  const payRefIdx = headers.findIndex((h) => h.includes("betalingskenmerk"));
  const desc1Idx = headers.findIndex((h) => h === "omschrijving-1");
  const desc2Idx = headers.findIndex((h) => h === "omschrijving-2");
  const desc3Idx = headers.findIndex((h) => h === "omschrijving-3");
  const currIdx = headers.findIndex((h) => h === "munt");

  if (dateIdx < 0 || amountIdx < 0) throw new Error("Ongeldig Rabobank CSV-formaat");

  const results: ParsedTransaction[] = [];
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const cols = parseCSVLine(lines[i], sep);

    const rawDate = cols[dateIdx]?.trim() ?? "";
    const date = rawDate.includes("-") ? dutchDateToISO(rawDate) :
      rawDate.length === 8 ? `${rawDate.substring(0, 4)}-${rawDate.substring(4, 6)}-${rawDate.substring(6, 8)}` : rawDate;

    const amount = parseAmount(cols[amountIdx] ?? "0");
    if (isNaN(amount)) continue;

    const counterpartyName = cols[nameIdx]?.trim();
    const desc = [cols[desc1Idx], cols[desc2Idx], cols[desc3Idx]].filter(Boolean).join(" ").trim();

    results.push({
      date,
      description: counterpartyName || desc || "Onbekend",
      amount: Math.abs(amount),
      type: amount >= 0 ? "income" : "expense",
      currency: cols[currIdx]?.trim() || "EUR",
      bank: "rabobank",
      iban: cols[ibanIdx]?.trim() || undefined,
      counterpartyName: counterpartyName || undefined,
      counterpartyIban: cols[counterIbanIdx]?.trim() || undefined,
      transactionCode: cols[codeIdx]?.trim() || undefined,
      paymentReference: cols[payRefIdx]?.trim() || undefined,
      originalDescription: desc || undefined,
    });
  }
  return results;
}

// ── SNS Bank ──────────────────────────────────────────
// Same format as ASN (both part of de Volksbank)
export function parseSNSCSV(text: string): ParsedTransaction[] {
  const parsed = parseASNCSV(text);
  return parsed.map((t) => ({ ...t, bank: "sns" }));
}

// ── RegioBank ──────────────────────────────────────────
// Same format as ASN/SNS (part of de Volksbank)
export function parseRegioBankCSV(text: string): ParsedTransaction[] {
  const parsed = parseASNCSV(text);
  return parsed.map((t) => ({ ...t, bank: "regiobank" }));
}

// ── Triodos ──────────────────────────────────────────
// CSV: Datum, Naam / Omschrijving, Rekening, Tegenrekening, Code, Af Bij, Bedrag, Mutatiesoort, Mededelingen
// Similar to ING format
export function parseTriodosCSV(text: string): ParsedTransaction[] {
  const parsed = parseINGCSV(text);
  return parsed.map((t) => ({ ...t, bank: "triodos" }));
}

// ── Knab ──────────────────────────────────────────
// CSV with semicolons: Rekeningnummer, Transactiedatum, Valutadatum, Beginsaldo, Eindsaldo, Transactiebedrag,
// Omschrijving
export function parseKnabCSV(text: string): ParsedTransaction[] {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];

  const sep = detectSeparator(lines[0]);
  const headers = parseCSVLine(lines[0], sep).map((h) => h.toLowerCase().trim());

  const ibanIdx = headers.findIndex((h) => h.includes("rekeningnummer") || h.includes("rekening"));
  const dateIdx = headers.findIndex((h) => h.includes("transactiedatum") || h === "datum");
  const amountIdx = headers.findIndex((h) => h.includes("transactiebedrag") || h.includes("bedrag"));
  const descIdx = headers.findIndex((h) => h.includes("omschrijving"));

  if (dateIdx < 0 || amountIdx < 0) throw new Error("Ongeldig Knab CSV-formaat");

  const results: ParsedTransaction[] = [];
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const cols = parseCSVLine(lines[i], sep);

    const rawDate = cols[dateIdx]?.trim() ?? "";
    const date = rawDate.includes("-") ? dutchDateToISO(rawDate) :
      rawDate.length === 8 ? `${rawDate.substring(0, 4)}-${rawDate.substring(4, 6)}-${rawDate.substring(6, 8)}` : rawDate;

    const amount = parseAmount(cols[amountIdx] ?? "0");
    if (isNaN(amount)) continue;

    const desc = cols[descIdx]?.trim() ?? "Onbekend";

    results.push({
      date,
      description: desc,
      amount: Math.abs(amount),
      type: amount >= 0 ? "income" : "expense",
      currency: "EUR",
      bank: "knab",
      iban: cols[ibanIdx]?.trim() || undefined,
      originalDescription: desc,
    });
  }
  return results;
}

// ── bunq ──────────────────────────────────────────
// CSV: Date, Amount, Account, Counterparty, Name, Description
export function parseBunqCSV(text: string): ParsedTransaction[] {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];

  const sep = detectSeparator(lines[0]);
  const headers = parseCSVLine(lines[0], sep).map((h) => h.toLowerCase().trim());

  const dateIdx = headers.findIndex((h) => h === "date" || h === "datum");
  const amountIdx = headers.findIndex((h) => h === "amount" || h.includes("bedrag"));
  const accountIdx = headers.findIndex((h) => h === "account" || h.includes("rekening"));
  const counterIdx = headers.findIndex((h) => h === "counterparty" || h.includes("tegenrekening"));
  const nameIdx = headers.findIndex((h) => h === "name" || h === "naam");
  const descIdx = headers.findIndex((h) => h === "description" || h.includes("omschrijving"));

  if (dateIdx < 0 || amountIdx < 0) throw new Error("Ongeldig bunq CSV-formaat");

  const results: ParsedTransaction[] = [];
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const cols = parseCSVLine(lines[i], sep);

    const rawDate = cols[dateIdx]?.trim() ?? "";
    let date = rawDate;
    if (rawDate.includes("-") && rawDate.split("-")[0].length <= 2) {
      date = dutchDateToISO(rawDate);
    } else if (rawDate.length === 10) {
      date = rawDate; // Already YYYY-MM-DD
    }

    const amount = parseAmount(cols[amountIdx] ?? "0");
    if (isNaN(amount)) continue;

    const name = cols[nameIdx]?.trim();
    const desc = cols[descIdx]?.trim();

    results.push({
      date,
      description: name || desc || "Onbekend",
      amount: Math.abs(amount),
      type: amount >= 0 ? "income" : "expense",
      currency: "EUR",
      bank: "bunq",
      iban: cols[accountIdx]?.trim() || undefined,
      counterpartyName: name || undefined,
      counterpartyIban: cols[counterIdx]?.trim() || undefined,
      originalDescription: desc || undefined,
    });
  }
  return results;
}

// ── N26 ──────────────────────────────────────────
// CSV: Date, Payee, Account number, Transaction type, Payment reference, Amount (EUR), Amount (Foreign Currency), Type Foreign Currency, Exchange Rate
export function parseN26CSV(text: string): ParsedTransaction[] {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];

  const sep = detectSeparator(lines[0]);
  const headers = parseCSVLine(lines[0], sep).map((h) => h.toLowerCase().trim());

  const dateIdx = headers.findIndex((h) => h === "date" || h === "datum");
  const payeeIdx = headers.findIndex((h) => h === "payee" || h.includes("naam"));
  const accountIdx = headers.findIndex((h) => h.includes("account number") || h.includes("rekening"));
  const typeIdx = headers.findIndex((h) => h.includes("transaction type") || h.includes("type"));
  const refIdx = headers.findIndex((h) => h.includes("payment reference") || h.includes("referentie"));
  const amountIdx = headers.findIndex((h) => h.includes("amount") || h.includes("bedrag"));

  if (dateIdx < 0 || amountIdx < 0) throw new Error("Ongeldig N26 CSV-formaat");

  const results: ParsedTransaction[] = [];
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const cols = parseCSVLine(lines[i], sep);

    const date = cols[dateIdx]?.trim() ?? "";
    const amount = parseAmount(cols[amountIdx] ?? "0");
    if (isNaN(amount)) continue;

    const payee = cols[payeeIdx]?.trim();

    results.push({
      date,
      description: payee || "Onbekend",
      amount: Math.abs(amount),
      type: amount >= 0 ? "income" : "expense",
      currency: "EUR",
      bank: "n26",
      counterpartyName: payee || undefined,
      counterpartyIban: cols[accountIdx]?.trim() || undefined,
      transactionType: cols[typeIdx]?.trim() || undefined,
      paymentReference: cols[refIdx]?.trim() || undefined,
    });
  }
  return results;
}

export function parseCSVForBank(bankId: string, text: string): ParsedTransaction[] {
  switch (bankId) {
    case "revolut": return parseRevolutCSV(text);
    case "ing": return parseINGCSV(text);
    case "asn": return parseASNCSV(text);
    case "abnamro": return parseABNAMROCSV(text);
    case "rabobank": return parseRabobankCSV(text);
    case "sns": return parseSNSCSV(text);
    case "regiobank": return parseRegioBankCSV(text);
    case "triodos": return parseTriodosCSV(text);
    case "knab": return parseKnabCSV(text);
    case "bunq": return parseBunqCSV(text);
    case "n26": return parseN26CSV(text);
    default: throw new Error(`Onbekende bank: ${bankId}`);
  }
}
