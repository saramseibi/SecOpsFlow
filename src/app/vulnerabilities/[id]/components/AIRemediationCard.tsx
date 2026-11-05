'use client';

import React, { useState } from 'react';
import { toast } from 'sonner';
import { Loader2, RefreshCw, Lightbulb, AlertTriangle, Wrench, CheckCircle2 } from 'lucide-react';

interface AIAnalysis {
  explanation: string;
  impact: string;
  suggested_fix: string;
  verification: string;
}

const SECTIONS: { key: keyof AIAnalysis; label: string; icon: typeof Lightbulb }[] = [
  { key: 'explanation', label: 'Explanation', icon: Lightbulb },
  { key: 'impact', label: 'Impact', icon: AlertTriangle },
  { key: 'suggested_fix', label: 'Suggested fix', icon: Wrench },
  { key: 'verification', label: 'Verification', icon: CheckCircle2 },
];

/** Minimal renderer: fenced code blocks become <pre>, the rest keeps its line breaks. */
function RichText({ text }: { text: string }) {
  const parts = text.split(/```[^\n]*\n([\s\S]*?)```/g);
  return (
    <div className="space-y-2">
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <pre
            key={i}
            className="text-xs font-mono bg-background/60 border border-border rounded-md p-3 overflow-x-auto"
          >
            <code>{part.replace(/\n$/, '')}</code>
          </pre>
        ) : part.trim() ? (
          <p key={i} className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
            {part.trim()}
          </p>
        ) : null
      )}
    </div>
  );
}

export default function AIRemediationCard({ vulnId }: { vulnId: string }) {
  const [analysis, setAnalysis] = useState<AIAnalysis | null>(null);
  const [loading, setLoading] = useState(false);

  const run = async (regenerate: boolean) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/vulnerabilities/${vulnId}/ai-analysis?regenerate=${regenerate}`, {
        method: 'POST',
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.detail || 'Failed to generate AI analysis.');
      setAnalysis(data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to generate AI analysis.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card-elevated p-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-1.5 mb-1">
            <h3 className="text-sm font-semibold text-foreground">AI explanation &amp; remediation</h3>
          </div>
          <p className="text-xs text-muted-foreground">
            Get a clear explanation of this finding and a suggested fix adapted to your project.
          </p>
        </div>
        {analysis ? (
          <button onClick={() => run(true)} disabled={loading} className="btn-ghost text-xs inline-flex gap-1.5">
            {loading ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
            Regenerate
          </button>
        ) : (
          <button onClick={() => run(false)} disabled={loading} className="btn-primary text-xs inline-flex gap-1.5">
            {loading && <Loader2 size={13} className="animate-spin" />}
            {loading ? 'Analyzing…' : 'Explain & suggest a fix'}
          </button>
        )}
      </div>

      {analysis && (
        <div className="mt-4 space-y-4 border-t border-border pt-4">
          {SECTIONS.map(({ key, label, icon: Icon }) => (
            <div key={key}>
              <div className="flex items-center gap-1.5 mb-1.5">
                <Icon size={13} className="text-primary" />
                <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground">{label}</h4>
              </div>
              <RichText text={analysis[key]} />
            </div>
          ))}
          <p className="text-[10px] text-muted-foreground">
            AI-generated — review before applying to your code.
          </p>
        </div>
      )}
    </div>
  );
}
