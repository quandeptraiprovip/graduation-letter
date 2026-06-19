"use client";

import { useMemo } from "react";
import { usePathname } from "next/navigation";
import {
  inviteDisplayNameFromPathname,
  inviteSlugFromPathname,
} from "@/lib/invite-path";

export function useInviteGuest() {
  const pathname = usePathname();

  return useMemo(() => {
    const slug = inviteSlugFromPathname(pathname);
    const displayName = inviteDisplayNameFromPathname(pathname);
    return {
      slug,
      displayName,
      isPersonalized: Boolean(slug && displayName),
    };
  }, [pathname]);
}
