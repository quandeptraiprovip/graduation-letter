import { InvitationPage } from "@/components/InvitationPage";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ invite: string }> };

export default async function PersonalizedInvitePage(_props: Props) {
  return <InvitationPage />;
}
