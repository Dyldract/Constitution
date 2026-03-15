import { NextResponse } from "next/server";
import { getPublicRooms } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const rooms = await getPublicRooms();
    return NextResponse.json({ rooms });
  } catch (e) {
    console.error("Erreur liste salles publiques:", e);
    return NextResponse.json(
      { error: "Impossible de charger les salles" },
      { status: 500 }
    );
  }
}
