import fs from "node:fs/promises";
import path from "node:path";
import { dbQuery, hasDatabase } from "./db";
import {
  canTransition,
  makeRequestCode,
  type NormalizedRequest,
  type QuoteItem,
  type QuoteStatus,
} from "./request";

export type RequestHistoryEntry = {
  status: QuoteStatus;
  at: string;
};

export type StoredRequest = NormalizedRequest & {
  code: string;
  status: QuoteStatus;
  createdAt: string;
  updatedAt: string;
  history: RequestHistoryEntry[];
};

type RequestRow = {
  code: string;
  name: string;
  phone: string;
  email: string;
  company: string;
  address: string;
  note: string;
  items: QuoteItem[];
  status: QuoteStatus;
  created_at: Date | string;
  updated_at: Date | string;
  history: RequestHistoryEntry[];
};

function mapRow(row: RequestRow): StoredRequest {
  return {
    code: row.code,
    name: row.name,
    phone: row.phone,
    email: row.email,
    company: row.company,
    address: row.address,
    note: row.note,
    items: Array.isArray(row.items) ? row.items : [],
    status: row.status,
    createdAt:
      row.created_at instanceof Date
        ? row.created_at.toISOString()
        : String(row.created_at),
    updatedAt:
      row.updated_at instanceof Date
        ? row.updated_at.toISOString()
        : String(row.updated_at),
    history: Array.isArray(row.history) ? row.history : [],
  };
}

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), "data");
const FILE = path.join(DATA_DIR, "requests.json");

let chain: Promise<unknown> = Promise.resolve();

function withLock<T>(work: () => Promise<T>): Promise<T> {
  const run = chain.then(work, work);
  chain = run.catch(() => undefined);
  return run;
}

async function readAllFile(): Promise<StoredRequest[]> {
  try {
    const raw = await fs.readFile(FILE, "utf8");
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as StoredRequest[]) : [];
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
}

async function writeAllFile(records: StoredRequest[]): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const temp = `${FILE}.tmp`;
  await fs.writeFile(temp, JSON.stringify(records, null, 2), "utf8");
  await fs.rename(temp, FILE);
}

export async function createRequest(input: NormalizedRequest): Promise<StoredRequest> {
  if (hasDatabase()) {
    const now = new Date();
    const prefix = makeRequestCode(now, 1).slice(0, -3);
    const { rows: existing } = await dbQuery<{ code: string }>(
      "SELECT code FROM quote_requests WHERE code LIKE $1",
      [`${prefix}%`]
    );
    const taken = new Set(existing.map((r) => r.code));
    let sequence = existing.length + 1;
    let code = makeRequestCode(now, sequence);
    while (taken.has(code)) {
      sequence += 1;
      code = makeRequestCode(now, sequence);
    }

    const timestamp = now.toISOString();
    const history: RequestHistoryEntry[] = [{ status: "moi", at: timestamp }];
    const { rows } = await dbQuery<RequestRow>(
      `INSERT INTO quote_requests (
        code, name, phone, email, company, address, note, items, status, created_at, updated_at, history
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,'moi',$9,$9,$10::jsonb)
      RETURNING *`,
      [
        code,
        input.name,
        input.phone,
        input.email,
        input.company,
        input.address,
        input.note,
        JSON.stringify(input.items),
        timestamp,
        JSON.stringify(history),
      ]
    );
    return mapRow(rows[0]);
  }

  return withLock(async () => {
    const records = await readAllFile();
    const now = new Date();
    const prefix = makeRequestCode(now, 1).slice(0, -3);

    let sequence = records.filter((record) => record.code.startsWith(prefix)).length + 1;
    let code = makeRequestCode(now, sequence);
    while (records.some((record) => record.code === code)) {
      sequence += 1;
      code = makeRequestCode(now, sequence);
    }

    const timestamp = now.toISOString();
    const record: StoredRequest = {
      ...input,
      code,
      status: "moi",
      createdAt: timestamp,
      updatedAt: timestamp,
      history: [{ status: "moi", at: timestamp }],
    };

    await writeAllFile([record, ...records]);
    return record;
  });
}

export async function listRequests(): Promise<StoredRequest[]> {
  if (hasDatabase()) {
    const { rows } = await dbQuery<RequestRow>(
      "SELECT * FROM quote_requests ORDER BY created_at DESC"
    );
    return rows.map(mapRow);
  }
  const records = await readAllFile();
  return records.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getRequest(code: string): Promise<StoredRequest | null> {
  const normalized = code.trim().toUpperCase();
  if (hasDatabase()) {
    const { rows } = await dbQuery<RequestRow>(
      "SELECT * FROM quote_requests WHERE UPPER(code) = $1",
      [normalized]
    );
    return rows[0] ? mapRow(rows[0]) : null;
  }
  const records = await readAllFile();
  return records.find((record) => record.code.toUpperCase() === normalized) ?? null;
}

export async function findByPhone(phone: string): Promise<StoredRequest[]> {
  const digits = phone.replace(/[^\d]/g, "");
  if (!digits) return [];
  const suffix = digits.slice(-9);

  if (hasDatabase()) {
    const { rows } = await dbQuery<RequestRow>(
      "SELECT * FROM quote_requests WHERE RIGHT(REGEXP_REPLACE(phone, '[^0-9]', '', 'g'), 9) = $1 ORDER BY created_at DESC",
      [suffix]
    );
    return rows.map(mapRow);
  }

  const records = await readAllFile();
  return records
    .filter((record) => record.phone.replace(/[^\d]/g, "").endsWith(suffix))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function updateStatus(
  code: string,
  next: QuoteStatus
): Promise<StoredRequest | null> {
  if (hasDatabase()) {
    const current = await getRequest(code);
    if (!current || !canTransition(current.status, next)) return null;

    const timestamp = new Date().toISOString();
    const history = [...current.history, { status: next, at: timestamp }];
    const { rows } = await dbQuery<RequestRow>(
      `UPDATE quote_requests
       SET status = $1, updated_at = $2, history = $3::jsonb
       WHERE UPPER(code) = $4
       RETURNING *`,
      [next, timestamp, JSON.stringify(history), current.code.toUpperCase()]
    );
    return rows[0] ? mapRow(rows[0]) : null;
  }

  return withLock(async () => {
    const records = await readAllFile();
    const index = records.findIndex(
      (record) => record.code.toUpperCase() === code.trim().toUpperCase()
    );
    if (index < 0) return null;

    const current = records[index];
    if (!canTransition(current.status, next)) return null;

    const timestamp = new Date().toISOString();
    const updated: StoredRequest = {
      ...current,
      status: next,
      updatedAt: timestamp,
      history: [...current.history, { status: next, at: timestamp }],
    };

    records[index] = updated;
    await writeAllFile(records);
    return updated;
  });
}
