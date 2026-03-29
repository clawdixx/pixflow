/**
 * POST /api/seed — Reset demo data for local development.
 * Deletes all records and forces DB re-seed on next access.
 */
import { NextResponse } from "next/server";
import { existsSync, unlinkSync } from "fs";
import { join } from "path";

const DB_PATH = join(process.cwd(), ".pixflow_data", "pixflow.db");

export async function POST() {
  if (existsSync(DB_PATH)) {
    unlinkSync(DB_PATH);
    console.log("[Pixflow] Banco resetado.");
  }
  return NextResponse.json({ ok: true, message: "Banco resetado. Dados serão recriados no próximo acesso." });
}

export async function GET() {
  if (existsSync(DB_PATH)) {
    unlinkSync(DB_PATH);
    console.log("[Pixflow] Banco resetado.");
  }
  return NextResponse.json({ ok: true, message: "Banco resetado." });
}
