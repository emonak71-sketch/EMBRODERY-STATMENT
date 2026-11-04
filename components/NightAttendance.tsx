import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Clock, Moon, RefreshCw, Save } from 'lucide-react';
import { dbService } from '../services/supabaseService';
import { bangladeshClock } from '../desktop/attendanceCore';

type Status = 'present' | 'absent' | 'late' | 'half_day' | 'leave';
type Worker = {
  id: string; worker_code: string; full_name: string;
  is_active: boolean; joining_date?: string | null;
};
type RecordRow = { worker_id: string; attendance_date: string; status: Status; note?: string; check_in?: string | null; check_out?: string | null };
const statusValues: Status[] = ['present', 'absent', 'late', 'half_day', 'leave'];

const NightAttendance: React.FC = () => {
  const [date, setDate] = useState(() => bangladeshClock().date);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [records, setRecords] = useState<RecordRow[]>([]);
  const [draft, setDraft] = useState<Record<string,Status>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const activeWorkers = useMemo(() => workers.filter(w => w.is_active !== false && (!w.joining_date || w.joining_date <= date)), [workers,date]);

  const reload = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [people, attendance] = await Promise.all([
        dbService.getWorkers() as Promise<Worker[]>,
        dbService.getWorkerNightAttendance(date) as Promise<RecordRow[]>,
      ]);
      setWorkers(people);
      setRecords(attendance);
      setDraft(Object.fromEntries(attendance.map(row => [row.worker_id, row.status])));
    } catch (e: any) {
      setError(e.message || 'Unable to load night attendance. Ask an administrator to apply the additive night attendance migration.');
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => { void reload(); }, [reload]);

  useEffect(() => {
    const onRemoteChange = () => {
      const hasUnsavedChanges = activeWorkers.some(worker => {
        const saved = records.find(row => row.worker_id === worker.id)?.status;
        return draft[worker.id] !== saved;
      });
      if (!hasUnsavedChanges && !saving) void reload();
    };
    window.addEventListener('embroidery:remote-data-changed', onRemoteChange);
    return () => window.removeEventListener('embroidery:remote-data-changed', onRemoteChange);
  }, [activeWorkers, records, draft, saving, reload]);

  const save = async () => {
    const rows = activeWorkers.filter(w => Boolean(draft[w.id])).map(w => ({
      worker_id: w.id,
      attendance_date: date,
      status: draft[w.id],
    }));
    if (!rows.length) {
      setError('Choose at least one worker status before saving.');
      return;
    }
    setSaving(true);
    setError('');
    setNotice('');
    try {
      await dbService.saveWorkerNightAttendance(rows);
      await reload();
      window.dispatchEvent(new CustomEvent('embroidery:attendance-saved', { detail: { session: 'night', date } }));
      setNotice('Night attendance saved to Supabase successfully.');
    } catch (e: any) {
      setError(e.message || 'Night attendance could not be saved.');
    } finally {
      setSaving(false);
    }
  };

  const savedIds = new Set(records.map(item => item.worker_id));
  const recordedCount = activeWorkers.filter(w => savedIds.has(w.id)).length;

  return (
    <section className="rounded-3xl border border-white/70 bg-white/70 p-5 shadow-xl backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/70">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-black text-slate-900 dark:text-white">
            <Moon size={18} className="text-sky-600" /> Night Attendance Register
          </h2>
          <p className="mt-1 text-xs text-slate-500">Night records are saved separately. Unsaved selections are not counted.</p>
          <p className="mt-2 text-xs font-bold text-sky-700 dark:text-sky-300">
            <Clock size={13} className="mr-1 inline" /> Saved {recordedCount} of {activeWorkers.length} active workers
          </p>
        </div>
        <input aria-label="Night attendance date" type="date" className="rounded-xl bg-slate-50 p-3 text-sm dark:bg-slate-800" value={date} onChange={e => setDate(e.target.value)} />
      </div>
      {error && <p role="alert" className="mb-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
      {notice && <p role="status" className="mb-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">{notice}</p>}
      <div className="mb-4 flex flex-wrap gap-2">
        <button onClick={() => setDraft(prev => ({...prev, ...Object.fromEntries(activeWorkers.map(w => [w.id, 'present' as Status]))}))}
          className="rounded-xl border border-sky-200 bg-sky-50 px-3 py-3 text-xs font-bold text-sky-700">Mark All Present</button>
        <button onClick={() => void save()} disabled={saving || loading || activeWorkers.length === 0}
          className="rounded-xl bg-gradient-to-r from-blue-700 to-cyan-500 px-4 py-3 text-xs font-black text-white disabled:opacity-50">
          <Save size={14} className="mr-2 inline" /> {saving ? 'Saving...' : 'Save Night Attendance'}
        </button>
        <button onClick={() => void reload()} className="rounded-xl border border-slate-200 px-4 py-3 text-xs font-bold text-slate-500">
          <RefreshCw size={14} className="mr-1 inline" /> Refresh
        </button>
      </div>
      {loading ? <p className="py-6 text-center text-sm text-slate-500">Loading night records...</p> :
        <div className="overflow-x-auto">
          <table className="w-full min-w-[420px] text-left text-sm">
            <thead className="text-[10px] uppercase text-slate-400"><tr><th className="p-3">Worker</th><th className="p-3">Night Status</th><th className="p-3">Saved?</th></tr></thead>
            <tbody>{activeWorkers.map(w => (
              <tr key={w.id} className="border-t border-slate-100 dark:border-slate-800">
                <td className="p-3 font-bold">{w.full_name}<div className="text-xs font-normal text-slate-500">{w.worker_code}</div></td>
                <td className="p-3">
                  <select value={draft[w.id] || ''} onChange={e => setDraft(prev => ({...prev,[w.id]:e.target.value as Status}))}
                    aria-label={'Night status for ' + w.full_name} className="rounded-lg bg-slate-50 p-2 text-xs dark:bg-slate-800">
                    <option value="" disabled>Not recorded</option>
                    {statusValues.map(s => <option value={s} key={s}>{s.replace('_',' ')}</option>)}
                  </select>
                </td>
                <td className="p-3 text-xs">{savedIds.has(w.id) ? <span className="font-bold text-emerald-600">Saved</span> : <span className="text-amber-600">Unsaved</span>}</td>
              </tr>
            ))}</tbody>
          </table>
          {activeWorkers.length === 0 && <p className="py-7 text-center text-sm text-slate-500">No active workers expected for this date.</p>}
        </div>}
    </section>
  );
};

export default NightAttendance;
