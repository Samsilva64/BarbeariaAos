import { useCallback, useEffect, useRef, useState } from 'react';
import { img } from '../utils';

// Fotos de origem (usadas enquanto o administrador não adicionar as suas no painel)
export const FOTOS = [
  { file: 'corte-1.jpg', alt: 'Corte degradê com barba', kind: 'corte' },
  { file: 'corte-2.jpg', alt: 'Barbeiro a fazer a barba', kind: 'barbeiro' },
  { file: 'corte-3.jpg', alt: 'Corte afro com degradê', kind: 'corte' },
];

export const fotosDePerfil = (cfg) =>
  new Set((cfg.team || []).map((t) => t.photo).filter(Boolean));

// A galeria usa apenas as fotos adicionadas para a galeria ou as fotos de origem.
export function fotosDaGaleria(cfg) {
  const perfis = fotosDePerfil(cfg);
  const custom = (cfg.gallery_images || []).filter((g) => g && g.url && !perfis.has(g.url));
  const base = custom.length
    ? custom.map((g) => ({ src: g.url, alt: g.kind === 'barbeiro' ? 'Barbeiro' : 'Corte', kind: g.kind === 'barbeiro' ? 'barbeiro' : 'corte' }))
    : FOTOS.map((f) => ({ src: img(f.file), alt: f.alt, kind: f.kind }));
  return base;
}

const PC = '(min-width: 601px)';
function usePC() {
  const [pc, setPc] = useState(() => typeof window !== 'undefined' && window.matchMedia(PC).matches);
  useEffect(() => {
    const m = window.matchMedia(PC);
    const f = () => setPc(m.matches);
    m.addEventListener('change', f);
    return () => m.removeEventListener('change', f);
  }, []);
  return pc;
}

export default function Gallery({ cfg = {} }) {
  const fotos = fotosDaGaleria(cfg);
  const n = fotos.length;
  const [i, setI] = useState(0);
  const [aberta, setAberta] = useState(null); // índice da foto aberta, ou null

  useEffect(() => {
    if (aberta !== null || n < 2) return undefined;
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    const t = setInterval(() => setI((k) => (k + 1) % n), 4500);
    return () => clearInterval(t);
  }, [n, i, aberta]);

  const atual = i < n ? i : 0;

  // ---- Computador: 3 fotos lado a lado (1ª, 2ª e 3ª), cada uma a mudar sozinha para uma foto aleatória ----
  const pc = usePC();
  const k = Math.min(3, n);
  const [slots, setSlots] = useState([0, 1, 2]);
  const mostradas = slots.slice(0, k).map((x) => (x < n ? x : 0));
  useEffect(() => {
    if (!pc || k < 2 || aberta !== null) return undefined;
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    const timers = Array.from({ length: k }, (_, j) =>
      setInterval(() => {
        setSlots((cur) => {
          const arr = cur.slice(0, k).map((x) => (x < n ? x : 0));
          const livres = Array.from({ length: n }, (_, x) => x).filter((x) => !arr.includes(x));
          if (livres.length) arr[j] = livres[Math.floor(Math.random() * livres.length)];
          else {
            // só há tantas fotos como lugares: troca com outro lugar
            let o = Math.floor(Math.random() * (k - 1));
            if (o >= j) o += 1;
            [arr[j], arr[o]] = [arr[o], arr[j]];
          }
          return arr;
        });
      }, 4000 + j * 1300),
    );
    return () => timers.forEach(clearInterval);
  }, [pc, k, n, aberta]);

  return (
    <section className="alt" id="galeria">
      <div className="wrap">
        <h2>Os nossos cortes</h2>
        <p className="lead">Degradê, barba e muito estilo, direto da nossa cadeira.</p>
        {pc && k > 1 ? (
          <div className="gstage g3">
            {mostradas.map((idx, j) => (
              <button key={j} type="button" className="gbtn" onClick={() => setAberta(idx)} aria-label="Abrir a galeria de fotos">
                {fotos.map((f, m) => (
                  <img key={`${f.src}-${m}`} src={f.src} alt={f.alt} className={m === idx ? 'on' : ''} />
                ))}
              </button>
            ))}
            <p className="gcap2">Toca para ver todas as fotos</p>
          </div>
        ) : (
          <div className="gstage">
            <button type="button" className="gbtn" onClick={() => setAberta(atual)} aria-label="Abrir a galeria de fotos">
              {fotos.map((f, m) => (
                <img key={`${f.src}-${m}`} src={f.src} alt={f.alt} className={m === atual ? 'on' : ''} />
              ))}
              <span className="gcap">Toca para ver todas as fotos</span>
            </button>
          </div>
        )}
      </div>
      {aberta !== null && <Lightbox fotos={fotos} start={aberta} onClose={() => setAberta(null)} />}
    </section>
  );
}

// Galeria em ecrã inteiro: setas, deslizar com o dedo, filtro Cortes / Barbeiros e miniaturas
function Lightbox({ fotos, start, onClose }) {
  const [filtro, setFiltro] = useState('todas');
  const [pos, setPos] = useState(() => start);
  const touch = useRef(null);

  const temCortes = fotos.some((f) => f.kind === 'corte');
  const temBarbeiros = fotos.some((f) => f.kind === 'barbeiro');
  const lista = filtro === 'todas' ? fotos : fotos.filter((f) => f.kind === (filtro === 'cortes' ? 'corte' : 'barbeiro'));
  const idx = Math.min(pos, lista.length - 1);
  const f = lista[idx];

  const ir = useCallback((d) => setPos((p) => (Math.min(p, lista.length - 1) + d + lista.length) % lista.length), [lista.length]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') ir(1);
      if (e.key === 'ArrowLeft') ir(-1);
    };
    window.addEventListener('keydown', onKey);
    const old = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = old; };
  }, [ir, onClose]);

  if (!f) return null;

  const mudaFiltro = (v) => { setFiltro(v); setPos(0); };

  return (
    <div className="lb" role="dialog" aria-modal="true" aria-label="Galeria de fotos">
      <div className="lbtop">
        <div className="lbtabs">
          {temCortes && temBarbeiros && (
            <>
              <button type="button" className={filtro === 'todas' ? 'on' : ''} onClick={() => mudaFiltro('todas')}>Todas</button>
              <button type="button" className={filtro === 'cortes' ? 'on' : ''} onClick={() => mudaFiltro('cortes')}>Cortes</button>
              <button type="button" className={filtro === 'barbeiros' ? 'on' : ''} onClick={() => mudaFiltro('barbeiros')}>Barbeiros</button>
            </>
          )}
        </div>
        <button type="button" className="lbx" onClick={onClose} aria-label="Fechar">×</button>
      </div>
      <div
        className="lbmain"
        onTouchStart={(e) => { touch.current = e.touches[0].clientX; }}
        onTouchEnd={(e) => {
          if (touch.current === null) return;
          const dx = e.changedTouches[0].clientX - touch.current;
          touch.current = null;
          if (Math.abs(dx) > 50) ir(dx < 0 ? 1 : -1);
        }}
      >
        {lista.length > 1 && <button type="button" className="lbnav l" onClick={() => ir(-1)} aria-label="Foto anterior">‹</button>}
        <img src={f.src} alt={f.alt} />
        {lista.length > 1 && <button type="button" className="lbnav r" onClick={() => ir(1)} aria-label="Foto seguinte">›</button>}
      </div>
      <p className="lbcap">{f.caption ? `${f.caption} · ` : ''}{idx + 1} / {lista.length}</p>
      <div className="lbthumbs">
        {lista.map((x, k) => (
          <button key={`${x.src}-${k}`} type="button" className={k === idx ? 'on' : ''} onClick={() => setPos(k)} aria-label={`Foto ${k + 1}`}>
            <img src={x.src} alt="" />
          </button>
        ))}
      </div>
    </div>
  );
}
