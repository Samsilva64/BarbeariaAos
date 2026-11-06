import { useState } from 'react';
import { agrupar, ICONE, temPreco } from '../servicos';
import { fmtMoney } from '../utils';

const LIMITE = 6; // categorias com mais serviços do que isto começam fechadas, com "Ver mais"

// Quando fechado, mostra grupos inteiros até chegar ao limite (ex.: Pintura mostra Aerógrafo + Preto)
function visiveis(grupos, aberto) {
  const total = grupos.reduce((a, g) => a + g.itens.length, 0);
  if (aberto || total <= LIMITE + 1) return { lista: grupos, escondidos: 0 };
  const lista = [];
  let n = 0;
  for (const g of grupos) {
    if (lista.length && n + g.itens.length > LIMITE) break;
    lista.push(g);
    n += g.itens.length;
  }
  return { lista, escondidos: total - n };
}

// Preçário: um cartão por categoria (Cabelo, Pintura, Domicílio), como no preçário da barbearia.
export default function Services({ cfg }) {
  const [abertos, setAbertos] = useState({});
  const cats = agrupar(cfg.services);
  const temMais = (cfg.services || []).some((s) => s.mais);
  return (
    <section id="servicos">
      <div className="wrap">
        <h2>Serviços e preços</h2>
        <p className="lead">Corte e barba feitos por barbeiros experientes, num ambiente acolhedor. Preços em {cfg.currency}.</p>
        <div className="plist">
          {cats.map((c) => {
            const aberto = Boolean(abertos[c.cat]);
            const { lista, escondidos } = visiveis(c.grupos, aberto);
            const pode = aberto || escondidos > 0; // tem botão "Ver mais" / "Ver menos"
            return (
              // aberto, o cartão ocupa a largura toda e reparte os grupos em colunas (sem ficar um buraco ao lado)
              <div className={`pcard${aberto && pode ? ' wide' : ''}`} key={c.cat}>
                <h3><span aria-hidden="true">{ICONE[c.cat] || '✂'}</span> {c.cat}</h3>
                {c.cat === 'Domicílio' && <p className="pnote">Corte de cabelo em tua casa. O preço depende da zona onde estás.</p>}
                <div className="pgroups">
                  {lista.map((g) => (
                    <div className="pgrp" key={g.g || 'x'}>
                      {g.g && <h4>{g.g}</h4>}
                      <ul>
                        {g.itens.map(({ s, i }) => (
                          <li key={i}>
                            <span className="pn">{s.n}</span>
                            <span className="pd" aria-hidden="true" />
                            <span className="pp">
                              {temPreco(s) ? fmtMoney(s.p, cfg.currency) : 'Sob consulta'}
                              {s.mais && <small className="pm">ou mais</small>}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
                {pode && (
                  <button type="button" className="pmore" aria-expanded={aberto} onClick={() => setAbertos((a) => ({ ...a, [c.cat]: !aberto }))}>
                    {aberto ? 'Ver menos' : `Ver mais ${escondidos} serviços`}
                  </button>
                )}
              </div>
            );
          })}
        </div>
        <p className="pfoot">
          <strong>Outros serviços sob consulta.</strong>
          {temMais && ' Nos preços com “ou mais”, o valor final depende do cabelo e é confirmado na barbearia.'}
        </p>
        <p><a className="btn" href="#marcar">Marcar horário</a></p>
      </div>
    </section>
  );
}
