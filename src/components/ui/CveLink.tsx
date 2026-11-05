import React from 'react';

const CVE_PATTERN = /^CVE-\d{4}-\d{4,}$/i;

// CVE IDs link to their NVD entry; anything else (GHSA IDs, free text) renders as plain mono.
export default function CveLink({
  cve,
  className = '',
}: {
  cve?: string | null;
  className?: string;
}) {
  if (!cve) return <span className={`text-xs text-muted-foreground ${className}`}>—</span>;
  const base = `text-xs font-mono font-medium text-foreground/90 ${className}`;
  if (!CVE_PATTERN.test(cve)) return <span className={base}>{cve}</span>;
  return (
    <a
      href={`https://nvd.nist.gov/vuln/detail/${cve.toUpperCase()}`}
      target="_blank"
      rel="noopener noreferrer"
      title={`Open ${cve} on NVD`}
      className={`${base} underline decoration-border-strong underline-offset-2 hover:text-primary hover:decoration-primary/60 transition-colors`}
    >
      {cve}
    </a>
  );
}
