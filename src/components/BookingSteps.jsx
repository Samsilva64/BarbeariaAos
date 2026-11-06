import { useState } from 'react';
import { WEEK, addDays, fmtDur, fmtMoney, fmtDay, hm, formatPhone } from '../utils';
import { agrupar, ICONE, temPreco } from '../servicos';

// ---------- 0. Salão ----------
export function SalonStep({ salons, salon, setSalon }) {
  return (
    <>
      <h3 className="qh">Em que salão?</h3>
      <p className="lead">Escolhe o salão onde queres ser atendido.</p>
      <div className="opts">
        {salons.map((s) => (
          <button type="button" key={s.id} className={`opt${salon === s.id ? ' on' : ''}`} onClick={() => setSalon(s.id)} aria-pressed={salon === s.id}>
            <span className="avatar" aria-hidden="true">📍</span>
            <span className="ot">
              <b>{s.name}</b>
              {s.where && <small>{s.where}</small>}
              {s.horario && <small>⏰ {s.horario.map((h) => `${h.dias}: ${h.horas}`).join(' · ')}</small>}
            </span>
          </button>
        ))}
      </div>
    </>
  );
}

// ---------- 1. Serviço ----------
// Separadores por categoria (Cabelo, Pintura, Domicílio); dentro de cada um, os serviços por grupo.
export function ServiceStep({ cfg, sel, toggle, aoTrocar }) {
  const cats = agrupar(cfg.services);
  const [tab, setTab] = useState(0);
  const atual = cats[Math.min(tab, cats.length - 1)];
  const noDom = atual && atual.cat === 'Domicílio';
  return (
    <>
      <h3 className="qh">Qual serviço?</h3>
      <p className="lead">Escolhe o que desejas fazer. Podes escolher mais de um.</p>
      {cats.length > 1 && (
        <div className="tabs" role="tablist">
          {cats.map((c, k) => {
            const n = sel.filter((i) => c.idx.includes(i)).length;
            return (
              <button type="button" role="tab" aria-selected={k === tab} key={c.cat} className={`tab${k === tab ? ' on' : ''}`} onClick={() => { setTab(k); if (aoTrocar) aoTrocar(); }}>
                <span aria-hidden="true">{ICONE[c.cat] || '✂'}</span> {c.cat}{n > 0 && <b>{n}</b>}
              </button>
            );
          })}
        </div>
      )}
      {noDom && <p className="pnote">Um barbeiro vai ter contigo. Escolhe a tua zona e, mais à frente, diz-nos a morada.</p>}
      {atual && atual.grupos.map((g) => (
        <div key={g.g || 'x'}>
          {g.g && <p className="grp">{g.g}</p>}
          <div className="opts">
            {g.itens.map(({ s, i }) => {
              const on = sel.includes(i);
              return (
                <button type="button" key={i} className={`opt${on ? ' on' : ''}`} onClick={() => toggle(i)} aria-pressed={on}>
                  <span className="simg">{s.img ? <img src={s.img} alt="" loading="lazy" /> : <span aria-hidden="true">{ICONE[s.c] || '✂'}</span>}</span>
                  <span className="ot"><b>{s.n}</b><small>⏱ {fmtDur(s.d || 30)}</small></span>
                  <span className="op">
                    {temPreco(s) ? fmtMoney(s.p, cfg.currency) : 'Sob consulta'}
                    {s.mais && <small className="pm">ou mais</small>}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </>
  );
}

// ---------- 2. Profissional ----------
export function ProStep({ team, proId, setPro }) {
  return (
    <>
      <h3 className="qh">Qual profissional?</h3>
      <p className="lead">Escolhe o barbeiro da tua preferência.</p>
      <div className="opts">
        <button type="button" className={`opt${proId === 'any' ? ' on' : ''}`} onClick={() => setPro('any')}>
          <span className="avatar">★</span>
          <span className="ot"><b>Sem preferência</b><small>O primeiro barbeiro livre</small></span>
        </button>
        {team.map((t) => (
          <button type="button" key={t.id} className={`opt${proId === t.id ? ' on' : ''}`} onClick={() => setPro(t.id)}>
            <span className="avatar pf">
              {t.photo ? <img src={t.photo} alt={t.name} /> : t.name.trim().charAt(0).toUpperCase()}
            </span>
            <span className="ot">
              <b>{t.name}</b>
              {t.phone && <small>📞 {formatPhone(t.phone)}</small>}
            </span>
          </button>
        ))}
      </div>
    </>
  );
}

// ---------- 3. Horário ----------
export function TimeStep({ hoje, day, setDay, slots, time, setTime, salonNome, horas }) {
  const dias = Array.from({ length: 21 }, (_, i) => addDays(hoje, i));
  const livres = slots.filter((s) => !s.off).length;
  return (
    <>
      <h3 className="qh">Quando?</h3>
      <p className="lead">Seleciona o dia e a hora.</p>
      <div className="days">
        {dias.map((d, i) => (
          <button type="button" key={d} className={`dchip${d === day ? ' on' : ''}`} onClick={() => setDay(d)}>
            <small>{i === 0 ? 'Hoje' : i === 1 ? 'Amanhã' : WEEK[new Date(`${d}T00:00:00`).getDay()]}</small>
            <b>{d.slice(8)}</b>
          </button>
        ))}
      </div>
      {horas && <p className="hnote">⏰ {salonNome ? `${salonNome}: ` : ''}aberto das {String(horas.open).padStart(2, '0')}h às {String(horas.close).padStart(2, '0')}h neste dia.</p>}
      {livres === 0 ? (
        <p className="lead">Não há horas livres neste dia para a duração escolhida. Tenta outro dia.</p>
      ) : (
        <div className="slots">
          {slots.map(({ m, off }) => (
            <button key={m} type="button" disabled={off} className={time === m && !off ? 'on' : ''} onClick={() => setTime(m)}>
              {hm(m)}
            </button>
          ))}
        </div>
      )}
    </>
  );
}

// ---------- 4. Dados ----------
export function DataStep({ name, setName, digits, setDigits, domicilio, address, setAddress }) {
  return (
    <>
      <h3 className="qh">Os teus dados</h3>
      <p className="lead">Para confirmarmos a marcação. Sem registo nem senha.</p>
      <div className="book" style={{ maxWidth: 'none' }}>
        <label>Nome completo *
          <input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" maxLength={80} />
        </label>
        <label>Telemóvel *
          <span className="tel">
            <span className="pre">+245</span>
            <input
              value={digits}
              onChange={(e) => setDigits(e.target.value.replace(/\D/g, '').slice(0, 15))}
              inputMode="tel"
              autoComplete="tel-national"
              placeholder="955 000 000"
            />
          </span>
        </label>
        {domicilio && (
          <label>Onde estás? (bairro e morada) *
            <input value={address} onChange={(e) => setAddress(e.target.value)} autoComplete="street-address" maxLength={80} placeholder="Ex.: Bairro de Quelelé, perto da escola" />
          </label>
        )}
      </div>
    </>
  );
}

// ---------- 5. Confirmar ----------
export function ConfirmStep({ cfg, salonName, chosen, proName, day, time, dur, name, digits, total, mais, address }) {
  const linhas = [
    ['Barbearia', cfg.name],
    ...(salonName ? [['Salão', salonName]] : []),
    ['Serviço', chosen.map((s) => s.n).join(' + ')],
    ['Profissional', proName],
    ['Data e hora', `${fmtDay(day)} às ${hm(time)} (${fmtDur(dur)})`],
    ['Cliente', `${name.trim()} · +245 ${digits}`],
    ...(address && address.trim() ? [['Morada', address.trim()]] : []),
    ['Valor', total === null ? 'Preço sob consulta' : fmtMoney(total, cfg.currency, mais)],
  ];
  return (
    <>
      <h3 className="qh">Confirmar</h3>
      <p className="lead">Verifica os detalhes da marcação.</p>
      <div className="sum">
        {linhas.map(([k, v]) => (
          <div key={k}><span>{k}</span><strong>{v}</strong></div>
        ))}
      </div>
    </>
  );
}

// ---------- 6. Pagamento ----------
export function PayStep({ cfg, payment, setPay, total, mais }) {
  return (
    <>
      <h3 className="qh">Como vais pagar?</h3>
      <p className="lead">
        Escolhe a forma de pagamento{total !== null ? `. Total: ${fmtMoney(total, cfg.currency, mais)}` : ''}.
      </p>
      <div className="opts">
        {cfg.payments.map((p) => (
          <button type="button" key={p} className={`opt${payment === p ? ' on' : ''}`} onClick={() => setPay(p)} aria-pressed={payment === p}>
            <span className="chk">{payment === p ? '✓' : ''}</span>
            <span className="ot"><b>{p}</b></span>
          </button>
        ))}
      </div>
    </>
  );
}
