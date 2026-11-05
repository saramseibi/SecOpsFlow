import React from 'react';
import { ChevronDown, ChevronUp, ChevronsUpDown } from 'lucide-react';

export type SortDir = 'asc' | 'desc';

interface SortableHeaderProps<K extends string> {
  column: K;
  sortKey: K;
  sortDir: SortDir;
  onSort: (column: K) => void;
  className?: string;
  children: React.ReactNode;
}

// Column header whose sort toggle is a real button (reachable by keyboard) and whose
// current order is exposed to assistive tech through aria-sort.
export default function SortableHeader<K extends string>({
  column,
  sortKey,
  sortDir,
  onSort,
  className = '',
  children,
}: SortableHeaderProps<K>) {
  const active = sortKey === column;
  const Icon = !active ? ChevronsUpDown : sortDir === 'asc' ? ChevronUp : ChevronDown;
  return (
    <th
      scope="col"
      aria-sort={active ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
      className={className}
    >
      <button
        type="button"
        onClick={() => onSort(column)}
        className={`-mx-1 px-1 inline-flex items-center gap-1 rounded uppercase select-none transition-colors hover:text-foreground ${
          active ? 'text-foreground' : ''
        }`}
      >
        {children}
        <Icon
          size={12}
          aria-hidden="true"
          className={active ? 'text-primary' : 'text-muted-foreground/50'}
        />
      </button>
    </th>
  );
}
