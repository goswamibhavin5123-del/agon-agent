const D2R = Math.PI / 180;
const norm = (x: number) => ((x % 360) + 360) % 360;

export const RASHIS = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];
export const RASHI_LORDS = ['Mars', 'Venus', 'Mercury', 'Moon', 'Sun', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Saturn', 'Jupiter'];
export const NAKSHATRAS = ['Ashwini', 'Bharani', 'Krittika', 'Rohini', 'Mrigashira', 'Ardra', 'Punarvasu', 'Pushya', 'Ashlesha', 'Magha', 'Purva Phalguni', 'Uttara Phalguni', 'Hasta', 'Chitra', 'Swati', 'Vishakha', 'Anuradha', 'Jyeshtha', 'Mula', 'Purva Ashadha', 'Uttara Ashadha', 'Shravana', 'Dhanishta', 'Shatabhisha', 'Purva Bhadrapada', 'Uttara Bhadrapada', 'Revati'];
const DASHA_SEQ = ['Ketu', 'Venus', 'Sun', 'Moon', 'Mars', 'Rahu', 'Jupiter', 'Saturn', 'Mercury'];
const DASHA_YEARS: Record<string, number> = { Ketu: 7, Venus: 20, Sun: 6, Moon: 10, Mars: 7, Rahu: 18, Jupiter: 16, Saturn: 19, Mercury: 17 };
const NAK_DEITY = ['Ashwini Kumaras', 'Yama', 'Agni', 'Brahma', 'Soma', 'Rudra', 'Aditi', 'Brihaspati', 'Nagas', 'Pitris', 'Bhaga', 'Aryaman', 'Savitar', 'Vishvakarma', 'Vayu', 'Indra-Agni', 'Mitra', 'Indra', 'Nirriti', 'Apas', 'Vishvedevas', 'Vishnu', 'Vasus', 'Varuna', 'Aja Ekapada', 'Ahir Budhnya', 'Pushan'];
const GANA = ['Deva', 'Manushya', 'Rakshasa', 'Manushya', 'Deva', 'Manushya', 'Deva', 'Deva', 'Rakshasa', 'Rakshasa', 'Manushya', 'Manushya', 'Deva', 'Rakshasa', 'Deva', 'Rakshasa', 'Deva', 'Rakshasa', 'Rakshasa', 'Manushya', 'Manushya', 'Deva', 'Rakshasa', 'Rakshasa', 'Manushya', 'Manushya', 'Deva'];

export const HOUSE_MEANINGS = [
  'Self, personality, appearance', 'Wealth, family, speech', 'Courage, siblings, communication', 'Home, mother, inner peace',
  'Creativity, children, romance', 'Health, service, obstacles', 'Marriage, partnerships', 'Transformation, longevity, secrets',
  'Fortune, dharma, higher learning', 'Career, status, karma', 'Gains, friendships, aspirations', 'Spirituality, losses, liberation',
];

const ELEMENTS: Record<string, number[]> = {
  Mercury: [0.38709927, 0.20563593, 7.00497902, 252.2503235, 149472.67411175, 77.45779628, 48.33076593],
  Venus: [0.72333566, 0.00677672, 3.39467605, 181.9790995, 58517.81538729, 131.60246718, 76.67984255],
  Earth: [1.00000261, 0.01671123, -0.00001531, 100.46457166, 35999.37244981, 102.93768193, 0],
  Mars: [1.52371034, 0.0933941, 1.84969142, -4.55343205, 19140.30268499, -23.94362959, 49.55953891],
  Jupiter: [5.202887, 0.04838624, 1.30439695, 34.39644051, 3034.74612775, 14.72847983, 100.47390909],
  Saturn: [9.53667594, 0.05386179, 2.48599187, 49.95424423, 1222.49362201, 92.59887831, 113.66242448],
};

function helio(name: string, T: number) {
  const [a, e, I, L0, Ld, varpi, Om] = ELEMENTS[name];
  const L = L0 + Ld * T;
  const M = norm(L - varpi) * D2R;
  const w = (varpi - Om) * D2R;
  const O = Om * D2R;
  const inc = I * D2R;
  let E = M;
  for (let i = 0; i < 8; i++) E = E - (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
  const xp = a * (Math.cos(E) - e);
  const yp = a * Math.sqrt(1 - e * e) * Math.sin(E);
  const x = (Math.cos(w) * Math.cos(O) - Math.sin(w) * Math.sin(O) * Math.cos(inc)) * xp + (-Math.sin(w) * Math.cos(O) - Math.cos(w) * Math.sin(O) * Math.cos(inc)) * yp;
  const y = (Math.cos(w) * Math.sin(O) + Math.sin(w) * Math.cos(O) * Math.cos(inc)) * xp + (-Math.sin(w) * Math.sin(O) + Math.cos(w) * Math.cos(O) * Math.cos(inc)) * yp;
  return { x, y };
}

function tropical(d: number) {
  const T = d / 36525;
  const earth = helio('Earth', T);
  const out: Record<string, number> = {};
  out.Sun = norm(Math.atan2(-earth.y, -earth.x) / D2R);
  for (const p of ['Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn']) {
    const h = helio(p, T);
    out[p] = norm(Math.atan2(h.y - earth.y, h.x - earth.x) / D2R);
  }
  const L0 = 218.316 + 13.176396 * d;
  const Mm = (134.963 + 13.064993 * d) * D2R;
  const F = (93.272 + 13.22935 * d) * D2R;
  const D = (297.85 + 12.190749 * d) * D2R;
  const Ms = (357.528 + 0.9856003 * d) * D2R;
  out.Moon = norm(L0 + 6.289 * Math.sin(Mm) - 1.274 * Math.sin(Mm - 2 * D) + 0.658 * Math.sin(2 * D) + 0.214 * Math.sin(2 * Mm) - 0.186 * Math.sin(Ms) - 0.114 * Math.sin(2 * F));
  out.Rahu = norm(125.04452 - 1934.136261 * T);
  out.Ketu = norm(out.Rahu + 180);
  return out;
}

export interface KundliInput { name: string; dob: string; tob: string; lat: number; lon: number; tz: number; }

export function computeKundli(input: KundliInput) {
  const [Y, Mo, Da] = input.dob.split('-').map(Number);
  const [hh, mm] = input.tob.split(':').map(Number);
  const utcMs = Date.UTC(Y, Mo - 1, Da, hh, mm) - input.tz * 3600000;
  const jd = utcMs / 86400000 + 2440587.5;
  const d = jd - 2451545.0;
  const T = d / 36525;
  const ayanamsa = 23.853 + (0.0139689 * d) / 365.25;

  const trop = tropical(d);
  const next = tropical(d + 1);
  const eps = (23.4393 - 0.013 * T) * D2R;
  const gmst = norm(280.46061837 + 360.98564736629 * d);
  const ramc = norm(gmst + input.lon) * D2R;
  const phi = input.lat * D2R;
  const ascTrop = norm(Math.atan2(Math.cos(ramc), -(Math.sin(ramc) * Math.cos(eps) + Math.tan(phi) * Math.sin(eps))) / D2R);
  const asc = norm(ascTrop - ayanamsa);
  const ascSign = Math.floor(asc / 30);

  const order = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn', 'Rahu', 'Ketu'];
  const abbr: Record<string, string> = { Sun: 'Su', Moon: 'Mo', Mars: 'Ma', Mercury: 'Me', Jupiter: 'Ju', Venus: 'Ve', Saturn: 'Sa', Rahu: 'Ra', Ketu: 'Ke' };
  const planets = order.map((name) => {
    const lon = norm(trop[name] - ayanamsa);
    const sign = Math.floor(lon / 30);
    const nak = Math.floor(lon / (360 / 27));
    let delta = next[name] - trop[name];
    if (delta > 180) delta -= 360;
    if (delta < -180) delta += 360;
    const retro = name === 'Rahu' || name === 'Ketu' ? true : name === 'Sun' || name === 'Moon' ? false : delta < 0;
    return {
      name, abbr: abbr[name], lon, sign, signName: RASHIS[sign], degree: lon % 30,
      house: ((sign - ascSign + 12) % 12) + 1, nakshatra: NAKSHATRAS[nak], pada: Math.floor((lon % (360 / 27)) / (360 / 108)) + 1, retro,
    };
  });

  const houses = Array.from({ length: 12 }, (_, i) => {
    const sign = (ascSign + i) % 12;
    return { house: i + 1, sign, signName: RASHIS[sign], lord: RASHI_LORDS[sign], meaning: HOUSE_MEANINGS[i], planets: planets.filter((p) => p.house === i + 1).map((p) => p.abbr) };
  });

  const moon = planets[1];
  const nakSize = 360 / 27;
  const nakIdx = Math.floor(moon.lon / nakSize);
  const traversed = (moon.lon % nakSize) / nakSize;
  const startLord = DASHA_SEQ[nakIdx % 9];
  const birth = new Date(utcMs);
  const dashas: { planet: string; start: string; end: string; years: number }[] = [];
  let cursor = new Date(birth);
  let idx = DASHA_SEQ.indexOf(startLord);
  for (let i = 0; i < 9; i++) {
    const p = DASHA_SEQ[(idx + i) % 9];
    const yrs = i === 0 ? DASHA_YEARS[p] * (1 - traversed) : DASHA_YEARS[p];
    const end = new Date(cursor.getTime() + yrs * 365.25 * 86400000);
    dashas.push({ planet: p, start: cursor.toISOString(), end: end.toISOString(), years: Math.round(yrs * 10) / 10 });
    cursor = end;
  }
  const now = Date.now();
  const current = dashas.find((x) => new Date(x.start).getTime() <= now && new Date(x.end).getTime() > now) || null;
  let antardashas: { planet: string; start: string; end: string }[] = [];
  if (current) {
    const total = DASHA_YEARS[current.planet];
    let c = new Date(current.start).getTime();
    const fullStart = new Date(current.end).getTime() - total * 365.25 * 86400000;
    c = fullStart;
    const ci = DASHA_SEQ.indexOf(current.planet);
    for (let i = 0; i < 9; i++) {
      const p = DASHA_SEQ[(ci + i) % 9];
      const len = (total * DASHA_YEARS[p]) / 120 * 365.25 * 86400000;
      antardashas.push({ planet: p, start: new Date(c).toISOString(), end: new Date(c + len).toISOString() });
      c += len;
    }
    antardashas = antardashas.filter((a) => new Date(a.end).getTime() > new Date(current.start).getTime());
  }

  return {
    ascendant: { lon: asc, sign: ascSign, signName: RASHIS[ascSign], degree: asc % 30, lord: RASHI_LORDS[ascSign], nakshatra: NAKSHATRAS[Math.floor(asc / nakSize)] },
    planets, houses,
    moonSign: RASHIS[moon.sign], sunSign: RASHIS[planets[0].sign],
    nakshatra: { name: NAKSHATRAS[nakIdx], pada: moon.pada, lord: startLord, deity: NAK_DEITY[nakIdx], gana: GANA[nakIdx], index: nakIdx + 1 },
    dashas, current, antardashas, ayanamsa,
  };
}

export const CITIES = [
  { name: 'New Delhi, India', lat: 28.6139, lon: 77.209, tz: 5.5 },
  { name: 'Mumbai, India', lat: 19.076, lon: 72.8777, tz: 5.5 },
  { name: 'Bengaluru, India', lat: 12.9716, lon: 77.5946, tz: 5.5 },
  { name: 'Kolkata, India', lat: 22.5726, lon: 88.3639, tz: 5.5 },
  { name: 'Chennai, India', lat: 13.0827, lon: 80.2707, tz: 5.5 },
  { name: 'Hyderabad, India', lat: 17.385, lon: 78.4867, tz: 5.5 },
  { name: 'Jaipur, India', lat: 26.9124, lon: 75.7873, tz: 5.5 },
  { name: 'Varanasi, India', lat: 25.3176, lon: 82.9739, tz: 5.5 },
  { name: 'Pune, India', lat: 18.5204, lon: 73.8567, tz: 5.5 },
  { name: 'Ahmedabad, India', lat: 23.0225, lon: 72.5714, tz: 5.5 },
  { name: 'Dubai, UAE', lat: 25.2048, lon: 55.2708, tz: 4 },
  { name: 'London, UK', lat: 51.5074, lon: -0.1278, tz: 0 },
  { name: 'New York, USA', lat: 40.7128, lon: -74.006, tz: -5 },
  { name: 'Singapore', lat: 1.3521, lon: 103.8198, tz: 8 },
  { name: 'Sydney, Australia', lat: -33.8688, lon: 151.2093, tz: 10 },
];
