import { noStoreJson } from "@/lib/server/no-store-json";
import { getPublishedEmmaKnowledge } from "@/lib/server/emma-knowledge";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/** Pack publicado para el cuestionario de la tienda. */
export async function GET() {
  const published = await getPublishedEmmaKnowledge();
  return noStoreJson({ published });
}
