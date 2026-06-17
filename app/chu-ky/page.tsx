import { listSignatures } from "@/lib/signature-store";
import { SignaturePageClient } from "@/components/SignaturePageClient";

export const dynamic = "force-dynamic";

export default async function ChuKyPage() {
  const initialSignatures = await listSignatures();
  return <SignaturePageClient initialSignatures={initialSignatures} />;
}
