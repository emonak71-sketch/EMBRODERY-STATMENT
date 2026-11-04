export type AttendanceSession = 'morning' | 'night';
export type AttendanceStatus = 'present' | 'absent' | 'late' | 'half_day' | 'leave';

export interface AttendanceWorker {
  id: string;
  is_active: boolean | null;
  joining_date?: string | null;
}

export interface AttendanceRecord {
  worker_id: string;
  status: string | null;
}

export interface ReminderTimes {
  morning: string;
  night: string;
}

export const DEFAULT_REMINDER_TIMES: ReminderTimes = {
  morning: '11:00',
  night: '23:00',
};

const validStatuses = new Set<AttendanceStatus>([
  'present', 'absent', 'late', 'half_day', 'leave',
]);

export function bangladeshClock(now: Date = new Date()): { date: string; minutes: number } {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Dhaka',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now);
  const values = Object.fromEntries(parts.map(item => [item.type, item.value]));
  return {
    date: values.year + '-' + values.month + '-' + values.day,
    minutes: Number(values.hour) * 60 + Number(values.minute),
  };
}

export function isValidReminderTime(value: string): boolean {
  if (!/^([01][0-9]|2[0-3]):[0-5][0-9]$/.test(value)) return false;
  return true;
}

export function minutesFromHHMM(value: string): number {
  if (!isValidReminderTime(value)) throw new Error('Invalid reminder time');
  const [hour, minute] = value.split(':').map(Number);
  return hour * 60 + minute;
}

export function dueSessions(
  minutes: number,
  times: ReminderTimes,
): AttendanceSession[] {
  const result: AttendanceSession[] = [];
  if (minutes >= minutesFromHHMM(times.morning)) result.push('morning');
  if (minutes >= minutesFromHHMM(times.night)) result.push('night');
  return result;
}

export function dueCheckpoints(
  clock: { date: string; minutes: number },
  times: ReminderTimes,
  overdueWindowMinutes = 24 * 60,
): Array<{date: string; session: AttendanceSession}> {
  const current = dueSessions(clock.minutes, times).map(session => ({
    date: clock.date,
    session,
  }));
  // Recover only recent missed checkpoints (e.g. last night after midnight),
  // rather than showing stale notifications from several days ago.
  const utcDay = new Date(clock.date + 'T12:00:00.000Z');
  utcDay.setUTCDate(utcDay.getUTCDate() - 1);
  const yesterday = utcDay.toISOString().slice(0, 10);
  const overdue: Array<{date: string; session: AttendanceSession}> = [];
  for (const session of ['morning','night'] as const) {
    const minutesLate = 1440 + clock.minutes - minutesFromHHMM(times[session]);
    if (minutesLate > 0 && minutesLate < overdueWindowMinutes) {
      overdue.push({date: yesterday, session});
    }
  }
  return [...overdue, ...current];
}

export function attendanceCompleteness(
  workers: AttendanceWorker[],
  records: AttendanceRecord[],
  date: string,
): { complete: boolean; expected: number; recorded: number; missingIds: string[] } {
  const expectedWorkers = workers.filter(worker =>
    worker.is_active !== false && (!worker.joining_date || worker.joining_date <= date),
  );
  const recordedIds = new Set(records
    .filter(item => validStatuses.has(item.status as AttendanceStatus))
    .map(item => item.worker_id));
  const missingIds = expectedWorkers.map(w => w.id).filter(id => !recordedIds.has(id));
  return {
    complete: missingIds.length === 0,
    expected: expectedWorkers.length,
    recorded: expectedWorkers.length - missingIds.length,
    missingIds,
  };
}

export const reminderTranslations = {
  bn: {
    morning: 'কর্মীদের সকালের হাজিরা এখনো নেওয়া হয়নি। অনুগ্রহ করে হাজিরা সম্পন্ন করুন।',
    night: 'কর্মীদের রাতের হাজিরা এখনো নেওয়া হয়নি। অনুগ্রহ করে হাজিরা সম্পন্ন করুন।',
    title: 'এম্ব্রয়ডারি স্টেটমেন্ট — হাজিরা',
  },
  en: {
    morning: 'Workers’ morning attendance has not been recorded yet. Please complete the attendance.',
    night: 'Workers’ night attendance has not been recorded yet. Please complete the attendance.',
    title: 'Embroidery Statement — Attendance',
  },
} as const;
