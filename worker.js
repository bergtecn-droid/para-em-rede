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
    const pageUrl = url.origin + '/m/' + encodeURIComponent(slug);
    const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
      'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

    try {
      const api = SUPABASE_URL + '/rest/v1/portal_articles?slug=eq.' + encodeURIComponent(slug) +
        '&select=title,slug,summary,body,image_url,category,created_at&limit=1';
      const r = await fetch(api, {
        headers: { apikey: SUPABASE_KEY, Authorization: 'Bearer ' + SUPABASE_KEY }
      });
      const rows = r.ok ? await r.json() : [];
      const a = Array.isArray(rows) ? rows[0] : null;

      /* ---- Matéria encontrada: servimos a PÁGINA DA MATÉRIA pronta, ----
       * sem depender de JavaScript/CDN no navegador do leitor. Assim o link
       * compartilhado abre sempre, em qualquer aparelho e rede. */
      if (a) {
        let rel = [];
        try {
          const relApi = SUPABASE_URL + '/rest/v1/portal_articles?slug=neq.' + encodeURIComponent(slug) +
            '&status=eq.published&select=title,slug,image_url,category,created_at&order=created_at.desc&limit=4';
          const rr = await fetch(relApi, {
            headers: { apikey: SUPABASE_KEY, Authorization: 'Bearer ' + SUPABASE_KEY }
          });
          rel = rr.ok ? await rr.json() : [];
        } catch (e) { /* relacionados são um extra: seguir sem eles */ }

        const d = a.created_at ? new Date(a.created_at) : new Date();
        const dataTxt = d.getUTCDate() + ' de ' + MESES[d.getUTCMonth()] + ' de ' + d.getUTCFullYear();
        const image = /^https:\/\//i.test(a.image_url || '') ? a.image_url : url.origin + '/imagens/capa.webp';
        const paras = String(a.body || a.summary || '').split(/\n\s*\n|\n/).filter(Boolean);
        const waText = '📰 PARÁ EM REDE\n\n*' + (a.title || '') + '*\n\n' +
          (a.summary || 'Confira a reportagem completa.') + '\n\n🔗 ' + pageUrl;
        const waHref = 'https://api.whatsapp.com/send?text=' + encodeURIComponent(waText);
        const fbHref = 'https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(pageUrl);
        const heroImg = a.image_url && /^https:\/\//i.test(a.image_url)
          ? '<img class="hero" src="' + esc(a.image_url) + '" alt="' + esc(a.title) + '">'
          : '';
        const relHtml = rel.length
          ? '<section class="rel"><h2>Últimas notícias</h2><div class="relgrid">' + rel.map(x =>
            '<a class="relcard" href="/m/' + encodeURIComponent(x.slug || '') + '">' +
            (/^https:\/\//i.test(x.image_url || '')
              ? '<img src="' + esc(x.image_url) + '" alt="" loading="lazy">'
              : '<img src="/imagens/capa.webp" alt="" loading="lazy">') +
            '<span class="tag">' + esc(x.category || 'Notícias') + '</span>' +
            '<h3>' + esc(x.title) + '</h3></a>').join('') + '</div></section>'
          : '';

        const html = '<!doctype html>\n<html lang="pt-BR">\n<head>\n<meta charset="utf-8">\n' +
          '<meta name="viewport" content="width=device-width, initial-scale=1">\n' +
          '<title>' + esc(a.title) + ' | Pará em Rede</title>\n' +
          '<meta name="description" content="' + esc(a.summary || 'Notícias do Pará') + '">\n' +
          '<link rel="canonical" href="' + esc(pageUrl) + '">\n' +
          '<meta property="og:type" content="article">\n' +
          '<meta property="og:url" content="' + esc(pageUrl) + '">\n' +
          '<meta property="og:title" content="' + esc(a.title) + '">\n' +
          '<meta property="og:description" content="' + esc(a.summary || 'Confira a reportagem completa.') + '">\n' +
          '<meta property="og:image" content="' + esc(image) + '">\n' +
          '<meta name="twitter:card" content="summary_large_image">\n' +
          '<meta name="twitter:title" content="' + esc(a.title) + '">\n' +
          '<meta name="twitter:description" content="' + esc(a.summary || 'Confira a reportagem completa.') + '">\n' +
          '<meta name="twitter:image" content="' + esc(image) + '">\n' +
          '<style>' +
          ':root{--red:#c4170c;--ink:#1a1a1a;--gray:#555;--border:#e2e2e2}' +
          '*{margin:0;padding:0;box-sizing:border-box}' +
          'body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif;color:var(--ink);line-height:1.55;background:#fff}' +
          'header{background:var(--red);color:#fff;padding:12px 18px;display:flex;align-items:center;gap:10px}' +
          'header img{height:34px;border-radius:4px;background:#fff;padding:2px}' +
          'header a{color:#fff;text-decoration:none;font-weight:800;font-size:17px;letter-spacing:.3px}' +
          'header small{color:#ffd8d4;font-weight:600;margin-left:auto;font-size:12px}' +
          '.wrap{max-width:780px;margin:0 auto;padding:22px 18px 50px}' +
          '.tag{display:inline-block;background:var(--red);color:#fff;font-size:12px;font-weight:700;padding:3px 10px;border-radius:20px;letter-spacing:.5px}' +
          'h1{font-size:clamp(25px,4vw,38px);line-height:1.18;margin:12px 0 8px;letter-spacing:-.3px}' +
          '.dek{font-size:19px;line-height:1.5;color:var(--gray);margin-bottom:8px}' +
          '.meta{font-size:13.5px;color:#888;margin-bottom:18px}' +
          '.hero{width:100%;border-radius:12px;margin:6px 0 20px}' +
          'p{margin-bottom:16px;font-size:17px;line-height:1.7}' +
          'h2{font-size:19px;margin:34px 0 12px;padding-left:10px;border-left:4px solid var(--red)}' +
          '.share{display:flex;flex-wrap:wrap;gap:10px;margin:26px 0 6px}' +
          '.share a{display:inline-block;background:var(--red);color:#fff;text-decoration:none;font-weight:700;padding:11px 18px;border-radius:8px;font-size:14.5px}' +
          '.share a.wa{background:#14b54b}.share a.fb{background:#1877f2}' +
          '.back{display:inline-block;margin-top:8px;color:var(--red);font-weight:700;text-decoration:none}' +
          '.relgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:14px}' +
          '.relcard{text-decoration:none;color:inherit;border:1px solid var(--border);border-radius:10px;overflow:hidden;display:block}' +
          '.relcard img{width:100%;height:105px;object-fit:cover;display:block}' +
          '.relcard .tag{margin:8px 10px 0;font-size:10.5px}' +
          '.relcard h3{font-size:14px;line-height:1.35;margin:6px 10px 12px;font-weight:600}' +
          'footer{margin-top:40px;padding:16px 18px;border-top:1px solid var(--border);font-size:13px;color:#888;text-align:center}' +
          'footer a{color:var(--red);font-weight:700;text-decoration:none}' +
          '</style>\n</head>\n<body>\n' +
          '<header><a href="/"><img src="/imagens/logo-oficial.webp" alt="" onerror="this.remove()">PARÁ EM REDE</a>' +
          '<small>Conectando histórias, fortalecendo vozes</small></header>\n' +
          '<main class="wrap">\n' +
          '<span class="tag">' + esc(a.category || 'Notícias') + '</span>\n' +
          '<h1>' + esc(a.title) + '</h1>\n' +
          (a.summary ? '<p class="dek">' + esc(a.summary) + '</p>\n' : '') +
          '<div class="meta">Redação Pará em Rede · ' + esc(dataTxt) + '</div>\n' +
          heroImg + '\n' +
          paras.map(p => '<p>' + esc(p) + '</p>').join('\n') + '\n' +
          '<div class="share"><a class="wa" href="' + waHref + '" target="_blank" rel="noopener noreferrer">◉ Compartilhar no WhatsApp</a>' +
          '<a class="fb" href="' + fbHref + '" target="_blank" rel="noopener noreferrer">f Facebook</a>' +
          '<a href="#" onclick="navigator.clipboard.writeText(\'' + esc(pageUrl) + '\');this.textContent=\'✔ Endereço copiado!\';return false">/copiar endereço</a></div>\n' +
          '<a class="back" href="/">← Voltar ao portal</a>\n' +
          relHtml + '\n' +
          '</main>\n' +
          '<footer>Pará em Rede · Informação da nossa região · <a href="/">página inicial</a></footer>\n' +
          '</body>\n</html>';

        return new Response(html, {
          headers: {
            'content-type': 'text/html;charset=UTF-8',
            'cache-control': 'public, max-age=0, must-revalidate'
          }
        });
      }

      /* ---- Matéria NÃO encontrada: mantém a capa com cartão genérico. ---- */
      const indexResp = await env.ASSETS.fetch(new URL('/', url));
      let html = await indexResp.text();

      const image = url.origin + '/imagens/capa.webp';
      const titulo = 'Pará em Rede | Notícias do Pará';
      const resumo = 'Notícias de Castanhal e do Pará em primeira mão. Rádio ao vivo, vídeos e fotos.';

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
