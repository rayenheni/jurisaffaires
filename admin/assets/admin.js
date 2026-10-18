/* JurisAffaires Admin SPA — vanilla JS, JWT */
const API = '';
let CMS = null;
let token = localStorage.getItem('ja_token');
let user = JSON.parse(localStorage.getItem('ja_user')||'null');

function redirectToLogin() {
  // Only redirect if we are not already on login to avoid loops
  if (!location.pathname.endsWith('login.html')) location.href = 'login.html';
}
function clearAuthAndRedirect() {
  localStorage.removeItem('ja_token');
  localStorage.removeItem('ja_user');
  redirectToLogin();
}

<<<<<<< HEAD
// Verify token — only clear on 401/403, not on network errors
=======
// Verify token — only clear on 401 (our auth), not on 403 (E2B gateway) nor network
>>>>>>> d252361 (fix(admin): ne pas deconnecter sur 403 E2B, message clair pour preview)
if (!token) {
  redirectToLogin();
} else {
  fetch(API+'/api/auth/me', { headers:{ Authorization:'Bearer '+token } })
    .then(r=>{
<<<<<<< HEAD
      if (r.status===401 || r.status===403) throw new Error('unauthorized');
=======
      if (r.status===401) throw new Error('unauthorized');
      // 403 = E2B "Missing traffic access token" — ne pas déconnecter, c'est le proxy
      if (r.status===403) throw new Error('network');
>>>>>>> d252361 (fix(admin): ne pas deconnecter sur 403 E2B, message clair pour preview)
      if(!r.ok) throw new Error('network');
      return r.json();
    })
    .then(u=>{
      user=u;
      localStorage.setItem('ja_user', JSON.stringify(u));
      const nm=document.getElementById('userName');
      const em=document.getElementById('userEmail');
      if(nm) nm.textContent = user?.name || user?.email || 'Admin';
      if(em) em.textContent = user?.email || '';
    })
    .catch(e=>{
      if (e.message==='unauthorized') {
        clearAuthAndRedirect();
      } else {
        // Network / 500 : keep token, show banner but don't logout
        console.warn('[admin] auth check failed:', e);
        // still try to render with cached user
        const nm=document.getElementById('userName');
        const em=document.getElementById('userEmail');
        if(nm) nm.textContent = user?.name || user?.email || 'Admin';
        if(em) em.textContent = user?.email || '';
      }
    });
}
document.getElementById('logoutBtn').onclick=()=>{ localStorage.removeItem('ja_token'); localStorage.removeItem('ja_user'); location.href='login.html'; };

const NAV = [
  { id:'dashboard', label:'Tableau de bord', icon:'◧' },
  { id:'site', label:'Cabinet & coordonnées', icon:'⌖', group:'Site' },
  { id:'navigation', label:'Navigation', icon:'≡', group:'Site' },
  { id:'expertises', label:'Pôles d’expertise', icon:'◆', group:'Contenu' },
  { id:'domaines', label:'Domaines (22)', icon:'⬔', group:'Contenu' },
  { id:'equipe', label:'Équipe', icon:'◐', group:'Contenu' },
  { id:'publications', label:'Publications', icon:'✎', group:'Contenu' },
  { id:'references', label:'Références', icon:'★', group:'Contenu' },
  { id:'messages', label:'Messages', icon:'✉', group:'Activité' },
  { id:'medias', label:'Médias', icon:'▭', group:'Activité' },
  { id:'settings', label:'Sécurité', icon:'⚙', group:'Système' },
];

function navHTML(active){
  let html=''; let lastGroup='';
  for(const it of NAV){
    if(it.group!==lastGroup){ html+=`<div class="nav-group"><div class="nav-group__title">${it.group}</div></div>`; lastGroup=it.group; }
    const cls = it.id===active ? 'nav-link is-active' : 'nav-link';
    const badge = it.id==='messages' ? `<span class="badge" id="msgBadge" style="display:none">0</span>` : '';
    html+=`<a class="${cls}" href="#${it.id}"><span>${it.icon}</span> ${it.label} ${badge}</a>`;
  }
  return html;
}

const main = document.getElementById('main');
const titleEl = document.getElementById('pageTitle');
const saveBtn = document.getElementById('saveBtn');
const rebuildBtn = document.getElementById('rebuildBtn');
const rebuildStatus = document.getElementById('rebuildStatus');

function api(path, opts={}){
  opts.headers = opts.headers||{};
  if(token) opts.headers.Authorization='Bearer '+token;
  if(opts.body && typeof opts.body==='object' && !(opts.body instanceof FormData)) { opts.headers['Content-Type']='application/json'; opts.body=JSON.stringify(opts.body); }
  return fetch(API+path, opts).then(async r=>{
    const j = await r.json().catch(()=>({}));
    if(!r.ok) throw new Error(j.error||r.statusText);
    return j;
  });
}

async function loadCMS(){
  CMS = await api('/api/cms');
  updateBadge();
  return CMS;
}
async function updateBadge(){
  try{
    const stats = await api('/api/stats');
    const b = document.getElementById('msgBadge');
    if(b){
      if(stats.messagesNew>0){ b.textContent=stats.messagesNew; b.style.display='inline-flex'; }
      else b.style.display='none';
    }
  }catch(e){}
}

function setActive(id){
  document.getElementById('nav').innerHTML = navHTML(id);
}

async function router(){
  const hash = location.hash.replace('#','') || 'dashboard';
  setActive(hash);
  saveBtn.style.display='none';
  try{
    if(!CMS) await loadCMS();
    if(hash==='dashboard') await viewDashboard();
    else if(hash==='site') viewSite();
    else if(hash==='navigation') viewNavigation();
    else if(hash==='expertises') viewExpertises();
    else if(hash==='domaines') viewDomaines();
    else if(hash==='equipe') viewEquipe();
    else if(hash==='publications') viewPublications();
    else if(hash==='references') viewReferences();
    else if(hash==='messages') await viewMessages();
    else if(hash==='medias') await viewMedias();
    else if(hash==='settings') viewSettings();
    else viewDashboard();
  }catch(e){
    main.innerHTML = `<div class="alert alert--error">${e.message}</div>`;
  }
}

// ---------- HELPERS ----------
function hEsc(s){ return String(s).replace(/[&<>"]/g,c=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' }[c])); }
function card(title, desc, body){ return `<div class="card"><div class="card__head"><div><h2>${title}</h2>${desc?`<p>${desc}</p>`:''}</div></div>${body}</div>`; }
function toast(msg, type='success'){
  const el=document.createElement('div'); el.className=`alert alert--${type}`; el.style.position='fixed'; el.style.right='18px'; el.style.bottom='18px'; el.style.zIndex='999'; el.style.maxWidth='420px'; el.textContent=msg; document.body.appendChild(el); setTimeout(()=>el.remove(),4000);
}

// ---------- VIEWS ----------
async function viewDashboard(){
  titleEl.textContent='Tableau de bord';
  const stats = await api('/api/stats');
  main.innerHTML = `
    <div class="stat-row">
      <div class="stat"><b>${stats.pages}</b><span>Pages statiques</span></div>
      <div class="stat"><b>${stats.team}</b><span>Avocats</span></div>
      <div class="stat"><b>${stats.publications}</b><span>Publications</span></div>
      <div class="stat"><b>${stats.messages} <small style="color:var(--gold)">(${stats.messagesNew} nouveaux)</small></b><span>Messages</span></div>
    </div>
    <div class="grid grid--2" style="margin-top:16px">
      ${card('Raccourcis', 'Actions fréquentes', `
        <div style="display:flex;flex-wrap:wrap;gap:10px">
          <a class="btn btn--primary btn--sm" href="#messages">Voir les messages</a>
          <a class="btn btn--ghost btn--sm" href="#equipe">Gérer l’équipe</a>
          <a class="btn btn--ghost btn--sm" href="#publications">Publier un article</a>
          <a class="btn btn--ghost btn--sm" href="#medias">Uploader un média</a>
          <a class="btn btn--ghost btn--sm" href="#site">Modifier les coordonnées</a>
        </div>
        <div class="divider"></div>
        <p class="kpi">Site : <b>${hEsc(stats.site?.SITE_URL||'')}</b> — Cabinet : ${hEsc(stats.site?.ADDRESS_1||'')} ${hEsc(stats.site?.ADDRESS_2||'')}</p>
        <p class="kpi">Email : ${hEsc(stats.site?.EMAIL||'')} — Tél : ${hEsc(stats.site?.PHONE_MAIN||'')} / ${hEsc(stats.site?.PHONE_2||'')}</p>
      `)}
      ${card('Comment ça marche', 'Architecture éditoriale', `
        <ol style="margin:0;padding-left:18px;font-size:.9rem;line-height:1.7">
          <li>Modifiez le contenu dans l’admin (stocké dans <code>data/cms.json</code>).</li>
          <li>Cliquez sur <b>⟳ Reconstruire le site</b> — lance <code>python3 tools/build_pages.py</code>.</li>
          <li>Les 43 pages HTML sont régénérées à la racine.</li>
          <li>Déployez en copiant le dossier sur votre VPS / hébergement statique.</li>
        </ol>
        <div class="alert alert--info" style="margin-top:12px">Le site reste 100% statique en production — l’admin n’est nécessaire qu’en édition.</div>
      `)}
    </div>
    <div style="margin-top:16px">
      ${card('État du système', null, `
        <div class="grid grid--3">
          <div><b>Pôles</b><br><span class="kpi">${stats.pillars} + Droit du sport</span></div>
          <div><b>Domaines</b><br><span class="kpi">${stats.practices} pratiques</span></div>
          <div><b>Références</b><br><span class="kpi">${stats.clients} logos</span></div>
        </div>
        <div class="divider"></div>
        <p class="kpi">Médias uploadés : ${stats.media} — <a href="#medias">gérer</a></p>
        <p class="kpi">Dernier build : HTML générés depuis <code>data/cms.json</code> via <code>tools/build_pages.py</code></p>
      `)}
    </div>
  `;
}

function viewSite(){
  titleEl.textContent='Cabinet & coordonnées';
  const s = CMS.site;
  saveBtn.style.display='inline-flex'; saveBtn.onclick = saveSite;
  main.innerHTML = `
    ${card('Identité & contact principal', 'Modifiez l’adresse, téléphones, email et horaires — se répercutent sur toutes les pages (header, footer, contact, mentions).', `
      <div class="form-grid">
        <div class="grid grid--2">
          <label>Nom court<input id="f_NAME" value="${hEsc(s.NAME)}"></label>
          <label>Nom légal<input id="f_LEGAL" value="${hEsc(s.LEGAL_NAME)}"></label>
        </div>
        <label>URL du site<input id="f_URL" value="${hEsc(s.SITE_URL)}" placeholder="https://www.jurisaffaires.tn/"></label>
        <div class="grid grid--2">
          <label>Adresse ligne 1<input id="f_A1" value="${hEsc(s.ADDRESS_1)}"></label>
          <label>Adresse ligne 2<input id="f_A2" value="${hEsc(s.ADDRESS_2)}"></label>
        </div>
        <label>Lien carte (MAP_URL)<input id="f_MAP" value="${hEsc(s.MAP_URL)}"></label>
        <div class="grid grid--2">
          <label>Téléphone principal<input id="f_P1" value="${hEsc(s.PHONE_MAIN)}"></label>
          <label>Téléphone 2<input id="f_P2" value="${hEsc(s.PHONE_2)}"></label>
        </div>
        <div class="grid grid--2">
          <label>Téléphone 3<input id="f_P3" value="${hEsc(s.PHONE_3)}"></label>
          <label>Fax<input id="f_FAX" value="${hEsc(s.FAX)}"></label>
        </div>
        <div class="grid grid--2">
          <label>Email<input id="f_EMAIL" type="email" value="${hEsc(s.EMAIL)}"></label>
          <label>Horaires<input id="f_HOURS" value="${hEsc(s.HOURS)}"></label>
        </div>
      </div>
      <div class="alert alert--info" style="margin-top:14px">Après enregistrement, cliquez <b>Reconstruire le site</b> pour générer les 43 pages.</div>
    `)}
    <div class="card"><h2 style="margin:0 0 8px">Aperçu</h2><p class="kpi">${hEsc(s.ADDRESS_1)} — ${hEsc(s.ADDRESS_2)} • ${hEsc(s.PHONE_MAIN)} • ${hEsc(s.EMAIL)}</p></div>
  `;
}
async function saveSite(){
  const v = id=> document.getElementById(id).value.trim();
  CMS.site.NAME=v('f_NAME'); CMS.site.LEGAL_NAME=v('f_LEGAL'); CMS.site.SITE_URL=v('f_URL');
  CMS.site.ADDRESS_1=v('f_A1'); CMS.site.ADDRESS_2=v('f_A2'); CMS.site.MAP_URL=v('f_MAP');
  CMS.site.PHONE_MAIN=v('f_P1'); CMS.site.PHONE_2=v('f_P2'); CMS.site.PHONE_3=v('f_P3'); CMS.site.FAX=v('f_FAX');
  CMS.site.EMAIL=v('f_EMAIL'); CMS.site.HOURS=v('f_HOURS');
  await api('/api/cms', { method:'PUT', body: CMS });
  toast('Coordonnées enregistrées — pensez à Reconstruire le site');
}

function viewNavigation(){
  titleEl.textContent='Navigation';
  saveBtn.style.display='inline-flex'; saveBtn.onclick=saveNav;
  const rows = CMS.nav.map((n,i)=>`<tr><td>${i+1}</td><td><input data-i="${i}" data-k="href" value="${hEsc(n.href)}" class="input" style="width:100%"></td><td><input data-i="${i}" data-k="label" value="${hEsc(n.label)}" class="input" style="width:100%"></td><td><button class="btn btn--ghost btn--sm" onclick="delNav(${i})">Suppr</button></td></tr>`).join('');
  const sub = CMS.expertise_subnav.map((n,i)=>`<tr><td>${i+1}</td><td><input data-sub="${i}" data-k="href" value="${hEsc(n.href)}" class="input" style="width:100%"></td><td><input data-sub="${i}" data-k="label" value="${hEsc(n.label)}" class="input" style="width:100%"></td><td><button class="btn btn--ghost btn--sm" onclick="delSub(${i})">Suppr</button></td></tr>`).join('');
  main.innerHTML = `
    ${card('Menu principal', '6 liens affichés en header et menu mobile.', `
      <div class="table-wrap"><table><thead><tr><th>#</th><th>href</th><th>Label</th><th></th></tr></thead><tbody>${rows}</tbody></table></div>
      <div style="margin-top:10px"><button class="btn btn--ghost btn--sm" onclick="addNav()">+ Ajouter un lien</button></div>
    `)}
    ${card('Sous-navigation Expertises', null, `
      <div class="table-wrap"><table><thead><tr><th>#</th><th>href</th><th>Label</th><th></th></tr></thead><tbody>${sub}</tbody></table></div>
      <div style="margin-top:10px"><button class="btn btn--ghost btn--sm" onclick="addSub()">+ Ajouter</button></div>
    `)}
  `;
  // bind inputs
  main.querySelectorAll('input[data-i]').forEach(inp=>{
    inp.addEventListener('input', e=>{
      const i=parseInt(e.target.dataset.i); const k=e.target.dataset.k;
      CMS.nav[i][k]=e.target.value;
    });
  });
  main.querySelectorAll('input[data-sub]').forEach(inp=>{
    inp.addEventListener('input', e=>{
      const i=parseInt(e.target.dataset.sub); const k=e.target.dataset.k;
      CMS.expertise_subnav[i][k]=e.target.value;
    });
  });
}
window.addNav=()=>{ CMS.nav.push({href:'nouvelle-page.html', label:'Nouveau'}); viewNavigation(); };
window.delNav=(i)=>{ CMS.nav.splice(i,1); viewNavigation(); };
window.addSub=()=>{ CMS.expertise_subnav.push({href:'expertise-nouvelle.html', label:'Nouvelle'}); viewNavigation(); };
window.delSub=(i)=>{ CMS.expertise_subnav.splice(i,1); viewNavigation(); };
async function saveNav(){ await api('/api/cms', {method:'PUT', body:CMS}); toast('Navigation enregistrée'); }

function viewExpertises(){
  titleEl.textContent='Pôles d’expertise';
  saveBtn.style.display='inline-flex'; saveBtn.onclick=saveExpertises;
  const pillars = CMS.pillars;
  const sport = CMS.sport;
  function pillarForm(p, idx, isSport=false){
    return `<div class="card" style="border-left:4px solid var(--green)">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:10px"><h3 style="margin:0">${isSport?'05 — ':''}${hEsc(p.title)} <small style="color:var(--slate)">(${hEsc(p.slug)})</small></h3>${!isSport?`<button class="btn btn--ghost btn--sm" onclick="delPillar(${idx})">Supprimer</button>`:''}</div>
      <div class="form-grid" style="margin-top:12px">
        <div class="grid grid--2">
          <label>Numéro<input data-p="${idx}" data-sport="${isSport}" data-f="num" value="${hEsc(p.num)}"></label>
          <label>Slug (fichier)<input data-p="${idx}" data-sport="${isSport}" data-f="slug" value="${hEsc(p.slug)}"></label>
        </div>
        <label>Titre<input data-p="${idx}" data-sport="${isSport}" data-f="title" value="${hEsc(p.title)}"></label>
        <label>Hero<input data-p="${idx}" data-sport="${isSport}" data-f="hero" value="${hEsc(p.hero)}"></label>
        <label>Lede<input data-p="${idx}" data-sport="${isSport}" data-f="lede" value="${hEsc(p.lede)}"></label>
        <label>Card<input data-p="${idx}" data-sport="${isSport}" data-f="card" value="${hEsc(p.card)}"></label>
        <label>Items (un par ligne)<textarea data-p="${idx}" data-sport="${isSport}" data-f="items" rows="4">${hEsc((p.items||[]).join('\n'))}</textarea></label>
      </div>
    </div>`;
  }
  main.innerHTML = `
    ${card('Les 4 pôles', 'Chaque pôle regroupe 4–5 domaines. Le slug détermine le nom du fichier généré.', `
      <div class="grid">${pillars.map((p,i)=>pillarForm(p,i,false)).join('')}</div>
      <div style="margin-top:12px"><button class="btn btn--ghost btn--sm" onclick="addPillar()">+ Ajouter un pôle</button></div>
    `)}
    ${card('Droit du sport (pôle signature)', null, pillarForm(sport, -1, true))}
  `;
  main.querySelectorAll('[data-p]').forEach(el=>{
    el.addEventListener('input', e=>{
      const idx=parseInt(e.target.dataset.p); const isSport=e.target.dataset.sport==='true'; const f=e.target.dataset.f;
      const target = isSport ? CMS.sport : CMS.pillars[idx];
      if(f==='items') target[f]=e.target.value.split('\n').map(s=>s.trim()).filter(Boolean);
      else target[f]=e.target.value;
    });
  });
}
window.addPillar=()=>{ CMS.pillars.push({ num:`0${CMS.pillars.length+1}`, slug:`expertise-nouveau-${Date.now().toString(36)}.html`, title:'Nouveau pôle', hero:'Hero', lede:'Lede', card:'Card', items:['Domaine 1']}); viewExpertises(); };
window.delPillar=(i)=>{ if(confirm('Supprimer ce pôle ?')){ CMS.pillars.splice(i,1); viewExpertises(); } };
async function saveExpertises(){ await api('/api/cms',{method:'PUT',body:CMS}); toast('Pôles enregistrés'); }

function viewDomaines(){
  titleEl.textContent='Domaines (22)';
  saveBtn.style.display='inline-flex'; saveBtn.onclick=async()=>{ await api('/api/cms',{method:'PUT',body:CMS}); toast('Domaines enregistrés'); };
  // practices is object with keys 0..4
  const allExpertises = [...CMS.pillars, CMS.sport];
  let html='';
  for(const k of Object.keys(CMS.practices).sort((a,b)=>a-b)){
    const pole = allExpertises[parseInt(k)];
    const list = CMS.practices[k]||[];
    html+=`<div class="card"><div class="card__head"><div><h2>${hEsc(pole?.title||'Pôle '+k)} <small style="color:var(--slate)">— ${hEsc(pole?.slug||'')}</small></h2><p>${list.length} domaines</p></div><button class="btn btn--ghost btn--sm" onclick="addDomaine('${k}')">+ Domaine</button></div>`;
    html+= list.map((d, idx)=>`
      <div style="border:1px solid var(--line-soft);border-radius:12px;padding:12px;margin-bottom:10px">
        <div class="grid grid--2">
          <label>Titre<input data-k="${k}" data-i="${idx}" data-f="title" value="${hEsc(d.title)}" class="input"></label>
          <label>Tag<input data-k="${k}" data-i="${idx}" data-f="tag" value="${hEsc(d.tag)}" class="input"></label>
        </div>
        <label style="margin-top:8px">Description<textarea data-k="${k}" data-i="${idx}" data-f="desc" rows="3" class="input" style="width:100%">${hEsc(d.desc)}</textarea></label>
        <div style="margin-top:8px"><button class="btn btn--ghost btn--sm" onclick="delDomaine('${k}',${idx})">Supprimer</button> <span class="kpi">Fichier : domaine-${hEsc(d.title.toLowerCase().replace(/[^a-z0-9]+/g,'-'))}.html</span></div>
      </div>
    `).join('') + `</div>`;
  }
  main.innerHTML = html;
  main.querySelectorAll('[data-k]').forEach(el=>{
    el.addEventListener('input', e=>{
      const k=e.target.dataset.k; const i=parseInt(e.target.dataset.i); const f=e.target.dataset.f;
      CMS.practices[k][i][f]=e.target.value;
    });
  });
}
window.addDomaine=(k)=>{ CMS.practices[k]=CMS.practices[k]||[]; CMS.practices[k].push({ title:'Nouveau domaine', desc:'Description', tag:'Conseil'}); viewDomaines(); };
window.delDomaine=(k,i)=>{ CMS.practices[k].splice(i,1); viewDomaines(); };

function viewEquipe(){
  titleEl.textContent='Équipe';
  saveBtn.style.display='inline-flex'; saveBtn.onclick=async()=>{ await api('/api/cms',{method:'PUT',body:CMS}); toast('Équipe enregistrée'); };
  const html = CMS.team.map((m, idx)=>`
    <div class="card" style="border-left:4px solid var(--gold)">
      <div style="display:flex;justify-content:space-between;align-items:center"><h3 style="margin:0">${hEsc(m.first)} ${hEsc(m.last)} — ${hEsc(m.role)}</h3><button class="btn btn--ghost btn--sm" onclick="delMember(${idx})">Supprimer</button></div>
      <div class="form-grid" style="margin-top:12px">
        <div class="grid grid--3">
          <label>Prénom<input data-m="${idx}" data-f="first" value="${hEsc(m.first)}"></label>
          <label>Nom<input data-m="${idx}" data-f="last" value="${hEsc(m.last)}"></label>
          <label>Numéro<input data-m="${idx}" data-f="num" value="${hEsc(m.num)}"></label>
        </div>
        <div class="grid grid--2">
          <label>Rôle<input data-m="${idx}" data-f="role" value="${hEsc(m.role)}"></label>
          <label>Slug<input data-m="${idx}" data-f="slug" value="${hEsc(m.slug)}"></label>
        </div>
        <div class="grid grid--2">
          <label>Image (assets/img/team/…)<input data-m="${idx}" data-f="img" value="${hEsc(m.img)}"></label>
          <label>Alt portrait<textarea data-m="${idx}" data-f="alt" rows="2">${hEsc(m.alt)}</textarea></label>
        </div>
        <label>Bio<textarea data-m="${idx}" data-f="bio" rows="3">${hEsc(m.bio)}</textarea></label>
        <div class="grid grid--2">
          <label>Tags (un par ligne)<textarea data-m="${idx}" data-f="tags" rows="4">${hEsc((m.tags||[]).join('\n'))}</textarea></label>
          <label>Faits (format: Label | Valeur — un par ligne)<textarea data-m="${idx}" data-f="facts" rows="4">${hEsc((m.facts||[]).map(f=>f.join(' | ')).join('\n'))}</textarea></label>
        </div>
        <label>Expertises (indices 0..4, séparés par ,)<input data-m="${idx}" data-f="expertises" value="${hEsc((m.expertises||[]).join(', '))}"></label>
        <div class="list-item"><img src="../assets/img/team/${hEsc(m.img)}" onerror="this.style.display='none'"><div><b>${hEsc(m.first)} ${hEsc(m.last)}</b><br><span class="kpi">${hEsc(m.role)}</span></div></div>
      </div>
    </div>
  `).join('');
  main.innerHTML = html + `<div style="margin-top:12px"><button class="btn btn--ghost btn--sm" onclick="addMember()">+ Ajouter un avocat</button></div>`;
  main.querySelectorAll('[data-m]').forEach(el=>{
    el.addEventListener('input', e=>{
      const idx=parseInt(e.target.dataset.m); const f=e.target.dataset.f;
      let v=e.target.value;
      if(f==='tags') CMS.team[idx][f]=v.split('\n').map(s=>s.trim()).filter(Boolean);
      else if(f==='facts') CMS.team[idx][f]=v.split('\n').map(s=>s.trim()).filter(Boolean).map(line=>{ const [k,...rest]=line.split('|'); return [k.trim(), rest.join('|').trim()]; });
      else if(f==='expertises') CMS.team[idx][f]=v.split(',').map(s=>parseInt(s.trim())).filter(n=>!isNaN(n));
      else CMS.team[idx][f]=v;
    });
  });
}
window.addMember=()=>{ CMS.team.push({ slug:`avocat-nouveau-${Date.now().toString(36)}.html`, num:`0${CMS.team.length+1}`, first:'Nouveau', last:'AVOCAT', role:'Avocat', img:'slim-bouderbala.jpg', alt:'Portrait', bio:'Bio', facts:[], tags:['Droit des affaires'], expertises:[0]}); viewEquipe(); };
window.delMember=(i)=>{ if(confirm('Supprimer ce profil ?')){ CMS.team.splice(i,1); viewEquipe(); } };

function viewPublications(){
  titleEl.textContent='Publications';
  saveBtn.style.display='inline-flex'; saveBtn.onclick=async()=>{ await api('/api/cms',{method:'PUT',body:CMS}); toast('Publications enregistrées'); };
  const html = CMS.publications.map((p, idx)=>`
    <div class="card" style="border-left:4px solid var(--green-deep)">
      <div style="display:flex;justify-content:space-between;align-items:center"><h3 style="margin:0">${hEsc(p.title)} <small style="color:var(--slate)">${hEsc(p.date)}</small></h3><button class="btn btn--ghost btn--sm" onclick="delPub(${idx})">Supprimer</button></div>
      <div class="form-grid" style="margin-top:12px">
        <label>Titre<input data-p="${idx}" data-f="title" value="${hEsc(p.title)}"></label>
        <label>Titre court<input data-p="${idx}" data-f="short_title" value="${hEsc(p.short_title)}"></label>
        <div class="grid grid--2">
          <label>Slug<input data-p="${idx}" data-f="slug" value="${hEsc(p.slug)}"></label>
          <label>Catégorie<input data-p="${idx}" data-f="category" value="${hEsc(p.category)}"></label>
        </div>
        <div class="grid grid--3">
          <label>Date<input data-p="${idx}" data-f="date" value="${hEsc(p.date)}"></label>
          <label>Temps lecture<input data-p="${idx}" data-f="read_time" value="${hEsc(p.read_time)}"></label>
          <label>Auteur<input data-p="${idx}" data-f="author" value="${hEsc(p.author)}"></label>
        </div>
        <div class="grid grid--2">
          <label>Auteur slug<input data-p="${idx}" data-f="author_slug" value="${hEsc(p.author_slug)}"></label>
          <label>Auteur image<input data-p="${idx}" data-f="author_img" value="${hEsc(p.author_img)}"></label>
        </div>
        <label>Kicker<textarea data-p="${idx}" data-f="kicker" rows="2">${hEsc(p.kicker)}</textarea></label>
        <label>Résumé (text)<textarea data-p="${idx}" data-f="text" rows="2">${hEsc(p.text)}</textarea></label>
        <label>URL originale<input data-p="${idx}" data-f="original_url" value="${hEsc(p.original_url)}"></label>
        <label>Points clés (un par ligne)<textarea data-p="${idx}" data-f="takeaways" rows="4">${hEsc((p.takeaways||[]).join('\n'))}</textarea></label>
        <div class="alert alert--info">Sections : édition avancée — structure JSON. Pour simplifier, les sections sont éditables en JSON brut ci-dessous.</div>
        <label>Sections (JSON)<textarea data-p="${idx}" data-f="sections" rows="6">${hEsc(JSON.stringify(p.sections||[], null, 2))}</textarea></label>
      </div>
    </div>
  `).join('');
  main.innerHTML = html + `<div style="margin-top:12px"><button class="btn btn--ghost btn--sm" onclick="addPub()">+ Nouvelle publication</button></div>`;
  main.querySelectorAll('[data-p]').forEach(el=>{
    el.addEventListener('input', e=>{
      const idx=parseInt(e.target.dataset.p); const f=e.target.dataset.f; let v=e.target.value;
      if(f==='takeaways') CMS.publications[idx][f]=v.split('\n').map(s=>s.trim()).filter(Boolean);
      else if(f==='sections'){ try{ CMS.publications[idx][f]=JSON.parse(v); }catch(e){} }
      else CMS.publications[idx][f]=v;
    });
  });
}
window.addPub=()=>{ CMS.publications.push({ slug:`publication-nouveau-${Date.now().toString(36)}.html`, title:'Nouvelle publication', short_title:'Nouveau', date:new Date().toLocaleDateString('fr-TN'), author:'Me Slim Bouderbala', author_slug:'avocat-slim-bouderbala.html', author_role:'Avocat Associé', author_img:'slim-bouderbala.jpg', category:'Droit', read_time:'5 min', kicker:'Accroche', text:'Résumé', original_url:'https://www.jurisaffaires.tn/', takeaways:['Point 1'], sections:[] }); viewPublications(); };
window.delPub=(i)=>{ if(confirm('Supprimer cette publication ?')){ CMS.publications.splice(i,1); viewPublications(); } };

function viewReferences(){
  titleEl.textContent='Références';
  saveBtn.style.display='inline-flex'; saveBtn.onclick=async()=>{ await api('/api/cms',{method:'PUT',body:CMS}); toast('Références enregistrées'); };
  const rows = CMS.clients.map((c,i)=>`
    <tr><td><img src="../assets/img/clients/${hEsc(c.file)}" style="height:32px" onerror="this.style.display='none'"></td><td><input data-c="${i}" data-f="file" value="${hEsc(c.file)}" class="input" style="width:100%"></td><td><input data-c="${i}" data-f="alt" value="${hEsc(c.alt)}" class="input" style="width:100%"></td><td><button class="btn btn--ghost btn--sm" onclick="delClient(${i})">Suppr</button></td></tr>
  `).join('');
  main.innerHTML = `
    ${card('Logos clients', '12 logos affichés sur references.html — fichier dans assets/img/clients/ + alt.', `
      <div class="table-wrap"><table><thead><tr><th>Aperçu</th><th>Fichier</th><th>Alt</th><th></th></tr></thead><tbody>${rows}</tbody></table></div>
      <div style="margin-top:10px;display:flex;gap:8px"><button class="btn btn--ghost btn--sm" onclick="addClient()">+ Ajouter</button> <a class="btn btn--ghost btn--sm" href="#medias">Uploader un logo</a></div>
    `)}
  `;
  main.querySelectorAll('[data-c]').forEach(el=>{
    el.addEventListener('input', e=>{
      const i=parseInt(e.target.dataset.c); const f=e.target.dataset.f;
      CMS.clients[i][f]=e.target.value;
    });
  });
}
window.addClient=()=>{ CMS.clients.push({ file:'nouveau-logo.png', alt:'Nouveau client'}); viewReferences(); };
window.delClient=(i)=>{ CMS.clients.splice(i,1); viewReferences(); };

async function viewMessages(){
  titleEl.textContent='Messages';
  const toolbar = `<div class="toolbar"><input id="msgQ" placeholder="Rechercher…" class="input" style="flex:1;min-width:180px"><select id="msgFilter" class="input"><option value="">Tous</option><option value="new">Nouveaux</option><option value="read">Lus</option><option value="archived">Archivés</option></select><button class="btn btn--ghost btn--sm" id="msgReload">Actualiser</button><button class="btn btn--ghost btn--sm" id="msgCsv">Exporter CSV</button></div>`;
  main.innerHTML = card('Boîte de réception', 'Messages du formulaire de contact — stockés dans data/messages.json', toolbar + `<div id="msgList" class="grid"></div>`);
  const qEl=document.getElementById('msgQ'), fEl=document.getElementById('msgFilter');
  async function load(){
    const q = qEl.value.trim(); const status=fEl.value;
    let url='/api/messages?'; if(status) url+=`status=${status}&`; if(q) url+=`q=${encodeURIComponent(q)}&`;
    const msgs = await api(url);
    const list = document.getElementById('msgList');
    if(!msgs.length) list.innerHTML=`<div class="empty">Aucun message</div>`;
    else list.innerHTML = msgs.map(m=>`
      <div class="card" style="padding:14px">
        <div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap">
          <div><b>${hEsc(m.nom)}</b> <span class="kpi">${hEsc(m.email)} ${m.tel? '• '+hEsc(m.tel):''}</span><br><span class="tag tag--${m.status}">${m.status}</span> <span class="kpi">${new Date(m.createdAt).toLocaleString('fr-TN')} — ${hEsc(m.sujet||'')}</span></div>
          <div style="display:flex;gap:6px;flex-wrap:wrap">
            <button class="btn btn--ghost btn--sm" onclick="markMsg('${m.id}','read')">Lu</button>
            <button class="btn btn--ghost btn--sm" onclick="markMsg('${m.id}','archived')">Archiver</button>
            <button class="btn btn--ghost btn--sm" onclick="delMsg('${m.id}')" style="color:var(--danger);border-color:#FEC6C1">Suppr</button>
          </div>
        </div>
        <div style="margin-top:10px;white-space:pre-wrap;background:#FCFBF8;border:1px solid var(--line-soft);border-radius:10px;padding:10px;font-size:.88rem">${hEsc(m.message)}</div>
        ${m.societe?`<div class="kpi" style="margin-top:6px">Société : ${hEsc(m.societe)}</div>`:''}
        <div class="kpi" style="margin-top:6px"><a href="mailto:${hEsc(m.email)}?subject=Re:%20${hEsc(m.sujet||'')}" >Répondre par email</a></div>
      </div>
    `).join('');
  }
  document.getElementById('msgReload').onclick=load;
  document.getElementById('msgCsv').onclick=async()=>{
    const msgs = await api('/api/messages');
    const header=['id','date','nom','societe','email','tel','sujet','message','status'];
    const rows = msgs.map(m=>[m.id, m.createdAt, m.nom, m.societe, m.email, m.tel, m.sujet, m.message.replace(/\n/g,' '), m.status]);
    const csv = [header, ...rows].map(r=>r.map(v=>`"${String(v||'').replace(/"/g,'""')}"`).join(',')).join('\n');
    const blob=new Blob([csv],{type:'text/csv'}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download='messages-jurisaffaires.csv'; a.click(); URL.revokeObjectURL(url);
  };
  qEl.oninput=load; fEl.onchange=load;
  await load();
}
window.markMsg=async(id,status)=>{ await api(`/api/messages/${id}`, { method:'PATCH', body:{ status } }); viewMessages(); toast('Statut mis à jour'); };
window.delMsg=async(id)=>{ if(!confirm('Supprimer ce message ?')) return; await api(`/api/messages/${id}`, { method:'DELETE' }); viewMessages(); toast('Message supprimé'); };

async function viewMedias(){
  titleEl.textContent='Médias';
  main.innerHTML = card('Bibliothèque', 'Uploads stockés dans assets/img/uploads/ — indexés dans data/media.json', `
    <form id="uploadForm" style="display:flex;gap:10px;flex-wrap:wrap;align-items:center">
      <input type="file" id="fileInput" multiple accept="image/*" class="input">
      <button type="submit" class="btn btn--primary btn--sm">Uploader</button>
      <span class="kpi">Taille max 12 Mo — JPG/PNG/WEBP/SVG</span>
    </form>
    <div id="mediaGrid" class="grid grid--3" style="margin-top:16px"></div>
  `);
  document.getElementById('uploadForm').onsubmit=async(e)=>{
    e.preventDefault();
    const files = document.getElementById('fileInput').files;
    if(!files.length) return toast('Sélectionnez des fichiers','error');
    const fd=new FormData(); for(const f of files) fd.append('files', f);
    const r = await fetch('/api/media/upload', { method:'POST', headers:{ Authorization:'Bearer '+token }, body: fd });
    const j=await r.json(); if(!r.ok) throw new Error(j.error);
    toast(`${j.files.length} fichier(s) uploadé(s)`); viewMedias();
  };
  const media = await api('/api/media');
  const grid=document.getElementById('mediaGrid');
  if(!media.length) grid.innerHTML=`<div class="empty">Aucun média</div>`;
  else grid.innerHTML=media.map(m=>`
    <div class="card" style="padding:10px">
      <img src="../${hEsc(m.url)}" style="width:100%;height:140px;object-fit:cover;border-radius:10px;border:1px solid var(--line-soft)">
      <div style="margin-top:8px"><b style="font-size:.85rem;word-break:break-all">${hEsc(m.filename)}</b><br><span class="kpi">${m.mimetype} • ${(m.size/1024).toFixed(1)} Ko</span><br><code style="font-size:.72rem;word-break:break-all">${hEsc(m.url)}</code></div>
      <div style="margin-top:8px;display:flex;gap:6px"><button class="btn btn--ghost btn--sm" onclick="copyUrl('${hEsc(m.url)}')">Copier URL</button><button class="btn btn--ghost btn--sm" onclick="delMedia('${m.id}')" style="color:var(--danger)">Supprimer</button></div>
    </div>
  `).join('');
}
window.copyUrl=(u)=>{ navigator.clipboard.writeText(u); toast('URL copiée'); };
window.delMedia=async(id)=>{ if(!confirm('Supprimer ce média ?')) return; await api(`/api/media/${id}`,{method:'DELETE'}); toast('Média supprimé'); viewMedias(); };

function viewSettings(){
  titleEl.textContent='Sécurité';
  main.innerHTML = `
    ${card('Changer le mot de passe', null, `
      <div class="form-grid">
        <label>Mot de passe actuel<input id="curPwd" type="password"></label>
        <label>Nouveau mot de passe (≥8 car.)<input id="newPwd" type="password"></label>
        <button class="btn btn--primary btn--sm" id="pwdBtn">Mettre à jour</button>
        <div id="pwdMsg" hidden></div>
      </div>
    `)}
    ${card('Informations', null, `
      <p class="kpi">Connecté en tant que <b>${hEsc(user.email)}</b> — rôle <b>${hEsc(user.role)}</b></p>
      <p class="kpi">JWT stocké dans localStorage — déconnexion via bouton en sidebar.</p>
      <p class="kpi">Pour ajouter un utilisateur, éditez <code>data/users.json</code> côté serveur.</p>
    `)}
  `;
  document.getElementById('pwdBtn').onclick=async()=>{
    const cur=document.getElementById('curPwd').value, nw=document.getElementById('newPwd').value;
    const msg=document.getElementById('pwdMsg'); msg.hidden=true;
    try{
      await api('/api/auth/password', { method:'PUT', body:{ currentPassword:cur, newPassword:nw } });
      msg.textContent='Mot de passe mis à jour.'; msg.className='alert alert--success'; msg.hidden=false;
      toast('Mot de passe mis à jour');
    }catch(e){ msg.textContent=e.message; msg.className='alert alert--error'; msg.hidden=false; }
  };
}

// Rebuild
rebuildBtn.onclick=async()=>{
  rebuildBtn.disabled=true; rebuildBtn.textContent='Reconstruction…'; rebuildStatus.textContent='';
  try{
    const r=await api('/api/rebuild', { method:'POST' });
    rebuildStatus.textContent='✔ Rebuild OK'; toast('Site reconstruit — 43 pages régénérées');
    rebuildStatus.style.color='var(--green)';
    setTimeout(()=> rebuildStatus.textContent='', 4000);
  }catch(e){ rebuildStatus.textContent='✘ '+e.message; rebuildStatus.style.color='var(--danger)'; toast(e.message,'error'); }
  finally{ rebuildBtn.disabled=false; rebuildBtn.textContent='⟳ Reconstruire le site'; }
};

// Router + burger
window.addEventListener('hashchange', router);
window.addEventListener('load', router);
document.getElementById('burger').onclick=()=> document.getElementById('sidebar').classList.toggle('is-open');
