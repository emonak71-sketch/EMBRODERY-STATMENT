import React, { useEffect, useState } from 'react';
import { dbService } from '../services/supabaseService';

type Customer = {
  customer_id: string;
  customer_email: string;
  business_name: string;
  email_verified: boolean;
  customer_phone: string | null;
};

export default function OwnerCustomerDirectory({ onSelect, refreshKey, disabled }: {
  onSelect: (email: string) => void;
  refreshKey: number;
  disabled: boolean;
}) {
  const [page, setPage] = useState(0);
  const [revision, setRevision] = useState(0);
  const [rows, setRows] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    setRows([]);
    dbService.ownerListCustomers(page * 50).then(data => {
      if (active) setRows(data as Customer[]);
    }).catch(e => {
      if (active) setError(e.message || 'Could not load registered customers.');
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [page, revision, refreshKey]);

  return <div className="space-y-3 rounded-xl border border-slate-200 p-4 dark:border-slate-700">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div><h2 className="text-sm font-black">Registered Customers</h2>
        <p className="mt-1 text-xs text-slate-500">New accounts appear here automatically. Select a Gmail to save its mobile number or manage access.</p></div>
      <button type="button" disabled={loading} onClick={() => setRevision(x => x + 1)} className="rounded-lg border px-3 py-2 text-xs font-bold disabled:opacity-50">Refresh customers</button>
    </div>
    {error && <p role="alert" className="text-sm text-rose-600">{error}</p>}
    {loading ? <p role="status" className="text-sm text-slate-500">Loading customers…</p> : !error && <>
      {rows.length ? <ul className="divide-y divide-slate-100 dark:divide-slate-800">
        {rows.slice(0, 50).map(row => <li key={row.customer_id}>
          <button type="button" disabled={disabled} onClick={() => onSelect(row.customer_email)} className="flex w-full flex-wrap items-center justify-between gap-2 rounded-lg p-3 text-left hover:bg-sky-50 disabled:opacity-50 dark:hover:bg-slate-800">
            <span className="min-w-0"><span className="block break-all text-sm font-bold">{row.customer_email}</span>
              <span className="mt-1 block text-xs text-slate-500">{row.business_name} · {row.customer_phone || 'No mobile number saved'}</span></span>
            <span className="text-xs font-semibold text-sky-700 dark:text-sky-300">{row.email_verified ? 'Verified · Manage' : 'Awaiting email verification'}</span>
          </button>
        </li>)}
      </ul> : <p className="text-sm text-slate-500">No registered customers on this page.</p>}
      <div className="flex items-center justify-between gap-2 text-xs">
        <button type="button" disabled={page === 0} onClick={() => setPage(x => x - 1)} className="rounded-lg border px-3 py-2 disabled:opacity-40">Previous</button>
        <span>Page {page + 1}</span>
        <button type="button" disabled={rows.length <= 50} onClick={() => setPage(x => x + 1)} className="rounded-lg border px-3 py-2 disabled:opacity-40">Next</button>
      </div>
    </>}
  </div>;
}
