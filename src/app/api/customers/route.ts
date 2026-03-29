import { NextRequest, NextResponse } from "next/server";
import { db, eq } from "@/lib/db";
import { z } from "zod";

const createCustomerSchema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email().optional(),
  phone: z.string().min(8).max(20),
  notes: z.string().optional(),
  asaasCustomerId: z.string().optional(),
});

// GET /api/customers
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId") ?? "demo-user";

  const rows = db
    .select()
    .from("pixflow_customers")
    .where(eq("user_id", userId), userId)
    .orderBy("created_at", "DESC");

  return NextResponse.json(rows.all());
}

// POST /api/customers
export async function POST(req: NextRequest) {
  let body: z.infer<typeof createCustomerSchema>;
  try {
    body = createCustomerSchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  }

  const data = {
    userId: "demo-user",
    ...body,
    isActive: true,
  };

  const result = db
    .insert("pixflow_customers")
    .values([data])
    .returning();

  const created = result.all();
  return NextResponse.json(created[0] ?? { error: "Erro ao criar" }, { status: 201 });
}
