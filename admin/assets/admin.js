/* JurisAffaires Admin SPA — vanilla JS, multi-storage + proxy-proof auth */
const API = '';
let CMS = null;

// Safe storage helpers — survive cross-origin iframes (Arena Live Preview),
// Safari ITP, Brave Shields, and proxies that overwrite Authorization headers.
const memStore = {};
function safeGet(store, key) {
  try { return store ? store.getItem(key) : null; } catch (e) { return null; }
}
function safeSet(store, key, val) {
  try { if (store) store.setItem(key, val); } catch (e) {}
}
function safeRemove(store, key) {
  try { if (store) store.removeItem(key); } catch (e) {}
}
function readWindowName() {
  try {
    if (!window.name || !window.name.startsWith('__ja__:')) return {};
    return JSON.parse(window.name.slice(7)) || {};
  } catch (e) { return {}; }
}
function writeWindowName(obj) {
  try { window.name = '__ja__:' + JSON.stringify(obj || {}); } catch (e) {}
}

function readStoredAuth() {
  const wn = readWindowName();
  const tok = memStore.token
    || safeGet(window.localStorage, 'ja_token')
    || safeGet(window.sessionStorage, 'ja_token')
    || wn.token
    || null;
  let usr = memStore.user || null;
  if (!usr) {
    const rawUser = safeGet(window.localStorage, 'ja_user')
      || safeGet(window.sessionStorage, 'ja_user');
    if (rawUser) {
      try { usr = JSON.parse(rawUser); } catch (e) { usr = null; }
    }
    if (!usr && wn.user) usr = wn.user;
  }
  return { token: tok, user: usr };
}

function persistAuth(newToken, newUser) {
  token = newToken || null;
  user = newUser || null;
  memStore.token = token;
  memStore.user = user;
  if (token) {
    safeSet(window.localStorage, 'ja_token', token);
    safeSet(window.sessionStorage, 'ja_token', token);
  }
  if (user) {
    const raw = JSON.stringify(user);
    safeSet(window.localStorage, 'ja_user', raw);
    safeSet(window.sessionStorage, 'ja_user', raw);
  }
  writeWindowName(token ? { token, user } : {});
}

function clearStoredAuth() {
  token = null;
  user = null;
  delete memStore.token;
  delete memStore.user;
  safeRemove(window.localStorage, 'ja_token');
  safeRemove(window.localStorage, 'ja_user');
  safeRemove(window.sessionStorage, 'ja_token');
  safeRemove(window.sessionStorage, 'ja_user');
  writeWindowName({});
}

function authHeaders(extra = {}) {
  const h = Object.assign({}, extra);
  if (token) {
    h['X-Admin-Token'] = token;
    h['Authorization'] = 'Bearer ' + token;
  }
  return h;
}

const initialAuth = readStoredAuth();
let token = initialAuth.token;
let user = initialAuth.user;

const loginScreen = document.getElementById('loginScreen');
const appShell = document.getElementById('appShell');

function syncUserUI() {
  const nm = document.getElementById('userName');
  const em = document.getElementById('userEmail');
  if (nm) nm.textContent = user?.name || user?.email || 'Admin';
  if (em) em.textContent = user?.email || '';
}

function showLoginScreen() {
  if (appShell) appShell.hidden = true;
  if (loginScreen) loginScreen.hidden = false;
  document.title = 'Connexion — Admin JurisAffaires';
}

function showAppShell() {
  if (loginScreen) loginScreen.hidden = true;
  if (appShell) appShell.hidden = false;
  document.title = 'Admin — JurisAffaires';
  syncUserUI();
  if (location.pathname.endsWith('login.html')) {
    try { history.replaceState(null, '', 'index.html' + (location.hash || '#dashboard')); } catch (e) {}
  }
}

async function logoutAndShowLogin() {
  clearStoredAuth();
  CMS = null;
  try {
    await fetch(API + '/api/auth/logout', { method: 'POST', credentials: 'include' });
  } catch (e) {}
  showLoginScreen();
}

const loginForm = document.getElementById('loginForm');
if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const err = document.getElementById('loginError');
    const btn = document.getElementById('loginBtn');
    if (err) { err.hidden = true; err.textContent = ''; }
    if (btn) { btn.disabled = true; btn.textContent = 'Connexion…'; }
    try {
      const r = await fetch(API + '/api/auth/login', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: document.getElementById('email').value.trim(),
          password: document.getElementById('password').value
        })
      });
      const text = await r.text();
      let j = {};
      try { j = JSON.parse(text); } catch (_e) {}
      if (text.includes('Missing traffic access token') || text.includes('e2b-traffic-access-token')) {
        throw new Error('Accès bloqué par E2B — ouvrez l’admin via le panneau “Live Preview” d’Arena.');
      }
      if (!r.ok) throw new Error(j.error || 'Identifiants invalides (' + r.status + ')');
      if (!j.token) throw new Error('Réponse serveur invalide');
      persistAuth(j.token, j.user || { email: document.getElementById('email').value.trim(), role: 'admin', name: 'Administrateur' });
      const pwdEl = document.getElementById('password');
      if (pwdEl) pwdEl.value = '';
      showAppShell();
      await router();
    } catch (e2) {
      console.error('[admin] login error:', e2);
      if (err) { err.textContent = e2.message; err.hidden = false; }
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = 'Se connecter'; }
    }
  });
}

document.getElementById('logoutBtn').onclick = () => { logoutAndShowLogin(); };

const NAV = [
  { id:'dashboard', label:'Tableau de bord', icon:'◧' },
  { id:'reservations', label:'Réservations', icon:'◷', group:'Activité' },
  { id:'messages', label:'Messages', icon:'✉', group:'Activité' },
  { id:'medias', label:'Médias', icon:'▭', group:'Activité' },
  { id:'site', label:'Cabinet & coordonnées', icon:'⌖', group:'Site' },
  { id:'navigation', label:'Navigation', icon:'≡', group:'Site' },
  { id:'expertises', label:'Pôles d’expertise', icon:'◆', group:'Contenu' },
  { id:'domaines', label:'Domaines (22)', icon:'⬔', group:'Contenu' },
  { id:'equipe', label:'Équipe', icon:'◐', group:'Contenu' },
  { id:'publications', label:'Publications', icon:'✎', group:'Contenu' },
  { id:'references', label:'Références', icon:'★', group:'Contenu' },
  { id:'settings', label:'Sécurité', icon:'⚙', group:'Système' },
];

function navHTML(active){
  let html=''; let lastGroup='';
  for(const it of NAV){
    if(it.group!==lastGroup){ html+=`<div class="nav-group"><div class="nav-group__title">${it.group}</div></div>`; lastGroup=it.group; }
    const cls = it.id===active ? 'nav-link is-active' : 'nav-link';
    const badge = it.id==='messages'
      ? `<span class="badge" id="msgBadge" style="display:none">0</span>`
      : it.id==='reservations'
        ? `<span class="badge" id="resvBadge" style="display:none">0</span>`
        : '';
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
  opts.credentials = 'include';
  opts.headers = authHeaders(opts.headers || {});
  if(opts.body && typeof opts.body==='object' && !(opts.body instanceof FormData)) {
    opts.headers['Content-Type']='application/json';
    opts.body=JSON.stringify(opts.body);
  }
  return fetch(API+path, opts).then(async r=>{
    const j = await r.json().catch(()=>({}));
    if (r.status === 401 && j && j.code === 'JA_AUTH_INVALID') {
      logoutAndShowLogin();
      throw new Error(j.error || 'Session expirée — reconnectez-vous.');
    }
    if(!r.ok) throw new Error(j.error||r.statusText);
    return j;
  });
}

async function loadCMS(){
  try {
    CMS = await api('/api/cms');
    safeSet(window.localStorage, 'ja_cms_cache', JSON.stringify(CMS));
  } catch(e){
    const cached = safeGet(window.localStorage, 'ja_cms_cache');
    if (cached) {
      try { CMS = JSON.parse(cached); console.warn('[admin] using cached CMS', e.message); }
      catch(_e2){ CMS = null; }
    }
    if (!CMS) throw e;
  }
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
    const rb = document.getElementById('resvBadge');
    if(rb){
      if(stats.reservationsPending>0){ rb.textContent=stats.reservationsPending; rb.style.display='inline-flex'; }
      else rb.style.display='none';
    }
  }catch(e){}
}

function setActive(id){
  document.getElementById('nav').innerHTML = navHTML(id);
  updateBadge();
}

async function router(){
  const hash = location.hash.replace('#','') || 'dashboard';
  setActive(hash);
  saveBtn.style.display='none';
  try{
    if(!CMS) await loadCMS();
    if(hash==='dashboard') await viewDashboard();
    else if(hash==='reservations') await viewReservations();
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
  let stats = null;
  try { stats = await api('/api/stats'); }
  catch(e){
    console.warn('[admin] stats failed', e);
    let cachedCms = {};
    try { cachedCms = JSON.parse(safeGet(window.localStorage, 'ja_cms_cache') || '{}'); } catch (_e) {}
    const cms = CMS || cachedCms;
    stats = {
      pages: 43,
      team: cms.team?.length || 4,
      publications: cms.publications?.length || 2,
      messages: 0, messagesNew: 0,
      media: 0,
      pillars: cms.pillars?.length || 4,
      practices: cms.practices ? Object.values(cms.practices).flat().length : 22,
      clients: cms.clients?.length || 12,
      site: cms.site || { SITE_URL:'', ADDRESS_1:'', ADDRESS_2:'', EMAIL:'', PHONE_MAIN:'' }
    };
  }
  main.innerHTML = `
    <div class="stat-row">
      <div class="stat"><b>${stats.reservations ?? 0} <small style="color:var(--gold)">(${stats.reservationsPending ?? 0} en attente)</small></b><span>Rendez-vous (${stats.reservationsToday ?? 0} aujourd’hui)</span></div>
      <div class="stat"><b>${stats.messages ?? 0} <small style="color:var(--gold)">(${stats.messagesNew ?? 0} nouveaux)</small></b><span>Messages de contact</span></div>
      <div class="stat"><b>${stats.pages ?? 44}</b><span>Pages statiques</span></div>
      <div class="stat"><b>${stats.team ?? 4}</b><span>Avocats associés</span></div>
    </div>
    <div class="grid grid--2" style="margin-top:16px">
      ${card('Raccourcis', 'Actions fréquentes', `
        <div style="display:flex;flex-wrap:wrap;gap:10px">
          <a class="btn btn--primary btn--sm" href="#reservations">Gérer les rendez-vous</a>
          <a class="btn btn--ghost btn--sm" href="#messages">Voir les messages</a>
          <a class="btn btn--ghost btn--sm" href="#equipe">Gérer l’équipe</a>
          <a class="btn btn--ghost btn--sm" href="#publications">Publier un article</a>
          <a class="btn btn--ghost btn--sm" href="../rendez-vous.html" target="_blank">↗ Page RDV publique</a>
        </div>
        <div class="divider"></div>
        <p class="kpi">Site : <b>${hEsc(stats.site?.SITE_URL||'')}</b> — Cabinet : ${hEsc(stats.site?.ADDRESS_1||'')} ${hEsc(stats.site?.ADDRESS_2||'')}</p>
        <p class="kpi">Email : ${hEsc(stats.site?.EMAIL||'')} — Tél : ${hEsc(stats.site?.PHONE_MAIN||'')} / ${hEsc(stats.site?.PHONE_2||'')}</p>
      `)}
      ${card('Comment ça marche', 'Architecture éditoriale & réservations', `
        <ol style="margin:0;padding-left:18px;font-size:.9rem;line-height:1.7">
          <li>Les clients planifient ou gèrent leurs consultations sur <code>rendez-vous.html</code>.</li>
          <li>Pilotez les demandes, créneaux bloqués, liens visio et horaires dans <b>Réservations</b>.</li>
          <li>Modifiez le contenu éditorial puis cliquez sur <b>⟳ Reconstruire le site</b> (${stats.pages ?? 44} pages).</li>
        </ol>
        <div class="alert alert--info" style="margin-top:12px">Les rendez-vous et disponibilités sont enregistrés en temps réel dans <code>data/reservations.json</code> et <code>data/reservation-settings.json</code>.</div>
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
    const r = await fetch('/api/media/upload', { method:'POST', credentials:'include', headers: authHeaders(), body: fd });
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
      <p class="kpi">Connecté en tant que <b>${hEsc(user?.email || 'admin@jurisaffaires.tn')}</b> — rôle <b>${hEsc(user?.role || 'admin')}</b></p>
      <p class="kpi">Session sécurisée active — déconnexion via le bouton en bas de la barre latérale.</p>
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
    rebuildStatus.textContent='✔ Rebuild OK'; toast('Site reconstruit — 44 pages régénérées');
    rebuildStatus.style.color='var(--green)';
    setTimeout(()=> rebuildStatus.textContent='', 4000);
  }catch(e){ rebuildStatus.textContent='✘ '+e.message; rebuildStatus.style.color='var(--danger)'; toast(e.message,'error'); }
  finally{ rebuildBtn.disabled=false; rebuildBtn.textContent='⟳ Reconstruire le site'; }
};

// ================================================================ MODULE RÉSERVATIONS
const RESV_STATE = {
  tab: 'list', // 'list' | 'agenda' | 'new' | 'settings'
  items: [],
  config: null,
  settings: null,
  editingId: null,
  prefill: null,
  agendaDate: '',
  filters: { q:'', status:'all', lawyerSlug:'all', mode:'all', date:'' }
};

const RESV_STATUS_LABELS = {
  pending: 'En attente',
  confirmed: 'Confirmé',
  completed: 'Effectué',
  cancelled: 'Annulé',
  no_show: 'Absent'
};
const RESV_URGENCY_LABELS = {
  normal: 'Normal',
  prioritaire: 'Prioritaire',
  urgent: 'Urgence contentieuse'
};
const RESV_MODE_LABELS = {
  cabinet: 'Au cabinet',
  visio: 'Visioconférence',
  telephone: 'Téléphone'
};
const RESV_DAY_LABELS = {
  '1': 'Lundi', '2': 'Mardi', '3': 'Mercredi', '4': 'Jeudi',
  '5': 'Vendredi', '6': 'Samedi', '0': 'Dimanche'
};

function resvTodayISO() {
  try {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Tunis', year:'numeric', month:'2-digit', day:'2-digit' }).format(new Date());
  } catch (_e) {
    return new Date().toISOString().slice(0, 10);
  }
}

function resvShiftISO(iso, delta) {
  const [y, m, d] = (iso || resvTodayISO()).split('-').map(Number);
  const dt = new Date(y, m - 1, d + delta);
  const pad = (n) => String(n).padStart(2, '0');
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;
}

function resvAddMinutes(hhmm, mins) {
  const [h, m] = String(hhmm || '09:00').split(':').map(Number);
  const tot = h * 60 + m + (Number(mins) || 45);
  return `${String(Math.floor(tot / 60)).padStart(2, '0')}:${String(tot % 60).padStart(2, '0')}`;
}

function resvGenDaySlots(settings, dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dow = String(new Date(y, m - 1, d).getDay());
  const dayCfg = settings?.schedule?.[dow];
  if (!dayCfg || !dayCfg.open) return [];
  const dur = Math.max(15, Number(settings.slotDuration || 45));
  const step = Math.max(15, dur + Number(settings.bufferMinutes ?? 15));
  const out = [];
  for (const [s, e] of (dayCfg.ranges || [])) {
    const [sh, sm] = s.split(':').map(Number);
    const [eh, em] = e.split(':').map(Number);
    const startMin = sh * 60 + sm, endMin = eh * 60 + em;
    for (let t = startMin; t + dur <= endMin; t += step) {
      out.push(`${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`);
    }
  }
  return out;
}

async function loadReservationsData() {
  const [listRes, cfgRes, setRes] = await Promise.all([
    api('/api/reservations/admin/list'),
    api('/api/reservations/config'),
    api('/api/reservations/admin/settings')
  ]);
  RESV_STATE.items = Array.isArray(listRes) ? listRes : (listRes.items || []);
  RESV_STATE.config = cfgRes;
  RESV_STATE.settings = setRes;
  if (!RESV_STATE.agendaDate) RESV_STATE.agendaDate = resvTodayISO();
  updateBadge();
}

async function viewReservations() {
  titleEl.textContent = 'Gestion des réservations';
  saveBtn.style.display = 'none';
  await loadReservationsData();
  renderReservationsModule();
}

function renderReservationsModule() {
  const items = RESV_STATE.items;
  const today = resvTodayISO();
  const counts = {
    total: items.length,
    pending: items.filter(x => x.status === 'pending').length,
    confirmed: items.filter(x => x.status === 'confirmed').length,
    today: items.filter(x => x.date === today && x.status !== 'cancelled').length,
    cancelled: items.filter(x => x.status === 'cancelled').length
  };

  let tabContent = '';
  if (RESV_STATE.tab === 'list') tabContent = renderResvListTab();
  else if (RESV_STATE.tab === 'agenda') tabContent = renderResvAgendaTab();
  else if (RESV_STATE.tab === 'new') tabContent = renderResvNewTab();
  else if (RESV_STATE.tab === 'settings') tabContent = renderResvSettingsTab();

  main.innerHTML = `
    <div class="stat-row" style="margin-bottom:16px">
      <div class="stat"><b>${counts.total}</b><span>Total demandes</span></div>
      <div class="stat"><b style="color:#9A6700">${counts.pending}</b><span>En attente de validation</span></div>
      <div class="stat"><b style="color:#185B37">${counts.confirmed}</b><span>Confirmés</span></div>
      <div class="stat"><b>${counts.today}</b><span>Prévu(s) aujourd’hui (${hEsc(today)})</span></div>
    </div>

    <div class="subtabs" id="resvSubtabs">
      <button type="button" class="subtab${RESV_STATE.tab==='list'?' is-active':''}" data-rtab="list">Demandes &amp; Liste (${counts.total})</button>
      <button type="button" class="subtab${RESV_STATE.tab==='agenda'?' is-active':''}" data-rtab="agenda">Agenda &amp; Créneaux bloqués</button>
      <button type="button" class="subtab${RESV_STATE.tab==='new'?' is-active':''}" data-rtab="new">+ Nouveau rendez-vous</button>
      <button type="button" class="subtab${RESV_STATE.tab==='settings'?' is-active':''}" data-rtab="settings">Paramètres &amp; Horaires</button>
    </div>

    ${tabContent}
  `;

  bindReservationsEvents();
}

function renderResvEditDrawer(item) {
  if (!item) return '';
  const lawyers = RESV_STATE.config?.lawyers || [];
  const poles = RESV_STATE.config?.poles || [];
  return `
    <div class="resv-drawer" id="resvEditDrawer">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:12px;flex-wrap:wrap">
        <div>
          <span class="tag tag--${hEsc(item.status === 'no_show' ? 'cancelled' : item.status)}">${RESV_STATUS_LABELS[item.status] || item.status}</span>
          <strong style="margin-left:8px;font-size:1.02rem">Réf. ${hEsc(item.ref)} — ${hEsc(item.nom)}</strong>
          ${item.societe ? `<span class="kpi"> (${hEsc(item.societe)})</span>` : ''}
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <a class="btn btn--ghost btn--sm" href="/api/reservations/${encodeURIComponent(item.ref)}/ics" target="_blank">Calendrier (.ics)</a>
          <button type="button" class="btn btn--ghost btn--sm" id="resvCloseDrawer">Fermer ✕</button>
        </div>
      </div>
      <form id="resvEditForm" class="form-grid">
        <div class="grid grid--3">
          <label>Statut
            <select id="ed_status">
              ${Object.entries(RESV_STATUS_LABELS).map(([k,v]) => `<option value="${k}"${item.status===k?' selected':''}>${v}</option>`).join('')}
            </select>
          </label>
          <label>Avocat assigné
            <select id="ed_lawyer">
              ${lawyers.map(l => `<option value="${hEsc(l.slug)}"${item.lawyerSlug===l.slug?' selected':''}>${hEsc(l.name)}</option>`).join('')}
            </select>
          </label>
          <label>Format d’entretien
            <select id="ed_mode">
              ${Object.entries(RESV_MODE_LABELS).map(([k,v]) => `<option value="${k}"${item.mode===k?' selected':''}>${v}</option>`).join('')}
            </select>
          </label>
        </div>
        <div class="grid grid--3">
          <label>Date du rendez-vous
            <input type="date" id="ed_date" value="${hEsc(item.date)}" required>
          </label>
          <label>Heure (HH:MM)
            <input type="time" id="ed_time" value="${hEsc(item.time)}" required>
          </label>
          <label>Pôle d’expertise
            <select id="ed_pole">
              ${poles.map(p => `<option value="${hEsc(p.title)}"${item.pole===p.title?' selected':''}>${hEsc(p.title)}</option>`).join('')}
            </select>
          </label>
        </div>
        <div class="grid grid--2">
          <label>Note visible par le client (ex. lien Google Meet / Teams, salle, pièces à apporter)
            <textarea id="ed_publicNote" placeholder="Affichée au client dans l’espace Suivre mon rendez-vous…">${hEsc(item.publicNote || '')}</textarea>
          </label>
          <label>Note confidentielle interne (secrétariat &amp; associés uniquement)
            <textarea id="ed_internalNote" placeholder="Contexte interne, conflit d’intérêts vérifié, cotation…">${hEsc(item.internalNote || '')}</textarea>
          </label>
        </div>
        <div class="kpi">
          <b>Priorité :</b> ${hEsc(RESV_URGENCY_LABELS[item.urgency] || item.urgency || 'Normale')}<br>
          <b>Exposé du dossier :</b> ${hEsc(item.message || 'Aucun détail complémentaire.')}<br>
          <b>Contact :</b> <a href="mailto:${hEsc(item.email)}">${hEsc(item.email)}</a> · <a href="tel:${hEsc(item.tel)}">${hEsc(item.tel)}</a> · Créé le ${hEsc(new Date(item.createdAt).toLocaleString('fr-FR'))}
        </div>
        <div style="display:flex;gap:10px;flex-wrap:wrap">
          <button type="submit" class="btn btn--primary btn--sm">Enregistrer les modifications</button>
          <button type="button" class="btn btn--ghost btn--sm" id="ed_deleteBtn" style="color:var(--danger)">Supprimer définitivement</button>
        </div>
      </form>
    </div>
  `;
}

function getFilteredReservations() {
  const f = RESV_STATE.filters;
  const q = (f.q || '').trim().toLowerCase();
  return RESV_STATE.items.filter(it => {
    if (f.status !== 'all' && it.status !== f.status) return false;
    if (f.lawyerSlug !== 'all' && it.lawyerSlug !== f.lawyerSlug) return false;
    if (f.mode !== 'all' && it.mode !== f.mode) return false;
    if (f.date && it.date !== f.date) return false;
    if (q) {
      const hay = `${it.ref} ${it.nom} ${it.email} ${it.tel} ${it.societe} ${it.pole} ${it.lawyerName} ${it.message}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

function renderResvListTab() {
  const f = RESV_STATE.filters;
  const lawyers = RESV_STATE.config?.lawyers || [];
  const filtered = getFilteredReservations();
  const editingItem = RESV_STATE.editingId ? RESV_STATE.items.find(x => x.id === RESV_STATE.editingId) : null;

  const rowsHtml = filtered.length ? filtered.map(it => `
    <tr>
      <td>
        <b style="font-family:monospace;font-size:.86rem">${hEsc(it.ref)}</b><br>
        <span class="tag tag--${hEsc(it.status === 'no_show' ? 'cancelled' : it.status)}" style="margin-top:4px">${RESV_STATUS_LABELS[it.status] || it.status}</span>
      </td>
      <td>
        <b>${hEsc(it.date)}</b><br>
        <span class="kpi">${hEsc(it.time)} – ${hEsc(resvAddMinutes(it.time, it.duration || 45))}</span>
      </td>
      <td>
        <b>${hEsc(it.nom)}</b>${it.societe ? `<br><span class="kpi">${hEsc(it.societe)}</span>` : ''}<br>
        <a href="mailto:${hEsc(it.email)}" class="kpi">${hEsc(it.email)}</a> · <a href="tel:${hEsc(it.tel)}" class="kpi">${hEsc(it.tel)}</a>
      </td>
      <td>
        <b>${hEsc(it.lawyerName || 'Orientation par le cabinet')}</b><br>
        <span class="kpi">${hEsc(it.pole || '')}</span><br>
        <span class="chip" style="margin-top:3px">${hEsc(RESV_MODE_LABELS[it.mode] || it.mode)}</span>
      </td>
      <td style="max-width:250px">
        <div style="font-weight:500">${hEsc((it.message || '—').slice(0, 110))}${(it.message || '').length > 110 ? '…' : ''}</div>
        ${it.urgency && it.urgency !== 'normal' ? `<div class="kpi" style="color:#9A6700;margin-top:2px">⚡ ${hEsc(RESV_URGENCY_LABELS[it.urgency] || it.urgency)}</div>` : ''}
        ${it.publicNote ? `<div class="kpi" style="color:#185B37;margin-top:3px">✓ Note client jointe</div>` : ''}
      </td>
      <td>
        <div style="display:flex;gap:6px;flex-wrap:wrap">
          ${it.status === 'pending' ? `<button type="button" class="btn btn--primary btn--sm" data-quick-status="${hEsc(it.id)}:confirmed">✓ Confirmer</button>` : ''}
          ${it.status === 'confirmed' ? `<button type="button" class="btn btn--ghost btn--sm" data-quick-status="${hEsc(it.id)}:completed">Effectué</button>` : ''}
          <button type="button" class="btn btn--ghost btn--sm" data-edit-resv="${hEsc(it.id)}">Gérer</button>
          ${it.status !== 'cancelled' ? `<button type="button" class="btn btn--ghost btn--sm" style="color:var(--danger)" data-quick-status="${hEsc(it.id)}:cancelled">Annuler</button>` : ''}
        </div>
      </td>
    </tr>
  `).join('') : `<tr><td colspan="6" class="empty">Aucun rendez-vous ne correspond aux filtres sélectionnés.</td></tr>`;

  return `
    ${renderResvEditDrawer(editingItem)}
    ${card('Demandes de consultation', 'Filtrez, confirmez, réaffectez ou ajoutez un lien de visioconférence', `
      <div class="toolbar">
        <input class="input" id="rf_q" placeholder="Rechercher (réf, nom, email, société…)" value="${hEsc(f.q)}" style="min-width:220px;flex:1">
        <select class="input" id="rf_status">
          <option value="all"${f.status==='all'?' selected':''}>Tous les statuts</option>
          ${Object.entries(RESV_STATUS_LABELS).map(([k,v]) => `<option value="${k}"${f.status===k?' selected':''}>${v}</option>`).join('')}
        </select>
        <select class="input" id="rf_lawyer">
          <option value="all"${f.lawyerSlug==='all'?' selected':''}>Tous les avocats</option>
          ${lawyers.map(l => `<option value="${hEsc(l.slug)}"${f.lawyerSlug===l.slug?' selected':''}>${hEsc(l.name)}</option>`).join('')}
        </select>
        <select class="input" id="rf_mode">
          <option value="all"${f.mode==='all'?' selected':''}>Tous formats</option>
          ${Object.entries(RESV_MODE_LABELS).map(([k,v]) => `<option value="${k}"${f.mode===k?' selected':''}>${v}</option>`).join('')}
        </select>
        <input class="input" type="date" id="rf_date" value="${hEsc(f.date)}">
        <button type="button" class="btn btn--ghost btn--sm" id="rf_reset">Réinitialiser</button>
        <button type="button" class="btn btn--ghost btn--sm" id="rf_csv">⬇ Export CSV</button>
      </div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Référence</th>
              <th>Date &amp; Heure</th>
              <th>Client</th>
              <th>Avocat &amp; Pôle</th>
              <th>Exposé / Note</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>${rowsHtml}</tbody>
        </table>
      </div>
    `)}
  `;
}

function renderResvAgendaTab() {
  const dateStr = RESV_STATE.agendaDate || resvTodayISO();
  const settings = RESV_STATE.settings || {};
  const lawyers = (RESV_STATE.config?.lawyers || []).filter(l => l.slug !== 'cabinet');
  const slots = resvGenDaySlots(settings, dateStr);
  const closedHoliday = (settings.blockedDates || []).includes(dateStr);
  const dayBlocks = (settings.blockedSlots || []).filter(b => b.date === dateStr);
  const dayBookings = RESV_STATE.items.filter(r => r.date === dateStr && r.status !== 'cancelled');

  let matrixHtml = '';
  if (closedHoliday) {
    matrixHtml = `<div class="alert alert--error" style="display:flex;justify-content:space-between;align-items:center;gap:12px">
      <span>Cette date (${hEsc(dateStr)}) est marquée comme <b>journée fermée exceptionnelle</b>.</span>
      <button type="button" class="btn btn--ghost btn--sm" id="ag_unblock_day">Rouvrir la journée</button>
    </div>`;
  } else if (!slots.length) {
    matrixHtml = `<div class="empty">Aucun créneau configuré pour ce jour de la semaine (${hEsc(dateStr)}). Vous pouvez ajuster les jours ouvrés dans l’onglet <b>Paramètres &amp; Horaires</b>.</div>`;
  } else {
    matrixHtml = `
      <div class="table-wrap agenda-grid">
        <table class="agenda-table">
          <thead>
            <tr>
              <th>Créneau</th>
              ${lawyers.map(l => `<th>${hEsc(l.name)}<br><span class="kpi" style="font-weight:400;text-transform:none">${hEsc(l.role)}</span></th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${slots.map(time => `
              <tr>
                <td>${hEsc(time)}</td>
                ${lawyers.map(l => {
                  const booked = dayBookings.find(b => b.time === time && b.lawyerSlug === l.slug);
                  const blocked = dayBlocks.find(b => b.time === time && (!b.lawyerSlug || b.lawyerSlug === '*' || b.lawyerSlug === l.slug));
                  if (booked) {
                    return `<td>
                      <div class="slot-cell ${booked.status==='pending'?'slot-cell--pending':'slot-cell--booked'}">
                        <b>${hEsc(booked.nom)}</b>
                        <span>${hEsc(booked.ref)} · ${hEsc(RESV_MODE_LABELS[booked.mode] || booked.mode)}</span>
                        <div class="slot-cell__actions">
                          <button type="button" class="slot-mini-btn" data-agenda-open="${hEsc(booked.id)}">Ouvrir</button>
                        </div>
                      </div>
                    </td>`;
                  }
                  if (blocked) {
                    return `<td>
                      <div class="slot-cell slot-cell--blocked">
                        <b>Indisponible</b>
                        <span>${hEsc(blocked.reason || 'Créneau bloqué')}</span>
                        <div class="slot-cell__actions">
                          <button type="button" class="slot-mini-btn" data-unblock="${hEsc(dateStr)}|${hEsc(blocked.time)}|${hEsc(blocked.lawyerSlug || l.slug)}">Débloquer</button>
                        </div>
                      </div>
                    </td>`;
                  }
                  return `<td>
                    <div class="slot-cell slot-cell--free">
                      <span class="muted">Disponible</span>
                      <div class="slot-cell__actions">
                        <button type="button" class="slot-mini-btn" data-book-slot="${hEsc(dateStr)}|${hEsc(time)}|${hEsc(l.slug)}">+ RDV</button>
                        <button type="button" class="slot-mini-btn" data-block-slot="${hEsc(dateStr)}|${hEsc(time)}|${hEsc(l.slug)}">Bloquer</button>
                      </div>
                    </div>
                  </td>`;
                }).join('')}
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  return card('Planning journalier par associé', 'Visualisez l’occupation en temps réel, réservez pour un client ou bloquez un créneau d’audience', `
    <div class="toolbar">
      <button type="button" class="btn btn--ghost btn--sm" id="ag_prev">◀ Jour préc.</button>
      <input type="date" class="input" id="ag_date" value="${hEsc(dateStr)}">
      <button type="button" class="btn btn--ghost btn--sm" id="ag_next">Jour suiv. ▶</button>
      <button type="button" class="btn btn--ghost btn--sm" id="ag_today">Aujourd’hui</button>
      ${!closedHoliday ? `<button type="button" class="btn btn--ghost btn--sm" id="ag_block_day" style="margin-left:auto">Fermer toute la journée (${hEsc(dateStr)})</button>` : ''}
    </div>
    ${matrixHtml}
  `);
}

function renderResvNewTab() {
  const pre = RESV_STATE.prefill || {};
  const lawyers = RESV_STATE.config?.lawyers || [];
  const poles = RESV_STATE.config?.poles || [];
  return card('Créer un rendez-vous (Secrétariat)', 'Saisie directe d’un entretien téléphonique, visio ou au cabinet', `
    <form id="resvNewForm" class="form-grid">
      <div class="grid grid--3">
        <label>Pôle d’expertise
          <select id="nw_pole">
            ${poles.map(p => `<option value="${hEsc(p.title)}">${hEsc(p.title)}</option>`).join('')}
          </select>
        </label>
        <label>Avocat assigné
          <select id="nw_lawyer">
            ${lawyers.map(l => `<option value="${hEsc(l.slug)}"${pre.lawyerSlug===l.slug?' selected':''}>${hEsc(l.name)}</option>`).join('')}
          </select>
        </label>
        <label>Format &amp; Statut initial
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
            <select id="nw_mode">
              <option value="cabinet">Au cabinet</option>
              <option value="visio">Visioconférence</option>
              <option value="telephone">Téléphone</option>
            </select>
            <select id="nw_status">
              <option value="confirmed">Confirmé</option>
              <option value="pending">En attente</option>
            </select>
          </div>
        </label>
      </div>
      <div class="grid grid--3">
        <label>Date du rendez-vous *
          <input type="date" id="nw_date" value="${hEsc(pre.date || resvTodayISO())}" required>
        </label>
        <label>Heure de début (HH:MM) *
          <input type="time" id="nw_time" value="${hEsc(pre.time || '10:00')}" required>
        </label>
        <label>Degré d’urgence
          <select id="nw_urgency">
            <option value="normal">Normal</option>
            <option value="prioritaire">Prioritaire</option>
            <option value="urgent">Urgence contentieuse</option>
          </select>
        </label>
      </div>
      <div class="grid grid--2">
        <label>Nom &amp; prénom du client *
          <input type="text" id="nw_nom" required placeholder="Ex. Karim Ben Salah">
        </label>
        <label>Société / Organisation
          <input type="text" id="nw_societe" placeholder="Ex. Groupe Industriel SA">
        </label>
      </div>
      <div class="grid grid--2">
        <label>Courriel *
          <input type="email" id="nw_email" required placeholder="client@entreprise.tn">
        </label>
        <label>Téléphone *
          <input type="tel" id="nw_tel" required placeholder="(+216) 71 000 000">
        </label>
      </div>
      <label>Objet / Exposé du dossier
        <textarea id="nw_message" placeholder="Ex. Audit contractuel / Pacte d’actionnaires"></textarea>
      </label>
      <div class="grid grid--2">
        <label>Note client / Lien Visioconférence
          <textarea id="nw_publicNote" placeholder="Lien Google Meet / Teams ou consignes d’accès…"></textarea>
        </label>
        <label>Note interne secrétariat
          <textarea id="nw_internalNote" placeholder="Observations internes confidentielles…"></textarea>
        </label>
      </div>
      <div>
        <button type="submit" class="btn btn--primary">Enregistrer le rendez-vous</button>
      </div>
    </form>
  `);
}

function renderResvSettingsTab() {
  const s = RESV_STATE.settings || {};
  const schedOrder = ['1', '2', '3', '4', '5', '6', '0'];
  const blockedDates = s.blockedDates || [];

  return card('Paramètres & Horaires d’ouverture', 'Contrôlez en temps réel les créneaux proposés sur rendez-vous.html', `
    <form id="resvSettingsForm" class="form-grid">
      <div class="grid grid--2">
        <label style="display:flex;align-items:center;gap:10px;padding:12px;border:1px solid var(--line-soft);border-radius:10px;background:#FCFBF8">
          <input type="checkbox" id="st_enabled" style="width:18px;height:18px" ${s.enabled !== false ? 'checked' : ''}>
          <span><b>Activer la prise de rendez-vous en ligne</b><br><span class="kpi">Décochez pour suspendre temporairement les nouvelles réservations web.</span></span>
        </label>
        <label style="display:flex;align-items:center;gap:10px;padding:12px;border:1px solid var(--line-soft);border-radius:10px;background:#FCFBF8">
          <input type="checkbox" id="st_autoConfirm" style="width:18px;height:18px" ${s.autoConfirm ? 'checked' : ''}>
          <span><b>Confirmation automatique immédiate</b><br><span class="kpi">Sinon, les demandes arrivent au statut « En attente » pour validation par le secrétariat.</span></span>
        </label>
      </div>

      <div class="grid grid--3">
        <label>Durée standard d’un créneau (minutes)
          <select id="st_duration">
            ${[30, 45, 60, 90].map(n => `<option value="${n}"${Number(s.slotDuration||45)===n?' selected':''}>${n} minutes</option>`).join('')}
          </select>
        </label>
        <label>Battement entre deux RDV (minutes)
          <select id="st_buffer">
            ${[0, 10, 15, 30].map(n => `<option value="${n}"${Number(s.bufferMinutes??15)===n?' selected':''}>${n} minutes</option>`).join('')}
          </select>
        </label>
        <label>Ouverture du calendrier (jours à l’avance)
          <input type="number" id="st_maxDays" min="7" max="180" value="${Number(s.maxAdvanceDays || 60)}">
        </label>
      </div>

      <div>
        <h3 style="font-size:.95rem;margin-bottom:8px">Plages horaires hebdomadaires (Heure de Tunis)</h3>
        <div style="border:1px solid var(--line-soft);border-radius:12px;overflow:hidden;background:#fff">
          ${schedOrder.map(d => {
            const dc = s.schedule?.[d] || { open: false, ranges: [] };
            const r1 = dc.ranges?.[0] || ['09:00', '12:30'];
            const r2 = dc.ranges?.[1] || ['', ''];
            return `
              <div class="sched-row">
                <b>${RESV_DAY_LABELS[d]}</b>
                <label style="display:flex;align-items:center;gap:6px;margin:0;font-weight:500">
                  <input type="checkbox" data-day-on="${d}" style="width:16px;height:16px" ${dc.open ? 'checked' : ''}> Ouvert
                </label>
                <div style="display:flex;align-items:center;gap:6px">
                  <span class="kpi">Matin</span>
                  <input type="time" data-day-m1="${d}" value="${hEsc(r1[0] || '')}" style="padding:6px 8px">
                  <span>–</span>
                  <input type="time" data-day-m2="${d}" value="${hEsc(r1[1] || '')}" style="padding:6px 8px">
                </div>
                <div style="display:flex;align-items:center;gap:6px">
                  <span class="kpi">Après-midi</span>
                  <input type="time" data-day-a1="${d}" value="${hEsc(r2[0] || '')}" style="padding:6px 8px">
                  <span>–</span>
                  <input type="time" data-day-a2="${d}" value="${hEsc(r2[1] || '')}" style="padding:6px 8px">
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>

      <div>
        <h3 style="font-size:.95rem;margin-bottom:8px">Jours fériés / fermetures exceptionnelles</h3>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px">
          <input type="date" class="input" id="st_addHolidayDate">
          <button type="button" class="btn btn--ghost btn--sm" id="st_addHolidayBtn">+ Ajouter une date fermée</button>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          ${blockedDates.length ? blockedDates.map(dt => `<span class="chip">${hEsc(dt)} <button type="button" data-rm-holiday="${hEsc(dt)}" style="border:0;background:none;cursor:pointer;font-weight:700;margin-left:6px">✕</button></span>`).join('') : '<span class="kpi">Aucune fermeture exceptionnelle enregistrée.</span>'}
        </div>
      </div>

      <div>
        <button type="submit" class="btn btn--primary">Enregistrer les paramètres de réservation</button>
      </div>
    </form>
  `);
}

function bindReservationsEvents() {
  document.querySelectorAll('[data-rtab]').forEach(btn => {
    btn.onclick = () => {
      RESV_STATE.tab = btn.getAttribute('data-rtab');
      if (RESV_STATE.tab !== 'new') RESV_STATE.prefill = null;
      renderReservationsModule();
    };
  });

  document.querySelectorAll('[data-quick-status]').forEach(btn => {
    btn.onclick = async () => {
      const [id, status] = btn.getAttribute('data-quick-status').split(':');
      if (status === 'cancelled' && !confirm('Confirmer l’annulation de ce rendez-vous ?')) return;
      try {
        await api(`/api/reservations/admin/${encodeURIComponent(id)}`, { method: 'PATCH', body: { status } });
        toast(`Statut mis à jour : ${RESV_STATUS_LABELS[status] || status}`);
        await loadReservationsData();
        renderReservationsModule();
      } catch (e) { toast(e.message, 'error'); }
    };
  });

  document.querySelectorAll('[data-edit-resv]').forEach(btn => {
    btn.onclick = () => {
      RESV_STATE.editingId = btn.getAttribute('data-edit-resv');
      renderReservationsModule();
      document.getElementById('resvEditDrawer')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };
  });

  const closeDrawer = document.getElementById('resvCloseDrawer');
  if (closeDrawer) closeDrawer.onclick = () => { RESV_STATE.editingId = null; renderReservationsModule(); };

  const editForm = document.getElementById('resvEditForm');
  if (editForm) {
    editForm.onsubmit = async (e) => {
      e.preventDefault();
      try {
        await api(`/api/reservations/admin/${encodeURIComponent(RESV_STATE.editingId)}`, {
          method: 'PATCH',
          body: {
            status: document.getElementById('ed_status').value,
            lawyerSlug: document.getElementById('ed_lawyer').value,
            mode: document.getElementById('ed_mode').value,
            date: document.getElementById('ed_date').value,
            time: document.getElementById('ed_time').value,
            pole: document.getElementById('ed_pole').value,
            publicNote: document.getElementById('ed_publicNote').value,
            internalNote: document.getElementById('ed_internalNote').value
          }
        });
        toast('Rendez-vous mis à jour');
        RESV_STATE.editingId = null;
        await loadReservationsData();
        renderReservationsModule();
      } catch (err) { toast(err.message, 'error'); }
    };
  }

  const delBtn = document.getElementById('ed_deleteBtn');
  if (delBtn) {
    delBtn.onclick = async () => {
      if (!confirm('Supprimer définitivement ce rendez-vous ?')) return;
      try {
        await api(`/api/reservations/admin/${encodeURIComponent(RESV_STATE.editingId)}`, { method: 'DELETE' });
        RESV_STATE.editingId = null;
        toast('Rendez-vous supprimé');
        await loadReservationsData();
        renderReservationsModule();
      } catch (err) { toast(err.message, 'error'); }
    };
  }

  const qEl = document.getElementById('rf_q');
  if (qEl) {
    const applyFilter = () => {
      RESV_STATE.filters.q = document.getElementById('rf_q').value;
      RESV_STATE.filters.status = document.getElementById('rf_status').value;
      RESV_STATE.filters.lawyerSlug = document.getElementById('rf_lawyer').value;
      RESV_STATE.filters.mode = document.getElementById('rf_mode').value;
      RESV_STATE.filters.date = document.getElementById('rf_date').value;
      renderReservationsModule();
    };
    qEl.onchange = applyFilter;
    qEl.onkeyup = (ev) => { if (ev.key === 'Enter') applyFilter(); };
    ['rf_status', 'rf_lawyer', 'rf_mode', 'rf_date'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.onchange = applyFilter;
    });
    document.getElementById('rf_reset').onclick = () => {
      RESV_STATE.filters = { q:'', status:'all', lawyerSlug:'all', mode:'all', date:'' };
      renderReservationsModule();
    };
    document.getElementById('rf_csv').onclick = () => {
      const rows = getFilteredReservations();
      const header = ['Reference','Statut','Date','Heure','Client','Societe','Email','Telephone','Avocat','Pole','Format','Message'];
      const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
      const csv = [header.join(';'), ...rows.map(r => [
        r.ref, RESV_STATUS_LABELS[r.status] || r.status, r.date, r.time, r.nom, r.societe, r.email, r.tel, r.lawyerName, r.pole, RESV_MODE_LABELS[r.mode] || r.mode, r.message
      ].map(esc).join(';'))].join('\n');
      const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `reservations-jurisaffaires-${resvTodayISO()}.csv`;
      a.click();
    };
  }

  const agDate = document.getElementById('ag_date');
  if (agDate) {
    agDate.onchange = () => { RESV_STATE.agendaDate = agDate.value; renderReservationsModule(); };
    document.getElementById('ag_prev').onclick = () => { RESV_STATE.agendaDate = resvShiftISO(RESV_STATE.agendaDate, -1); renderReservationsModule(); };
    document.getElementById('ag_next').onclick = () => { RESV_STATE.agendaDate = resvShiftISO(RESV_STATE.agendaDate, 1); renderReservationsModule(); };
    document.getElementById('ag_today').onclick = () => { RESV_STATE.agendaDate = resvTodayISO(); renderReservationsModule(); };
    const blockDayBtn = document.getElementById('ag_block_day');
    if (blockDayBtn) {
      blockDayBtn.onclick = async () => {
        if (!confirm(`Fermer toute la journée du ${RESV_STATE.agendaDate} à la réservation en ligne ?`)) return;
        const blockedDates = Array.from(new Set([...(RESV_STATE.settings.blockedDates || []), RESV_STATE.agendaDate])).sort();
        await api('/api/reservations/admin/settings', { method: 'PUT', body: { blockedDates } });
        toast('Journée fermée');
        await loadReservationsData();
        renderReservationsModule();
      };
    }
    const unblockDayBtn = document.getElementById('ag_unblock_day');
    if (unblockDayBtn) {
      unblockDayBtn.onclick = async () => {
        const blockedDates = (RESV_STATE.settings.blockedDates || []).filter(d => d !== RESV_STATE.agendaDate);
        await api('/api/reservations/admin/settings', { method: 'PUT', body: { blockedDates } });
        toast('Journée rouverte');
        await loadReservationsData();
        renderReservationsModule();
      };
    }
  }

  document.querySelectorAll('[data-agenda-open]').forEach(btn => {
    btn.onclick = () => {
      RESV_STATE.editingId = btn.getAttribute('data-agenda-open');
      RESV_STATE.tab = 'list';
      renderReservationsModule();
    };
  });

  document.querySelectorAll('[data-book-slot]').forEach(btn => {
    btn.onclick = () => {
      const [date, time, lawyerSlug] = btn.getAttribute('data-book-slot').split('|');
      RESV_STATE.prefill = { date, time, lawyerSlug };
      RESV_STATE.tab = 'new';
      renderReservationsModule();
    };
  });

  document.querySelectorAll('[data-block-slot]').forEach(btn => {
    btn.onclick = async () => {
      const [date, time, lawyerSlug] = btn.getAttribute('data-block-slot').split('|');
      const reason = prompt('Motif d’indisponibilité (ex. Audience, Congé) :', 'Audience / indisponibilité');
      if (reason === null) return;
      const blockedSlots = [...(RESV_STATE.settings.blockedSlots || []), { date, time, lawyerSlug, reason }];
      await api('/api/reservations/admin/settings', { method: 'PUT', body: { blockedSlots } });
      toast(`Créneau ${time} bloqué`);
      await loadReservationsData();
      renderReservationsModule();
    };
  });

  document.querySelectorAll('[data-unblock]').forEach(btn => {
    btn.onclick = async () => {
      const [date, time, lawyerSlug] = btn.getAttribute('data-unblock').split('|');
      const blockedSlots = (RESV_STATE.settings.blockedSlots || []).filter(
        b => !(b.date === date && b.time === time && (b.lawyerSlug || '*') === (lawyerSlug || '*'))
      );
      await api('/api/reservations/admin/settings', { method: 'PUT', body: { blockedSlots } });
      toast('Créneau débloqué');
      await loadReservationsData();
      renderReservationsModule();
    };
  });

  const newForm = document.getElementById('resvNewForm');
  if (newForm) {
    newForm.onsubmit = async (e) => {
      e.preventDefault();
      try {
        const res = await api('/api/reservations/admin/create', {
          method: 'POST',
          body: {
            pole: document.getElementById('nw_pole').value,
            lawyerSlug: document.getElementById('nw_lawyer').value,
            mode: document.getElementById('nw_mode').value,
            status: document.getElementById('nw_status').value,
            urgency: document.getElementById('nw_urgency').value,
            date: document.getElementById('nw_date').value,
            time: document.getElementById('nw_time').value,
            nom: document.getElementById('nw_nom').value,
            societe: document.getElementById('nw_societe').value,
            email: document.getElementById('nw_email').value,
            tel: document.getElementById('nw_tel').value,
            message: document.getElementById('nw_message').value,
            publicNote: document.getElementById('nw_publicNote').value,
            internalNote: document.getElementById('nw_internalNote').value
          }
        });
        toast(`Rendez-vous créé (${res.reservation.ref})`);
        RESV_STATE.prefill = null;
        RESV_STATE.tab = 'list';
        await loadReservationsData();
        renderReservationsModule();
      } catch (err) { toast(err.message, 'error'); }
    };
  }

  const setForm = document.getElementById('resvSettingsForm');
  if (setForm) {
    document.getElementById('st_addHolidayBtn').onclick = async () => {
      const dt = document.getElementById('st_addHolidayDate').value;
      if (!dt) return toast('Sélectionnez une date', 'error');
      const blockedDates = Array.from(new Set([...(RESV_STATE.settings.blockedDates || []), dt])).sort();
      await api('/api/reservations/admin/settings', { method: 'PUT', body: { blockedDates } });
      toast(`Fermeture ajoutée : ${dt}`);
      await loadReservationsData();
      renderReservationsModule();
    };
    document.querySelectorAll('[data-rm-holiday]').forEach(btn => {
      btn.onclick = async () => {
        const dt = btn.getAttribute('data-rm-holiday');
        const blockedDates = (RESV_STATE.settings.blockedDates || []).filter(x => x !== dt);
        await api('/api/reservations/admin/settings', { method: 'PUT', body: { blockedDates } });
        toast(`Fermeture retirée : ${dt}`);
        await loadReservationsData();
        renderReservationsModule();
      };
    });
    setForm.onsubmit = async (e) => {
      e.preventDefault();
      const schedule = {};
      for (const d of ['0','1','2','3','4','5','6']) {
        const open = document.querySelector(`[data-day-on="${d}"]`).checked;
        const m1 = document.querySelector(`[data-day-m1="${d}"]`).value;
        const m2 = document.querySelector(`[data-day-m2="${d}"]`).value;
        const a1 = document.querySelector(`[data-day-a1="${d}"]`).value;
        const a2 = document.querySelector(`[data-day-a2="${d}"]`).value;
        const ranges = [];
        if (m1 && m2 && m1 < m2) ranges.push([m1, m2]);
        if (a1 && a2 && a1 < a2) ranges.push([a1, a2]);
        schedule[d] = { open: open && ranges.length > 0, ranges };
      }
      try {
        await api('/api/reservations/admin/settings', {
          method: 'PUT',
          body: {
            enabled: document.getElementById('st_enabled').checked,
            autoConfirm: document.getElementById('st_autoConfirm').checked,
            slotDuration: Number(document.getElementById('st_duration').value),
            bufferMinutes: Number(document.getElementById('st_buffer').value),
            maxAdvanceDays: Number(document.getElementById('st_maxDays').value),
            schedule
          }
        });
        toast('Paramètres de réservation enregistrés');
        await loadReservationsData();
        renderReservationsModule();
      } catch (err) { toast(err.message, 'error'); }
    };
  }
}

// Router + burger + session bootstrap
window.addEventListener('hashchange', () => {
  if (appShell && !appShell.hidden) router();
});
document.getElementById('nav').addEventListener('click', (e) => {
  if (e.target.closest('a')) document.getElementById('sidebar').classList.remove('is-open');
});
document.getElementById('burger').onclick = () => document.getElementById('sidebar').classList.toggle('is-open');

async function bootAdmin() {
  if (token) {
    showAppShell();
    router();
    try {
      const r = await fetch(API + '/api/auth/me', {
        credentials: 'include',
        headers: authHeaders()
      });
      const j = await r.json().catch(() => ({}));
      if (r.status === 401 && j && j.code === 'JA_AUTH_INVALID') {
        await logoutAndShowLogin();
        return;
      }
      if (r.ok && j && j.email) {
        persistAuth(token, j);
        syncUserUI();
      }
    } catch (e) {
      console.warn('[admin] verification warning:', e);
    }
    return;
  }

  // No client-stored token yet: check if server HttpOnly cookie session is active
  try {
    const r = await fetch(API + '/api/auth/me', { credentials: 'include' });
    const j = await r.json().catch(() => ({}));
    if (r.ok && j && j.email) {
      user = j;
      showAppShell();
      await router();
      return;
    }
  } catch (e) {}

  showLoginScreen();
}

bootAdmin();
