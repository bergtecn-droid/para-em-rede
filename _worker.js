/**
 * PARÁ EM REDE — Cartões de compartilhamento por matéria (Cloudflare Pages)
 *
 * Serve /m/<slug> como a página inicial do portal com as meta tags Open Graph
 * preenchidas com os dados reais da reportagem (título, resumo e foto),
 * buscados do Supabase. WhatsApp, Facebook e outros leem essas tags e
 * exibem o cartão bonito com a foto da matéria.
 *
 * A chave usada é a pública (anon/publishable) — a mesma do config.js.
 */
export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method !== 'GET' || !url.pathname.match(/^\/m\/([^/?#]+)/)) {
      return env.ASSETS.fetch(request);
    }

    const slug = decodeURIComponent(url.pathname.match(/^\/m\/([^/?#]+)/)[1]);
    const SUPABASE_URL = 'https://xtezeoxlonyfcxnixtqn.supabase.co';
    const SUPABASE_KEY = 'sb_publishable_pWAi0UiqWgJeuNElklPmzA_OaW12pSM';

    try {
      const api = SUPABASE_URL + '/rest/v1/portal_articles?slug=eq.' + encodeURIComponent(slug) +
        '&select=title,summary,image_url,category,created_at&limit=1';
      const r = await fetch(api, {
        headers: { apikey: SUPABASE_KEY, Authorization: 'Bearer ' + SUPABASE_KEY }
      });
      const rows = r.ok ? await r.json() : [];
      const a = Array.isArray(rows) ? rows[0] : null;

      const indexResp = await env.ASSETS.fetch(new URL('/', url));
      let html = await indexResp.text();

      if (a) {
        const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;')
          .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
        const pageUrl = url.origin + '/m/' + encodeURIComponent(slug);
        const image = /^https:\/\//i.test(a.image_url || '') ? a.image_url : url.origin + '/imagens/capa.webp';
        const meta =
          '<title>' + esc(a.title) + ' | Pará em Rede</title>' +
          '<meta name="description" content="' + esc(a.summary || 'Leia a reportagem completa no Pará em Rede.') + '">' +
          '<meta property="og:type" content="article">' +
          '<meta property="og:site_name" content="Pará em Rede">' +
          '<meta property="og:title" content="' + esc(a.title) + '">' +
          '<meta property="og:description" content="' + esc(a.summary || 'Leia a reportagem completa no Pará em Rede.') + '">' +
          '<meta property="og:url" content="' + esc(pageUrl) + '">' +
          '<meta property="og:image" content="' + esc(image) + '">' +
          '<meta property="og:locale" content="pt_BR">' +
          '<meta name="twitter:card" content="summary_large_image">' +
          '<meta name="twitter:title" content="' + esc(a.title) + '">' +
          '<meta name="twitter:description" content="' + esc(a.summary || '') + '">' +
          '<meta name="twitter:image" content="' + esc(image) + '">';
        html = html
          .replace(/<title>.*?<\/title>/is, '')        // evita título duplicado
          .replace('<link rel="canonical" href="https://para-em-rede.pages.dev/">',
                   '<link rel="canonical" href="' + esc(pageUrl) + '">')
          .replace('</head>', meta + '</head>');
      }

      return new Response(html, {
        headers: {
          'content-type': 'text/html;charset=UTF-8',
          'cache-control': 'public, max-age=0, must-revalidate'
        }
      });
    } catch (e) {
      return env.ASSETS.fetch(request);
    }
  }
};
