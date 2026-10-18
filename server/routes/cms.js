const express = require('express');
const fs = require('fs');
const path = require('path');
const auth = require('../middleware/auth');

const router = express.Router();
const ROOT = path.join(__dirname,'..','..');
const CMS_PATH = path.join(ROOT,'data','cms.json');

function readCMS(){
  return JSON.parse(fs.readFileSync(CMS_PATH,'utf-8'));
}
function writeCMS(data){
  fs.writeFileSync(CMS_PATH, JSON.stringify(data,null,2)+'\n','utf-8');
}

// Public read (for preview)
router.get('/', (req,res)=>{
  try {
    const cms = readCMS();
    res.json(cms);
  } catch(e){ res.status(500).json({ error:'CMS illisible: '+e.message }); }
});

// Protected write
router.put('/', auth(true), (req,res)=>{
  try {
    const incoming = req.body;
    if (!incoming || typeof incoming !== 'object') return res.status(400).json({ error:'Données invalides.' });
    // Basic validation: must contain site
    if (!incoming.site || !incoming.site.EMAIL) return res.status(400).json({ error:'Le CMS doit contenir site.EMAIL' });
    writeCMS(incoming);
    res.json({ ok:true, message:'CMS sauvegardé — pensez à Reconstruire le site.' });
  } catch(e){ res.status(500).json({ error:e.message }); }
});

// Patch single section (e.g. site, team, pillars...)
router.patch('/:section', auth(true), (req,res)=>{
  const section = req.params.section;
  const allowed = ['site','nav','expertise_subnav','pillars','sport','team','clients','publications','stats_fixed','practices','engagements','all_domains'];
  if (!allowed.includes(section)) return res.status(400).json({ error:'Section inconnue: '+section });
  try {
    const cms = readCMS();
    cms[section] = req.body;
    writeCMS(cms);
    res.json({ ok:true });
  } catch(e){ res.status(500).json({ error:e.message }); }
});

module.exports = router;
