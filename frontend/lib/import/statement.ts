/**
 * Parser de extratos bancários para importação de transações.
 *
 * Suporta dois formatos comuns de exportação de bancos brasileiros:
 *  - OFX / QFX (Open Financial Exchange) — padrão de Nubank, Itaú, Inter, etc.
 *  - CSV — com detecção de delimitador (`,`/`;`), cabeçalho e formato de valor
 *    brasileiro (`1.234,56`).
 *
 * Tudo roda no client; nenhum dado sai do navegador até o usuário confirmar a
 * importação.
 */

export interface ImportedTx {
  /** Data no formato YYYY-MM-DD. */
  date: string;
  description: string;
  /** Valor sempre positivo; o sinal vira `type`. */
  amount: number;
  type: "income" | "expense";
  /** Identificador do banco (FITID no OFX) quando disponível — usado na dedupe. */
  externalId?: string;
}

export interface ParseResult {
  items: ImportedTx[];
  format: "ofx" | "csv" | "desconhecido";
  warnings: string[];
}

/** Remove acentos e normaliza para comparação de cabeçalhos/palavras-chave. */
function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function decodeEntities(value: string): string {
  return value
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&quot;/gi, '"');
}

/**
 * Converte um valor monetário em número. Aceita formato brasileiro
 * (`1.234,56`), internacional (`1234.56`) e sinais/símbolos (`R$ -1.234,56`).
 */
export function parseAmount(raw: string): number | null {
  if (!raw) return null;
  let s = raw.replace(/[^0-9.,-]/g, "").trim();
  if (s === "" || s === "-") return null;
  const hasComma = s.includes(",");
  const hasDot = s.includes(".");
  if (hasComma && hasDot) {
    // O último separador é o decimal; o outro é milhar.
    if (s.lastIndexOf(",") > s.lastIndexOf(".")) {
      s = s.replace(/\./g, "").replace(",", ".");
    } else {
      s = s.replace(/,/g, "");
    }
  } else if (hasComma) {
    s = s.replace(",", ".");
  }
  const value = Number(s);
  return Number.isFinite(value) ? value : null;
}

/** Converte datas em YYYY-MM-DD a partir de DD/MM/YYYY, YYYY-MM-DD, etc. */
export function parseDate(raw: string): string | null {
  const s = raw.trim();
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/); // ISO
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = s.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})/); // DD/MM/YYYY
  if (m) {
    const day = m[1].padStart(2, "0");
    const month = m[2].padStart(2, "0");
    const year = m[3].length === 2 ? `20${m[3]}` : m[3];
    if (Number(month) > 12) return null;
    return `${year}-${month}-${day}`;
  }
  m = s.match(/^(\d{8})/); // OFX YYYYMMDD
  if (m) return `${m[1].slice(0, 4)}-${m[1].slice(4, 6)}-${m[1].slice(6, 8)}`;
  return null;
}

function ofxTag(block: string, tag: string): string | null {
  const match = block.match(new RegExp(`<${tag}>([^\\r\\n<]*)`, "i"));
  return match ? match[1].trim() : null;
}

function parseOFX(text: string): ImportedTx[] {
  const items: ImportedTx[] = [];
  const blocks = text.match(/<STMTTRN>[\s\S]*?(?=<STMTTRN>|<\/BANKTRANLIST>|<\/STMTTRN>|$)/gi) ?? [];
  for (const block of blocks) {
    const amtRaw = ofxTag(block, "TRNAMT");
    const dtRaw = ofxTag(block, "DTPOSTED");
    if (!amtRaw || !dtRaw) continue;
    const amount = parseAmount(amtRaw);
    const date = parseDate(dtRaw);
    if (amount === null || amount === 0 || !date) continue;
    const name = ofxTag(block, "NAME") || ofxTag(block, "MEMO") || ofxTag(block, "TRNTYPE") || "Lançamento importado";
    items.push({
      date,
      description: decodeEntities(name).trim().slice(0, 200),
      amount: Math.abs(amount),
      type: amount < 0 ? "expense" : "income",
      externalId: ofxTag(block, "FITID") ?? undefined,
    });
  }
  return items;
}

/** Divide uma linha CSV respeitando aspas duplas. */
function splitCSVLine(line: string, delim: string): string[] {
  const out: string[] = [];
  let cur = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (quoted && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        quoted = !quoted;
      }
    } else if (ch === delim && !quoted) {
      out.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out.map((c) => c.trim());
}

function detectDelimiter(headerLine: string): string {
  const semis = (headerLine.match(/;/g) ?? []).length;
  const commas = (headerLine.match(/,/g) ?? []).length;
  const tabs = (headerLine.match(/\t/g) ?? []).length;
  if (tabs > semis && tabs > commas) return "\t";
  return semis >= commas ? ";" : ",";
}

function findColumn(header: string[], keywords: string[]): number {
  return header.findIndex((cell) => keywords.some((k) => cell.includes(k)));
}

function parseCSV(text: string, warnings: string[]): ImportedTx[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim() !== "");
  if (lines.length < 2) {
    warnings.push("O arquivo CSV não tem linhas suficientes.");
    return [];
  }
  const delim = detectDelimiter(lines[0]);
  const header = splitCSVLine(lines[0], delim).map(normalize);
  const dateIdx = findColumn(header, ["data", "date", "dt"]);
  const descIdx = findColumn(header, ["descricao", "historico", "lancamento", "description", "memo", "detalhe", "estabelecimento", "titulo"]);
  const amtIdx = findColumn(header, ["valor", "amount", "value", "montante", "quantia"]);

  if (dateIdx === -1 || amtIdx === -1) {
    warnings.push(
      "Não reconheci as colunas do CSV (preciso de uma coluna de data e uma de valor). Se possível, exporte o extrato em OFX.",
    );
    return [];
  }

  const items: ImportedTx[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = splitCSVLine(lines[i], delim);
    const date = parseDate(cols[dateIdx] ?? "");
    const amount = parseAmount(cols[amtIdx] ?? "");
    if (!date || amount === null || amount === 0) continue;
    const description = (descIdx !== -1 ? cols[descIdx] : "") || "Lançamento importado";
    items.push({
      date,
      description: description.trim().slice(0, 200),
      amount: Math.abs(amount),
      type: amount < 0 ? "expense" : "income",
    });
  }
  if (items.length === 0) warnings.push("Nenhuma transação válida foi encontrada no CSV.");
  return items;
}

/**
 * Detecta o formato pelo conteúdo/nome e extrai as transações.
 */
export function parseStatement(filename: string, content: string): ParseResult {
  const warnings: string[] = [];
  const lower = filename.toLowerCase();
  const looksOfx = /<STMTTRN>/i.test(content) || /<OFX>/i.test(content) || lower.endsWith(".ofx") || lower.endsWith(".qfx");

  if (looksOfx) {
    const items = parseOFX(content);
    if (items.length === 0) warnings.push("Nenhuma transação encontrada no arquivo OFX.");
    return { items, format: "ofx", warnings };
  }

  if (lower.endsWith(".csv") || lower.endsWith(".txt") || content.includes(";") || content.includes(",")) {
    return { items: parseCSV(content, warnings), format: "csv", warnings };
  }

  warnings.push("Formato não reconhecido. Envie um arquivo .ofx ou .csv.");
  return { items: [], format: "desconhecido", warnings };
}

/**
 * Chave idempotente estável para dedupe na tabela transactions
 * (unique user_id + idempotency_key). Reimportar o mesmo extrato não duplica.
 */
export function importKey(tx: ImportedTx): string {
  if (tx.externalId) return `import:${tx.externalId}`;
  const slug = normalize(tx.description).replace(/\s+/g, "-").slice(0, 40);
  return `import:${tx.date}:${tx.type}:${tx.amount.toFixed(2)}:${slug}`;
}
