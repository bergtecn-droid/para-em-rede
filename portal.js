/* ============================================================
   PARÁ EM REDE — portal.js (V2, limpo)
   - Sem painel demo (somente Supabase)
   - Sem imagens base64 (usa /imagens/*.webp)
   - Correção: render() não destrói mais a lista de artigos
   - Compartilhamento com URL própria por matéria (/m/<slug>)
   ============================================================ */
'use strict';

const $ = id => document.getElementById(id);
const safe = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const safeUrl = u => /^https:\/\//i.test(u || '') ? u : '';
const youtubeId = link => {
  try {
    const u = new URL(link);
    const h = u.hostname.replace(/^www\./, '').replace(/^m\./, '');
    let id = '';
    if (h === 'youtu.be') id = u.pathname.split('/')[1];
    else if (['youtube.com', 'youtube-nocookie.com', 'music.youtube.com'].includes(h)) {
      if (u.pathname === '/watch') id = u.searchParams.get('v');
      else if (/^\/(shorts|live|embed)\//.test(u.pathname)) id = u.pathname.split('/')[2];
    }
    return /^[A-Za-z0-9_-]{11}$/.test(id || '') ? id : null;
  } catch { return null; }
};

/* Imagens locais de apoio (chaves antigas mapeadas, sem duplicatas) */
const ASSETS = {
  cirio: '/imagens/cirio.webp', acai: '/imagens/acai.webp', futebol: '/imagens/futebol.webp',
  amazonia: '/imagens/amazonia.webp', turismo: '/imagens/amazonia.webp', videos: '/imagens/amazonia.webp',
  marajo: '/imagens/marajo.webp', fotos: '/imagens/marajo.webp', artesanato: '/imagens/artesanato.webp',
  especiais: '/imagens/artesanato.webp', castanha: '/imagens/acai.webp', futebol_hd: '/imagens/futebol.webp',
  cirio_hd: '/imagens/cirio.webp'
};
const ASSET_CAPA = '/imagens/capa.webp';
const imageFor = x => (typeof x === 'string' ? (ASSETS[x] || (x.startsWith('data:') || /^https?:\/\/|^\/imagens\//.test(x) ? x : null)) : null) || ASSETS.cirio;

/* ---------- estado ---------- */
const waDefault = '5591982943236';
let articles = [], videos = [], photos = [], sponsors = [];
let settings = { wa: waDefault, insta: '', stream: '', cover: '' };
let leadIndex = 0;
let allowedPortalCategories = ['PARÁ', 'POLÍTICA', 'POLÍCIA', 'CIDADES', 'ESPORTES', 'SAÚDE', 'GERAL', 'BRASIL'];

/* ---------- renderização ---------- */
function visibleArticles() {
  return articles.filter(x => allowedPortalCategories.includes(String(x.cat || '').trim().toUpperCase()));
}

function card(x, i) {
  return `<article class="news-card" tabindex="0" role="button" data-article="${i}">
    <img src="${safe(imageFor(x.img))}" alt="${safe(x.title)}" loading="lazy">
    <div class="content"><span class="tag">${safe(x.cat)}</span><h3>${safe(x.title)}</h3>
    <p>${safe(x.summary)}</p><p class="readmore">Ler matéria completa →</p></div></article>`;
}

function renderPublicGallery() {
  const grid = $('photoGrid');
  if (!grid) return;
  grid.innerHTML = photos.length
    ? photos.map((x, i) => `<article class="media-card" role="button" tabindex="0" data-photo="${i}">
        <img src="${safe(imageFor(x.img))}" alt="${safe(x.title)}" loading="lazy">
        <div class="content"><h3>${safe(x.title)}</h3></div></article>`).join('')
    : '<p style="padding:12px">Nenhuma fotografia cadastrada na galeria.</p>';
}

function render() {
  const list = visibleArticles();
  if (!list.length) {
    const lead = $('lead'); if (lead) lead.style.display = 'none';
    ['#newsgrid', '#categorySections', '#mostlist', '#stack', '#leadDots'].forEach(sel => {
      const el = document.querySelector(sel); if (el) el.innerHTML = '';
    });
    const t = $('tickertext'); if (t) t.textContent = 'Aguarde novas notícias';
  } else {
    const lead = $('lead'); if (lead) lead.style.display = '';
    leadIndex = ((leadIndex % Math.min(5, list.length)) + Math.min(5, list.length)) % Math.min(5, list.length);
    const a = list[leadIndex];
    $('leadimg').removeAttribute('loading');
    $('leadimg').src = imageFor(a.img);
    $('leadcat').textContent = a.cat;
    $('leadtitle').textContent = a.title;
    $('leadsummary').textContent = a.summary;
    $('leadDots').innerHTML = Array.from({ length: Math.min(5, list.length) }, (_, i) =>
      `<button class="${i === leadIndex ? 'active' : ''}" data-lead-dot="${i}" aria-label="Destaque ${i + 1}"></button>`).join('');
    $('stack').innerHTML = [1, 2, 3].map(k => {
      const i = k % list.length, x = list[i];
      return `<div class="small-news" tabindex="0" role="button" data-article="${i}">
        <img src="${safe(imageFor(x.img))}" alt="" loading="lazy">
        <div><span class="tag">${safe(x.cat)}</span><h3>${safe(x.title)}</h3></div></div>`;
    }).join('');
    $('newsgrid').innerHTML = list.slice(0, 9).map(card).join('');
    $('categorySections').innerHTML = allowedPortalCategories
      .filter(cat => list.some(x => String(x.cat || '').trim().toUpperCase() === cat))
      .map(cat => `<div class="category-block"><h3>${safe(cat)}</h3><div class="newsgrid">${
        list.map((x, i) => ({ x, i }))
          .filter(t => String(t.x.cat || '').trim().toUpperCase() === cat)
          .slice(0, 3).map(t => card(t.x, t.i)).join('')}</div></div>`).join('');
    $('mostlist').innerHTML = list.slice(0, 4).map((x, i) =>
      `<button data-article="${i}"><b style="background:var(--red);color:#fff;padding:8px;border-radius:6px">${i + 1}</b>
       <img src="${safe(imageFor(x.img))}" alt="" loading="lazy">${safe(x.title)}</button>`).join('');
    const tickerText = list.map(x => '  \u25cf  ' + x.title + '     |     ').join('');
    $('tickertext').textContent = tickerText;
    if ($('tickertext2')) $('tickertext2').textContent = tickerText;
  }

  $('videoGrid').innerHTML = videos.map((x, i) =>
    `<article class="media-card" role="button" tabindex="0" data-video="${i}">
     <img src="${safe(youtubeId(x.url) ? `https://i.ytimg.com/vi/${youtubeId(x.url)}/hqdefault.jpg` : imageFor(x.img))}" alt="Capa do vídeo" loading="lazy">
     <div class="content"><span class="tag">VÍDEO</span><h3>${safe(x.title)}</h3><p>▶ Assistir aqui no portal</p></div></article>`).join('');

  renderPublicGallery();

  $('sponsorTrack').innerHTML = sponsors.length ? sponsors.map(x => {
    const name = safe(String(x.name || 'Patrocinador'));
    const picture = x.img ? `<img src="${safe(String(x.img))}" alt="Logomarca de ${name}" loading="lazy">` : `<strong>${name}</strong>`;
    const logo = picture + (x.img ? `<small>${name}</small>` : '');
    const destination = String(x.link || '').trim() ||
      (String(x.phone || '').replace(/\D/g, '') ? 'https://wa.me/' + String(x.phone).replace(/\D/g, '') : '');
    return /^https:\/\//i.test(destination)
      ? `<a class="sponsor sponsor-logo" href="${safe(destination)}" target="_blank" rel="noopener noreferrer" title="Visitar ${name}">${logo}</a>`
      : `<div class="sponsor sponsor-logo" title="${name}">${logo}</div>`;
  }).join('') : '<p style="padding:16px;color:var(--muted)">Nenhum patrocinador publicado no momento.</p>';

  $('cover').style.backgroundImage = `url("${safeUrl(settings.cover) || ASSET_CAPA}")`;
  $('whats').href = 'https://wa.me/' + String(settings.wa || waDefault).replace(/\D/g, '') +
    '?text=' + encodeURIComponent('Olá! Vim pelo portal Pará em Rede.');
  $('insta').href = safeUrl(settings.insta) || '#';
  $('insta').title = settings.insta ? 'Abrir Instagram' : 'Instagram ainda não configurado';
  $('today').textContent = 'Pará em Rede • ' + new Intl.DateTimeFormat('pt-BR', { dateStyle: 'full' }).format(new Date());
}
function moveLead(d) {
  const n = Math.min(5, visibleArticles().length); if (!n) return;
  leadIndex = (leadIndex + d + n) % n; render();
}

/* ---------- matéria: leitura + compartilhamento ---------- */
const slugOf = (a, i) => a.slug || ('materia-' + (i + 1));
const articleShareUrl = i => new URL('/m/' + encodeURIComponent(slugOf(articles[i] || {}, i)), location.origin).href;
const articleShareText = i => {
  const a = articles[i] || {};
  return '📰 PARÁ EM REDE | ' + (a.cat || 'Notícias') + '\n\n*' + (a.title || '') + '*\n\n' +
    (a.summary || 'Confira a reportagem completa.') + '\n\n🔗 ' + articleShareUrl(i);
};
function shareOnWhatsapp(i) { window.open('https://api.whatsapp.com/send?text=' + encodeURIComponent(articleShareText(i)), '_blank', 'noopener,noreferrer'); }
function shareOnFacebook(i) { window.open('https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(articleShareUrl(i)), '_blank', 'noopener,noreferrer'); }
async function copyArticleLink(i) {
  const txt = articleShareText(i);
  try { await navigator.clipboard.writeText(txt); alert('Título, resumo e link copiados!'); }
  catch (e) {
    const ta = document.createElement('textarea'); ta.value = txt; document.body.appendChild(ta);
    ta.select(); document.execCommand('copy'); ta.remove(); alert('Título, resumo e link copiados!');
  }
}

// Corpo formatado: se o texto já tem tags, mantém; senão converte texto corrido em <p>/<br>
function fmtBody(raw) {
  const txt = String(raw == null ? '' : raw);
  if (/<\s*(p|h[1-6]\b|ul\b|ol\b|li\b|blockquote\b|table\b|pre\b|div\b|figure\b)/i.test(txt)) return txt;
  const norm = txt.replace(/\r\n/g, '\n').trim();
  if (!norm) return '';
  return norm.split(/\n{2,}/).map(b => '<p>' + b.split('\n').map(safe).join('<br>') + '</p>').join('\n');
}

function openArticle(i) {
  const a = articles[i]; if (!a) return;
  const paras = null; // substituído por fmtBody (parágrafos automáticos)
  const rel = articles.map((x, j) => ({ x, j })).filter(t => t.j !== i).slice(0, 5);
  $('articleContent').innerHTML =
    `<button class="article-back" onclick="closeOverlay('articleOverlay')">← Voltar ao portal</button>
     <div class="article-page-grid"><div class="article-page-main">
       <span class="tag">${safe(a.cat)}</span>
       <h1>${safe(a.title)}</h1><p class="dek">${safe(a.summary)}</p>
       <div class="article-meta">Redação Pará em Rede · ${safe(a.created_at ? new Date(a.created_at).toLocaleDateString('pt-BR') : new Date().toLocaleDateString('pt-BR'))}</div>
       <img class="hero-article" src="${safe(imageFor(a.img))}" alt="${safe(a.title)}">
       <div class="article-body">${fmtBody(a.body || a.summary)}</div>
     </div>
     <aside class="article-side">
       <h2>Últimas notícias</h2>
       ${rel.map(t => `<button class="related-news" onclick="openArticle(${t.j})"><img src="${safe(imageFor(t.x.img))}" alt="" loading="lazy">${safe(t.x.title)}</button>`).join('')}
       <h2>Compartilhe</h2>
       <div class="share-actions">
         <button class="share-wa" onclick="shareOnWhatsapp(${i})">◉ WhatsApp</button>
         <button class="share-fb" onclick="shareOnFacebook(${i})">f Facebook</button>
         <button class="share-copy" onclick="copyArticleLink(${i})">▤ Copiar matéria</button>
         <p class="share-hint">O cartão com foto e título aparece para quem receber o link.</p>
       </div>
     </aside></div>`;
  $('articleOverlay').classList.add('show');
  $('articleOverlay').scrollTop = 0;
  document.title = a.title + ' | Pará em Rede';
  try { history.replaceState(null, '', '/m/' + encodeURIComponent(slugOf(a, i))); } catch (e) {}
}
function closeOverlay(id) {
  $(id).classList.remove('show');
  if (id === 'articleOverlay') {
    const iframe = document.querySelector('#articleContent iframe'); if (iframe) iframe.remove();
    document.title = 'Pará em Rede | Notícias do Pará';
    try { history.replaceState(null, '', '/'); } catch (e) {}
  }
}

/* ---------- galeria (visualizador) ---------- */
let currentPhoto = 0;
function openPhotoViewer(i) {
  if (!photos.length) return;
  currentPhoto = (i + photos.length) % photos.length;
  $('photoViewer').classList.add('show');
  document.body.style.overflow = 'hidden';
  renderPhotoViewer();
}
function renderPhotoViewer() {
  if (!photos.length) return;
  const p = photos[currentPhoto];
  $('viewerImage').src = imageFor(p.img); $('viewerImage').alt = p.title;
  $('viewerTitle').textContent = p.title;
  $('viewerCount').textContent = `${currentPhoto + 1} de ${photos.length} fotografias`;
  $('viewerStrip').innerHTML = photos.map((pp, i) =>
    `<img src="${safe(imageFor(pp.img))}" alt="Foto ${i + 1}" loading="lazy" class="${i === currentPhoto ? 'selected' : ''}" data-viewer-index="${i}">`).join('');
  const act = $('viewerStrip').querySelector('.selected'); if (act) act.scrollIntoView({ block: 'nearest', inline: 'center' });
}
function stepPhoto(d) { if (!photos.length) return; currentPhoto = (currentPhoto + d + photos.length) % photos.length; renderPhotoViewer(); }
function closePhotoViewer() { $('photoViewer').classList.remove('show'); document.body.style.overflow = ''; }

/* ---------- rádio ---------- */
window.toggleRadio = function () {
  const status = $('radiostatus'), btn = $('radiobtn'), box = $('radio');
  const url = String(settings.stream || '').trim();
  if (!/^https:\/\//i.test(url)) { alert('Cadastre primeiro uma URL HTTPS de streaming no painel.'); return; }
  let frame = $('radioVoxFrame');
  const vox = /^(https:\/\/)(?:stm1|player)\.voxhd\.com\.br(?::12150)?(?:\/|$)/i.test(url);
  if (vox) {
    if (!frame) {
      frame = document.createElement('iframe'); frame.id = 'radioVoxFrame';
      frame.title = 'Rádio ao vivo';
      frame.setAttribute('allow', 'autoplay'); frame.setAttribute('loading', 'lazy');
      box.appendChild(frame);
    }
    if (frame.style.display !== 'block') {
      frame.src = /player\.voxhd\.com\.br/i.test(url) ? url : 'https://player.voxhd.com.br/player-barra/12150/FFE4E1';
      frame.style.display = 'block'; btn.textContent = '❚❚';
      status.textContent = 'Player da rádio aberto. Use o controle abaixo.';
    } else {
      frame.style.display = 'none'; frame.src = 'about:blank';
      btn.textContent = '▶'; status.textContent = 'Player fechado.';
    }
    return;
  }
  if (frame) { frame.style.display = 'none'; frame.src = 'about:blank'; }
  const audio = $('audio');
  if (audio.paused) {
    audio.src = url;
    audio.play().then(() => { btn.textContent = '❚❚'; status.textContent = 'Rádio ao vivo'; })
      .catch(() => { status.textContent = 'O navegador não conseguiu reproduzir este formato de áudio.'; });
  } else { audio.pause(); btn.textContent = '▶'; status.textContent = 'Transmissão pausada'; }
};
window.scrollSponsors = d => { $('sponsorTrack').scrollBy({ left: d * 420, behavior: 'smooth' }); };
window.openArticle = openArticle;
window.closeOverlay = closeOverlay;
window.moveLead = moveLead;
window.closePhotoViewer = closePhotoViewer;
window.stepPhoto = stepPhoto;
window.shareOnWhatsapp = shareOnWhatsapp;
window.shareOnFacebook = shareOnFacebook;
window.copyArticleLink = copyArticleLink;

/* ---------- eventos globais ---------- */
document.addEventListener('click', e => {
  const dot = e.target.closest('[data-lead-dot]');
  if (dot) { leadIndex = +dot.dataset.leadDot; render(); return; }
  const a = e.target.closest('[data-article]'); if (a) { openArticle(+a.dataset.article); return; }
  const v = e.target.closest('[data-video]');
  if (v) {
    const x = videos[+v.dataset.video]; if (!x) return;
    const id = youtubeId(x.url);
    if (!id) { alert('Link de vídeo inválido.'); return; }
    $('articleContent').innerHTML =
      `<button class="article-back" onclick="closeOverlay('articleOverlay')">← Voltar aos vídeos</button>
       <div class="video-player-box"><span class="tag">VÍDEO • YOUTUBE</span><h1>${safe(x.title)}</h1>
       <iframe title="${safe(x.title)}" src="https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0" loading="eager"
        referrerpolicy="strict-origin-when-cross-origin" style="width:100%;aspect-ratio:16/9;border:0;border-radius:12px;background:#000"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe></div>`;
    $('articleOverlay').classList.add('show');
    document.title = x.title + ' | Pará em Rede';
    return;
  }
  const f = e.target.closest('[data-photo]'); if (f) { openPhotoViewer(+f.dataset.photo); return; }
  const pv = e.target.closest('[data-viewer-index]');
  if (pv) { currentPhoto = +pv.dataset.viewerIndex; renderPhotoViewer(); return; }
  if (e.target.id === 'photoViewer') closePhotoViewer();
});
document.addEventListener('keydown', e => {
  if ($('photoViewer').classList.contains('show')) {
    if (e.key === 'ArrowRight') stepPhoto(1);
    if (e.key === 'ArrowLeft') stepPhoto(-1);
    if (e.key === 'Escape') { closePhotoViewer(); return; }
  }
  if (e.key === 'Escape') closeOverlay('articleOverlay');
  if (e.key === 'Enter' && e.target.dataset && e.target.dataset.article) openArticle(+e.target.dataset.article);
});
document.querySelectorAll('.overlay').forEach(el => el.addEventListener('click', e => {
  if (e.target === el && el.id === 'articleOverlay') closeOverlay(el.id);
}));

/* ---------- clima ---------- */
async function weather() {
  try {
    const r = await fetch('https://api.open-meteo.com/v1/forecast?latitude=-1.2939&longitude=-47.9264&current=temperature_2m,weather_code&timezone=America%2FBelem');
    if (!r.ok) throw Error();
    const d = await r.json();
    $('temp').textContent = Math.round(d.current.temperature_2m) + '°C';
    const code = d.current.weather_code;
    $('weathericon').textContent = code < 3 ? '🌤️' : code < 60 ? '☁️' : '🌧️';
    $('weatherdesc').textContent = code < 3 ? 'Céu aberto ou parcialmente nublado' : code < 60 ? 'Nublado' : 'Possibilidade de chuva';
  } catch (e) { $('weatherdesc').textContent = 'Previsão indisponível no momento'; }
}

/* ---------- Supabase: sincronização única ---------- */
async function loadPortalData() {
  const cfg = window.PARA_CONFIG || {};
  if (!cfg.supabaseUrl || !cfg.supabaseAnonKey) {
    console.warn('Pará em Rede: configure config.js com o Supabase.');
    return;
  }
  /* Reserva: se o SDK do Supabase não carregou do CDN principal (bloqueio
     ou falha de rede no leitor), tenta um endereço alternativo. */
  if (!window.supabase) {
    try {
      await new Promise((ok, fail) => {
        const s = document.createElement('script');
        s.src = 'https://unpkg.com/@supabase/supabase-js@2/dist/umd/supabase.min.js';
        s.onload = ok;
        s.onerror = () => fail(new Error('falha ao carregar SDK reserva'));
        document.head.appendChild(s);
        setTimeout(() => fail(new Error('tempo esgotado')), 8000);
      });
    } catch (e) {
      console.warn('Pará em Rede: não foi possível carregar o SDK do Supabase.', e.message);
      return;
    }
  }
  if (!window.supabase) return;
  const db = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey);

  // Notícias
  try {
    const { data, error } = await db.from('portal_articles')
      .select('id,title,slug,summary,body,category,image_url,created_at')
      .eq('status', 'published').order('created_at', { ascending: false }).limit(100);
    if (error) throw error;
    articles = (data || []).map(a => ({
      cat: a.category, title: a.title, summary: a.summary, body: a.body,
      img: a.image_url || '', slug: a.slug, created_at: a.created_at
    }));
  } catch (e) {
    console.error('Falha ao carregar notícias:', e.message);
    const t = $('tickertext'); if (t) t.textContent = 'Não foi possível carregar as notícias. Tente atualizar a página.';
  }

  // Galeria (excluindo fotos que são imagem de notícias)
  try {
    const usedInArticle = new Set(articles.map(a => a.img).filter(x => /^https:\/\//i.test(x)));
    const { data, error } = await db.from('portal_media')
      .select('id,title,public_url').order('created_at', { ascending: false });
    if (error) throw error;
    photos = (data || [])
      .filter(x => /^https:\/\//i.test(x.public_url || '') && !usedInArticle.has(x.public_url))
      .map(x => ({ title: x.title || 'Fotografia', img: x.public_url }));
  } catch (e) { console.warn('Falha ao carregar galeria:', e.message); }

  // Vídeos
  try {
    const { data, error } = await db.from('portal_videos').select('*');
    if (error) throw error;
    videos = (data || [])
      .map(v => ({
        title: String(v.title || 'Vídeo'),
        url: String(v.youtube_url || v.url || '').trim(),
        order: Number(v.sort_order ?? 0)
      }))
      .filter(v => youtubeId(v.url)).sort((a, b) => a.order - b.order);
  } catch (e) { console.warn('Falha ao carregar vídeos:', e.message); }

  // Patrocinadores
  try {
    const { data, error } = await db.from('portal_sponsors').select('*');
    if (error) throw error;
    sponsors = (data || [])
      .map(x => ({
        name: String(x.title || x.name || x.nome || 'Patrocinador'),
        img: String(x.image_url || x.logo_url || '').trim(),
        link: String(x.website_url || x.site_url || x.url || x.instagram || '').trim(),
        phone: String(x.whatsapp || x.phone || '').trim(),
        order: Number(x.sort_order ?? 0)
      }))
      .sort((a, b) => a.order - b.order);
  } catch (e) { console.warn('Falha ao carregar patrocinadores:', e.message); }

  // Configurações
  try {
    const { data, error } = await db.from('portal_settings').select('key,value')
      .in('key', ['radio', 'whatsapp', 'instagram', 'cover', 'radio_name']);
    if (error) throw error;
    const v = Object.fromEntries((data || []).map(x => [x.key, x.value]));
    if (v.cover && /^https:\/\//i.test(v.cover)) settings.cover = String(v.cover).trim();
    if (v.radio) { settings.stream = String(v.radio).trim(); $('radiostatus').textContent = 'Rádio configurada. Clique em ▶ para ouvir.'; }
    if (v.whatsapp) settings.wa = String(v.whatsapp).replace(/\D/g, '');
    if (v.instagram) settings.insta = String(v.instagram).trim();
    if (v.radio_name) $('publicRadioName').textContent = v.radio_name;
    if (v.categories) {
      const rows = String(v.categories).split(/[\n,;]+/).map(x => x.trim().toUpperCase()).filter(Boolean);
      if (rows.length) {
        allowedPortalCategories = [...new Set(rows)].slice(0, 18);
        const nav = $('portalNav');
        if (nav) {
          nav.querySelectorAll('[href="#noticias"][data-cat]').forEach(x => x.remove());
          const anchor = nav.querySelector('[href="#videos"]');
          for (const cat of allowedPortalCategories) {
            const aEl = document.createElement('a');
            aEl.href = '#noticias'; aEl.textContent = cat;
            if (anchor) nav.insertBefore(aEl, anchor); else nav.appendChild(aEl);
          }
        }
      }
    }
  } catch (e) { console.warn('Configurações indisponíveis:', e.message); }

  render();
}

/* ---------- inicialização ---------- */
window.addEventListener('hashchange', () => {
  const slug = decodeURIComponent((location.hash.match(/materia=([^&]+)/) || [])[1] || '');
  if (slug) {
    const i = articles.findIndex(x => x.slug === slug);
    if (i >= 0) openArticle(i);
  }
});
weather();
loadPortalData();
setInterval(() => { if (!$('articleOverlay').classList.contains('show')) moveLead(1); }, 8500);
/* Reabrir matéria quando carregada por link direto /m/<slug> */
function articleNotFound() {
  const box = $('articleContent');
  if (!box) return;
  box.innerHTML =
    '<button class="article-back" onclick="closeOverlay(\'articleOverlay\')">← Voltar\u00a0ao\u00a0portal</button>' +
    '<div class="article-notfound">' +
      '<div class="nf-emoji">\ud83d\udcd1</div>' +
      '<h2>Mat\u00e9ria n\u00e3o encontrada</h2>' +
      '<p>Este link est\u00e1 desatualizado \u2014 a mat\u00e9ria foi republicada com outro endere\u00e7o ou n\u00e3o est\u00e1 mais dispon\u00edvel.</p>' +
      '<p><a class="nf-link" href="/">\u2192 Ver as \u00faltimas not\u00edcias</a></p>' +
    '</div>';
  $('articleOverlay').classList.add('show');
}

if (location.pathname.match(/^\/m\/([^/?#]+)/)) {
  const slug = decodeURIComponent(location.pathname.match(/^\/m\/([^/?#]+)/)[1]);
  const tryOpen = () => {
    const i = articles.findIndex(x => x.slug === slug);
    if (i >= 0) { openArticle(i); return true; }
    return false;
  };
  if (!tryOpen()) {
    const timer = setInterval(() => { if (tryOpen()) clearInterval(timer); }, 400);
    setTimeout(() => {
      clearInterval(timer);
      if (!tryOpen()) articleNotFound();
    }, 15000);
  }
}
