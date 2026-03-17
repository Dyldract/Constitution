import { NextResponse } from "next/server";
import { getAdoptedAmendmentTexts, getRoomById } from "@/lib/store";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ roomId: string }> }
) {
  const { roomId } = await params;
  const room = await getRoomById(roomId);
  if (!room) {
    return NextResponse.json({ error: "Salle introuvable" }, { status: 404 });
  }
  const amendments = await getAdoptedAmendmentTexts(roomId);
  return NextResponse.json({ amendments });
}
