'use client';

import { useEffect, useMemo, useState } from 'react';
import type { GithubOrg, GithubRepo } from '@/types';

export interface AccountOption {
  type: 'personal' | 'organization';
  login: string;
}

const PERSONAL_ORG_PARAM = '__personal__';

interface CurrentUser {
  github_username?: string | null;
}

interface UseGithubAccountScopeResult {
  personalLogin: string | null;
  accounts: AccountOption[];
  repos: GithubRepo[];
  reposLoading: boolean;
  reconnectRequired: boolean;
}

/**
 * Shared "which GitHub accounts (personal + orgs) can this user scope to, and which
 * repos does the selected one have" logic -- used by any page-local account/repo
 * selector (currently the Scans page filter bar). Never used to drive Dashboard data,
 * which is intentionally global/unscoped.
 */
export function useGithubAccountScope(selectedAccountLogin: string): UseGithubAccountScopeResult {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [orgs, setOrgs] = useState<GithubOrg[]>([]);
  const [repos, setRepos] = useState<GithubRepo[]>([]);
  const [reposLoading, setReposLoading] = useState(false);
  const [reconnectRequired, setReconnectRequired] = useState(false);

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

  useEffect(() => {
    if (!user?.github_username) {
      setOrgs([]);
      return;
    }
    let cancelled = false;
    setReconnectRequired(false);
    fetch('/api/github/orgs')
      .then((res) => {
        if (res.status === 401 && !cancelled) setReconnectRequired(true);
        return res.ok ? res.json() : [];
      })
      .then((data) => {
        if (!cancelled && Array.isArray(data)) setOrgs(data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [user?.github_username]);

  const accounts: AccountOption[] = useMemo(() => {
    if (!user?.github_username) return [];
    return [
      { type: 'personal' as const, login: user.github_username },
      ...orgs.map((o) => ({ type: 'organization' as const, login: o.login })),
    ];
  }, [user?.github_username, orgs]);

  useEffect(() => {
    if (!selectedAccountLogin) {
      setRepos([]);
      return;
    }
    const isPersonal = accounts.find((a) => a.login === selectedAccountLogin)?.type === 'personal';
    let cancelled = false;
    setReposLoading(true);
    fetch(`/api/github/repos?org=${encodeURIComponent(isPersonal ? PERSONAL_ORG_PARAM : selectedAccountLogin)}`)
      .then((res) => {
        if (res.status === 401 && !cancelled) setReconnectRequired(true);
        return res.ok ? res.json() : [];
      })
      .then((data) => {
        if (!cancelled && Array.isArray(data)) setRepos(data);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setReposLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedAccountLogin, accounts]);

  return { personalLogin: user?.github_username ?? null, accounts, repos, reposLoading, reconnectRequired };
}

export { PERSONAL_ORG_PARAM };
