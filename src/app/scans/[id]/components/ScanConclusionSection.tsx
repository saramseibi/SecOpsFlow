'use client';

import React from 'react';
import { Info } from 'lucide-react';
import { buildConclusion } from '@/lib/scanOverview';
import type { Scan } from '@/types';

const TITLE_CLASS: Record<string, string> = {
  'Scan completed successfully': 'text-success',
  'Scan completed with issues': 'text-warning',
  'Scan failed': 'text-critical',
};

export default function ScanConclusionSection({ scan }: { scan: Scan }) {
  const conclusion = buildConclusion(scan);

  if (!conclusion) {
    return (
      <div className="card-elevated p-5">
        <p className="text-sm text-muted-foreground">
          Waiting for all CI jobs to finish before summarizing this scan.
        </p>
      </div>
    );
  }

  return (
    <div className="card-elevated p-5">
      <h3
        className={`text-base font-semibold mb-1.5 ${TITLE_CLASS[conclusion.title] ?? 'text-foreground'}`}
      >
        {conclusion.title}
      </h3>
      <p className="text-sm text-muted-foreground leading-relaxed">{conclusion.body}</p>

      
    </div>
  );
}
