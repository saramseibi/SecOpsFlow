import React from 'react';
import { AlertCircle } from 'lucide-react';


interface EmptyStateProps {
  icon?: React.ElementType;
  title: string;
  description: string;
  action?: React.ReactNode;
}

export default function EmptyState({ icon: Icon = AlertCircle, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div className="relative mb-5">
        <div className="absolute inset-0 rounded-2xl bg-primary/20 blur-xl" aria-hidden="true" />
        <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-b from-muted to-card border border-border-strong flex items-center justify-center">
          <Icon size={24} strokeWidth={1.75} className="text-primary" />
        </div>
      </div>
      <h3 className="text-base font-semibold text-foreground mb-1.5">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-sm leading-relaxed">{description}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
