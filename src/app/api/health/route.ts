import { connection, NextResponse } from "next/server";
import { checkDbHealth } from "@/lib/db";

export async function GET() {
  await connection();
  const health = await checkDbHealth();
  return NextResponse.json(health, { status: health.ok ? 200 : 503 });
}
