# Pará em Rede — Portal V2 (corrigido e otimizado)

Portal de notícias de Castanhal/PA. React-free (HTML/CSS/JS puro), conteúdo via
Supabase, hospedagem no Cloudflare Pages.

## O que mudou nesta versão

| Antes | Agora |
|---|---|
| `index.html` com **5,99 MB** (27 fotos em base64 dentro do código) | `index.html` com **12 KB** + fotos em arquivos separados carregadas sob demanda |
| Painel demonstrativo duplicado dentro do `index.html` (código morto) | Removido — só existe o painel real (`admin.html`) |
| CSS com blocos V9/V10/V12/V15 duplicados e conflitantes | Um único `styles.css` limpo |
| Sem `meta description`, sem Open Graph, sem favicon | SEO completo + cartão com foto/título ao compartilhar |
| Compartilhamento sem prévia | Cartão bonito no WhatsApp/Facebook via `_worker.js` (rota `/m/<slug>`) |
| 6 imagens duplicadas (~2,5 MB desperdiçados) | 20 imagens únicas, ainda guardadas por cache de 30 dias |

## Estrutura de arquivos

```
index.html     → página principal (leve, com SEO)
styles.css     → todo o estilo (folha única)
portal.js      → lógica do portal (notícias, galeria, rádio, clima, compartilhar)
admin.html     → painel administrativo (login Supabase)
admin.js       → lógica do painel
config.js      → URL e chave PÚBLICA do Supabase
_worker.js     → cartões de compartilhamento por matéria (Cloudflare Pages)
_headers       → cache de imagens (30 dias)
imagens/       → fotos locais do portal (capa, fallbacks, logo)
```

## Como publicar (primeira vez) — Cloudflare Pages

O jeito mais prático: conectar o repositório GitHub ao projeto.

1. dash.cloudflare.com → **Workers & Pages** → projeto **para-em-rede**
2. **Settings → Builds & deployments → Git integration → Connect to Git**
3. Autorize o GitHub, escolha o repositório e salve.
   - production branch: `main` — a publicação passa a ser automática a cada atualização.

## Como atualizar o portal no dia a dia

**Conteúdo** (notícias, capas, patrocinadores, raios etc.):
use o painel em `https://para-em-rede.pages.dev/admin.html`.
O conteúdo fica no Supabase — atualizar arquivos não apaga nada.

**Arquivos/visual** (mudanças de código): atualize o repositório aqui no GitHub.
O Cloudflare publica sozinho em ~1 minuto.

## Fazer login no painel

O acesso só é liberado para usuarios cadastrados na tabela `portal_admins`.
Para cadastrar um administrador, insira o `user_id` (UUID do Auth) do usuário.

## Segurança — confira no Supabase (uma vez)

- **RLS ativado** em todas as tabelas `portal_*`.
- Políticas de **SELECT público** (leitura) para o portal funcionar.
- Políticas de INSERT/UPDATE/DELETE **somente para administradores autenticados**.
- Nunca usar a chave `service_role` no front-end (o `config.js` só tem a chave pública).

## Compartilhamento com foto (como funciona)

Cada matéria tem endereço próprio: `https://para-em-rede.pages.dev/m/<slug>`.
O `_worker.js` busca os dados da matéria no Supabase e monta o cartão.
Para o preview aparecer certinho no WhatsApp, certifique-se de que a
reportagem tenha **foto e resumo** preenchidos no painel.

Observação: após publicar, um primeiro compartilhamento pode demorar alguns
minutos para mostrar a foto (cache das plataformas). Cargas seguintes ficam certas.

## Trocar a logo oficial

Substitua o arquivo `imagens/logo-portal.png` pela logo oficial (ideal: PNG com
fundo transparente, ~900×220 px). Ou coloque uma capa no painel:
**Configurações → Imagem de capa do portal**.

## Checklist de qualidade Attende nesta versão

- [x] Página inicial ~75× mais leve
- [x] Sem código morto ou demo
- [x] SEO (description, canonical, Open Graph, Twitter Card, favicon)
- [x] Acessibilidade (aria-labels, navegação por teclado, reduced-motion)
- [x] Cache de imagens
- [x] Cartão de compartilhamento por matéria
