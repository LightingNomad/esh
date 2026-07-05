import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createGroup, listGroupsForUser } from "@/lib/queries";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const groups = await listGroupsForUser(userId);
  return NextResponse.json({ groups });
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json()) as { name: string };
  if (!body.name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  const group = await createGroup(body.name, userId);
  return NextResponse.json({ group }, { status: 201 });
}
