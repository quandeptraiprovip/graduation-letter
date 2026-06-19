"use client";

import { useEffect, useRef } from "react";

/** Điền sẵn tên khách khi slug đổi; không ghi đè sau khi người dùng đã sửa. */
export function usePrefillInviteName(
  displayName: string | null,
  slug: string | null,
  setName: (value: string) => void
) {
  const slugRef = useRef<string | null>(null);
  const userEditedRef = useRef(false);

  useEffect(() => {
    if (!slug || !displayName) return;
    if (slugRef.current === slug) return;
    slugRef.current = slug;
    userEditedRef.current = false;
    setName(displayName);
  }, [slug, displayName, setName]);

  const onNameChange = (value: string) => {
    userEditedRef.current = true;
    setName(value);
  };

  return { onNameChange };
}
