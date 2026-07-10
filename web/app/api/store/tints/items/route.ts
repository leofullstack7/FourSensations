import { NextResponse } from "next/server";
import { getTintBubbleItems } from "@/lib/tints";

export const revalidate = 300;

export async function GET() {
  const items = await getTintBubbleItems();
  return NextResponse.json({ items });
}
