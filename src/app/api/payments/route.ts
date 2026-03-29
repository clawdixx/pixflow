import { NextRequest, NextResponse } from "next/server";
import { db, eq } from "@/lib/db";

// GET /api/payments — list all payments with customer + schedule info
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId") ?? "demo-user";
  const customerIdParam = searchParams.get("customerId");

  const payments = customerIdParam
    ? db.select().from("pixflow_payments").where(eq("customer_id", parseInt(customerIdParam)), parseInt(customerIdParam)).all()
    : db.select().from("pixflow_payments").where(eq("user_id", userId), userId).all();

  const results = [];
  for (const payment of payments) {
    const [customer] = db.select().from("pixflow_customers").where(eq("id", payment.customerId), payment.customerId).limit(1).all();
    const schedules = db.select().from("pixflow_follow_up_schedules").where(eq("payment_id", payment.id), payment.id).all();
    results.push({ payment, customer, schedules });
  }

  // Sort by created_at desc
  results.sort((a, b) => new Date(b.payment.createdAt).getTime() - new Date(a.payment.createdAt).getTime());

  return NextResponse.json(results);
}
