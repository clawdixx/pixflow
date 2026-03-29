/**
 * SQLite database for local prototype.
 * Mirrors the Drizzle ORM query API but uses better-sqlite3 under the hood.
 *
 * Usage (drop-in replacement for drizzle(neon(...))):
 *   import { db, eq, and } from "@/lib/db";
 *
 * In production, swap this file for:
 *   import { drizzle } from "drizzle-orm/neon-http";
 *   import { neon } from "@neondatabase/serverless";
 *   export const db = drizzle(neon(process.env.DATABASE_URL!));
 */
import Database from "better-sqlite3";
import { join } from "path";
import { existsSync, mkdirSync } from "fs";

const DB_DIR = join(process.cwd(), ".pixflow_data");
const DB_PATH = join(DB_DIR, "pixflow.db");

// Ensure data directory exists
if (!existsSync(DB_DIR)) mkdirSync(DB_DIR, { recursive: true });

let _db: Database.Database | null = null;

function getDb(): Database.Database {
  if (!_db) {
    _db = new Database(DB_PATH);
    _db.pragma("journal_mode = WAL");
    _db.pragma("foreign_keys = ON");
    initSchema(_db);
    seedDemoData(_db);
  }
  return _db;
}

// ─── Schema Init ─────────────────────────────────────────────────────────────

function initSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS pixflow_users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      phone TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS pixflow_customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      email TEXT,
      phone TEXT NOT NULL,
      asaas_customer_id TEXT,
      notes TEXT,
      is_active INTEGER DEFAULT 1 NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS pixflow_payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      customer_id INTEGER NOT NULL,
      asaas_payment_id TEXT UNIQUE,
      amount TEXT NOT NULL,
      status TEXT DEFAULT 'PENDING' NOT NULL,
      due_date TEXT NOT NULL,
      paid_at TEXT,
      pix_qr_code TEXT,
      pix_copy_code TEXT,
      payment_url TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS pixflow_follow_up_schedules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      payment_id INTEGER NOT NULL,
      user_id TEXT NOT NULL,
      customer_id INTEGER NOT NULL,
      step TEXT NOT NULL,
      scheduled_for TEXT NOT NULL,
      sent_at TEXT,
      status TEXT DEFAULT 'PENDING' NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS pixflow_follow_up_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      follow_up_schedule_id INTEGER,
      customer_id INTEGER NOT NULL,
      payment_id INTEGER NOT NULL,
      user_id TEXT NOT NULL,
      message_type TEXT NOT NULL,
      content TEXT NOT NULL,
      zapi_message_id TEXT,
      zapi_status TEXT DEFAULT 'QUEUED',
      sent_at TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);
}

// ─── Demo Seed Data ───────────────────────────────────────────────────────────

function seedDemoData(db: Database.Database) {
  // Only seed if users table is empty
  const userCount = db.prepare("SELECT COUNT(*) as c FROM pixflow_users").get() as { c: number };
  if (userCount.c > 0) return;

  const DEMO_USER = "demo-user";
  const now = new Date();

  // Demo user
  db.prepare(`INSERT INTO pixflow_users (id, name, email, phone) VALUES (?, ?, ?, ?)`).run(
    DEMO_USER, "Marcos Felipe", "marcos@pixflow.com.br", "5511988887777"
  );

  // Customers
  const insertCustomer = db.prepare(
    `INSERT INTO pixflow_customers (user_id, name, email, phone, notes, is_active) VALUES (?, ?, ?, ?, ?, ?)`
  );
  const maria = insertCustomer.run(DEMO_USER, "Maria da Silva", "maria@design.com.br", "5511999990001", "Designer freelance — projeto de identidade visual", 1);
  const joao = insertCustomer.run(DEMO_USER, "João Santos", "joao@santos.com.br", "5511999990002", "Fotógrafo — ensaio corporativo", 1);
  const ana = insertCustomer.run(DEMO_USER, "Ana Costa", "ana@costadv.com.br", "5511999990003", "Advogada — Landing page", 1);

  // Dates
  const overdue4d = new Date(now); overdue4d.setDate(overdue4d.getDate() - 4);
  const overdue8d = new Date(now); overdue8d.setDate(overdue8d.getDate() - 8);
  const dueIn3d = new Date(now); dueIn3d.setDate(dueIn3d.getDate() + 3);
  const dueIn7d = new Date(now); dueIn7d.setDate(dueIn7d.getDate() + 7);
  const dueIn14d = new Date(now); dueIn14d.setDate(dueIn14d.getDate() + 14);

  const toISO = (d: Date) => d.toISOString().split("T")[0];

  const insertPayment = db.prepare(
    `INSERT INTO pixflow_payments (user_id, customer_id, asaas_payment_id, amount, status, due_date, pix_copy_code, pix_qr_code, payment_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  const p1 = insertPayment.run(DEMO_USER, maria.lastInsertRowid, "pay_seed_001", "850.00", "OVERDUE", toISO(overdue4d),
    "00020126580014br.gov.bcb.pix0136{a1b2c3d4e5f6}5204000053039865403", "https://api.qrserver.com/v1/create-qr-code", "https://asaas.com/c/pay_seed_001");
  const p2 = insertPayment.run(DEMO_USER, joao.lastInsertRowid, "pay_seed_002", "1200.00", "PENDING", toISO(dueIn3d),
    "00020126580014br.gov.bcb.pix0136{e5f6g7h8}5204000053039865404", "https://api.qrserver.com/v1/create-qr-code", "https://asaas.com/c/pay_seed_002");
  const p3 = insertPayment.run(DEMO_USER, ana.lastInsertRowid, "pay_seed_003", "450.00", "OVERDUE", toISO(overdue8d),
    "00020126580014br.gov.bcb.pix0136{i9j0k1l2m3n}5204000053039865405", "https://api.qrserver.com/v1/create-qr-code", "https://asaas.com/c/pay_seed_003");

  // Schedules for p1 (overdue 4d — D3 sent, D7 + D14 pending)
  const insertSchedule = db.prepare(
    `INSERT INTO pixflow_follow_up_schedules (payment_id, user_id, customer_id, step, scheduled_for, sent_at, status) VALUES (?, ?, ?, ?, ?, ?, ?)`
  );
  const d3_1 = new Date(overdue4d); d3_1.setDate(d3_1.getDate() + 3);
  const d7_1 = new Date(overdue4d); d7_1.setDate(d7_1.getDate() + 7);
  const d14_1 = new Date(overdue4d); d14_1.setDate(d14_1.getDate() + 14);
  insertSchedule.run(p1.lastInsertRowid, DEMO_USER, maria.lastInsertRowid, "D3", toISO(d3_1), toISO(d3_1), "SENT");
  insertSchedule.run(p1.lastInsertRowid, DEMO_USER, maria.lastInsertRowid, "D7", toISO(d7_1), null, "PENDING");
  insertSchedule.run(p1.lastInsertRowid, DEMO_USER, maria.lastInsertRowid, "D14", toISO(d14_1), null, "PENDING");

  // Schedules for p2 (pending — all pending)
  insertSchedule.run(p2.lastInsertRowid, DEMO_USER, joao.lastInsertRowid, "D3", toISO(dueIn3d), null, "PENDING");
  insertSchedule.run(p2.lastInsertRowid, DEMO_USER, joao.lastInsertRowid, "D7", toISO(dueIn7d), null, "PENDING");
  insertSchedule.run(p2.lastInsertRowid, DEMO_USER, joao.lastInsertRowid, "D14", toISO(dueIn14d), null, "PENDING");

  // Schedules for p3 (overdue 8d — D3 + D7 sent, D14 pending)
  const d3_3 = new Date(overdue8d); d3_3.setDate(d3_3.getDate() + 3);
  const d7_3 = new Date(overdue8d); d7_3.setDate(d7_3.getDate() + 7);
  const d14_3 = new Date(overdue8d); d14_3.setDate(d14_3.getDate() + 14);
  insertSchedule.run(p3.lastInsertRowid, DEMO_USER, ana.lastInsertRowid, "D3", toISO(d3_3), toISO(d3_3), "SENT");
  insertSchedule.run(p3.lastInsertRowid, DEMO_USER, ana.lastInsertRowid, "D7", toISO(d7_3), toISO(d7_3), "SENT");
  insertSchedule.run(p3.lastInsertRowid, DEMO_USER, ana.lastInsertRowid, "D14", toISO(d14_3), null, "PENDING");

  console.log("[Pixflow DB] Dados de demo inicializados.");
}

// ─── SQL helpers ─────────────────────────────────────────────────────────────

function mapRowKeys(row: Record<string, unknown>, colMap: Record<string, string>): Record<string, unknown> {
  // Map DB snake_case columns to camelCase
  const result: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(row)) {
    result[colMap[key] ?? key] = val;
  }
  return result;
}

// Column name mapping: DB snake_case → camelCase
const USER_COLS: Record<string, string> = {
  id: "id", name: "name", email: "email", phone: "phone",
  asaas_api_key: "asaasApiKey", zapi_instance_id: "zapiInstanceId",
  zapi_token: "zapiToken", created_at: "createdAt", updated_at: "updatedAt",
};

const CUSTOMER_COLS: Record<string, string> = {
  id: "id", user_id: "userId", name: "name", email: "email", phone: "phone",
  asaas_customer_id: "asaasCustomerId", notes: "notes",
  is_active: "isActive", created_at: "createdAt", updated_at: "updatedAt",
};

const PAYMENT_COLS: Record<string, string> = {
  id: "id", user_id: "userId", customer_id: "customerId",
  asaas_payment_id: "asaasPaymentId", amount: "amount", status: "status",
  due_date: "dueDate", paid_at: "paidAt", pix_qr_code: "pixQrCode",
  pix_copy_code: "pixCopyCode", payment_url: "paymentUrl",
  created_at: "createdAt", updated_at: "updatedAt",
};

const SCHEDULE_COLS: Record<string, string> = {
  id: "id", payment_id: "paymentId", user_id: "userId", customer_id: "customerId",
  step: "step", scheduled_for: "scheduledFor", sent_at: "sentAt",
  status: "status", created_at: "createdAt",
};

const MESSAGE_COLS: Record<string, string> = {
  id: "id", follow_up_schedule_id: "followUpScheduleId", customer_id: "customerId",
  payment_id: "paymentId", user_id: "userId", message_type: "messageType",
  content: "content", zapi_message_id: "zapiMessageId",
  zapi_status: "zapiStatus", sent_at: "sentAt", created_at: "createdAt",
};

// ─── Query Interface ─────────────────────────────────────────────────────────

export const db = {
  select<T = Record<string, unknown>>(cols?: string[]) {
    return new SelectBuilder<T>(getDb(), cols);
  },
  insert<T = Record<string, unknown>>(table: string) {
    return new InsertBuilder<T>(getDb(), table);
  },
  update<T = Record<string, unknown>>(table: string) {
    return new UpdateBuilder<T>(getDb(), table);
  },
  delete<T = Record<string, unknown>>(table: string) {
    return new DeleteBuilder<T>(getDb(), table);
  },
};

// ─── Select Builder ──────────────────────────────────────────────────────────

class SelectBuilder<T> {
  private _db: Database.Database;
  private _cols: string[];
  private _table = "";
  private _joins: string[] = [];
  private _whereSql = "";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private _whereParams: any[] = [];
  private _orderSql = "";
  private _limitN?: number;
  private _colMap: Record<string, string> = {};

  constructor(db: Database.Database, cols?: string[]) {
    this._db = db;
    // Only apply table alias prefix if cols explicitly include table qualifiers
    this._cols = (cols ?? ["*"]).map((c) => c.includes(".") ? c : c);
  }

  from(table: string, colMap: Record<string, string> = {}) {
    this._table = table;
    this._colMap = colMap;
    return this;
  }

  innerJoin(table: string, on: string, colMap: Record<string, string> = {}) {
    this._joins.push(`INNER JOIN ${table} ON ${on}`);
    // Add columns from joined table
    for (const [dbCol, camelCol] of Object.entries(colMap)) {
      if (dbCol !== "id") this._cols.push(`${table}.${dbCol} as ${camelCol}`);
    }
    return this;
  }

  where(sql: string, ...params: unknown[]) {
    if (this._whereSql) this._whereSql += " AND " + sql;
    else this._whereSql = sql;
    this._whereParams.push(...params);
    return this;
  }

  orderBy(col: string, dir: "ASC" | "DESC" = "ASC") {
    this._orderSql = ` ORDER BY ${col} ${dir}`;
    return this;
  }

  limit(n: number) {
    this._limitN = n;
    return this;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  all(): any[] {
    const cols = this._cols.length > 0 ? this._cols.join(", ") : "*";
    let sql = `SELECT ${cols} FROM ${this._table}`;
    if (this._joins.length > 0) sql += " " + this._joins.join(" ");
    if (this._whereSql) sql += " WHERE " + this._whereSql;
    sql += this._orderSql;
    if (this._limitN !== undefined) sql += ` LIMIT ${this._limitN}`;
    const rows = this._db.prepare(sql).all(...this._whereParams) as Record<string, unknown>[];
    return rows.map((r) => mapRowKeys(r, this._colMap));
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  allTyped(): any[] { return this.all(); }
}

// ─── Insert Builder ──────────────────────────────────────────────────────────

class InsertBuilder<T> {
  private _db: Database.Database;
  private _table: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private _rows: Record<string, any>[] = [];

  constructor(db: Database.Database, table: string) {
    this._db = db;
    this._table = table;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  values(rows: Record<string, any>[]) {
    // Convert camelCase keys to snake_case + normalize booleans for SQLite
    this._rows = rows.map((r) => {
      const result: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(r)) {
        const snakeKey = k.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
        // SQLite boolean: true → 1, false → 0
        if (v === true) result[snakeKey] = 1;
        else if (v === false) result[snakeKey] = 0;
        else result[snakeKey] = v;
      }
      return result;
    });
    return this;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  returning(): { all: () => any[] } {
    if (this._rows.length === 0) return { all: () => [] };
    const keys = Object.keys(this._rows[0]);
    // Use ? placeholders with indexed $1, $2, etc for better-sqlite3
    const placeholders = this._rows.map((_, ri) =>
      `(${keys.map((_, ki) => `$${ri * keys.length + ki + 1}`).join(", ")})`
    ).join(", ");
    const flat: unknown[] = this._rows.flatMap((r) => keys.map((k) => r[k]));
    const sql = `INSERT INTO ${this._table} (${keys.join(", ")}) VALUES ${placeholders}`;
    console.log(`[INSERT DEBUG] SQL: ${sql} | PARAMS count: ${flat.length} | values:`, JSON.stringify(flat));
    const info = this._db.prepare(sql).run(...flat);
    // Return inserted rows by fetching them back
    const startId = Number(info.lastInsertRowid) - this._rows.length + 1;
    const ids = this._rows.map((_, i) => startId + i);
    const questionMarks = ids.map((_, i) => `$${i + 1}`).join(", ");
    const pk = this._db.prepare(`SELECT rowid FROM ${this._table} WHERE rowid IN (${questionMarks})`).all(...ids) as { rowid: number }[];
    const result = pk.map((r) => {
      const row = this._db.prepare(`SELECT * FROM ${this._table} WHERE rowid = ?`).get(r.rowid);
      return mapRowKeys(row as Record<string, unknown>, {});
    });
    return { all: () => result };
  }
}

// ─── Update Builder ──────────────────────────────────────────────────────────

class UpdateBuilder<T> {
  private _db: Database.Database;
  private _table: string;
  private _whereSql = "";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private _whereParams: any[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private _setData: Record<string, any> = {};

  constructor(db: Database.Database, table: string) {
    this._db = db;
    this._table = table;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  set(data: Record<string, any>) {
    // Convert camelCase keys + normalize booleans for SQLite
    const result: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(data)) {
      const snakeKey = k.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
      if (v === true) result[snakeKey] = 1;
      else if (v === false) result[snakeKey] = 0;
      else result[snakeKey] = v;
    }
    this._setData = result;
    return this;
  }

  where(sql: string, ...params: unknown[]) {
    this._whereSql = sql;
    this._whereParams = params;
    return this;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  returning(): { all: () => any[] } {
    const setKeys = Object.keys(this._setData);
    const setClause = setKeys.map((k) => `${k} = ?`).join(", ");
    const setValues = setKeys.map((k) => this._setData[k]);
    const sql = `UPDATE ${this._table} SET ${setClause} WHERE ${this._whereSql}`;
    this._db.prepare(sql).run(...setValues, ...this._whereParams);
    const rows = this._db.prepare(`SELECT * FROM ${this._table} WHERE ${this._whereSql}`).all(...this._whereParams) as Record<string, unknown>[];
    return { all: () => rows.map((r) => mapRowKeys(r, {})) };
  }
}

// ─── Delete Builder ──────────────────────────────────────────────────────────

class DeleteBuilder<T> {
  private _db: Database.Database;
  private _table: string;
  private _whereSql = "";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private _whereParams: any[] = [];

  constructor(db: Database.Database, table: string) {
    this._db = db;
    this._table = table;
  }

  where(sql: string, ...params: unknown[]) {
    this._whereSql = sql;
    this._whereParams = params;
    return this;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  returning(): { all: () => any[] } {
    const rows = this._db.prepare(`SELECT * FROM ${this._table} WHERE ${this._whereSql}`).all(...this._whereParams) as Record<string, unknown>[];
    this._db.prepare(`DELETE FROM ${this._table} WHERE ${this._whereSql}`).run(...this._whereParams);
    return { all: () => rows.map((r) => mapRowKeys(r, {})) };
  }
}

// ─── Helper exports ──────────────────────────────────────────────────────────

// Map camelCase DB fields to snake_case SQL columns
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function toSnake(obj: Record<string, any>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    const snake = k.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
    result[snake] = v;
  }
  return result;
}

// eq() helper for WHERE clauses
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function eq(col: any, val: unknown): string {
  if (val === null) return `${String(col)} IS NULL`;
  return `${String(col)} = ?`;
}

export function and(...conditions: string[]): string {
  return conditions.filter(Boolean).join(" AND ");
}
