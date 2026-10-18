const express = require('express');
const fs = require('fs');
const path = require('path');
const auth = require('../middleware/auth');

const router = express.Router();
const ROOT = path.join(__dirname,'..','..');
const MSG_PATH = path.join(ROOT,'data','messages.json');

function readMsgs(){
  try { const d=JSON.parse(fs.readFileSync(MSG_PATH,'utf-8')); return Array.isArray(d)?d:[]; } catch(e){ return []; }
}
function writeMsgs(arr){
  fs.writeFileSync(MSG_PATH, JSON.stringify(arr,null,2)+'\n','utf-8');
}

// Public: submit contact form
router.post('/', (req,res)=>{
  const { nom, societe, email, tel, sujet, message } = req.body || {};
  const errors=[];
  if (!nom || String(nom).trim().length<2) errors.push('Nom requis (≥2 car.)');
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email))) errors.push('Email invalide');
  if (!sujet) errors.push('Sujet requis');
  if (!message || String(message).trim().length<10) errors.push('Message ≥10 car.');
  if (tel && String(tel).replace(/\D/g,'').length>0 && String(tel).replace(/\D/g,'').length<8) errors.push('Téléphone invalide');
  if (errors.length) return res.status(400).json({ error: errors.join(' — ') });

  const msgs = readMsgs();
  const entry = {
    id: Date.now().toString(36)+Math.random().toString(36).slice(2,6),
    nom: String(nom).trim(),
    societe: String(societe||'').trim(),
    email: String(email).trim().toLowerCase(),
    tel: String(tel||'').trim(),
    sujet: String(sujet).trim(),
    message: String(message).trim(),
    createdAt: new Date().toISOString(),
    status: 'new', // new | read | archived | replied
    ip: req.ip
  };
  msgs.unshift(entry);
  writeMsgs(msgs);
  res.json({ ok:true, id: entry.id });
});

// Protected: list
router.get('/', auth(true), (req,res)=>{
  const msgs = readMsgs();
  const { status, q } = req.query;
  let out = msgs;
  if (status) out = out.filter(m=>m.status===status);
  if (q) {
    const qq = String(q).toLowerCase();
    out = out.filter(m=> (m.nom+m.email+m.sujet+m.message).toLowerCase().includes(qq));
  }
  res.json(out);
});

router.get('/:id', auth(true), (req,res)=>{
  const msgs = readMsgs();
  const m = msgs.find(x=>x.id===req.params.id);
  if (!m) return res.status(404).json({ error:'Message introuvable' });
  res.json(m);
});

router.patch('/:id', auth(true), (req,res)=>{
  const msgs = readMsgs();
  const idx = msgs.findIndex(x=>x.id===req.params.id);
  if (idx===-1) return res.status(404).json({ error:'Message introuvable' });
  const allowed = ['status'];
  for (const k of allowed) if (k in req.body) msgs[idx][k]=req.body[k];
  msgs[idx].updatedAt = new Date().toISOString();
  writeMsgs(msgs);
  res.json({ ok:true, message: msgs[idx] });
});

router.delete('/:id', auth(true), (req,res)=>{
  let msgs = readMsgs();
  const before = msgs.length;
  msgs = msgs.filter(x=>x.id!==req.params.id);
  if (msgs.length===before) return res.status(404).json({ error:'Message introuvable' });
  writeMsgs(msgs);
  res.json({ ok:true });
});

router.delete('/', auth(true), (req,res)=>{
  // bulk delete via ?ids=a,b
  const ids = String(req.query.ids||'').split(',').filter(Boolean);
  if (!ids.length) return res.status(400).json({ error:'ids requis' });
  let msgs = readMsgs();
  msgs = msgs.filter(m=>!ids.includes(m.id));
  writeMsgs(msgs);
  res.json({ ok:true });
});

module.exports = router;
