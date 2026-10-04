import { MessageCircle, Phone, Video } from 'lucide-react';

export type Mode = 'chat' | 'audio' | 'video';

export const MODES: Record<Mode, { label: string; short: string; icon: any; key: string }> = {
  chat: { label: 'Chat', short: 'Chat', icon: MessageCircle, key: 'chat_price' },
  audio: { label: 'Audio Call', short: 'Call', icon: Phone, key: 'call_price' },
  video: { label: 'Video Call', short: 'Video', icon: Video, key: 'video_price' },
};

export const rateFor = (a: any, mode: Mode) => Number(a?.[MODES[mode].key] || 0);

export const inr = (n: any, digits = 0) =>
  '₹' + Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: digits, maximumFractionDigits: 2 });

export const fmtDate = (d: any) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
export const fmtDay = (d: any) => new Date(d).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
export const fmtTime = (d: any) => new Date(d).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
export const fmtDateTime = (d: any) => `${fmtDay(d)} · ${fmtTime(d)}`;

export function timeAgo(d: any) {
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 86400 * 7) return `${Math.floor(s / 86400)}d ago`;
  return fmtDate(d);
}

export function fmtDuration(sec: number) {
  sec = Math.max(0, Math.floor(sec));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return h ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

export const DAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
export const DAY_LABEL: Record<string, string> = { mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', thu: 'Thursday', fri: 'Friday', sat: 'Saturday', sun: 'Sunday' };

export function slotsFor(av: any, date: Date): string[] {
  const d = av?.[DAYS[date.getDay()]];
  if (!d || !d.on) return [];
  const [sh, sm] = String(d.start || '10:00').split(':').map(Number);
  const [eh, em] = String(d.end || '18:00').split(':').map(Number);
  const out: string[] = [];
  for (let t = sh * 60 + sm; t + 15 <= eh * 60 + em; t += 30) out.push(`${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`);
  return out;
}

export const label12 = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
};

export const initials = (name?: string) => (name || '?').split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();

export const STATUS_STYLE: Record<string, string> = {
  upcoming: 'bg-lilac text-plum', completed: 'bg-emerald-50 text-emerald-700', cancelled: 'bg-rose-50 text-rose-600', refunded: 'bg-amber-50 text-amber-700',
  active: 'bg-emerald-50 text-emerald-700', ended: 'bg-stone-100 text-stone-600', pending: 'bg-amber-50 text-amber-700', approved: 'bg-emerald-50 text-emerald-700',
  paid: 'bg-emerald-50 text-emerald-700', rejected: 'bg-rose-50 text-rose-600', published: 'bg-emerald-50 text-emerald-700', hidden: 'bg-stone-100 text-stone-600',
  flagged: 'bg-rose-50 text-rose-600', open: 'bg-amber-50 text-amber-700', resolved: 'bg-emerald-50 text-emerald-700', suspended: 'bg-rose-50 text-rose-600',
  not_submitted: 'bg-stone-100 text-stone-600', success: 'bg-emerald-50 text-emerald-700',
};
