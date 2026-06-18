import { listGuestbook } from "@/lib/guestbook-store";
import { listContributions } from "@/lib/contribution-store";
import { GuestbookSignatureClient } from "@/components/GuestbookSignatureClient";

export const dynamic = "force-dynamic";

export default async function LuuButPage() {
  let initialGuests: Awaited<ReturnType<typeof listGuestbook>> = [];
  let initialContributions: Awaited<ReturnType<typeof listContributions>> = [];
  try {
    initialGuests = await listGuestbook();
  } catch (e) {
    console.error("[luu-but] listGuestbook:", e);
  }
  try {
    initialContributions = await listContributions();
  } catch (e) {
    console.error("[luu-but] listContributions:", e);
  }
  return (
    <GuestbookSignatureClient
      initialGuests={initialGuests}
      initialContributions={initialContributions}
    />
  );
}
