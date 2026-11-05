'use client';

import { useEffect, useState } from 'react';

export interface CurrentUser {
  id: string;
  email: string;
  github_username?: string | null;
  github_avatar_url?: string | null;
}

/** The signed-in user, fetched once per layout mount and shared by the sidebar and topbar. */
export function useCurrentUser() {
  const [user, setUser] = useState<CurrentUser | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/auth/me')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data?.user) setUser(data.user);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  return { user, setUser };
}
