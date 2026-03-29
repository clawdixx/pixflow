import { NextRequest, NextResponse } from "next/server";
import { db, eq } from "@/lib/db";
import { z } from "zod";

const updateCustomerSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  email: z.string().email().optional(),
  phone: z.string().min(8).max(20).optional(),
  notes: z.string().optional(),
  isActive: z.boolean().optional(),
});

// GET /api/customers/[id]
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const rows = db.select().from("pixflow_customers").where(eq("id", parseInt(id)), parseInt(id)).limit(1).all();
  if (rows.length === 0) {
    return NextResponse.json({ error: "Cliente não encontrado" }, { status: 404 });
  }
  return NextResponse.json(rows[0]);
}

// PATCH /api/customers/[id]
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = updateCustomerSchema.parse(await req.json());

  const result = db
    .update("pixflow_customers")
    .set({ ...body, updated_at: new Date().toISOString() })
    .where(eq("id", parseInt(id)), parseInt(id))
    .returning();

  const updated = result.all();
  if (updated.length === 0) {
    return NextResponse.json({ error: "Cliente não encontrado" }, { status: 404 });
  }
  return NextResponse.json(updated[0]);
}

// DELETE /api/customers/[id]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const result = db.delete("pixflow_customers").where(eq("id", parseInt(id)), parseInt(id)).returning();
  const deleted = result.all();
  if (deleted.length === 0) {
    return NextResponse.json({ error: "Cliente não encontrado" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
