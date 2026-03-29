import { NextRequest, NextResponse } from "next/server";
import { db, eq } from "@/lib/db";

// GET /api/payments/[id]
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const paymentId = parseInt(id);

  const [payment] = db.select().from("pixflow_payments").where(eq("id", paymentId), paymentId).limit(1).all();
  if (!payment) {
    return NextResponse.json({ error: "Pagamento não encontrado" }, { status: 404 });
  }

  const [customer] = db.select().from("pixflow_customers").where(eq("id", payment.customerId), payment.customerId).limit(1).all();
  const schedules = db.select().from("pixflow_follow_up_schedules").where(eq("payment_id", paymentId), paymentId).all();

  return NextResponse.json({ payment, customer, schedules });
}
