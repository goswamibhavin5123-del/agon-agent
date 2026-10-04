export const SIGNS = [
  { key: 'aries', name: 'Aries', glyph: '♈', dates: 'Mar 21 – Apr 19', element: 'Fire', ruler: 'Mars', hindi: 'Mesha' },
  { key: 'taurus', name: 'Taurus', glyph: '♉', dates: 'Apr 20 – May 20', element: 'Earth', ruler: 'Venus', hindi: 'Vrishabha' },
  { key: 'gemini', name: 'Gemini', glyph: '♊', dates: 'May 21 – Jun 20', element: 'Air', ruler: 'Mercury', hindi: 'Mithuna' },
  { key: 'cancer', name: 'Cancer', glyph: '♋', dates: 'Jun 21 – Jul 22', element: 'Water', ruler: 'Moon', hindi: 'Karka' },
  { key: 'leo', name: 'Leo', glyph: '♌', dates: 'Jul 23 – Aug 22', element: 'Fire', ruler: 'Sun', hindi: 'Simha' },
  { key: 'virgo', name: 'Virgo', glyph: '♍', dates: 'Aug 23 – Sep 22', element: 'Earth', ruler: 'Mercury', hindi: 'Kanya' },
  { key: 'libra', name: 'Libra', glyph: '♎', dates: 'Sep 23 – Oct 22', element: 'Air', ruler: 'Venus', hindi: 'Tula' },
  { key: 'scorpio', name: 'Scorpio', glyph: '♏', dates: 'Oct 23 – Nov 21', element: 'Water', ruler: 'Mars', hindi: 'Vrishchika' },
  { key: 'sagittarius', name: 'Sagittarius', glyph: '♐', dates: 'Nov 22 – Dec 21', element: 'Fire', ruler: 'Jupiter', hindi: 'Dhanu' },
  { key: 'capricorn', name: 'Capricorn', glyph: '♑', dates: 'Dec 22 – Jan 19', element: 'Earth', ruler: 'Saturn', hindi: 'Makara' },
  { key: 'aquarius', name: 'Aquarius', glyph: '♒', dates: 'Jan 20 – Feb 18', element: 'Air', ruler: 'Saturn', hindi: 'Kumbha' },
  { key: 'pisces', name: 'Pisces', glyph: '♓', dates: 'Feb 19 – Mar 20', element: 'Water', ruler: 'Jupiter', hindi: 'Meena' },
];

export const g = (glyph: string) => glyph + '\uFE0E';

export function signFromDate(dob?: string | null) {
  if (!dob) return null;
  const d = new Date(dob);
  if (isNaN(d.getTime())) return null;
  const m = d.getUTCMonth() + 1;
  const day = d.getUTCDate();
  const edges = [20, 19, 21, 20, 21, 21, 23, 23, 23, 23, 22, 22];
  const idx = day < edges[m - 1] ? (m + 8) % 12 : (m + 9) % 12;
  return SIGNS[idx].key;
}

export const signByKey = (k?: string | null) => SIGNS.find((s) => s.key === k) || null;
