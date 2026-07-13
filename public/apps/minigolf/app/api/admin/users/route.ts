import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { isAdmin, listUsers } from "@/lib/queries";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await isAdmin(userId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const users = await listUsers();
  return NextResponse.json({ users });
}
