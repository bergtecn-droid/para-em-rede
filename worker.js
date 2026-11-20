/**
 * PARA EM REDE — Cartões de compartilhamento por matéria (Cloudflare Workers)
 *
 * Serve /m/<slug> como a página inicial do portal com as meta tags Open Graph
 * preenchidas com os dados reais da reportagem (título, resumo e foto),
 * buscados do Supabase. WhatsApp, Facebook e outros leem essas tags e
 * exibem o cartão bonito com a foto da matéria.
 *
 * Formato nativo de Workers: `main: worker.js` no wrangler.jsonc + binding
 * de assets chamado ASSETS. Arquivos estáticos (index.html, styles.css,
 * portal.js, imagens...) são servidos diretamente pelo Cloudflare; somente
 * as rotas /m/<slug> passam por este script.
 *
 * A chave usada é a pública (anon/publishable) — a mesma do config.js.
 */
export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Qualquer coisa que não seja /m/<slug> segue como arquivo estático.
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

      const pageUrl = url.origin + '/m/' + encodeURIComponent(slug);
      const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;')
        .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
      const image = /^https:\/\//i.test(a?.image_url || '') ? a.image_url : url.origin + '/imagens/capa.webp';
      const titulo = a ? a.title : 'Pará em Rede | Notícias do Pará';
      const resumo = (a?.summary) || 'Notícias de Castanhal e do Pará em primeira mão. Rádio ao vivo, vídeos e fotos.';

      const pergunta = (alvo) => new RegExp('<meta[^>]+(?:property|name)="' + alvo + '"[^>]*>', 'i');

      // Substitui as meta tags genéricas da capa pelos dados reais da matéria
      // (sem duplicar: troca no lugar, um a um).
      const trocas = [
        [/<title>[\s\S]*?<\/title>/i, '<title>' + esc(titulo) + '</title>'],
        [/<link rel="canonical"[^>]*>/i, '<link rel="canonical" href="' + esc(pageUrl) + '">'],
        [pergunta('og:type'), '<meta property="og:type" content="article">'],
        [pergunta('og:url'), '<meta property="og:url" content="' + esc(pageUrl) + '">'],
        [pergunta('og:title'), '<meta property="og:title" content="' + esc(titulo) + '">'],
        [pergunta('og:description'), '<meta property="og:description" content="' + esc(resumo) + '">'],
        [pergunta('og:image'), '<meta property="og:image" content="' + esc(image) + '">'],
        [pergunta('twitter:card'), '<meta name="twitter:card" content="summary_large_image">'],
        [pergunta('twitter:title'), '<meta name="twitter:title" content="' + esc(titulo) + '">'],
        [pergunta('twitter:description'), '<meta name="twitter:description" content="' + esc(resumo) + '">'],
        [pergunta('twitter:image'), '<meta name="twitter:image" content="' + esc(image) + '">']
      ];
      for (const [de, para] of trocas) html = html.replace(de, para);

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
