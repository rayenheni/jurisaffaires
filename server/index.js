require('dotenv').config();
const express = require('express');
const path = require('path');
const fs = require('fs');
const helmet = require('helmet');
const compression = require('compression');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const ROOT = path.join(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'data');
const PUBLIC_DIR = ROOT;

const app = express();
const PORT = process.env.PORT || 3000;

// Trust proxy for rate-limit behind reverse proxy
app.set('trust proxy', 1);

app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
  frameguard: false,
  crossOriginOpenerPolicy: false,
  crossOriginResourcePolicy: false,
}));
app.use(cors({
  origin: true,
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Admin-Token']
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Compression à la volée : sans elle, style.min.css (121 Ko) et les pages
// HTML partaient en clair sur 4G mobile. Les hôtes statiques (Vercel, CDN)
// compressent déjà ; ce middleware couvre l'auto-hébergement Node.
app.use(compression({ threshold: 1024 }));

app.use('/api', (req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  res.on('finish', () => {
    console.log(`[api] ${req.method} ${req.originalUrl} -> ${res.statusCode}`);
  });
  next();
});

// Rate limit login
const loginLimiter = rateLimit({ windowMs: 15*60*1000, max: 50, standardHeaders: true });

// Serve admin static assets first with no-store so updates take effect immediately
app.use('/admin', express.static(path.join(ROOT, 'admin'), {
  index: 'index.html',
  setHeaders(res) {
    res.setHeader('Cache-Control', 'no-store');
  }
}));

// Serve public site (static)
// Politique de cache
//  - polices, images et fichiers de style/script : noms (ou ?v=empreinte)
//    uniques par version -> un an, immuable. C'est ce qui supprime les
//    allers-retours de revalidation qui plombaient le LCP au 2e chargement.
//  - pages HTML : revalidation systématique pour publier immédiatement.
const IMMUTABLE = 'public, max-age=31536000, immutable';
app.use(express.static(PUBLIC_DIR, {
  extensions: ['html'],
  index: 'index.html',
  setHeaders(res, filePath) {
    if (/\.(?:woff2|webp|avif|jpe?g|png|svg)$/i.test(filePath)) {
      res.setHeader('Cache-Control', IMMUTABLE);
    } else if (/assets[\\/](?:css|js)[\\/].*\.(?:css|js)$/i.test(filePath)) {
      // Toutes les références portent ?v=<empreinte> (voir tools/build_pages.py).
      res.setHeader('Cache-Control', IMMUTABLE);
    } else if (/\.html?$/i.test(filePath)) {
      res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
    }
  }
}));

// API routes
app.use('/api/auth', loginLimiter, require('./routes/auth'));
app.use('/api/cms', require('./routes/cms'));
app.use('/api/messages', require('./routes/messages'));
app.use('/api/reservations', require('./routes/reservations'));
app.use('/api/media', require('./routes/media'));
app.use('/api/rebuild', require('./routes/rebuild'));
app.use('/api/stats', require('./routes/stats'));

// Health
app.get('/api/health', (req,res)=>{
  const htmlCount = fs.readdirSync(ROOT).filter(f=>f.endsWith('.html')).length;
  res.json({ ok:true, pages: htmlCount, time: new Date().toISOString() });
});

// Serve admin SPA (protected client-side, but we serve files)
app.use('/admin', express.static(path.join(ROOT, 'admin')));
app.get('/admin/*', (req,res)=>{
  // fallback to index.html for SPA routing
  res.sendFile(path.join(ROOT, 'admin', 'index.html'));
});

// Fallback for SPA contact form public endpoint already in messages

// Ensure data files exist
for (const f of ['cms.json','messages.json','media.json','users.json']) {
  const p = path.join(DATA_DIR, f);
  if (!fs.existsSync(p)) fs.writeFileSync(p, '[]', 'utf-8');
}
// Ensure users.json has default admin
(function ensureAdmin(){
  const usersPath = path.join(DATA_DIR, 'users.json');
  let users = [];
  try { users = JSON.parse(fs.readFileSync(usersPath,'utf-8')); } catch(e){ users=[]; }
  if (!Array.isArray(users)) users=[];
  if (users.length===0) {
    const bcrypt = require('bcryptjs');
    const email = process.env.ADMIN_EMAIL || 'admin@jurisaffaires.tn';
    const pwd = process.env.ADMIN_PASSWORD || 'Admin123!';
    const hash = bcrypt.hashSync(pwd, 10);
    users = [{ id:'1', email, passwordHash: hash, role:'admin', name:'Administrateur', createdAt: new Date().toISOString() }];
    fs.writeFileSync(usersPath, JSON.stringify(users,null,2), 'utf-8');
    console.log(`[admin] utilisateur par défaut créé: ${email} / ${pwd}`);
  }
})();

app.listen(PORT, '0.0.0.0', ()=>{
  console.log(`JurisAffaires — site public sur http://localhost:${PORT}`);
  console.log(`Espace admin sur http://localhost:${PORT}/admin`);
  console.log(`API sur http://localhost:${PORT}/api`);
});
