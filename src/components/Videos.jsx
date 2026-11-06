import videos from '../data/videos.json';
import { fmtViewsMais, fmtDate } from '../utils';

// Os 6 vídeos mais vistos do TikTok (dados em src/data/videos.json)
export default function Videos() {
  return (
    <section className="alt" id="videos">
      <div className="wrap">
        <h2>Os vídeos mais vistos</h2>
        <p className="lead">A barbearia que Bissau vê todos os dias no TikTok.</p>
        <div className="grid">
          {videos.map((v, i) => (
            <a className={`vid v${i % 3}`} key={v.url} href={v.url} target="_blank" rel="noopener noreferrer">
              <i>▶</i>
              <b>{fmtViewsMais(v.views)}</b>
              <span>visualizações</span>
              <em>{fmtDate(v.date)} · Ver no TikTok</em>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
