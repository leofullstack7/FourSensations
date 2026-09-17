import { NextResponse } from "next/server";
import { getActiveStoreCombos } from "@/lib/server/store-combos";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const combos = await getActiveStoreCombos();
  return NextResponse.json(
    { combos },
    {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
      },
    },
  );
}
