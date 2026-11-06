export const P = (n) => String(n).padStart(2, '0');

export const iso = (d) => `${d.getFullYear()}-${P(d.getMonth() + 1)}-${P(d.getDate())}`;

export const hoursList = (open, close) => {
  const list = [];
  for (let h = open; h < close; h++) list.push(`${P(h)}:00`);
  return list;
};

export const waLink = (phone, text) =>
  `https://wa.me/${phone}${text ? `?text=${encodeURIComponent(text)}` : ''}`;

export const formatPhone = (p) => p.replace(/^245/, '').replace(/(\d{3})(?=\d)/g, '$1 ');

export const img = (file) => `${import.meta.env.BASE_URL}img/${file}`;

export const fmtViews = (n) =>
  n >= 10000 ? `${Math.round(n / 1000)} mil` : `${(n / 1000).toFixed(1).replace('.', ',')} mil`;

// Para "mais de": arredonda para BAIXO e põe + à frente, para nunca prometer mais do que é.
// 165000 -> "+165 mil"; 60500 -> "+60 mil"; 14400 -> "+14 mil"; 8700 -> "+8,7 mil"
export const fmtViewsMais = (n) =>
  n >= 10000 ? `+${Math.floor(n / 1000)} mil` : n >= 1000 ? `+${(Math.floor(n / 100) / 10).toFixed(1).replace('.', ',')} mil` : `+${n}`;

// 52400 -> "52,4 mil"; 580500 -> "581 mil"; 1250000 -> "1,3 mi"
export const fmtCount = (n) => {
  n = Number(n);
  if (!Number.isFinite(n)) return '';
  if (n >= 1e6) return `${(n / 1e6).toFixed(1).replace('.', ',').replace(',0', '')} mi`;
  if (n >= 1e5) return `${Math.round(n / 1000)} mil`;
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace('.', ',').replace(',0', '')} mil`;
  return String(n);
};

const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
export const fmtDate = (s) => `${Number(s.slice(8, 10))} ${MESES[Number(s.slice(5, 7)) - 1]} ${s.slice(0, 4)}`;

export const fmtDay = (s) => s.split('-').reverse().join('/');

// ---- datas e horas (hora local de Bissau, igual a UTC) ----
export const WEEK = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export const addDays = (isoDay, n) => {
  const d = new Date(`${isoDay}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

// "2026-10-14T10:30:00" -> minutos desde a meia-noite
export const toMin = (ts) => Number(ts.slice(11, 13)) * 60 + Number(ts.slice(14, 16));

// minutos -> "10:30"
export const hm = (m) => `${P(Math.floor(m / 60))}:${P(m % 60)}`;

export const fmtDur = (m) =>
  m >= 60 ? `${Math.floor(m / 60)} h${m % 60 ? ` ${m % 60} min` : ''}` : `${m} min`;

// 2500 -> "2.500 FCFA" (como no preçário da barbearia); com mais = true: "3.000 FCFA ou mais"
export const fmtMoney = (n, cur, mais = false) =>
  n === null || n === undefined || n === ''
    ? ''
    : `${String(Math.round(Number(n))).replace(/\B(?=(\d{3})+(?!\d))/g, '.')} ${cur}${mais ? ' ou mais' : ''}`;

// Reduz uma foto do telemóvel (máx. 1600 px, JPEG) antes de a enviar, para carregar depressa no site.
// Com square = true recorta ao centro em quadrado (fotos de perfil dos barbeiros).
export const shrinkImage = (file, max = 1600, square = false) =>
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const im = new Image();
    im.onload = () => {
      let sx = 0, sy = 0, sw = im.width, sh = im.height;
      if (square) {
        const s = Math.min(im.width, im.height);
        sx = (im.width - s) / 2; sy = (im.height - s) / 2; sw = s; sh = s;
      }
      const k = Math.min(1, max / Math.max(sw, sh));
      const c = document.createElement('canvas');
      c.width = Math.round(sw * k);
      c.height = Math.round(sh * k);
      c.getContext('2d').drawImage(im, sx, sy, sw, sh, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      c.toBlob((b) => (b ? resolve(b) : reject(new Error('Não deu para ler a foto.'))), 'image/jpeg', 0.82);
    };
    im.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Não deu para ler a foto.')); };
    im.src = url;
  });

// Telefone: só dígitos; com 9 dígitos junta o indicativo 245 da Guiné-Bissau
export const normPhone = (v) => {
  const d = String(v || '').replace(/\D/g, '');
  return d.length === 9 ? `245${d}` : d;
};

// UUID v4 (crypto.randomUUID só existe em páginas seguras; isto funciona também em http)
export const uuid = () => {
  const c = globalThis.crypto;
  if (c && c.randomUUID) return c.randomUUID();
  const b = new Uint8Array(16);
  if (c && c.getRandomValues) c.getRandomValues(b);
  else for (let i = 0; i < 16; i++) b[i] = Math.floor(Math.random() * 256);
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
};
