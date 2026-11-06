import { fmtMoney } from './utils';

// Ajudas para o preçário. Cada serviço (settings.services) tem:
//   n nome, p preço, d duração em minutos, c categoria, g grupo dentro da categoria,
//   mais = true ("ou mais": preço a partir de), dom = true (serviço ao domicílio, pede a morada)
export const ICONE = { Cabelo: '✂', Pintura: '🎨', Domicílio: '🏠' };
export const CATEGORIAS = ['Cabelo', 'Pintura', 'Domicílio'];
const SEM_CATEGORIA = 'Outros serviços';

export const temPreco = (s) => s.p !== null && s.p !== undefined && s.p !== '';

// "2.500 FCFA", "3.000 FCFA ou mais" ou "Sob consulta"
export const precoTxt = (s, cur) => (temPreco(s) ? fmtMoney(s.p, cur, Boolean(s.mais)) : 'Sob consulta');

// Agrupa por categoria e, dentro dela, por grupo, na ordem em que aparecem.
// Cada item guarda o índice original (i) porque a marcação escolhe serviços por esse índice.
// [{ cat, idx: [0,1,..], grupos: [{ g, itens: [{ s, i }] }] }]
export function agrupar(servicos) {
  const cats = [];
  (servicos || []).forEach((s, i) => {
    const nome = s.c || SEM_CATEGORIA;
    let c = cats.find((x) => x.cat === nome);
    if (!c) { c = { cat: nome, idx: [], grupos: [] }; cats.push(c); }
    const gnome = s.g || '';
    let g = c.grupos.find((x) => x.g === gnome);
    if (!g) { g = { g: gnome, itens: [] }; c.grupos.push(g); }
    g.itens.push({ s, i });
    c.idx.push(i);
  });
  return cats;
}
