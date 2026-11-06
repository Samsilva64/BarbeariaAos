import { useCallback, useEffect, useRef, useState } from 'react';
import { online } from '../supabase';
import { fetchBusy, createBooking, notifyBooking } from '../api';
import { iso, hm, toMin, fmtDay, fmtDur, fmtMoney, uuid, waLink, normPhone } from '../utils';
import { SalonStep, ServiceStep, ProStep, TimeStep, DataStep, ConfirmStep, PayStep } from './BookingSteps.jsx';
import { listSalons, salonName, salonHours } from '../salons';

const LABELS = {
  salao: 'Salão', servico: 'Serviço', profissional: 'Profissional', horario: 'Horário',
  dados: 'Dados', confirmar: 'Confirmar', pagamento: 'Pagamento',
};

// Marcação em etapas: Salão > Serviço > Profissional > Horário > Dados > Confirmar > Pagamento.
// Com Supabase: grava na base de dados e a hora fica bloqueada para todos (sem sobreposição).
// Sem Supabase (modo simples): no fim, o pedido segue por WhatsApp.
export default function Booking({ cfg }) {
  const hoje = iso(new Date());
  const salons = listSalons(cfg);
  const [salon, setSalon] = useState(null);
  // Só aparecem os barbeiros do salão escolhido (os que ainda não têm salão no painel aparecem nos dois)
  const team = salon ? (cfg.team || []).filter((t) => !t.salon || t.salon === salon) : [];

  const [step, setStep] = useState(0);
  const [sel, setSel] = useState([]);
  const [proId, setProId] = useState('any');
  const [day, setDay] = useState(hoje);
  const [time, setTime] = useState(null);
  const [name, setName] = useState('');
  const [digits, setDigits] = useState('');
  const [address, setAddress] = useState('');
  const [pay, setPay] = useState('');
  const [busy, setBusy] = useState([]);
  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState('');
  const [done, setDone] = useState(null);

  // A etapa "Profissional" só aparece quando o salão escolhido tem 2 ou mais barbeiros
  const keys = ['salao', 'servico', ...(team.length > 1 ? ['profissional'] : []), 'horario', 'dados', 'confirmar', 'pagamento'];
  const key = keys[step];

  const resources = team.length ? team.map((t) => t.id) : [`geral-${salon || 'x'}`];
  const pool = proId === 'any' || !resources.includes(proId) ? resources : [proId];
  const payment = pay || cfg.payments[0];

  const chosen = sel.map((i) => cfg.services[i]).filter(Boolean);
  // domicílio: o barbeiro vai ao cliente, por isso pedimos a morada; "ou mais": o valor final é confirmado na barbearia
  const domicilio = chosen.some((s) => s.dom);
  const mais = chosen.some((s) => s.mais);
  const nomesServ = chosen.map((s) => (s.dom ? `Ao domicílio: ${s.n}` : s.n)).join(' + ');
  const servicoTxt = domicilio && address.trim() ? `${nomesServ} — Morada: ${address.trim()}` : nomesServ;
  const dur = chosen.reduce((a, s) => a + (s.d || 30), 0) || 30;
  const priced = chosen.length > 0 && chosen.every((s) => s.p !== null && s.p !== undefined && s.p !== '');
  const total = priced ? chosen.reduce((a, s) => a + Number(s.p), 0) : null;

  // A caixa da marcação muda de altura em cada etapa (a lista de pinturas é comprida, a dos barbeiros é curta).
  // Quando isso acontece a página ficava para trás, lá em baixo. Aqui a página acompanha a caixa:
  // se ela cabe no ecrã, fica ao centro; se for maior, o topo fica logo abaixo do menu.
  const wizRef = useRef(null);
  const anterior = useRef({ step, done }); // etapa em que a caixa estava da última vez
  const manterVisivel = useCallback(() => {
    requestAnimationFrame(() => {
      const el = wizRef.current;
      if (!el) return;
      const nav = document.querySelector('nav');
      const navH = nav ? nav.getBoundingClientRect().height : 0;
      const r = el.getBoundingClientRect();
      const util = window.innerHeight - navH; // altura que sobra por baixo do menu fixo
      if (r.top >= navH && r.bottom <= window.innerHeight) return; // já está toda à vista
      const alvo = r.height <= util - 24
        ? window.scrollY + r.top - navH - (util - r.height) / 2
        : window.scrollY + r.top - navH - 12;
      const reduzir = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      window.scrollTo({ top: Math.max(0, alvo), behavior: reduzir ? 'auto' : 'smooth' });
    });
  }, []);
  // só quando a etapa (ou o ecrã final) MUDA de verdade: ao abrir a página não mexe em nada
  useEffect(() => {
    if (anterior.current.step === step && anterior.current.done === done) return;
    anterior.current = { step, done };
    manterVisivel();
  }, [step, done, manterVisivel]);

  const refresh = useCallback(async () => setBusy(await fetchBusy(day)), [day]);
  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 15000);
    return () => clearInterval(t);
  }, [refresh]);

  // horas livres: um profissional tem de estar livre durante toda a duração
  const agora = new Date();
  const nowMin = agora.getHours() * 60 + agora.getMinutes();
  const ocupado = (pid) => busy.filter((b) => b.professional === pid).map((b) => [toMin(b.starts_at), toMin(b.ends_at)]);
  const livre = (m) => pool.find((pid) => !ocupado(pid).some(([s, e]) => s < m + dur && e > m));
  const slots = [];
  const horas = salonHours(cfg, salon, day); // cada salão tem o seu horário em cada dia da semana
  for (let m = horas.open * 60; m + dur <= horas.close * 60; m += 30) {
    slots.push({ m, off: !livre(m) || (day === hoje && m <= nowMin) });
  }
  const timeOk = time !== null && slots.some((s) => s.m === time && !s.off);

  const phoneOk = digits.length >= 7;
  const pode = {
    salao: Boolean(salon), servico: sel.length > 0 && nomesServ.length <= 200, profissional: true, horario: timeOk,
    dados: name.trim().length > 0 && phoneOk && (!domicilio || address.trim().length >= 4), confirmar: true, pagamento: Boolean(payment),
  }[key];
  const dica = {
    salao: 'Escolhe o salão.', servico: nomesServ.length > 200 ? 'Escolheste muitos serviços de uma vez. Tira alguns.' : 'Escolhe pelo menos um serviço.',
    horario: 'Escolhe uma hora livre.',
    dados: domicilio ? 'Preenche o nome, o telemóvel e a morada.' : 'Preenche o nome e o telemóvel.',
  }[key];

  const toggle = (i) => {
    setSel((s) => {
      if (s.includes(i)) return s.filter((x) => x !== i);
      // só uma zona de domicílio de cada vez: escolher outra troca a anterior
      const base = cfg.services[i] && cfg.services[i].dom ? s.filter((x) => !(cfg.services[x] && cfg.services[x].dom)) : s;
      return [...base, i];
    });
    setTime(null);
  };
  const escolherSalao = (id) => { setSalon(id); setProId('any'); setTime(null); };
  const escolherPro = (id) => { setProId(id); setTime(null); };
  const escolherDia = (d) => { setDay(d); setTime(null); };

  const nomePro = (pid) => team.find((t) => t.id === pid)?.name || 'Sem preferência';

  const concluir = async () => {
    const pid = livre(time);
    if (!pid) { setMsg('Essa hora acabou de ser ocupada. Escolhe outra.'); setTime(null); setStep(keys.indexOf('horario')); refresh(); return; }
    const waPhone = normPhone((cfg.salon_phones || {})[salon] || cfg.phone);
    const waText = [
      `Nova marcação — ${cfg.name}`,
      `Salão: ${salonName(cfg, salon)}`,
      `Serviço: ${nomesServ}`,
      ...(domicilio && address.trim() ? [`Morada: ${address.trim()}`] : []),
      `Profissional: ${nomePro(pid)}`,
      `Dia: ${fmtDay(day)}`,
      `Hora: ${hm(time)}`,
      `Cliente: ${name.trim()}`,
      `Telefone: +245 ${digits}`,
      `Pagamento: ${payment}`,
    ].join('\n');
    let avisado = false;
    if (online) {
      setSending(true);
      const id = uuid();
      const { error } = await createBooking({
        id,
        salon,
        service: servicoTxt,
        professional: pid,
        starts_at: `${day}T${hm(time)}:00`,
        ends_at: `${day}T${hm(time + dur)}:00`,
        name: name.trim(),
        phone: `+245 ${digits}`,
        price: total,
        payment,
      });
      if (error) {
        setSending(false);
        if (error.code === '23P01' || error.code === '23505') {
          setMsg('Essa hora acabou de ser ocupada. Escolhe outra.');
          setTime(null); setStep(keys.indexOf('horario')); refresh();
        } else {
          setMsg('Não foi possível registar agora. Tenta pelo WhatsApp.');
        }
        return;
      }
      avisado = await notifyBooking(id);
      setSending(false);
      refresh();
    }
    setMsg('');
    setDone({
      quando: `${fmtDay(day)} às ${hm(time)}`,
      avisado,
      whatsappUrl: waLink(waPhone, waText),
    });
  };

  const reiniciar = () => {
    setDone(null); setStep(0); setSalon(null); setSel([]); setProId('any'); setTime(null);
    setName(''); setDigits(''); setAddress(''); setMsg('');
  };

  if (done) {
    return (
      <section className="alt" id="marcar">
        <div className="wrap">
          <div className="wiz" ref={wizRef}>
            <div className="wb">
              <h3 className="qh">{online ? 'Marcação confirmada!' : 'Marcação não confirmada'}</h3>
              <div className="donebox">
                <p>
                  {!online
                    ? 'O serviço de marcação automática está indisponível. A tua marcação ainda não foi enviada; usa o botão do WhatsApp para enviar o pedido à barbearia.'
                    : done.avisado.ok
                      ? `A tua marcação para ${done.quando} ficou registada e a barbearia já foi avisada. Até já! ✂️`
                      : `A tua marcação para ${done.quando} ficou registada, mas não foi possível avisar a barbearia automaticamente${done.avisado.motivo ? ` (${done.avisado.motivo})` : ''}. Contacta a barbearia para confirmar.`
                  }
                </p>
                <div className="btns">
                  {!online && (
                    <a className="btn" href={done.whatsappUrl} target="_blank" rel="noopener noreferrer">
                      Enviar pedido pelo WhatsApp
                    </a>
                  )}
                  <button type="button" className="btn alt" onClick={reiniciar}>Nova marcação</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  const ultimo = step === keys.length - 1;
  const proNome = team.length === 1 ? team[0].name : nomePro(proId === 'any' ? null : proId);

  return (
    <section className="alt" id="marcar">
      <div className="wrap">
        <h2>Marcar horário</h2>
        <p className="lead">Em poucos passos, sem filas.</p>
        <div className="wiz" ref={wizRef}>
          <div className="steps" role="list">
            {keys.map((k, i) => (
              <div role="listitem" key={k} className={`st${i === step ? ' on' : ''}${i < step ? ' ok' : ''}`}>
                <i>{i < step ? '✓' : i + 1}</i>
                <span>{LABELS[k]}</span>
              </div>
            ))}
          </div>
          <div className="wb">
            {key === 'salao' && <SalonStep salons={salons} salon={salon} setSalon={escolherSalao} />}
            {key === 'servico' && <ServiceStep cfg={cfg} sel={sel} toggle={toggle} aoTrocar={manterVisivel} />}
            {key === 'profissional' && <ProStep team={team} proId={proId} setPro={escolherPro} />}
            {key === 'horario' && (
              <TimeStep hoje={hoje} day={day} setDay={escolherDia} slots={slots} time={timeOk ? time : null} setTime={setTime} salonNome={salonName(cfg, salon)} horas={horas} />
            )}
            {key === 'dados' && (
              <DataStep name={name} setName={setName} digits={digits} setDigits={setDigits} domicilio={domicilio} address={address} setAddress={setAddress} />
            )}
            {key === 'confirmar' && (
              <ConfirmStep cfg={cfg} salonName={salonName(cfg, salon)} chosen={chosen} proName={proNome} day={day} time={time} dur={dur} name={name} digits={digits} total={total} mais={mais} address={domicilio ? address : ''} />
            )}
            {key === 'pagamento' && <PayStep cfg={cfg} payment={payment} setPay={setPay} total={total} mais={mais} />}
          </div>
          <p className="err">{msg || (!pode ? dica : '')}</p>
          <div className="wnav">
            <button type="button" className="btn alt" disabled={step === 0} onClick={() => { setMsg(''); setStep(step - 1); }}>← Voltar</button>
            {ultimo ? (
              <button type="button" className="btn" disabled={!pode || sending} onClick={concluir}>
                {sending ? 'A marcar...' : 'Concluir marcação'}
              </button>
            ) : (
              <button type="button" className="btn" disabled={!pode} onClick={() => { setMsg(''); setStep(step + 1); }}>Continuar →</button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
