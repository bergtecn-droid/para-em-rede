(()=>{'use strict';const $=id=>document.getElementById(id), config=window.PARA_CONFIG||{};let db=null, cache={};const show=(id,on)=>$(id).classList.toggle('hidden',!on);const note=(message,bad=false)=>{let e=$('notice');e.style.display='block';e.style.background=bad?'#ffe5e5':'#e6edf8';e.textContent=message;window.scrollTo({top:0,behavior:'smooth'})};const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));const val=id=>$(id).value.trim();const slugify=s=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');const requireOk=({data,error})=>{if(error)throw error;return data};const safeUrl=u=>/^https:\/\//i.test(u||'')?u:'';
// Validação amigável de fotos (igual ao painel da Agência Bragança) — retorna texto de erro ou null
const PHOTO_LIMIT = 15 * 1024 * 1024; // 15 MB
function photoProblem(file) {
  if (!file) return null;
  const name = String(file.name || '').toLowerCase();
  const isHeic = String(file.type || '').toLowerCase().includes('hei') || name.endsWith('.heic') || name.endsWith('.heif');
  if (isHeic) return 'A foto está no formato HEIC (padrão mais novo do iPhone). Duas opções: no iPhone, vá em Ajustes › Câmera › Formatos › "Mais compatível" e tire a foto de novo; ou converta sem perder qualidade em heictojpg.com e envie o arquivo JPG.';
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) return 'Formato de foto não aceito. Envie JPG, PNG ou WEBP.';
  if (file.size > PHOTO_LIMIT) return 'A foto é grande (' + Math.round(file.size / 1048576) + ' MB) e o máximo é 15 MB. Reduza em um clique em iloveimg.com/pt-br (opção "Comprimir imagem") e envie de novo.';
  return null;
}
async function isAdmin(){const {data:{user}}=await db.auth.getUser();if(!user)return false;const {data,error}=await db.from('portal_admins').select('user_id').eq('user_id',user.id).maybeSingle();if(error)throw error;return !!data}
async function start(){if(!config.supabaseUrl||!config.supabaseAnonKey||!window.supabase){show('setup',true);return}db=window.supabase.createClient(config.supabaseUrl,config.supabaseAnonKey);$('logout').onclick=async()=>{await db.auth.signOut();location.reload()};$('loginForm').onsubmit=async e=>{e.preventDefault();try{requireOk(await db.auth.signInWithPassword({email:val('email'),password:val('password')}));await enter()}catch(err){note('Não foi possível entrar: '+err.message,true)}};await enter()}
async function enter(){try{const {data:{session}}=await db.auth.getSession();if(!session){show('login',true);show('app',false);show('logout',false);return}if(!await isAdmin()){await db.auth.signOut();show('login',true);note('Este usuário não foi autorizado como administrador. Cadastre seu UUID na tabela portal_admins.',true);return}show('login',false);show('app',true);show('logout',true);await refresh()}catch(e){note('Erro de conexão: '+e.message,true)}}
async function refresh(){try{for(const [key,table,sort] of [['articles','portal_articles','created_at'],['media','portal_media','created_at'],['videos','portal_videos','sort_order'],['sponsors','portal_sponsors','sort_order']]){const {data,error}=await db.from(table).select('*').order(sort,{ascending:key==='videos'||key==='sponsors'});if(error)throw error;cache[key]=data||[]}render();const {data,error}=await db.from('portal_settings').select('key,value');if(error)throw error;const obj=Object.fromEntries((data||[]).map(x=>[x.key,x.value]));for(const [key,id] of [['whatsapp','setWhatsapp'],['instagram','setInstagram'],['radio','setRadio'],['radio_name','setRadioName'],['categories','setCategories'],['headline','setHeadline'],['cover','setCover']]){$(id).value=obj[key]||(key==='radio_name'?'Rádio CF News FM':key==='categories'?'PARÁ\nPOLÍTICA\nPOLÍCIA\nCIDADES\nESPORTES\nSAÚDE\nGERAL\nBRASIL':'')}if(obj.cover&&/^https:\/\//i.test(obj.cover)){$('coverPreview').src=obj.cover;$('coverPreview').style.display='block'}else{$('coverPreview').style.display='none'}}catch(e){note('Erro ao carregar dados: '+e.message,true)}}
const card=(body)=>'<div class="item">'+body+'</div>';const btn=(label,action,id,cls='secondary')=>`<button class="${cls}" data-action="${action}" data-id="${id}">${label}</button>`;
function render(){ $('articleList').innerHTML=(cache.articles||[]).map(x=>card(`<b>${escape(x.title)}</b><p><small>${escape(x.category)} • ${x.status==='published'?'PUBLICADA':'RASCUNHO'}</small></p>${x.image_url?`<img src="${escape(safeUrl(x.image_url))}" alt="">`:''}<p>${btn('Editar','editArticle',x.id)} ${btn('Excluir','deleteArticle',x.id,'danger')}</p>`)).join('')||'<p>Nenhuma notícia cadastrada.</p>';
const media=(cache.media||[]).map(x=>card(`<img src="${escape(safeUrl(x.public_url))}" alt=""><b>${escape(x.title)}</b><p>${btn('Usar na notícia','useImage',x.id)} ${btn('Editar','editMedia',x.id)} ${btn('Copiar endereço','copyImage',x.id)} ${btn('Excluir','deleteMedia',x.id,'danger')}</p>`)).join('')||'<p>Envie suas primeiras fotografias.</p>';$('mediaList').innerHTML=media;
const urlsUsadas=new Set((cache.articles||[]).map(x=>x.image_url).filter(Boolean));
const mediaGaleria=(cache.media||[]).filter(x=>!urlsUsadas.has(x.public_url));
$('galleryList').innerHTML=mediaGaleria.map(x=>card(`<img src="${escape(safeUrl(x.public_url))}" alt=""><b>${escape(x.title)}</b><p>${btn('Editar','editMedia',x.id)} ${btn('Copiar endereço','copyImage',x.id)} ${btn('Excluir','deleteMedia',x.id,'danger')}</p>`)).join('')||'<p>Nenhuma fotografia exclusiva de galeria. Envie fotografias na aba Biblioteca para elas aparecerem na galeria do portal.</p>';
const mediaUsada=(cache.media||[]).filter(x=>urlsUsadas.has(x.public_url));
const btnLimpar=$('limparMediaUsada');if(btnLimpar){btnLimpar.style.display=mediaUsada.length?'':'none';btnLimpar.textContent='Limpar '+mediaUsada.length+' foto'+(mediaUsada.length===1?'':'s')+' que já viraram matérias';}
$('videoList').innerHTML=(cache.videos||[]).map((x,i)=>card(`<b>${i+1}. ${escape(x.title)}</b><p><small>${escape(x.youtube_url)}</small></p>${btn('Editar','editVideo',x.id)} ${btn('Excluir','deleteVideo',x.id,'danger')}`)).join('')||'<p>Nenhum vídeo cadastrado.</p>';
$('sponsorList').innerHTML=(cache.sponsors||[]).map(x=>card(`${x.image_url?`<img src="${escape(safeUrl(x.image_url))}" alt="">`:''}<b>${escape(x.title)}</b><p>${btn('Editar','editSponsor',x.id)} ${btn('Excluir','deleteSponsor',x.id,'danger')}</p>`)).join('')||'<p>Nenhum patrocinador cadastrado.</p>'}
function clearArticle(){$('articleForm').reset();$('articleId').value='';$('articlePhotoProgress').textContent='Escolha uma foto aqui. Ela será enviada automaticamente ao salvar.'}function clearVideo(){$('videoForm').reset();$('videoId').value=''}function clearSponsor(){$('sponsorForm').reset();$('sponsorId').value='';$('sponsorPreview').style.display='none';$('sponsorPreview').removeAttribute('src');$('sponsorPhotoProgress').textContent='Selecione uma imagem. Ela será enviada ao Supabase ao salvar.'}
$('resetArticle').onclick=clearArticle;$('resetVideo').onclick=clearVideo;$('resetSponsor').onclick=clearSponsor;
$('tabs').onclick=e=>{let b=e.target.closest('button[data-tab]');if(!b)return;document.querySelectorAll('#tabs button').forEach(x=>x.classList.toggle('active',x===b));document.querySelectorAll('.panel').forEach(x=>show(x.id,x.id===b.dataset.tab))};
$('articleForm').onsubmit=async e=>{e.preventDefault();let id=val('articleId'),title=val('articleTitle');const file=$('articlePhotoFile').files[0];let imageUrl=val('articleImage');const submit=$('articleForm').querySelector('[type=submit]');submit.disabled=true;try{if(file){const phProblem=photoProblem(file);if(phProblem)throw Error(phProblem);$('articlePhotoProgress').textContent='Enviando fotografia, aguarde...';const path=crypto.randomUUID()+'-'+file.name.replace(/[^a-zA-Z0-9._-]/g,'_');requireOk(await db.storage.from('portal-imagens').upload(path,file,{contentType:file.type,upsert:false}));const {data}=db.storage.from('portal-imagens').getPublicUrl(path);imageUrl=data.publicUrl;$('articleImage').value=imageUrl;$('articlePhotoProgress').textContent='Fotografia enviada com sucesso.';}if(imageUrl&&!safeUrl(imageUrl))throw Error('A fotografia precisa ter um endereço HTTPS válido.');}catch(err){note('Erro ao enviar a fotografia: '+err.message,true);submit.disabled=false;return}let obj={title,slug:id?(cache.articles.find(x=>x.id===id)?.slug||slugify(title)):slugify(title)+'-'+Date.now().toString(36),category:val('articleCat'),summary:val('articleSummary'),body:val('articleBody'),image_url:imageUrl||null,status:val('articleStatus'),updated_at:new Date().toISOString()};try{requireOk(id?await db.from('portal_articles').update(obj).eq('id',id):await db.from('portal_articles').insert(obj));clearArticle();note('Reportagem salva no Supabase.');await refresh()}catch(err){note(err.message,true)}finally{submit.disabled=false}};
$('videoForm').onsubmit=async e=>{e.preventDefault();let id=val('videoId'),url=val('videoUrl');if(!/^https:\/\/([\w.-]*\.)?(youtube\.com|youtu\.be|vimeo\.com|facebook\.com|fb\.watch|tiktok\.com|drive\.google\.com)\//i.test(url)){note('Use um link válido do YouTube, Vimeo, Facebook, TikTok ou Google Drive ( começa com https:// ).',true);return}let obj={title:val('videoTitle'),youtube_url:url,sort_order:Number(val('videoOrder'))||0};try{requireOk(id?await db.from('portal_videos').update(obj).eq('id',id):await db.from('portal_videos').insert(obj));clearVideo();note('Vídeo salvo.');await refresh()}catch(err){note(err.message,true)}};
$('sponsorPhotoFile').addEventListener('change',()=>{const file=$('sponsorPhotoFile').files[0];const preview=$('sponsorPreview');if(!file){preview.style.display='none';preview.removeAttribute('src');return}const sProblem=photoProblem(file);if(sProblem){$('sponsorPhotoFile').value='';preview.style.display='none';note(sProblem,true);return}const reader=new FileReader();reader.onload=()=>{preview.src=reader.result;preview.style.display='block'};reader.readAsDataURL(file)});
$('sponsorForm').onsubmit=async e=>{e.preventDefault();const id=val('sponsorId'),file=$('sponsorPhotoFile').files[0],submit=$('sponsorForm').querySelector('button[type=submit]');let imageUrl=val('sponsorImage');submit.disabled=true;try{if(file){if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>10*1024*1024)throw Error('A imagem deve ser JPG, PNG ou WebP e ter até 10 MB.');$('sponsorPhotoProgress').textContent='Enviando logomarca...';const path='patrocinadores/'+crypto.randomUUID()+'-'+file.name.replace(/[^a-zA-Z0-9._-]/g,'_');requireOk(await db.storage.from('portal-imagens').upload(path,file,{contentType:file.type,upsert:false}));const {data}=db.storage.from('portal-imagens').getPublicUrl(path);imageUrl=data.publicUrl;$('sponsorPhotoProgress').textContent='Logomarca enviada.'}if(imageUrl&&!safeUrl(imageUrl))throw Error('O endereço da imagem precisa começar com https://.');if(!imageUrl)throw Error('Escolha uma imagem ou informe uma URL HTTPS antes de salvar.');const website=val('sponsorUrl');if(website&&!safeUrl(website))throw Error('O site/Instagram deve começar com https://.');const obj={title:val('sponsorTitle'),image_url:imageUrl,website_url:website||null,sort_order:Number(val('sponsorOrder'))||0};requireOk(id?await db.from('portal_sponsors').update(obj).eq('id',id):await db.from('portal_sponsors').insert(obj));clearSponsor();note('Patrocinador e imagem salvos no Supabase.');await refresh()}catch(err){$('sponsorPhotoProgress').textContent='Falha ao salvar. Verifique a mensagem acima.';note('Erro no patrocinador: '+err.message,true)}finally{submit.disabled=false}};
$('setCoverFile').addEventListener('change',()=>{const file=$('setCoverFile').files[0];if(!file)return;const preview=$('coverPreview');preview.src=URL.createObjectURL(file);preview.style.display='block';$('coverProgress').textContent='Imagem selecionada; clique em Salvar configurações para enviar.'});
$('settingsForm').onsubmit=async e=>{e.preventDefault();const submit=$('settingsForm').querySelector('button');submit.disabled=true;try{let cover=val('setCover');const file=$('setCoverFile').files[0];if(file){const cProblem=photoProblem(file);if(cProblem)throw Error(cProblem);$('coverProgress').textContent='Enviando capa...';const path='capas/'+crypto.randomUUID()+'-'+file.name.replace(/[^a-zA-Z0-9._-]/g,'_');requireOk(await db.storage.from('portal-imagens').upload(path,file,{contentType:file.type,upsert:false}));cover=db.storage.from('portal-imagens').getPublicUrl(path).data.publicUrl;}if(cover&&!/^https:\/\//i.test(cover))throw Error('A URL da capa precisa começar com https://');let data=[['whatsapp','setWhatsapp'],['instagram','setInstagram'],['radio','setRadio'],['radio_name','setRadioName'],['categories','setCategories'],['headline','setHeadline']].map(([key,id])=>({key,value:val(id)}));data.push({key:'cover',value:cover});requireOk(await db.from('portal_settings').upsert(data));$('setCover').value=cover;$('setCoverFile').value='';$('coverProgress').textContent='Capa salva.';note('Configurações salvas no Supabase.');await refresh()}catch(err){note('Erro ao salvar configurações: '+err.message,true);$('coverProgress').textContent='Falha ao salvar capa.'}finally{submit.disabled=false}};
const LEGACY_GALLERY_IMAGES=[{"title": "Turismo nas águas amazônicas", "path": "/imagens/galeria-legado/foto-01.webp"}, {"title": "Círio de Nazaré em Belém", "path": "/imagens/galeria-legado/foto-02.webp"}, {"title": "Futebol paraense", "path": "/imagens/galeria-legado/foto-03.webp"}, {"title": "Ilha do Marajó", "path": "/imagens/galeria-legado/foto-04.webp"}, {"title": "Artesanato do Pará", "path": "/imagens/galeria-legado/foto-05.webp"}, {"title": "Castanha-do-brasil", "path": "/imagens/galeria-legado/foto-06.webp"}, {"title": "Rios e florestas", "path": "/imagens/galeria-legado/foto-07.webp"}, {"title": "Pôr do sol no Pará", "path": "/imagens/galeria-legado/foto-08.webp"}];
$('importLegacyGallery').onclick=async()=>{
 const button=$('importLegacyGallery'),progress=$('legacyImportProgress');
 if(!confirm('Importar as 8 fotografias antigas para o Supabase? Fotos já importadas serão ignoradas.'))return;
 button.disabled=true;let created=0,skipped=0;
 try{
  const existing=new Set((cache.media||[]).map(x=>String(x.title||'').trim().toLocaleLowerCase('pt-BR')));
  for(const item of LEGACY_GALLERY_IMAGES){
   if(existing.has(item.title.toLocaleLowerCase('pt-BR'))){skipped++;continue;}
   progress.textContent='Importando: '+item.title;
   const response=await fetch(item.path);if(!response.ok)throw Error('Não foi possível ler '+item.path);
   const blob=await response.blob();const filePath='galeria-modelo/'+item.path.split('/').pop();
   const upload=await db.storage.from('portal-imagens').upload(filePath,blob,{contentType:blob.type||'image/webp',upsert:true});requireOk(upload);
   const {data}=db.storage.from('portal-imagens').getPublicUrl(filePath);
   requireOk(await db.from('portal_media').insert({title:item.title,file_path:filePath,public_url:data.publicUrl}));
   existing.add(item.title.toLocaleLowerCase('pt-BR'));created++;
  }
  progress.textContent=`Concluído: ${created} importadas, ${skipped} já existentes. Atualize o portal público.`;
  note('Importação das fotos antigas concluída.');await refresh();
 }catch(err){progress.textContent='Importação interrompida: '+err.message;note(err.message,true);await refresh();}
 finally{button.disabled=false;}
};
$('limparMediaUsada').onclick=async()=>{const urlsUsadas=new Set((cache.articles||[]).map(x=>x.image_url).filter(Boolean));const alvo=(cache.media||[]).filter(x=>urlsUsadas.has(x.public_url));if(!alvo.length){note('Nenhuma fotografia de matéria para limpar.');return}if(!confirm(alvo.length+' fotografia(s) que já são capa de matérias serão removidas do acervo. As matérias continuam funcionando normalmente, com as suas fotos. Continuar?'))return;const lbtn=$('limparMediaUsada');lbtn.disabled=true;$('limparProgresso').textContent='Limpando...'+0+' de '+alvo.length;let ok=0,falha=0;for(let i=0;i<alvo.length;i++){try{const deletion=await db.from('portal_media').delete().eq('id',alvo[i].id).select('id');requireOk(deletion);if(!deletion.data||!deletion.data.length)throw Error('sem confirmação');ok++}catch(er){falha++;console.warn('Falha ao remover',alvo[i].title,er.message)}$('limparProgresso').textContent='Limpando... '+(i+1)+' de '+alvo.length}lbtn.disabled=false;$('limparProgresso').textContent='Concluído: '+ok+' removida(s)'+(falha?', '+falha+' com falha (repita o botão)':'.');note('Limpeza da galeria concluída: '+ok+' foto(s) de matérias removida(s).');await refresh()};
$('uploadMedia').onclick=async()=>{let files=[...$('mediaFiles').files];if(!files.length){note('Selecione as fotos primeiro.',true);return}let success=0;for(let file of files){try{const mProblem=photoProblem(file);if(mProblem)throw Error(mProblem);let path=crypto.randomUUID()+'-'+file.name.replace(/[^a-zA-Z0-9._-]/g,'_');requireOk(await db.storage.from('portal-imagens').upload(path,file,{contentType:file.type,upsert:false}));let {data}=db.storage.from('portal-imagens').getPublicUrl(path);requireOk(await db.from('portal_media').insert({title:file.name,file_path:path,public_url:data.publicUrl}));success++}catch(e){note('Falha ao enviar '+file.name+': '+e.message,true)}$('uploadProgress').textContent=`${success} de ${files.length} fotografias enviadas`;}await refresh()};
document.addEventListener('click',async e=>{let b=e.target.closest('[data-action]');if(!b||!db)return;let {action,id}=b.dataset;const find=(k)=>(cache[k]||[]).find(x=>x.id===id);try{if(action==='editArticle'){let x=find('articles');$('articleId').value=x.id;$('articleTitle').value=x.title;if(![...$('articleCat').options].some(o=>o.value===x.category))$('articleCat').add(new Option(x.category+' (categoria antiga)',x.category));$('articleCat').value=x.category;$('articleSummary').value=x.summary;$('articleBody').value=x.body;$('articleImage').value=x.image_url||'';$('articleStatus').value=x.status;document.querySelector('[data-tab="noticias"]').click();window.scrollTo(0,0);return}if(action==='editVideo'){let x=find('videos');$('videoId').value=x.id;$('videoTitle').value=x.title;$('videoUrl').value=x.youtube_url;$('videoOrder').value=x.sort_order;document.querySelector('[data-tab="videos"]').click();return}if(action==='editSponsor'){let x=find('sponsors');$('sponsorId').value=x.id;$('sponsorTitle').value=x.title;$('sponsorImage').value=x.image_url||'';$('sponsorUrl').value=x.website_url||'';$('sponsorOrder').value=x.sort_order;$('sponsorPhotoFile').value='';$('sponsorPreview').style.display=x.image_url?'block':'none';if(x.image_url)$('sponsorPreview').src=safeUrl(x.image_url);$('sponsorPhotoProgress').textContent='Para trocar a imagem, escolha um novo arquivo.';document.querySelector('[data-tab="patrocinadores"]').click();return}if(action==='editMedia'){let x=find('media');if(!x)return;const title=prompt('Título da fotografia:',x.title||'');if(title===null)return;if(!title.trim())throw Error('Informe um título.');const url=prompt('Endereço HTTPS da imagem (para substituir, informe outro):',x.public_url||'');if(url===null)return;if(!safeUrl(url.trim()))throw Error('Informe uma URL HTTPS válida.');requireOk(await db.from('portal_media').update({title:title.trim(),public_url:url.trim()}).eq('id',id));note('Fotografia atualizada.');await refresh();return} if(action==='copyImage'||action==='useImage'){let u=find('media').public_url;if(action==='useImage'){$('articleImage').value=u;document.querySelector('[data-tab="noticias"]').click();note('Fotografia selecionada para a notícia.')}else{await navigator.clipboard.writeText(u);note('Endereço da imagem copiado.')}return}if(action.startsWith('delete')){if(!confirm('Tem certeza de que deseja excluir este item?'))return;let table={deleteArticle:'portal_articles',deleteVideo:'portal_videos',deleteSponsor:'portal_sponsors',deleteMedia:'portal_media'}[action];if(action==='deleteMedia'){let x=find('media');if(x&&cache.articles.some(t=>t.image_url===x.public_url)){if(!confirm('Esta fotografia é usada por uma reportagem. Excluir da galeria pode afetar a imagem da notícia. Deseja continuar?'))return;}}const deletion=await db.from(table).delete().eq('id',id).select('id');requireOk(deletion);if(!deletion.data||deletion.data.length===0){throw new Error('A exclusão não foi confirmada no Supabase. Verifique as permissões de DELETE (RLS) desta tabela.')}note('Item excluído do banco de dados.');await refresh()}}catch(err){note(err.message,true)}});
// Barra de formatação do texto da reportagem (igual ao painel da Agência Bragança)
const bodyEl = $('articleBody');
const bodyToolbar = document.getElementById('bodyToolbar');
if (bodyToolbar && bodyEl) {
  bodyToolbar.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-edit]');
    if (!btn) return;
    e.preventDefault();
    bodyEl.focus();
    const start = bodyEl.selectionStart, end = bodyEl.selectionEnd;
    const sel = bodyEl.value.slice(start, end);
    const put = (pre, post, ph) => {
      const inner = sel || ph;
      bodyEl.value = bodyEl.value.slice(0, start) + pre + inner + post + bodyEl.value.slice(end);
      const caret = start + pre.length + inner.length;
      bodyEl.setSelectionRange(caret, caret);
      bodyEl.focus();
    };
    const kind = btn.dataset.edit;
    if (kind === 'strong') put('<strong>', '</strong>', 'texto em negrito');
    else if (kind === 'em') put('<em>', '</em>', 'texto em itálico');
    else if (kind === 'h3') put('<h3>', '</h3>', 'Subtítulo');
    else if (kind === 'blockquote') put('<blockquote>', '</blockquote>', 'Citação');
    else if (kind === 'link') {
      const url = window.prompt('Endereço (URL) do link:', 'https://');
      if (url) put('<a href="' + url + '" target="_blank" rel="noopener noreferrer">', '</a>', sel || 'clique aqui');
    } else if (kind === 'list') {
      const itemText = sel && sel.trim() ? sel : 'Item da lista';
      const items = itemText.split('\n').map(s => '<li>' + s.trim() + '</li>').join('\n');
      bodyEl.value = bodyEl.value.slice(0, start) + '<ul>\n' + items + '\n</ul>' + bodyEl.value.slice(end);
    } else if (kind === 'photo') {
      const medias = (cache.media || []);
      if (!medias.length) { window.alert('Sua biblioteca de fotos está vazia. Envie fotos na seção Biblioteca de fotos primeiro.'); return; }
      const list = medias.map((x, idx2) => (idx2 + 1) + '. ' + String(x.title || x.public_url || 'foto').slice(0, 42)).join('\n');
      const pick = window.prompt('Qual foto inserir? Digite o número:\n\n' + list);
      if (!pick) return;
      const chosen = medias[parseInt(pick, 10) - 1];
      if (!chosen || !chosen.public_url) { window.alert('Número inválido.'); return; }
      bodyEl.focus();
      const st = bodyEl.selectionStart;
      const tag = '\n\n<img src="' + chosen.public_url + '" alt="" style="max-width:100%;border-radius:10px">\n\n';
      bodyEl.value = bodyEl.value.slice(0, st) + tag + bodyEl.value.slice(bodyEl.selectionEnd);
    } else if (kind === 'paras') {
      if (/<\s*(p|h[1-6]\b|ul\b|ol\b|li\b|blockquote\b|table\b|div\b|figure\b)/i.test(bodyEl.value)) {
        window.alert('Este texto já tem formatação (parágrafos, títulos ou listas). Se apagar a formatação sem querer, use Ctrl+Z para desfazer.');
        return;
      }
      const raw = bodyEl.value.replace(/\r\n/g, '\n').trim();
      if (!raw) return;
      const blocks = raw.split(/\n{2,}/).map(b => '<p>' + b.split('\n').join('<br>') + '</p>');
      bodyEl.value = blocks.join('\n');
      note('Texto organizado em parágrafos! Confira antes de salvar. Use Ctrl+Z se quiser voltar.');
    }
  });
}
// Cópia de segurança (baixar/ restaurar) — Pará em Rede
const BACKUP_TABLES = ['portal_articles','portal_media','portal_videos','portal_sponsors','portal_settings'];
const btnBackupDownload = $('btnBackupDownload');
if (btnBackupDownload) {
  btnBackupDownload.onclick = async () => {
    try {
      btnBackupDownload.disabled = true;
      $('backupProgress').textContent = 'Recolhendo dados...';
      const dump = { app: 'para-em-rede', exported_at: new Date().toISOString(), tables: {} };
      let totalRows = 0;
      for (const table of BACKUP_TABLES) {
        const { data, error } = await db.from(table).select('*');
        if (error) throw error;
        dump.tables[table] = data || [];
        totalRows += (data || []).length;
      }
      const blob = new Blob([JSON.stringify(dump, null, 1)], { type: 'application/json' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = 'backup-para-em-rede-' + new Date().toISOString().slice(0, 10) + '.json';
      document.body.appendChild(link); link.click(); link.remove();
      $('backupProgress').textContent = '✅ Cópia baixada: ' + totalRows + ' registros. Guarde o arquivo no seu computador.';
    } catch (err) { $('backupProgress').textContent = ''; note('Erro ao baixar cópia: ' + err.message, true); }
    finally { btnBackupDownload.disabled = false; }
  };
}
const btnBackupRestore = $('btnBackupRestore');
if (btnBackupRestore) {
  btnBackupRestore.onclick = () => $('backupFile').click();
  $('backupFile').addEventListener('change', async e => {
    const file = e.target.files[0]; if (!file) return;
    try {
      const dump = JSON.parse(await file.text());
      if (!dump || !dump.tables) throw new Error('Arquivo de cópia inválido (não contém os dados esperados).');
      const total = Object.values(dump.tables).reduce((n, arr) => n + (Array.isArray(arr) ? arr.length : 0), 0);
      if (!window.confirm('Isso vai reinserir ' + total + ' registros do arquivo (reportagens, fotos, vídeos, patrocinadores e configurações). Registros com o mesmo número de identificação serão sobrescritos pela cópia. Continuar?')) { e.target.value = ''; return; }
      btnBackupRestore.disabled = true;
      let okCount = 0, failMsg = '';
      for (const table of BACKUP_TABLES) {
        const rows = dump.tables[table];
        if (!Array.isArray(rows) || rows.length === 0) continue;
        try { requireOk(await db.from(table).upsert(rows)); okCount += rows.length; }
        catch (err2) { failMsg += (failMsg ? '; ' : '') + table + ': ' + err2.message; }
      }
      if (failMsg) { note('Restauração parcial (' + okCount + ' registros). Falhas: ' + failMsg, true); }
      else { note('✅ Restauração concluída: ' + okCount + ' registros de volta. Abra o portal para conferir.'); }
      $('backupProgress').textContent = 'Cópia aplicada: ' + okCount + ' registros.' + (failMsg ? ' (falhas: ' + failMsg + ')' : '');
      await refresh();
    } catch (err) { note('Erro ao restaurar: ' + err.message, true); }
    finally { btnBackupRestore.disabled = false; e.target.value = ''; }
  });
}
start();})();