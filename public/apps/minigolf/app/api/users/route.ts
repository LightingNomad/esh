import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { listUsers } from "@/lib/queries";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const users = await listUsers();
  return NextResponse.json({ users });
}
