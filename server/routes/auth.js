const express = require('express');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const router = express.Router();
const DATA_DIR = path.join(__dirname,'..','..','data');
const JWT_SECRET = process.env.JWT_SECRET || 'jurisaffaires-jwt-secret-2026';

function readUsers(){
  try { return JSON.parse(fs.readFileSync(path.join(DATA_DIR,'users.json'),'utf-8')); } catch(e){ return []; }
}
function writeUsers(users){
  fs.writeFileSync(path.join(DATA_DIR,'users.json'), JSON.stringify(users,null,2), 'utf-8');
}

router.post('/login', async (req,res)=>{
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'Email et mot de passe requis.' });
  const users = readUsers();
  const user = users.find(u=>u.email.toLowerCase()===String(email).toLowerCase());
  if (!user) return res.status(401).json({ error: 'Identifiants invalides.' });
  const ok = await bcrypt.compare(String(password), user.passwordHash);
  if (!ok) return res.status(401).json({ error: 'Identifiants invalides.' });
  const token = jwt.sign({ id:user.id, email:user.email, role:user.role }, JWT_SECRET, { expiresIn:'12h' });
  res.json({ token, user:{ id:user.id, email:user.email, role:user.role, name:user.name } });
});

router.get('/me', require('../middleware/auth')(true), (req,res)=>{
  const users = readUsers();
  const u = users.find(x=>x.id===req.user.id);
  if (!u) return res.status(404).json({ error:'Utilisateur introuvable' });
  res.json({ id:u.id, email:u.email, role:u.role, name:u.name });
});

router.put('/password', require('../middleware/auth')(true), async (req,res)=>{
  const { currentPassword, newPassword } = req.body || {};
  if (!newPassword || String(newPassword).length < 8) return res.status(400).json({ error:'Le nouveau mot de passe doit contenir au moins 8 caractères.' });
  const users = readUsers();
  const idx = users.findIndex(u=>u.id===req.user.id);
  if (idx===-1) return res.status(404).json({ error:'Utilisateur introuvable' });
  const ok = await bcrypt.compare(String(currentPassword||''), users[idx].passwordHash);
  if (!ok) return res.status(401).json({ error:'Mot de passe actuel incorrect.' });
  users[idx].passwordHash = await bcrypt.hash(String(newPassword), 10);
  writeUsers(users);
  res.json({ ok:true });
});

router.get('/users', require('../middleware/auth')(true), (req,res)=>{
  const users = readUsers();
  res.json(users.map(u=>({ id:u.id, email:u.email, role:u.role, name:u.name, createdAt:u.createdAt })));
});

module.exports = router;
