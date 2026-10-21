const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const auth = require('../middleware/auth');

const router = express.Router();
const ROOT = path.join(__dirname,'..','..');
const UPLOAD_DIR = path.join(ROOT,'assets','img','uploads');
const DATA_DIR = path.join(ROOT,'data');
const MEDIA_JSON = path.join(DATA_DIR,'media.json');

if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, {recursive:true});

const storage = multer.diskStorage({
  destination: (req,file,cb)=> cb(null, UPLOAD_DIR),
  filename: (req,file,cb)=>{
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    const base = path.basename(file.originalname, ext).replace(/[^a-z0-9_-]/gi,'-').slice(0,40) || 'upload';
    const name = `${Date.now()}-${base}${ext}`;
    cb(null, name);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 12*1024*1024 },
  fileFilter: (req,file,cb)=>{
    const ok = /image\/(jpeg|png|webp|svg\+xml|gif)/.test(file.mimetype) || /\.(jpg|jpeg|png|webp|svg|gif)$/i.test(file.originalname);
    if (!ok) return cb(new Error('Type de fichier non autorisé — images uniquement.'));
    cb(null,true);
  }
});

function readMedia(){ try{ return JSON.parse(fs.readFileSync(MEDIA_JSON,'utf-8')); }catch(e){ return []; } }
function writeMedia(arr){ fs.writeFileSync(MEDIA_JSON, JSON.stringify(arr,null,2)+'\n','utf-8'); }

router.get('/', auth(true), (req,res)=>{
  res.json(readMedia());
});

// Public list for debugging (optional) — but keep protected by default
// Upload
router.post('/upload', auth(true), upload.array('files', 12), (req,res)=>{
  const media = readMedia();
  const uploaded = (req.files||[]).map(f=>{
    const entry = {
      id: Date.now().toString(36)+Math.random().toString(36).slice(2,5),
      filename: f.filename,
      originalName: f.originalname,
      url: `assets/img/uploads/${f.filename}`,
      size: f.size,
      mimetype: f.mimetype,
      uploadedAt: new Date().toISOString(),
      uploadedBy: req.user?.email || 'admin'
    };
    media.unshift(entry);
    return entry;
  });
  writeMedia(media);
  res.json({ ok:true, files: uploaded });
});

router.delete('/:id', auth(true), (req,res)=>{
  const media = readMedia();
  const idx = media.findIndex(m=>m.id===req.params.id);
  if (idx===-1) return res.status(404).json({ error:'Média introuvable' });
  const entry = media[idx];
  try { fs.unlinkSync(path.join(ROOT, entry.url)); } catch(e){}
  media.splice(idx,1);
  writeMedia(media);
  res.json({ ok:true });
});

module.exports = router;
