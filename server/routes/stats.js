const express = require('express');
const fs = require('fs');
const path = require('path');
const auth = require('../middleware/auth');

const router = express.Router();
const ROOT = path.join(__dirname, '..', '..');

function readJsonSafe(file, fallback) {
  try {
    if (!fs.existsSync(file)) return fallback;
    return JSON.parse(fs.readFileSync(file, 'utf-8'));
  } catch (e) {
    return fallback;
  }
}

router.get('/', auth(true), (req, res) => {
  const cms = readJsonSafe(path.join(ROOT, 'data', 'cms.json'), {});
  const msgs = readJsonSafe(path.join(ROOT, 'data', 'messages.json'), []);
  const media = readJsonSafe(path.join(ROOT, 'data', 'media.json'), []);
  const reservations = readJsonSafe(path.join(ROOT, 'data', 'reservations.json'), []);
  const htmlCount = fs.readdirSync(ROOT).filter(f => f.endsWith('.html')).length;
  const today = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Tunis',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date());

  res.json({
    pages: htmlCount,
    team: cms.team?.length || 0,
    pillars: cms.pillars?.length || 0,
    practices: Object.values(cms.practices || {}).flat().length,
    publications: cms.publications?.length || 0,
    clients: cms.clients?.length || 0,
    messages: msgs.length,
    messagesNew: msgs.filter(m => m.status === 'new').length,
    reservations: reservations.length,
    reservationsPending: reservations.filter(r => r.status === 'pending').length,
    reservationsConfirmed: reservations.filter(r => r.status === 'confirmed').length,
    reservationsToday: reservations.filter(r => r.date === today && r.status !== 'cancelled').length,
    media: media.length,
    site: cms.site
  });
});

module.exports = router;
