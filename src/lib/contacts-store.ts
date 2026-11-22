import fs from "node:fs/promises";
import path from "node:path";
import type { NormalizedContact } from "./contact";
import { dbQuery, hasDatabase } from "./db";

export type ContactMessage = NormalizedContact & {
  id: string;
  createdAt: string;
};

type ContactRow = {
  id: string;
  name: string;
  phone: string;
  email: string;
  message: string;
  created_at: Date | string;
};

function mapRow(row: ContactRow): ContactMessage {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    email: row.email,
    message: row.message,
    createdAt:
      row.created_at instanceof Date
        ? row.created_at.toISOString()
        : String(row.created_at),
  };
}

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), "data");
const FILE = path.join(DATA_DIR, "contacts.json");

let chain: Promise<unknown> = Promise.resolve();

function withLock<T>(work: () => Promise<T>): Promise<T> {
  const run = chain.then(work, work);
  chain = run.catch(() => undefined);
  return run;
}

async function readAllFile(): Promise<ContactMessage[]> {
  try {
    const raw = await fs.readFile(FILE, "utf8");
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as ContactMessage[]) : [];
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
}

async function writeAllFile(records: ContactMessage[]): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const temp = `${FILE}.tmp`;
  await fs.writeFile(temp, JSON.stringify(records, null, 2), "utf8");
  await fs.rename(temp, FILE);
}

export async function createContact(input: NormalizedContact): Promise<ContactMessage> {
  if (hasDatabase()) {
    const now = new Date();
    const stamp = now.toISOString().slice(0, 10).replace(/-/g, "").slice(2);
    const { rows: existing } = await dbQuery<{ id: string }>(
      "SELECT id FROM contact_messages WHERE id LIKE $1",
      [`LH-${stamp}-%`]
    );
    const taken = new Set(existing.map((r) => r.id));
    let seq = existing.length + 1;
    let id = `LH-${stamp}-${String(seq).padStart(3, "0")}`;
    while (taken.has(id)) {
      seq += 1;
      id = `LH-${stamp}-${String(seq).padStart(3, "0")}`;
    }

    const { rows } = await dbQuery<ContactRow>(
      `INSERT INTO contact_messages (id, name, phone, email, message, created_at)
       VALUES ($1,$2,$3,$4,$5,$6)
       RETURNING *`,
      [id, input.name, input.phone, input.email, input.message, now.toISOString()]
    );
    return mapRow(rows[0]);
  }

  return withLock(async () => {
    const records = await readAllFile();
    const now = new Date();
    const stamp = now.toISOString().slice(0, 10).replace(/-/g, "").slice(2);
    const record: ContactMessage = {
      ...input,
      id: `LH-${stamp}-${String(records.length + 1).padStart(3, "0")}`,
      createdAt: now.toISOString(),
    };
    await writeAllFile([record, ...records]);
    return record;
  });
}

export async function listContacts(): Promise<ContactMessage[]> {
  if (hasDatabase()) {
    const { rows } = await dbQuery<ContactRow>(
      "SELECT * FROM contact_messages ORDER BY created_at DESC"
    );
    return rows.map(mapRow);
  }
  const records = await readAllFile();
  return records.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
