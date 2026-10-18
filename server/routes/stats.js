const express = require('express');
const fs = require('fs');
const path = require('path');
const auth = require('../middleware/auth');

const router = express.Router();
const ROOT = path.join(__dirname,'..','..');

router.get('/', auth(true), (req,res)=>{
  const cms = JSON.parse(fs.readFileSync(path.join(ROOT,'data','cms.json'),'utf-8'));
  const msgs = JSON.parse(fs.readFileSync(path.join(ROOT,'data','messages.json'),'utf-8') || '[]');
  const media = JSON.parse(fs.readFileSync(path.join(ROOT,'data','media.json'),'utf-8') || '[]');
  const pages = 43; // could count html files
  const htmlCount = fs.readdirSync(ROOT).filter(f=>f.endsWith('.html')).length;
  res.json({
    pages: htmlCount,
    team: cms.team?.length || 0,
    pillars: cms.pillars?.length || 0,
    practices: Object.values(cms.practices||{}).flat().length,
    publications: cms.publications?.length || 0,
    clients: cms.clients?.length || 0,
    messages: msgs.length,
    messagesNew: msgs.filter(m=>m.status==='new').length,
    media: media.length,
    site: cms.site
  });
});

module.exports = router;
