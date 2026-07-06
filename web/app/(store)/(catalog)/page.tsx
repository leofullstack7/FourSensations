import { StoreHomeClient } from "@/components/store/StoreHomeClient";
import { getTintBubbleItems } from "@/lib/tints";

export const revalidate = 300;

export default async function StoreHomePage() {
  const tintItems = await getTintBubbleItems();
  return <StoreHomeClient tintItems={tintItems} />;
}
