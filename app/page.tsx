import { listGuestbook } from "@/lib/guestbook-store";
import { InvitationPage } from "@/components/InvitationPage";

export const dynamic = "force-dynamic";

export default async function Home() {
  let initialGuests: Awaited<ReturnType<typeof listGuestbook>> = [];
  try {
    initialGuests = await listGuestbook();
  } catch (e) {
    console.error("[page] listGuestbook:", e);
  }
  return <InvitationPage initialGuests={initialGuests} />;
}
