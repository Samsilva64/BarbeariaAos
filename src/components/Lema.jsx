const NAIPES = [
  { s: '♠', t: 'Qualidade', d: 'Cada corte com atenção ao detalhe.' },
  { s: '♦', t: 'Classe', d: 'Estilo e postura em cada atendimento.' },
  { s: '♣', t: 'Conforto', d: 'Um espaço pensado para tu ficares à vontade.' },
  { s: '♥', t: 'Satisfação', d: 'Só sais daqui quando estiveres satisfeito.' },
];

export default function Lema() {
  return (
    <section>
      <div className="wrap">
        <h2>O nosso lema</h2>
        <p className="lead">Quatro naipes que resumem como recebemos cada cliente.</p>
        <div className="grid">
          {NAIPES.map((n) => (
            <div className="box" key={n.t}>
              <span className="suit">{n.s}</span>
              <h3>{n.t}</h3>
              <p>{n.d}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
