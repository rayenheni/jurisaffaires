const express = require('express');
const fs = require('fs');
const path = require('path');
const auth = require('../middleware/auth');

const router = express.Router();
const ROOT = path.join(__dirname, '..', '..');
const DATA_DIR = path.join(ROOT, 'data');
const RES_PATH = path.join(DATA_DIR, 'reservations.json');
const SETTINGS_PATH = path.join(DATA_DIR, 'reservation-settings.json');
const CMS_PATH = path.join(DATA_DIR, 'cms.json');

const DEFAULT_SETTINGS = {
  enabled: true,
  autoConfirm: false,
  slotDuration: 45,
  bufferMinutes: 15,
  minAdvanceHours: 1,
  maxAdvanceDays: 60,
  timezone: 'Africa/Tunis',
  modes: [
    {
      id: 'cabinet',
      label: 'Au cabinet (Tunis)',
      subtitle: '45, rue Ali Darghouth — 1001 Tunis',
      duration: 45,
      enabled: true
    },
    {
      id: 'visio',
      label: 'Visioconférence',
      subtitle: 'Entretien vidéo sécurisé (lien transmis par e-mail)',
      duration: 45,
      enabled: true
    },
    {
      id: 'telephone',
      label: 'Entretien téléphonique',
      subtitle: 'Appel direct par l’avocat à l’heure convenue',
      duration: 30,
      enabled: true
    }
  ],
  // 0 = Dimanche ... 6 = Samedi
  schedule: {
    '0': { open: false, ranges: [] },
    '1': { open: true, ranges: [['09:00', '12:30'], ['14:00', '18:00']] },
    '2': { open: true, ranges: [['09:00', '12:30'], ['14:00', '18:00']] },
    '3': { open: true, ranges: [['09:00', '12:30'], ['14:00', '18:00']] },
    '4': { open: true, ranges: [['09:00', '12:30'], ['14:00', '18:00']] },
    '5': { open: true, ranges: [['09:00', '12:30'], ['14:00', '17:30']] },
    '6': { open: false, ranges: [['09:30', '12:30']] }
  },
  blockedDates: [],
  blockedSlots: []
};

function tunisNowParts() {
  const now = new Date();
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Tunis',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
  const map = {};
  for (const p of fmt.formatToParts(now)) {
    map[p.type] = p.value;
  }
  const hh = map.hour === '24' ? '00' : map.hour;
  return {
    date: `${map.year}-${map.month}-${map.day}`,
    minutes: parseInt(hh, 10) * 60 + parseInt(map.minute, 10),
    year: map.year
  };
}

function nextBusinessDate(offsetBusinessDays) {
  const base = tunisNowParts().date;
  const [y, m, d] = base.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  let added = 0;
  while (added < offsetBusinessDays) {
    dt.setUTCDate(dt.getUTCDate() + 1);
    const dow = dt.getUTCDay();
    if (dow !== 0 && dow !== 6) added++;
  }
  return dt.toISOString().slice(0, 10);
}

function ensureFiles() {
  if (!fs.existsSync(SETTINGS_PATH)) {
    fs.writeFileSync(SETTINGS_PATH, JSON.stringify(DEFAULT_SETTINGS, null, 2) + '\n', 'utf-8');
  }
  if (!fs.existsSync(RES_PATH)) {
    const seed = [
      {
        id: 'seed-1',
        ref: `JA-${tunisNowParts().year}-4108`,
        nom: 'Karim Ben Mansour',
        societe: ' Groupe Carthage Industrie SA',
        email: 'k.benmansour@exemple.tn',
        tel: '+216 71 880 410',
        pole: 'Droit des affaires',
        lawyerSlug: 'avocat-slim-bouderbala.html',
        lawyerName: 'Me Slim BOUDERBALA',
        mode: 'cabinet',
        date: nextBusinessDate(1),
        time: '10:00',
        duration: 45,
        urgency: 'prioritaire',
        message: 'Revue du pacte d’actionnaires et calendrier de restructuration du capital.',
        status: 'confirmed',
        publicNote: 'Salle de conseil — 45, rue Ali Darghouth, Tunis.',
        internalNote: 'Dossier prioritaire communiqué par la direction générale.',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'seed-2',
        ref: `JA-${tunisNowParts().year}-4125`,
        nom: 'Nadia Trabelsi',
        societe: 'Financière Médina',
        email: 'n.trabelsi@exemple.tn',
        tel: '+216 22 419 300',
        pole: 'Banque, finance & assurances',
        lawyerSlug: 'avocate-faten-guemri.html',
        lawyerName: 'Me Faten GUEMRI',
        mode: 'visio',
        date: nextBusinessDate(2),
        time: '15:00',
        duration: 45,
        urgency: 'normal',
        message: 'Conformité réglementaire d’une convention de financement syndiqué.',
        status: 'pending',
        publicNote: '',
        internalNote: '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];
    seed[0].societe = seed[0].societe.trim();
    fs.writeFileSync(RES_PATH, JSON.stringify(seed, null, 2) + '\n', 'utf-8');
  }
}

ensureFiles();

function readSettings() {
  ensureFiles();
  try {
    const s = JSON.parse(fs.readFileSync(SETTINGS_PATH, 'utf-8'));
    return Object.assign({}, DEFAULT_SETTINGS, s, {
      schedule: Object.assign({}, DEFAULT_SETTINGS.schedule, s.schedule || {})
    });
  } catch (e) {
    return JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
  }
}

function writeSettings(s) {
  fs.writeFileSync(SETTINGS_PATH, JSON.stringify(s, null, 2) + '\n', 'utf-8');
}

function readReservations() {
  ensureFiles();
  try {
    const arr = JSON.parse(fs.readFileSync(RES_PATH, 'utf-8'));
    return Array.isArray(arr) ? arr : [];
  } catch (e) {
    return [];
  }
}

function writeReservations(arr) {
  fs.writeFileSync(RES_PATH, JSON.stringify(arr, null, 2) + '\n', 'utf-8');
}

function readCMS() {
  try {
    return JSON.parse(fs.readFileSync(CMS_PATH, 'utf-8'));
  } catch (e) {
    return { team: [], pillars: [], site: {} };
  }
}

function parseHHMM(str) {
  const m = /^(\d{2}):(\d{2})$/.exec(String(str || '').trim());
  if (!m) return null;
  const h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  if (h < 0 || h > 23 || min < 0 || min > 59) return null;
  return h * 60 + min;
}

function fmtHHMM(mins) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function validDateStr(dateStr) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(dateStr || ''))) return false;
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

function dayOfWeekUTC(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

function diffDays(dateA, dateB) {
  const [ya, ma, da] = dateA.split('-').map(Number);
  const [yb, mb, db] = dateB.split('-').map(Number);
  return Math.round((Date.UTC(ya, ma - 1, da) - Date.UTC(yb, mb - 1, db)) / 86400000);
}

function resolveModeDuration(settings, modeId) {
  const m = (settings.modes || []).find(x => x.id === modeId);
  return (m && Number(m.duration)) || Number(settings.slotDuration) || 45;
}

function resolveLawyerLabel(lawyerSlug) {
  if (!lawyerSlug || lawyerSlug === 'cabinet') {
    return 'Orientation par le cabinet';
  }
  const cms = readCMS();
  const found = (cms.team || []).find(t => t.slug === lawyerSlug);
  return found ? `Me ${found.first} ${found.last}` : lawyerSlug;
}

/**
 * Compute all slots for a single YYYY-MM-DD date.
 * excludeReservationId lets a client/admin reschedule an existing booking without self-colliding.
 */
function computeDaySlots(dateStr, { lawyerSlug = 'cabinet', modeId = 'cabinet', excludeId = null } = {}) {
  const settings = readSettings();
  if (!settings.enabled || !validDateStr(dateStr)) {
    return { open: false, reason: 'closed', slots: [] };
  }

  const now = tunisNowParts();
  const delta = diffDays(dateStr, now.date);
  if (delta < 0) return { open: false, reason: 'past', slots: [] };
  if (delta > (Number(settings.maxAdvanceDays) || 60)) {
    return { open: false, reason: 'beyond_window', slots: [] };
  }

  const blockedDay = (settings.blockedDates || []).find(b => b.date === dateStr);
  if (blockedDay) {
    return { open: false, reason: 'holiday', reasonLabel: blockedDay.reason || 'Fermeture exceptionnelle', slots: [] };
  }

  const dow = String(dayOfWeekUTC(dateStr));
  const dayCfg = settings.schedule[dow];
  if (!dayCfg || !dayCfg.open || !Array.isArray(dayCfg.ranges) || !dayCfg.ranges.length) {
    return { open: false, reason: 'weekly_closed', slots: [] };
  }

  const cms = readCMS();
  const teamCount = Math.max(1, (cms.team || []).length || 4);
  const duration = resolveModeDuration(settings, modeId);
  const buffer = Number(settings.bufferMinutes) || 0;
  const step = duration + buffer;
  const minAdvanceMins = (Number(settings.minAdvanceHours) || 0) * 60;

  const activeBookings = readReservations().filter(r =>
    r.date === dateStr &&
    r.id !== excludeId &&
    r.status !== 'cancelled' &&
    r.status !== 'rejected'
  );
  const dayBlockedSlots = (settings.blockedSlots || []).filter(b => b.date === dateStr);

  const slots = [];
  for (const range of dayCfg.ranges) {
    if (!Array.isArray(range) || range.length < 2) continue;
    const startMin = parseHHMM(range[0]);
    const endMin = parseHHMM(range[1]);
    if (startMin === null || endMin === null || endMin <= startMin) continue;

    for (let t = startMin; t + duration <= endMin; t += step) {
      const timeLabel = fmtHHMM(t);
      const period = t < 13 * 60 ? 'morning' : 'afternoon';

      // Advance notice on today
      if (delta === 0 && t < now.minutes + minAdvanceMins) {
        slots.push({ time: timeLabel, period, available: false, reason: 'past_time' });
        continue;
      }

      // Admin manual slot block
      const isBlocked = dayBlockedSlots.some(b =>
        b.time === timeLabel && (!b.lawyerSlug || b.lawyerSlug === '*' || b.lawyerSlug === lawyerSlug)
      );
      if (isBlocked) {
        slots.push({ time: timeLabel, period, available: false, reason: 'blocked' });
        continue;
      }

      // Overlap check against existing reservations [bStart, bEnd)
      const overlapping = activeBookings.filter(b => {
        const bStart = parseHHMM(b.time);
        if (bStart === null) return false;
        const bDur = Number(b.duration) || duration;
        const bEnd = bStart + bDur + buffer;
        const candEnd = t + duration + buffer;
        return t < bEnd && bStart < candEnd;
      });

      let available = true;
      if (lawyerSlug && lawyerSlug !== 'cabinet') {
        // Busy if this specific lawyer has an overlapping booking OR total bookings hit full firm capacity
        const lawyerBusy = overlapping.some(b => b.lawyerSlug === lawyerSlug);
        available = !lawyerBusy && overlapping.length < teamCount;
      } else {
        // Firm-wide pool: open while at least one lawyer in the team is free
        available = overlapping.length < teamCount;
      }

      slots.push({
        time: timeLabel,
        period,
        duration,
        available,
        reason: available ? null : 'booked'
      });
    }
  }

  return {
    open: slots.length > 0,
    date: dateStr,
    duration,
    availableCount: slots.filter(s => s.available).length,
    totalCount: slots.length,
    slots
  };
}

function generateUniqueRef(existing) {
  const year = tunisNowParts().year;
  const used = new Set(existing.map(r => r.ref));
  for (let i = 0; i < 100; i++) {
    const code = Math.floor(1000 + Math.random() * 9000);
    const ref = `JA-${year}-${code}`;
    if (!used.has(ref)) return ref;
  }
  return `JA-${year}-${Date.now().toString().slice(-5)}`;
}

function buildICS(reservation) {
  const cms = readCMS();
  const site = cms.site || {};
  const [y, m, d] = reservation.date.split('-').map(Number);
  const mins = parseHHMM(reservation.time) || 540;
  const dur = Number(reservation.duration) || 45;
  const endMins = mins + dur;
  const pad = n => String(n).padStart(2, '0');
  const dtStart = `${y}${pad(m)}${pad(d)}T${pad(Math.floor(mins / 60))}${pad(mins % 60)}00`;
  const dtEnd = `${y}${pad(m)}${pad(d)}T${pad(Math.floor(endMins / 60))}${pad(endMins % 60)}00`;
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z');
  const modeMap = {
    cabinet: `${site.ADDRESS_1 || '45, rue Ali Darghouth'}, ${site.ADDRESS_2 || '1001 Tunis — Tunisie'}`,
    visio: 'Visioconférence sécurisée — Cabinet JurisAffaires',
    telephone: `Entretien téléphonique (${reservation.tel || site.PHONE_MAIN || ''})`
  };
  const esc = s => String(s || '').replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/[,;]/g, ' ');
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//JurisAffaires//Consultation Juridique//FR',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${reservation.ref}@jurisaffaires.tn`,
    `DTSTAMP:${stamp}`,
    `DTSTART;TZID=Africa/Tunis:${dtStart}`,
    `DTEND;TZID=Africa/Tunis:${dtEnd}`,
    `SUMMARY:${esc(`Consultation JurisAffaires (${reservation.ref}) — ${reservation.pole}`)}`,
    `LOCATION:${esc(modeMap[reservation.mode] || modeMap.cabinet)}`,
    `DESCRIPTION:${esc(`Référence : ${reservation.ref}\nInterlocuteur : ${reservation.lawyerName}\nPôle : ${reservation.pole}\nClient : ${reservation.nom}\n${reservation.publicNote ? 'Note du cabinet : ' + reservation.publicNote : ''}`)}`,
    'STATUS:' + (reservation.status === 'confirmed' ? 'CONFIRMED' : 'TENTATIVE'),
    'BEGIN:VALARM',
    'TRIGGER:-PT60M',
    'ACTION:DISPLAY',
    'DESCRIPTION:Rappel consultation JurisAffaires dans 1 heure',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR'
  ];
  return lines.join('\r\n');
}

// =====================================================================
// PUBLIC ENDPOINTS
// =====================================================================

router.get('/config', (req, res) => {
  const settings = readSettings();
  const cms = readCMS();
  const poles = [
    ...(cms.pillars || []).map(p => ({ slug: p.slug, title: String(p.title || '').replace(/&amp;/g, '&') })),
    ...(cms.sport ? [{ slug: cms.sport.slug, title: String(cms.sport.title || 'Droit du sport').replace(/&amp;/g, '&') }] : [])
  ];
  const lawyers = [
    {
      slug: 'cabinet',
      name: 'Orientation par le cabinet',
      role: 'Premier avocat spécialisé disponible',
      img: null,
      tags: ['Tous pôles', 'Assignation optimale']
    },
    ...(cms.team || []).map(m => ({
      slug: m.slug,
      name: `Me ${m.first} ${m.last}`,
      role: m.role,
      img: m.img ? `assets/img/team/${m.img}` : null,
      tags: m.tags || []
    }))
  ];
  res.json({
    enabled: settings.enabled !== false,
    autoConfirm: Boolean(settings.autoConfirm),
    slotDuration: settings.slotDuration,
    bufferMinutes: settings.bufferMinutes,
    minAdvanceHours: settings.minAdvanceHours,
    maxAdvanceDays: settings.maxAdvanceDays,
    timezone: settings.timezone,
    modes: (settings.modes || []).filter(m => m.enabled !== false),
    schedule: settings.schedule,
    blockedDates: settings.blockedDates || [],
    poles,
    lawyers,
    today: tunisNowParts().date
  });
});

router.get('/availability', (req, res) => {
  const month = String(req.query.month || '').trim();
  const lawyerSlug = String(req.query.lawyer || 'cabinet').trim();
  const modeId = String(req.query.mode || 'cabinet').trim();
  const excludeId = req.query.excludeId ? String(req.query.excludeId) : null;

  if (!/^\d{4}-\d{2}$/.test(month)) {
    return res.status(400).json({ error: 'Paramètre month requis (YYYY-MM).' });
  }
  const [y, m] = month.split('-').map(Number);
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const days = {};
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${month}-${String(d).padStart(2, '0')}`;
    const info = computeDaySlots(dateStr, { lawyerSlug, modeId, excludeId });
    days[dateStr] = {
      open: info.open,
      reason: info.reason || null,
      reasonLabel: info.reasonLabel || null,
      available: info.availableCount || 0,
      total: info.totalCount || 0
    };
  }
  res.json({ month, days });
});

router.get('/slots', (req, res) => {
  const dateStr = String(req.query.date || '').trim();
  const lawyerSlug = String(req.query.lawyer || 'cabinet').trim();
  const modeId = String(req.query.mode || 'cabinet').trim();
  const excludeId = req.query.excludeId ? String(req.query.excludeId) : null;

  if (!validDateStr(dateStr)) {
    return res.status(400).json({ error: 'Date invalide (YYYY-MM-DD).' });
  }
  res.json(computeDaySlots(dateStr, { lawyerSlug, modeId, excludeId }));
});

router.post('/', (req, res) => {
  const settings = readSettings();
  if (!settings.enabled) {
    return res.status(403).json({ error: 'La réservation en ligne est momentanément fermée. Merci d’appeler le cabinet.' });
  }
  const {
    nom,
    societe,
    email,
    tel,
    pole,
    lawyerSlug = 'cabinet',
    mode = 'cabinet',
    date,
    time,
    urgency = 'normal',
    message
  } = req.body || {};

  const errors = [];
  if (!nom || String(nom).trim().length < 2) errors.push('Votre nom complet est requis.');
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(email).trim())) errors.push('Adresse e-mail invalide.');
  if (!tel || String(tel).replace(/\D/g, '').length < 8) errors.push('Numéro de téléphone valide requis.');
  if (!pole || String(pole).trim().length < 2) errors.push('Veuillez sélectionner un domaine juridique.');
  if (!validDateStr(date)) errors.push('Date de rendez-vous invalide.');
  if (parseHHMM(time) === null) errors.push('Créneau horaire invalide.');
  if (!message || String(message).trim().length < 8) errors.push('Veuillez décrire brièvement l’objet de la consultation.');
  if (errors.length) {
    return res.status(400).json({ error: errors.join(' ') });
  }

  const dayInfo = computeDaySlots(date, { lawyerSlug, modeId: mode });
  const targetSlot = (dayInfo.slots || []).find(s => s.time === time);
  if (!dayInfo.open || !targetSlot || !targetSlot.available) {
    return res.status(409).json({
      error: 'Ce créneau vient d’être réservé ou n’est plus disponible. Veuillez sélectionner un autre horaire.',
      code: 'SLOT_UNAVAILABLE'
    });
  }

  const list = readReservations();
  const ref = generateUniqueRef(list);
  const nowIso = new Date().toISOString();
  const status = settings.autoConfirm ? 'confirmed' : 'pending';
  const entry = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    ref,
    nom: String(nom).trim(),
    societe: String(societe || '').trim(),
    email: String(email).trim().toLowerCase(),
    tel: String(tel).trim(),
    pole: String(pole).trim(),
    lawyerSlug: String(lawyerSlug || 'cabinet').trim(),
    lawyerName: resolveLawyerLabel(lawyerSlug),
    mode: ['cabinet', 'visio', 'telephone'].includes(mode) ? mode : 'cabinet',
    date,
    time,
    duration: resolveModeDuration(settings, mode),
    urgency: ['normal', 'prioritaire', 'urgent'].includes(urgency) ? urgency : 'normal',
    message: String(message).trim(),
    status,
    publicNote: '',
    internalNote: '',
    createdAt: nowIso,
    updatedAt: nowIso
  };

  list.unshift(entry);
  writeReservations(list);
  res.status(201).json({ ok: true, reservation: serializePublic(entry) });
});

function serializePublic(r) {
  return {
    id: r.id,
    ref: r.ref,
    nom: r.nom,
    societe: r.societe,
    email: r.email,
    tel: r.tel,
    pole: r.pole,
    lawyerSlug: r.lawyerSlug,
    lawyerName: r.lawyerName,
    mode: r.mode,
    date: r.date,
    time: r.time,
    duration: r.duration,
    urgency: r.urgency,
    message: r.message,
    status: r.status,
    publicNote: r.publicNote || '',
    createdAt: r.createdAt,
    updatedAt: r.updatedAt
  };
}

router.post('/lookup', (req, res) => {
  const ref = String((req.body && req.body.ref) || '').trim().toUpperCase();
  const email = String((req.body && req.body.email) || '').trim().toLowerCase();
  if (!ref || !email) {
    return res.status(400).json({ error: 'Référence du dossier et adresse e-mail requis.' });
  }
  const found = readReservations().find(
    r => r.ref.toUpperCase() === ref && r.email.toLowerCase() === email
  );
  if (!found) {
    return res.status(404).json({ error: 'Aucun rendez-vous trouvé avec cette référence et cette adresse e-mail.' });
  }
  res.json({ ok: true, reservation: serializePublic(found) });
});

router.patch('/client/:ref', (req, res) => {
  const ref = String(req.params.ref || '').trim().toUpperCase();
  const { email, action, date, time, mode } = req.body || {};
  const cleanEmail = String(email || '').trim().toLowerCase();
  if (!cleanEmail) return res.status(400).json({ error: 'Adresse e-mail requise.' });

  const list = readReservations();
  const idx = list.findIndex(r => r.ref.toUpperCase() === ref && r.email.toLowerCase() === cleanEmail);
  if (idx === -1) return res.status(404).json({ error: 'Rendez-vous introuvable.' });

  const current = list[idx];
  if (action === 'cancel') {
    if (current.status === 'cancelled') {
      return res.json({ ok: true, reservation: serializePublic(current) });
    }
    current.status = 'cancelled';
    current.updatedAt = new Date().toISOString();
    writeReservations(list);
    return res.json({ ok: true, reservation: serializePublic(current) });
  }

  if (action === 'reschedule') {
    if (!validDateStr(date) || parseHHMM(time) === null) {
      return res.status(400).json({ error: 'Nouvelle date et nouvel horaire requis.' });
    }
    const nextMode = mode && ['cabinet', 'visio', 'telephone'].includes(mode) ? mode : current.mode;
    const dayInfo = computeDaySlots(date, {
      lawyerSlug: current.lawyerSlug,
      modeId: nextMode,
      excludeId: current.id
    });
    const slot = (dayInfo.slots || []).find(s => s.time === time);
    if (!dayInfo.open || !slot || !slot.available) {
      return res.status(409).json({
        error: 'Ce créneau n’est plus disponible. Veuillez choisir un autre horaire.',
        code: 'SLOT_UNAVAILABLE'
      });
    }
    const settings = readSettings();
    current.date = date;
    current.time = time;
    current.mode = nextMode;
    current.duration = resolveModeDuration(settings, nextMode);
    if (!settings.autoConfirm && current.status === 'cancelled') {
      current.status = 'pending';
    } else if (current.status === 'cancelled') {
      current.status = 'confirmed';
    }
    current.updatedAt = new Date().toISOString();
    writeReservations(list);
    return res.json({ ok: true, reservation: serializePublic(current) });
  }

  return res.status(400).json({ error: 'Action inconnue.' });
});

router.get('/:ref/ics', (req, res) => {
  const ref = String(req.params.ref || '').trim().toUpperCase();
  const email = String(req.query.email || '').trim().toLowerCase();
  const found = readReservations().find(
    r => r.ref.toUpperCase() === ref && (!email || r.email.toLowerCase() === email)
  );
  if (!found) return res.status(404).send('Rendez-vous introuvable.');
  const ics = buildICS(found);
  res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="JurisAffaires-${found.ref}.ics"`);
  res.send(ics);
});

// =====================================================================
// ADMIN PROTECTED ENDPOINTS
// =====================================================================

router.get('/admin/list', auth(true), (req, res) => {
  const { status, lawyer, mode, date, q } = req.query;
  let out = readReservations();
  if (status) out = out.filter(r => r.status === status);
  if (lawyer) out = out.filter(r => r.lawyerSlug === lawyer);
  if (mode) out = out.filter(r => r.mode === mode);
  if (date) out = out.filter(r => r.date === date);
  if (q) {
    const needle = String(q).toLowerCase();
    out = out.filter(r =>
      `${r.ref} ${r.nom} ${r.societe} ${r.email} ${r.tel} ${r.pole} ${r.lawyerName} ${r.message}`
        .toLowerCase()
        .includes(needle)
    );
  }
  out.sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));
  res.json(out);
});

router.post('/admin/create', auth(true), (req, res) => {
  const settings = readSettings();
  const {
    nom,
    societe = '',
    email = '',
    tel = '',
    pole = 'Droit des affaires',
    lawyerSlug = 'cabinet',
    mode = 'cabinet',
    date,
    time,
    urgency = 'normal',
    status = 'confirmed',
    message = 'Consultation planifiée par le secrétariat.',
    publicNote = '',
    internalNote = ''
  } = req.body || {};

  if (!nom || !validDateStr(date) || parseHHMM(time) === null) {
    return res.status(400).json({ error: 'Nom, date (YYYY-MM-DD) et heure (HH:MM) requis.' });
  }
  const list = readReservations();
  const ref = generateUniqueRef(list);
  const nowIso = new Date().toISOString();
  const entry = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    ref,
    nom: String(nom).trim(),
    societe: String(societe || '').trim(),
    email: String(email || 'client@cabinet.tn').trim().toLowerCase(),
    tel: String(tel || '').trim(),
    pole: String(pole || 'Droit des affaires').trim(),
    lawyerSlug,
    lawyerName: resolveLawyerLabel(lawyerSlug),
    mode: ['cabinet', 'visio', 'telephone'].includes(mode) ? mode : 'cabinet',
    date,
    time,
    duration: resolveModeDuration(settings, mode),
    urgency,
    message: String(message || '').trim(),
    status: ['pending', 'confirmed', 'completed', 'cancelled', 'no_show'].includes(status) ? status : 'confirmed',
    publicNote: String(publicNote || '').trim(),
    internalNote: String(internalNote || '').trim(),
    createdAt: nowIso,
    updatedAt: nowIso
  };
  list.unshift(entry);
  writeReservations(list);
  res.status(201).json({ ok: true, reservation: entry });
});

router.patch('/admin/:id', auth(true), (req, res) => {
  const list = readReservations();
  const idx = list.findIndex(r => r.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Réservation introuvable.' });

  const item = list[idx];
  const editable = ['nom', 'societe', 'email', 'tel', 'pole', 'mode', 'date', 'time', 'duration', 'urgency', 'status', 'message', 'publicNote', 'internalNote'];
  for (const key of editable) {
    if (key in (req.body || {})) {
      item[key] = req.body[key];
    }
  }
  if ('lawyerSlug' in (req.body || {})) {
    item.lawyerSlug = req.body.lawyerSlug;
    item.lawyerName = resolveLawyerLabel(req.body.lawyerSlug);
  }
  item.updatedAt = new Date().toISOString();
  writeReservations(list);
  res.json({ ok: true, reservation: item });
});

router.delete('/admin/:id', auth(true), (req, res) => {
  const list = readReservations();
  const filtered = list.filter(r => r.id !== req.params.id);
  if (filtered.length === list.length) {
    return res.status(404).json({ error: 'Réservation introuvable.' });
  }
  writeReservations(filtered);
  res.json({ ok: true });
});

router.get('/admin/settings', auth(true), (req, res) => {
  res.json(readSettings());
});

router.put('/admin/settings', auth(true), (req, res) => {
  const incoming = req.body || {};
  const merged = Object.assign({}, readSettings(), incoming);
  writeSettings(merged);
  res.json({ ok: true, settings: merged });
});

module.exports = router;
