import { listGuestbook } from "@/lib/guestbook-store";
import { InvitationPage } from "@/components/InvitationPage";

export const dynamic = "force-dynamic";

export default async function Home() {
  const initialGuests = await listGuestbook();
  return <InvitationPage initialGuests={initialGuests} />;
}
