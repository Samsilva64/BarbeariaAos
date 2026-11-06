import { P, WEEK } from './utils';

// Os dois salões da BarberShop AOS.
// O "id" é o que fica gravado nas marcações e nos barbeiros (não mudar); o nome e a morada vêm de src/data/site.json (locations).
//
// Horário: a hora de abrir e a de fechar "normais" vêm do painel de administração (cfg.open / cfg.close).
// "fechoExtra" diz em que dias da semana (0 = domingo ... 6 = sábado) um salão fecha mais tarde.
// O Salão de Feira de Praça fecha às 22h às quartas (3), sextas (5) e sábados (6); o de Mbatonha segue sempre o horário normal.
export const SALOES = [
  { id: 'lago', nome: 'Salão de Mbatonha' },
  { id: 'mercado', nome: 'Salão de Feira de Praça', fechoExtra: { 3: 22, 5: 22, 6: 22 } },
];

const ORDEM = [1, 2, 3, 4, 5, 6, 0]; // semana a começar na segunda

// hora de fecho de um salão num dia da semana
function fechoDoDia(cfg, id, dow) {
  const s = SALOES.find((x) => x.id === id);
  const normal = Number(cfg.close);
  const extra = s && s.fechoExtra && s.fechoExtra[dow];
  return extra ? Math.max(extra, normal) : normal;
}

// { open, close } de um salão num dia ("2026-10-23"); sem salão escolhido usa o horário normal
export function salonHours(cfg, id, day) {
  const dow = new Date(`${day}T00:00:00Z`).getUTCDay();
  return { open: Number(cfg.open), close: id ? fechoDoDia(cfg, id, dow) : Number(cfg.close) };
}

const listaDias = (dias) => {
  const n = dias.map((d) => WEEK[d]);
  return n.length > 1 ? `${n.slice(0, -1).join(', ')} e ${n[n.length - 1]}` : n[0];
};

// Linhas de horário de um salão, agrupando os dias com a mesma hora de fecho:
// [{ dias: 'Seg, Ter, Qui e Dom', horas: '09h às 19h', fecho: 19 }, { dias: 'Qua, Sex e Sáb', horas: '09h às 22h', fecho: 22 }]
export function horarioSalao(cfg, id) {
  const grupos = new Map();
  for (const d of ORDEM) {
    const c = fechoDoDia(cfg, id, d);
    if (!grupos.has(c)) grupos.set(c, []);
    grupos.get(c).push(d);
  }
  return [...grupos].map(([c, dias]) => ({
    dias: dias.length === 7 ? 'Todos os dias' : listaDias(dias),
    horas: `${P(Number(cfg.open))}h às ${P(c)}h`,
    fecho: c,
  }));
}

export function listSalons(cfg) {
  const locs = cfg.locations || [];
  return SALOES.map((s, i) => ({
    id: s.id,
    name: (locs[i] && locs[i].name) || s.nome,
    where: (locs[i] && locs[i].where) || '',
    horario: horarioSalao(cfg, s.id),
  }));
}

export const salonName = (cfg, id) => (listSalons(cfg).find((s) => s.id === id) || {}).name || '';

// Frase para os textos do site, só para os salões que fecham mais tarde em alguns dias.
// ex.: "No Salão de Feira de Praça, abrimos até às 22h (Qua, Sex e Sáb)."
export function notaHorarios(cfg) {
  return listSalons(cfg)
    .filter((s) => s.horario.length > 1)
    .map((s) => {
      const tarde = s.horario[s.horario.length - 1];
      return `No ${s.name}, abrimos até às ${P(tarde.fecho)}h (${tarde.dias}).`;
    })
    .join(' ');
}
