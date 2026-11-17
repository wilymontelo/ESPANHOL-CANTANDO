(function () {
/* Painel de funis (funil "espanhol") + mapa de calor. Mesmo formato da página da Maquiadora:
   - eventos: visita, etapa (bloco visto), clique (posição no bloco), checkout, saida (rolagem%,segundos)
   - ?mapa=1: a página abre dentro do painel e só desenha o mapa (não conta visita, sem pixel/Clarity). */

const URL_EVENTOS = 'https://bqrisvgconcrxnbzjsmz.supabase.co/rest/v1/eventos';
const CHAVE = 'sb_publishable_TZBA-I95KUEkCCTIpbqfsw_OTbZfQ9g'; // pública: só permite inserir eventos
const FUNIL = /^(localhost|127\.0\.0\.1)$/.test(location.hostname) ? 'teste' : 'espanhol';
const ROBO = /bot|crawl|spider|slurp|facebookexternalhit|facebot|meta-external|headless|lighthouse|pagespeed|preview|phantom|selenium|puppeteer|playwright/i;
var MODO_MAPA = /[?&]mapa=1(&|$)/.test(location.search);


function cortar(s, n) { return s ? String(s).slice(0, n) : null; }
function novoId() {
  const a = new Uint8Array(12);
  crypto.getRandomValues(a);
  return Array.from(a, (b) => ('0' + b.toString(16)).slice(-2)).join('');
}

function criarFA() {
  const ua = navigator.userAgent || '';
  if (MODO_MAPA || ROBO.test(ua) || navigator.webdriver || !window.fetch) return null;
  let sessao;
  try { sessao = sessionStorage.getItem('fa_s') || novoId(); sessionStorage.setItem('fa_s', sessao); } catch (e) { sessao = novoId(); }
  const q = new URLSearchParams(location.search);
  const base = {
    funil: FUNIL, sessao,
    utm_source: cortar(q.get('utm_source'), 200), utm_medium: cortar(q.get('utm_medium'), 200),
    utm_campaign: cortar(q.get('utm_campaign'), 200), utm_content: cortar(q.get('utm_content'), 200),
    utm_term: cortar(q.get('utm_term'), 200),
    dispositivo: /iPad|Tablet/i.test(ua) ? 'tablet' : /Mobi|Android|iPhone/i.test(ua) ? 'celular' : 'computador',
    referencia: cortar(document.referrer, 300), ua: cortar(ua, 400),
  };
  const enviar = (dados) => {
    try {
      fetch(URL_EVENTOS, {
        method: 'POST', keepalive: true, mode: 'cors', credentials: 'omit',
        headers: { apikey: CHAVE, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
        body: JSON.stringify({ ...base, ...dados }),
      }).catch(() => {});
    } catch (e) { /* nada */ }
  };
  // visita real = 2 s com a aba visível ou alguma interação
  let real = false; const fila = []; let tempo;
  const confirmar = () => {
    if (real) return;
    real = true;
    let ja = false;
    try { ja = sessionStorage.getItem('fa_v') === '1'; sessionStorage.setItem('fa_v', '1'); } catch (e) { /* nada */ }
    if (!ja) enviar({ evento: 'visita' });
    fila.splice(0).forEach(enviar);
  };
  const relogio = () => { clearTimeout(tempo); if (document.visibilityState === 'visible') tempo = window.setTimeout(confirmar, 2000); };
  document.addEventListener('visibilitychange', relogio);
  ['pointerdown', 'touchstart', 'keydown', 'scroll'].forEach((ev) => window.addEventListener(ev, confirmar, { once: true, passive: true }));
  relogio();
  const registrar = (d) => { if (real) enviar(d); else fila.push(d); };
  return {
    etapa: (passo, nome) => registrar({ evento: 'etapa', passo, nome: cortar(nome, 80) }),
    clique: (passo, nome, valor) => registrar({ evento: 'clique', passo, nome: cortar(nome, 80), valor: cortar(valor, 160) }),
    checkout: () => { confirmar(); enviar({ evento: 'checkout' }); },
    saida: (passo, valor) => { if (real) enviar({ evento: 'saida', passo, valor: cortar(valor, 160) }); },
  };
}

function rastrear(fa) {
  const secoes = Array.from(document.querySelectorAll('[data-secao]'));
  const vistas = {};
  if ('IntersectionObserver' in window) {
    // conta o bloco quando 25% dele aparece OU quando ocupa metade da tela (blocos muito altos, como o de bônus)
    const io = new IntersectionObserver((es) => es.forEach((e) => {
      if (!e.isIntersecting) return;
      if (e.intersectionRatio < 0.25 && e.intersectionRect.height < window.innerHeight * 0.5) return;
      const i = secoes.indexOfe.target;
      if (vistas[i]) return;
      vistas[i] = true;
      fa.etapa(i, e.target.dataset.secao || '');
    }), { threshold: [0, 0.05, 0.1, 0.15, 0.2, 0.25] });
    secoes.forEach((s) => io.observe(s));
  }

  // toques: bloco + posição dentro dele (0–1) + o que foi tocado; clique no checkout conta como "checkout"
  let nCliques = 0;
  document.addEventListener('click', (ev) => {
    const alvo = ev.target;
    const link = alvo.closest('a');
    const ehCheckout = !!link && /checkout\.payt\.com\.br/.test(link.href);
    if (ehCheckout) fa.checkout();
    if (nCliques >= 60) return;
    const sec = alvo.closest('[data-secao]');
    if (!sec) return;
    const r = sec.getBoundingClientRect();
    const fx = (ev.clientX - r.left) / r.width, fy = (ev.clientY - r.top) / r.height;
    const el = alvo.closest('a,button,img,video,audio');
    let oque = '';
    if (ehCheckout) oque = 'botão checkout';
    else if (link && link.getAttribute('href') === '#oferta') oque = 'botão oferta';
    else if (alvo.closest('.vsl-sound')) oque = 'VSL: ativar som';
    else if (alvo.closest('[data-vsl]')) oque = 'VSL';
    else if (alvo.closest('[data-audio]')) oque = 'áudio: ' + (alvo.closest('[data-audio]').getAttribute('aria-label') || '').replace('Tocar ', '');
    else if (alvo.closest('.faq-list summary')) oque = 'FAQ: ' + (alvo.closest('.faq-list summary').textContent || '').replace('+', '').trim();
    else if (el) oque = el.tagName === 'IMG' ? 'imagem' : el.tagName === 'BUTTON' ? 'botão' : 'link';
    nCliques++;
    fa.clique(secoes.indexOf(sec), sec.dataset.secao || '', fx.toFixed(3) + ',' + fy.toFixed(3) + ',' + oque.slice(0, 120));
  }, true);

  // saída: rolagem máxima (%) e segundos na página
  const inicio = Date.now(); let maxRol = 0, ultima = '';
  const medir = () => {
    const h = document.documentElement.scrollHeight;
    const p = Math.round(Math.min(1, (window.scrollY + window.innerHeight) / h) * 100);
    if (p > maxRol) maxRol = p;
  };
  window.addEventListener('scroll', medir, { passive: true });
  medir();
  const sair = () => {
    let fundo = -1;
    for (const k in vistas) if (+k > fundo) fundo = +k;
    const v = maxRol + ',' + Math.round((Date.now() - inicio) / 1000);
    if (v === ultima) return;
    ultima = v;
    fa.saida(fundo, v);
  };
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') sair(); });
  window.addEventListener('pagehide', sair);
}

function modoMapa() {
  const ORIGENS = /^(https:\/\/painel-de-funis\.vercel\.app|http:\/\/(localhost|127\.0\.0\.1)(:\d+)?)$/;
  const secoes = Array.from(document.querySelectorAll('[data-secao]'));
  let dados = null;
  const css = document.createElement('style');
  css.textContent =
    '*{animation:none!important}a,button,summary{pointer-events:none}.reveal{opacity:1!important;transform:none!important;transition:none!important}.launch-bar{display:none}' +
    '#mapa-cv{position:absolute;left:0;top:0;pointer-events:none;z-index:40}' +
    '.mapa-alc{position:absolute;left:0;right:0;z-index:41;pointer-events:none;border-top:2px dashed rgba(20,20,40,.6);font:700 12px system-ui,sans-serif}' +
    '.mapa-alc span{position:absolute;right:6px;top:-11px;background:#14142a;color:#fff;border-radius:999px;padding:2px 9px;white-space:nowrap}';
  document.head.appendChild(css);
  const cv = document.createElement('canvas'); cv.id = 'mapa-cv'; document.body.appendChild(cv);
  const camada = document.createElement('div'); document.body.appendChild(camada);
  const paleta = (() => {
    const c = document.createElement('canvas'); c.width = 256; c.height = 1;
    const g = c.getContext('2d');
    const gr = g.createLinearGradient(0, 0, 256, 0);
    gr.addColorStop(0.15, 'rgba(0,80,255,1)'); gr.addColorStop(0.45, 'rgba(0,220,120,1)');
    gr.addColorStop(0.7, 'rgba(255,230,0,1)'); gr.addColorStop(1, 'rgba(255,30,30,1)');
    g.fillStyle = gr; g.fillRect(0, 0, 256, 1);
    return g.getImageData(0, 0, 256, 1).data;
  })();
  const desenhar = () => {
    if (!dados) return;
    const W = document.documentElement.clientWidth, H = document.documentElement.scrollHeight;
    cv.width = W; cv.height = H; cv.style.width = W + 'px'; cv.style.height = H + 'px';
    const g = cv.getContext('2d');
    g.clearRect(0, 0, W, H);
    const raio = Math.max(18, Math.round(W * 0.07));
    const pos = secoes.map((s) => { const r = s.getBoundingClientRect(); return { x: r.left + scrollX, y: r.top + scrollY, w: r.width, h: r.height }; });
    const pontos = dados.cliques || [];
    const forca = Math.max(0.08, Math.min(0.5, 6 / Math.sqrt(pontos.length + 1)));
    pontos.forEach((p) => {
      const b = pos[p[0]]; if (!b) return;
      const x = b.x + p[1] * b.w, y = b.y + p[2] * b.h;
      const gr = g.createRadialGradient(x, y, 0, x, y, raio);
      gr.addColorStop(0, 'rgba(0,0,0,' + forca + ')'); gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gr; g.fillRect(x - raio, y - raio, raio * 2, raio * 2);
    });
    if (pontos.length) {
      const img = g.getImageData(0, 0, W, H), d = img.data;
      for (let i = 3; i < d.length; i += 4) {
        const a = d[i]; if (!a) continue;
        const o = a * 4;
        d[i - 3] = paleta[o]; d[i - 2] = paleta[o + 1]; d[i - 1] = paleta[o + 2]; d[i] = Math.min(220, 60 + a);
      }
      g.putImageData(img, 0, 0);
    }
    camada.innerHTML = '';
    const alc = dados.alcance || {};
    secoes.forEach((s, i) => {
      if (alc[i] == null) return;
      const linha = document.createElement('div');
      linha.className = 'mapa-alc'; linha.style.top = pos[i].y + 'px';
      const sp = document.createElement('span');
      sp.textContent = alc[i] + '% chegaram aqui · ' + (s.dataset.secao || '');
      linha.appendChild(sp); camada.appendChild(linha);
    });
  };
  window.addEventListener('message', (ev) => {
    if (!ORIGENS.test(ev.origin) || !ev.data || ev.data.tipo !== 'mapa') return;
    dados = ev.data; desenhar();
  });
  let t;
  const agenda = () => { clearTimeout(t); t = window.setTimeout(desenhar, 150); };
  window.addEventListener('resize', agenda);
  window.addEventListener('load', agenda);
  if ('ResizeObserver' in window) new ResizeObserver(agenda).observe(document.body);
  if (window.parent !== window) window.parent.postMessage({ tipo: 'mapa-pronto' }, '*');
}

function iniciarRastreio() {
  if (MODO_MAPA) { modoMapa(); return; }
  const fa = criarFA();
  if (fa) rastrear(fa);
}

iniciarRastreio();
})();
