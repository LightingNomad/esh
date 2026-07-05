import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { inviteMember, listGroupMembers } from "@/lib/queries";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const members = await listGroupMembers(id);
  return NextResponse.json({ members });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = (await req.json()) as { invitedEmail: string };
  if (!body.invitedEmail) {
    return NextResponse.json({ error: "invitedEmail is required" }, { status: 400 });
  }

  const member = await inviteMember(id, { invitedEmail: body.invitedEmail });
  return NextResponse.json({ member }, { status: 201 });
}
