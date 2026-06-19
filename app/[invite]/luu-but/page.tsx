import { listGuestbook } from "@/lib/guestbook-store";
import { listContributions } from "@/lib/contribution-store";
import { GuestbookSignatureClient } from "@/components/GuestbookSignatureClient";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ invite: string }> };

export default async function PersonalizedLuuButPage(_props: Props) {
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
