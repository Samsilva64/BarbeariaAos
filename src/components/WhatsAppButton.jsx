import { useEffect, useRef } from 'react';
import { waLink } from '../utils';

// Botão verde de WhatsApp único. Nasce no lugar reservado da grelha da página inicial (#wa-slot),
// por cima do botão do Instagram, e acompanha esse lugar enquanto se rola um pouco.
//  - COMPUTADOR: numa rolagem curta fica colado à grelha; à segunda rolagem ou numa rolagem longa
//    (150px) pula para o canto inferior direito e fica lá.
//  - TELEMÓVEL: pula para o canto logo que se começa a rolar (40px).
//  Ao voltar ao topo da página regressa ao lugar da grelha. Nunca existem dois botões verdes ao mesmo tempo.
const CANTO = {
  left: 'calc(100% - 140px)',
  top: 'calc(100% - 64px - env(safe-area-inset-bottom, 0px))',
  width: '124px',
  height: '48px',
};
const PC = '(min-width: 601px)';
const LIMITE_PC = 150; // px rolados a partir dos quais o botão pula (computador)
const LIMITE_TEL = 40; // idem (telemóvel)

export default function WhatsAppButton({ cfg }) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    let modo = null; // 'lugar' | 'canto'
    let timer;

    const pos = (left, top, width, height) => {
      el.style.left = left;
      el.style.top = top;
      el.style.width = width;
      el.style.height = height;
    };

    const colocar = () => {
      const slot = document.getElementById('wa-slot');
      const r = slot ? slot.getBoundingClientRect() : null;
      const limite = window.matchMedia(PC).matches ? LIMITE_PC : LIMITE_TEL;
      // fora da página inicial (sem grelha) fica sempre no canto
      const proximo = !r || r.width === 0 || window.scrollY > limite ? 'canto' : 'lugar';

      if (proximo !== modo) {
        modo = proximo;
        el.classList.add('moving'); // anima só na troca de lugar
        clearTimeout(timer);
        timer = setTimeout(() => el.classList.remove('moving'), 450);
      }
      if (modo === 'canto') pos(CANTO.left, CANTO.top, CANTO.width, CANTO.height);
      else pos(`${r.left}px`, `${r.top}px`, `${r.width}px`, `${r.height}px`); // colado ao lugar na grelha
    };

    colocar();
    window.addEventListener('scroll', colocar, { passive: true });
    window.addEventListener('resize', colocar);
    window.addEventListener('load', colocar);
    const iv = setInterval(colocar, 600); // acerta o lugar enquanto as imagens carregam
    return () => {
      window.removeEventListener('scroll', colocar);
      window.removeEventListener('resize', colocar);
      window.removeEventListener('load', colocar);
      clearInterval(iv);
      clearTimeout(timer);
    };
  }, []);

  return (
    <a ref={ref} className="wa" href={waLink(cfg.phone)} target="_blank" rel="noopener noreferrer">
      WhatsApp
    </a>
  );
}
