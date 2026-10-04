import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Search, ChevronLeft, ChevronRight, Download, Inbox } from 'lucide-react';
import { EmptyState, Skeleton, ErrorState } from './ui';

export interface Column { key: string; label: string; render?: (row: any) => ReactNode; className?: string; exportValue?: (row: any) => any }

export function toCSV(rows: any[], columns: Column[], name: string) {
  const esc = (v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const head = columns.map((c) => esc(c.label)).join(',');
  const body = rows.map((r) => columns.map((c) => esc(c.exportValue ? c.exportValue(r) : typeof r[c.key] === 'object' ? JSON.stringify(r[c.key]) : r[c.key])).join(',')).join('\n');
  const url = URL.createObjectURL(new Blob([head + '\n' + body], { type: 'text/csv' }));
  const a = document.createElement('a'); a.href = url; a.download = `${name}.csv`; a.click(); URL.revokeObjectURL(url);
}

export default function DataTable({ rows, columns, loading, error, onRetry, searchKeys = [], toolbar, emptyTitle = 'Nothing here yet', exportName, pageSize = 15 }: {
  rows: any[] | null; columns: Column[]; loading?: boolean; error?: string | null; onRetry?: () => void; searchKeys?: string[]; toolbar?: ReactNode; emptyTitle?: string; exportName?: string; pageSize?: number;
}) {
  const [q, setQ] = useState('');
  const [page, setPage] = useState(0);
  const filtered = useMemo(() => {
    const list = rows || [];
    if (!q || !searchKeys.length) return list;
    const s = q.toLowerCase();
    return list.filter((r) => searchKeys.some((k) => String(k.split('.').reduce((o: any, p) => o?.[p], r) ?? '').toLowerCase().includes(s)));
  }, [rows, q, searchKeys]);
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const view = filtered.slice(page * pageSize, page * pageSize + pageSize);

  return (
    <div className="card overflow-hidden">
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between p-4 border-b border-line">
        {searchKeys.length > 0 ? (
          <div className="relative sm:w-72"><Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" /><input value={q} onChange={(e) => { setQ(e.target.value); setPage(0); }} placeholder="Search…" className="input !pl-10 !py-2 !rounded-full" /></div>
        ) : <span />}
        <div className="flex flex-wrap gap-2 items-center">
          {toolbar}
          {exportName && <button onClick={() => toCSV(filtered, columns, exportName)} className="btn btn-outline btn-sm" disabled={!filtered.length}><Download className="h-4 w-4" /> CSV</button>}
        </div>
      </div>
      {error ? <div className="p-5"><ErrorState message={error} onRetry={onRetry} /></div> : loading ? (
        <div className="p-4 space-y-2">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-11" />)}</div>
      ) : filtered.length === 0 ? <EmptyState icon={Inbox} title={q ? 'No matches' : emptyTitle} /> : (
        <>
          <div className="overflow-x-auto">
            <table className="table-lux min-w-[720px]">
              <thead><tr>{columns.map((c) => <th key={c.key} className={c.className}>{c.label}</th>)}</tr></thead>
              <tbody>{view.map((r, i) => <tr key={r.id ?? r.user_id ?? r.key ?? i}>{columns.map((c) => <td key={c.key} className={c.className}>{c.render ? c.render(r) : String(r[c.key] ?? '—')}</td>)}</tr>)}</tbody>
            </table>
          </div>
          <div className="flex items-center justify-between px-4 py-3 text-sm text-muted border-t border-line">
            <span>{filtered.length} record{filtered.length === 1 ? '' : 's'}</span>
            {pages > 1 && <div className="flex items-center gap-2"><button onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0} className="h-8 w-8 rounded-full hover:bg-cream flex items-center justify-center disabled:opacity-40"><ChevronLeft className="h-4 w-4" /></button><span>{page + 1} / {pages}</span><button onClick={() => setPage(Math.min(pages - 1, page + 1))} disabled={page >= pages - 1} className="h-8 w-8 rounded-full hover:bg-cream flex items-center justify-center disabled:opacity-40"><ChevronRight className="h-4 w-4" /></button></div>}
          </div>
        </>
      )}
    </div>
  );
}
