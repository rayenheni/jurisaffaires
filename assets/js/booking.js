/* =====================================================================
   JURISAFFAIRES — Système complet de prise de rendez-vous & suivi client
   Vanilla JavaScript · API /api/reservations + fallback statique autonome
   ===================================================================== */
(function () {
  'use strict';

  var root = document.getElementById('bookingApp');
  if (!root) return;

  var MONTHS_FR = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
  ];
  var WEEKDAYS_SHORT = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
  var STATUS_LABELS = {
    pending: 'En attente de confirmation',
    confirmed: 'Confirmé par le cabinet',
    completed: 'Consultation effectuée',
    cancelled: 'Annulé',
    no_show: 'Absent'
  };
  var MODE_LABELS = {
    cabinet: 'Au cabinet — Tunis',
    visio: 'Visioconférence sécurisée',
    telephone: 'Entretien téléphonique'
  };

  var FALLBACK_CONFIG = {
    enabled: true,
    autoConfirm: false,
    slotDuration: 45,
    bufferMinutes: 15,
    minAdvanceHours: 1,
    maxAdvanceDays: 60,
    timezone: 'Africa/Tunis',
    today: new Date().toISOString().slice(0, 10),
    modes: [
      { id: 'cabinet', label: 'Au cabinet (Tunis)', subtitle: '45, rue Ali Darghouth — 1001 Tunis', duration: 45 },
      { id: 'visio', label: 'Visioconférence', subtitle: 'Entretien vidéo sécurisé (lien transmis par e-mail)', duration: 45 },
      { id: 'telephone', label: 'Entretien téléphonique', subtitle: 'Appel direct par l’avocat à l’heure convenue', duration: 30 }
    ],
    schedule: {
      '0': { open: false, ranges: [] },
      '1': { open: true, ranges: [['09:00', '12:30'], ['14:00', '18:00']] },
      '2': { open: true, ranges: [['09:00', '12:30'], ['14:00', '18:00']] },
      '3': { open: true, ranges: [['09:00', '12:30'], ['14:00', '18:00']] },
      '4': { open: true, ranges: [['09:00', '12:30'], ['14:00', '18:00']] },
      '5': { open: true, ranges: [['09:00', '12:30'], ['14:00', '17:30']] },
      '6': { open: false, ranges: [] }
    },
    poles: [
      { slug: 'expertise-droit-des-affaires.html', title: 'Droit des affaires' },
      { slug: 'expertise-banque-finance-assurances.html', title: 'Banque, finance & assurances' },
      { slug: 'expertise-immobilier-social-maritime.html', title: 'Immobilier, social & maritime' },
      { slug: 'expertise-contentieux-penal-libertes.html', title: 'Contentieux, pénal & libertés' },
      { slug: 'expertise-droit-du-sport.html', title: 'Droit du sport' }
    ],
    lawyers: [
      { slug: 'cabinet', name: 'Orientation par le cabinet', role: 'Premier avocat spécialisé disponible', img: null },
      { slug: 'avocat-slim-bouderbala.html', name: 'Me Slim BOUDERBALA', role: 'Avocat Associé Gérant', img: 'assets/img/team/slim-bouderbala.jpg' },
      { slug: 'avocate-faten-guemri.html', name: 'Me Faten GUEMRI', role: 'Avocate Senior', img: 'assets/img/team/faten-guemri.jpg' },
      { slug: 'avocat-sahbi-bouderbala.html', name: 'Me Sahbi BOUDERBALA', role: 'Avocat Of Counsel', img: 'assets/img/team/sahbi-bouderbala.jpg' },
      { slug: 'avocat-taoufik-bouderbala.html', name: 'Me Taoufik BOUDERBALA', role: 'Avocat Senior Consultant', img: 'assets/img/team/taoufik-bouderbala.jpg' }
    ]
  };

  var state = {
    tab: 'book', // 'book' | 'manage'
    step: 1,     // 1 | 2 | 3 | 4
    config: FALLBACK_CONFIG,
    onlineApi: true,
    pole: 'Droit des affaires',
    lawyerSlug: 'cabinet',
    mode: 'cabinet',
    viewYear: new Date().getFullYear(),
    viewMonth: new Date().getMonth() + 1, // 1..12
    monthAvailability: {},
    date: '',
    time: '',
    daySlots: [],
    loadingSlots: false,
    submitting: false,
    error: '',
    form: {
      nom: '',
      societe: '',
      email: '',
      tel: '',
      urgency: 'normal',
      message: ''
    },
    confirmedReservation: null,
    // Manage tab state
    lookupRef: '',
    lookupEmail: '',
    lookupError: '',
    managedReservation: null,
    rescheduleOpen: false,
    rescheduleDate: '',
    rescheduleTime: '',
    rescheduleSlots: []
  };

  function esc(str) {
    return String(str == null ? '' : str).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  function pad2(n) {
    return String(n).padStart(2, '0');
  }

  function formatDateFR(dateStr) {
    if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return 'À choisir';
    var parts = dateStr.split('-').map(Number);
    var dt = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
    return dt.toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC'
    });
  }

  function saveRecentClientRef(resObj) {
    try {
      var arr = JSON.parse(localStorage.getItem('ja_recent_bookings') || '[]');
      arr = arr.filter(function (x) { return x.ref !== resObj.ref; });
      arr.unshift({ ref: resObj.ref, email: resObj.email, date: resObj.date, time: resObj.time, pole: resObj.pole });
      localStorage.setItem('ja_recent_bookings', JSON.stringify(arr.slice(0, 5)));
    } catch (e) {}
  }

  function getRecentClientRefs() {
    try {
      return JSON.parse(localStorage.getItem('ja_recent_bookings') || '[]');
    } catch (e) {
      return [];
    }
  }

  // Offline slot computation fallback (used only if running as raw file:// without backend)
  function computeOfflineDaySlots(dateStr, modeId) {
    var parts = dateStr.split('-').map(Number);
    var dow = String(new Date(Date.UTC(parts[0], parts[1] - 1, parts[2])).getUTCDay());
    var cfg = state.config.schedule[dow];
    if (!cfg || !cfg.open) return { open: false, slots: [], availableCount: 0, totalCount: 0 };
    if (dateStr < state.config.today) return { open: false, slots: [], availableCount: 0, totalCount: 0 };
    var dur = currentModeDuration(modeId);
    var step = dur + (Number(state.config.bufferMinutes) || 15);
    var slots = [];
    (cfg.ranges || []).forEach(function (rng) {
      var s = parseInt(rng[0].slice(0, 2), 10) * 60 + parseInt(rng[0].slice(3, 5), 10);
      var e = parseInt(rng[1].slice(0, 2), 10) * 60 + parseInt(rng[1].slice(3, 5), 10);
      for (var t = s; t + dur <= e; t += step) {
        slots.push({
          time: pad2(Math.floor(t / 60)) + ':' + pad2(t % 60),
          period: t < 780 ? 'morning' : 'afternoon',
          duration: dur,
          available: true
        });
      }
    });
    return { open: slots.length > 0, slots: slots, availableCount: slots.length, totalCount: slots.length };
  }

  function currentModeDuration(modeId) {
    var m = (state.config.modes || []).find(function (x) { return x.id === (modeId || state.mode); });
    return (m && m.duration) || state.config.slotDuration || 45;
  }

  function currentLawyerObj() {
    return (state.config.lawyers || []).find(function (l) { return l.slug === state.lawyerSlug; }) || state.config.lawyers[0];
  }

  function currentModeObj() {
    return (state.config.modes || []).find(function (m) { return m.id === state.mode; }) || state.config.modes[0];
  }

  function buildClientICSBlobUrl(r) {
    var parts = r.date.split('-').map(Number);
    var hm = r.time.split(':').map(Number);
    var startMins = hm[0] * 60 + hm[1];
    var endMins = startMins + (Number(r.duration) || 45);
    var dtStart = '' + parts[0] + pad2(parts[1]) + pad2(parts[2]) + 'T' + pad2(Math.floor(startMins / 60)) + pad2(startMins % 60) + '00';
    var dtEnd = '' + parts[0] + pad2(parts[1]) + pad2(parts[2]) + 'T' + pad2(Math.floor(endMins / 60)) + pad2(endMins % 60) + '00';
    var ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//JurisAffaires//Consultation//FR',
      'BEGIN:VEVENT',
      'UID:' + r.ref + '@jurisaffaires.tn',
      'DTSTART;TZID=Africa/Tunis:' + dtStart,
      'DTEND;TZID=Africa/Tunis:' + dtEnd,
      'SUMMARY:Consultation JurisAffaires (' + r.ref + ') - ' + r.pole,
      'LOCATION:45 rue Ali Darghouth 1001 Tunis',
      'DESCRIPTION:Référence ' + r.ref + ' - ' + r.lawyerName,
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\r\n');
    return URL.createObjectURL(new Blob([ics], { type: 'text/calendar;charset=utf-8' }));
  }

  async function loadMonthAvailability() {
    var ym = state.viewYear + '-' + pad2(state.viewMonth);
    if (state.onlineApi) {
      try {
        var url = '/api/reservations/availability?month=' + encodeURIComponent(ym)
          + '&lawyer=' + encodeURIComponent(state.lawyerSlug)
          + '&mode=' + encodeURIComponent(state.mode);
        var r = await fetch(url);
        if (r.ok) {
          var j = await r.json();
          state.monthAvailability = j.days || {};
          return;
        }
      } catch (e) {
        state.onlineApi = false;
      }
    }
    var daysInMonth = new Date(Date.UTC(state.viewYear, state.viewMonth, 0)).getUTCDate();
    var map = {};
    for (var d = 1; d <= daysInMonth; d++) {
      var ds = ym + '-' + pad2(d);
      var info = computeOfflineDaySlots(ds, state.mode);
      map[ds] = { open: info.open, available: info.availableCount, total: info.totalCount };
    }
    state.monthAvailability = map;
  }

  async function selectDateAndLoadSlots(dateStr) {
    state.date = dateStr;
    state.time = '';
    state.loadingSlots = true;
    render();
    if (state.onlineApi) {
      try {
        var url = '/api/reservations/slots?date=' + encodeURIComponent(dateStr)
          + '&lawyer=' + encodeURIComponent(state.lawyerSlug)
          + '&mode=' + encodeURIComponent(state.mode);
        var r = await fetch(url);
        if (r.ok) {
          var info = await r.json();
          state.daySlots = info.slots || [];
          var firstFree = state.daySlots.find(function (s) { return s.available; });
          if (firstFree) state.time = firstFree.time;
          state.loadingSlots = false;
          render();
          return;
        }
      } catch (e) {
        state.onlineApi = false;
      }
    }
    var off = computeOfflineDaySlots(dateStr, state.mode);
    state.daySlots = off.slots;
    if (state.daySlots[0]) state.time = state.daySlots[0].time;
    state.loadingSlots = false;
    render();
  }

  async function autoPickFirstAvailableDate() {
    await loadMonthAvailability();
    var keys = Object.keys(state.monthAvailability).sort();
    var first = keys.find(function (d) {
      return d >= state.config.today && state.monthAvailability[d] && state.monthAvailability[d].available > 0;
    });
    if (!first) {
      // Advance 1 month if current month has no remaining business days
      if (state.viewMonth === 12) { state.viewMonth = 1; state.viewYear += 1; }
      else { state.viewMonth += 1; }
      await loadMonthAvailability();
      keys = Object.keys(state.monthAvailability).sort();
      first = keys.find(function (d) {
        return state.monthAvailability[d] && state.monthAvailability[d].available > 0;
      });
    }
    if (first) {
      await selectDateAndLoadSlots(first);
    } else {
      render();
    }
  }

  function renderSummaryAside() {
    var lw = currentLawyerObj();
    var md = currentModeObj();
    return ''
      + '<aside class="booking-summary" aria-label="Récapitulatif de votre demande">'
      + '  <p class="booking-summary__eyebrow">Votre consultation</p>'
      + '  <h3 class="booking-summary__title">Récapitulatif</h3>'
      + '  <ul class="booking-summary__list">'
      + '    <li><span class="booking-summary__k">Pôle juridique</span><span class="booking-summary__v">' + esc(state.pole) + '</span></li>'
      + '    <li><span class="booking-summary__k">Interlocuteur</span><span class="booking-summary__v">' + esc(lw ? lw.name : '') + '</span></li>'
      + '    <li><span class="booking-summary__k">Format &amp; durée</span><span class="booking-summary__v">' + esc(md ? md.label : '') + ' · ' + currentModeDuration() + ' min</span></li>'
      + '    <li><span class="booking-summary__k">Date retenue</span><span class="booking-summary__v" style="text-transform:capitalize">' + esc(formatDateFR(state.date)) + '</span></li>'
      + '    <li><span class="booking-summary__k">Horaire (Tunis)</span><span class="booking-summary__v">' + (state.time ? esc(state.time) : 'À sélectionner') + '</span></li>'
      + '  </ul>'
      + '  <p class="booking-summary__note">'
      + '    <strong>Secret professionnel garanti.</strong> Vos échanges et pièces communiquées au cabinet sont strictement confidentiels (45, rue Ali Darghouth — Tunis).'
      + '  </p>'
      + '</aside>';
  }

  function renderStep1() {
    var polesHtml = (state.config.poles || []).map(function (p) {
      var sel = state.pole === p.title ? ' is-selected' : '';
      return '<button type="button" class="booking-pole' + sel + '" data-action="pole" data-val="' + esc(p.title) + '">'
        + '<span>' + esc(p.title) + '</span><span class="booking-pole__dot" aria-hidden="true"></span>'
        + '</button>';
    }).join('');

    var lawyersHtml = (state.config.lawyers || []).map(function (l) {
      var sel = state.lawyerSlug === l.slug ? ' is-selected' : '';
      var avatar = l.img
        ? '<img class="booking-lawyer__avatar" src="' + esc(l.img) + '" alt="' + esc(l.name) + '" width="48" height="48">'
        : '<span class="booking-lawyer__avatar" aria-hidden="true">JA</span>';
      return '<button type="button" class="booking-lawyer' + sel + '" data-action="lawyer" data-val="' + esc(l.slug) + '">'
        + avatar
        + '<span><span class="booking-lawyer__name">' + esc(l.name) + '</span>'
        + '<span class="booking-lawyer__role">' + esc(l.role) + '</span></span>'
        + '</button>';
    }).join('');

    var modesHtml = (state.config.modes || []).map(function (m) {
      var sel = state.mode === m.id ? ' is-selected' : '';
      return '<button type="button" class="booking-mode' + sel + '" data-action="mode" data-val="' + esc(m.id) + '">'
        + '<span class="booking-mode__top">'
        + '  <span class="booking-mode__title">' + esc(m.label) + '</span>'
        + '  <span class="booking-mode__dur">' + esc(m.duration) + ' min</span>'
        + '</span>'
        + '<span class="booking-mode__sub">' + esc(m.subtitle) + '</span>'
        + '</button>';
    }).join('');

    return ''
      + '<div class="booking-card">'
      + '  <div class="booking-block">'
      + '    <p class="booking-block__eyebrow">01 · Domaine d’intervention</p>'
      + '    <h2 class="booking-block__title">Quel pôle concerne votre dossier ?</h2>'
      + '    <div class="booking-poles">' + polesHtml + '</div>'
      + '  </div>'
      + '  <div class="booking-block">'
      + '    <p class="booking-block__eyebrow">02 · Choix de l’avocat</p>'
      + '    <h2 class="booking-block__title">Souhaitez-vous désigner un interlocuteur ?</h2>'
      + '    <div class="booking-lawyers">' + lawyersHtml + '</div>'
      + '  </div>'
      + '  <div class="booking-block">'
      + '    <p class="booking-block__eyebrow">03 · Format de l’entretien</p>'
      + '    <h2 class="booking-block__title">Comment souhaitez-vous échanger ?</h2>'
      + '    <div class="booking-modes">' + modesHtml + '</div>'
      + '  </div>'
      + '  <div class="booking-nav-row">'
      + '    <span class="form__hint">Étape 1 sur 3 — Disponibilités synchronisées en temps réel.</span>'
      + '    <button type="button" class="btn" data-action="goto-step" data-step="2">Choisir la date &amp; l’horaire &rarr;</button>'
      + '  </div>'
      + '</div>';
  }

  function renderCalendarCells() {
    var firstDow = new Date(Date.UTC(state.viewYear, state.viewMonth - 1, 1)).getUTCDay();
    var leadEmpty = (firstDow + 6) % 7; // Monday = 0 .. Sunday = 6
    var totalDays = new Date(Date.UTC(state.viewYear, state.viewMonth, 0)).getUTCDate();
    var ym = state.viewYear + '-' + pad2(state.viewMonth);
    var cells = [];

    for (var i = 0; i < leadEmpty; i++) {
      cells.push('<span class="cal-day cal-day--empty" aria-hidden="true"></span>');
    }
    for (var d = 1; d <= totalDays; d++) {
      var ds = ym + '-' + pad2(d);
      var info = state.monthAvailability[ds];
      var canPick = info && info.open && info.available > 0;
      var cls = 'cal-day';
      if (ds === state.date) cls += ' is-selected';
      if (ds === state.config.today) cls += ' is-today';
      if (canPick) {
        cells.push(
          '<button type="button" class="' + cls + '" data-action="pick-date" data-date="' + ds + '" title="' + info.available + ' créneau(x) libre(s)">'
          + '<span>' + d + '</span><span class="cal-day__dot" aria-hidden="true"></span>'
          + '</button>'
        );
      } else {
        cells.push('<button type="button" class="' + cls + '" disabled>' + d + '</button>');
      }
    }
    return cells.join('');
  }

  function renderStep2() {
    var todayYm = state.config.today.slice(0, 7);
    var curYm = state.viewYear + '-' + pad2(state.viewMonth);
    var prevDisabled = curYm <= todayYm ? ' disabled' : '';

    var morning = state.daySlots.filter(function (s) { return s.period === 'morning'; });
    var afternoon = state.daySlots.filter(function (s) { return s.period !== 'morning'; });

    function slotButtons(list) {
      return list.map(function (s) {
        var cls = 'slot-btn' + (state.time === s.time ? ' is-selected' : '');
        if (!s.available) {
          return '<button type="button" class="slot-btn" disabled title="Créneau indisponible">' + esc(s.time) + '</button>';
        }
        return '<button type="button" class="' + cls + '" data-action="pick-time" data-time="' + esc(s.time) + '">' + esc(s.time) + '</button>';
      }).join('');
    }

    var slotsBody = '';
    if (state.loadingSlots) {
      slotsBody = '<p class="body-text">Chargement des créneaux disponibles…</p>';
    } else if (!state.date) {
      slotsBody = '<p class="body-text">Sélectionnez une date dans le calendrier pour afficher les créneaux.</p>';
    } else if (!state.daySlots.length) {
      slotsBody = '<p class="body-text">Aucun créneau ouvert à cette date. Veuillez choisir un autre jour ouvré.</p>';
    } else {
      if (morning.length) {
        slotsBody += '<div class="slots-group"><p class="slots-group__label">Matinée</p><div class="slots-grid">' + slotButtons(morning) + '</div></div>';
      }
      if (afternoon.length) {
        slotsBody += '<div class="slots-group"><p class="slots-group__label">Après-midi</p><div class="slots-grid">' + slotButtons(afternoon) + '</div></div>';
      }
    }

    return ''
      + '<div class="booking-card">'
      + '  <p class="booking-block__eyebrow">Étape 02 · Agenda en temps réel</p>'
      + '  <h2 class="booking-block__title">Choisissez le jour et l’heure de votre rendez-vous</h2>'
      + (state.error ? '<div class="form__feedback" data-tone="error" style="margin-bottom:18px">' + esc(state.error) + '</div>' : '')
      + '  <div class="booking-cal-grid">'
      + '    <div class="cal-box">'
      + '      <div class="cal-head">'
      + '        <button type="button" class="cal-nav-btn" data-action="prev-month" aria-label="Mois précédent"' + prevDisabled + '>&lsaquo;</button>'
      + '        <h3 class="cal-head__title">' + MONTHS_FR[state.viewMonth - 1] + ' ' + state.viewYear + '</h3>'
      + '        <button type="button" class="cal-nav-btn" data-action="next-month" aria-label="Mois suivant">&rsaquo;</button>'
      + '      </div>'
      + '      <div class="cal-weekdays">' + WEEKDAYS_SHORT.map(function (w) { return '<span>' + w + '</span>'; }).join('') + '</div>'
      + '      <div class="cal-days">' + renderCalendarCells() + '</div>'
      + '    </div>'
      + '    <div>'
      + '      <p class="booking-block__eyebrow" style="text-transform:uppercase">' + esc(formatDateFR(state.date)) + '</p>'
      + '      <p class="form__hint" style="margin-bottom:14px">Fuseau horaire : Tunis (UTC+1) · Durée : ' + currentModeDuration() + ' minutes</p>'
      + slotsBody
      + '    </div>'
      + '  </div>'
      + '  <div class="booking-nav-row">'
      + '    <button type="button" class="btn btn--ghost" data-action="goto-step" data-step="1">&larr; Étape précédente</button>'
      + '    <button type="button" class="btn" data-action="goto-step" data-step="3"' + (!state.date || !state.time ? ' disabled' : '') + '>Continuer vers vos coordonnées &rarr;</button>'
      + '  </div>'
      + '</div>';
  }

  function renderStep3() {
    var f = state.form;
    return ''
      + '<form class="booking-card form" id="bookingDetailsForm" novalidate>'
      + '  <p class="booking-block__eyebrow">Étape 03 · Coordonnées &amp; Dossier</p>'
      + '  <h2 class="booking-block__title">Finalisez votre demande de consultation</h2>'
      + (state.error ? '<div class="form__feedback" data-tone="error">' + esc(state.error) + '</div>' : '')
      + '  <div class="form__row form__row--2">'
      + '    <div class="field">'
      + '      <label for="bk-nom">Nom et prénom *</label>'
      + '      <input id="bk-nom" name="nom" type="text" required minlength="2" placeholder="Votre nom complet" value="' + esc(f.nom) + '">'
      + '    </div>'
      + '    <div class="field">'
      + '      <label for="bk-societe">Société / Institution</label>'
      + '      <input id="bk-societe" name="societe" type="text" placeholder="Optionnel" value="' + esc(f.societe) + '">'
      + '    </div>'
      + '  </div>'
      + '  <div class="form__row form__row--2">'
      + '    <div class="field">'
      + '      <label for="bk-email">Adresse e-mail *</label>'
      + '      <input id="bk-email" name="email" type="email" required placeholder="vous@societe.tn" value="' + esc(f.email) + '">'
      + '    </div>'
      + '    <div class="field">'
      + '      <label for="bk-tel">Téléphone *</label>'
      + '      <input id="bk-tel" name="tel" type="tel" required placeholder="+216 71 256 751" value="' + esc(f.tel) + '">'
      + '    </div>'
      + '  </div>'
      + '  <div class="field">'
      + '    <label for="bk-urgency">Niveau d’échéance</label>'
      + '    <select id="bk-urgency" name="urgency">'
      + '      <option value="normal"' + (f.urgency === 'normal' ? ' selected' : '') + '>Consultation standard</option>'
      + '      <option value="prioritaire"' + (f.urgency === 'prioritaire' ? ' selected' : '') + '>Échéance contractuelle ou judiciaire proche</option>'
      + '      <option value="urgent"' + (f.urgency === 'urgent' ? ' selected' : '') + '>Urgence procédurale (audience / mise en demeure)</option>'
      + '    </select>'
      + '  </div>'
      + '  <div class="field">'
      + '    <label for="bk-message">Objet synthétique du dossier *</label>'
      + '    <textarea id="bk-message" name="message" required minlength="8" placeholder="Décrivez brièvement le contexte, l’opération ou le litige afin que l’avocat prépare utilement l’entretien.">' + esc(f.message) + '</textarea>'
      + '  </div>'
      + '  <div class="booking-nav-row">'
      + '    <button type="button" class="btn btn--ghost" data-action="goto-step" data-step="2">&larr; Modifier le créneau</button>'
      + '    <button type="submit" class="btn"' + (state.submitting ? ' disabled' : '') + '>'
      + (state.submitting ? 'Enregistrement en cours…' : 'Confirmer le rendez-vous &rarr;')
      + '    </button>'
      + '  </div>'
      + '</form>';
  }

  function renderStep4() {
    var r = state.confirmedReservation;
    if (!r) return '';
    var icsHref = state.onlineApi
      ? '/api/reservations/' + encodeURIComponent(r.ref) + '/ics?email=' + encodeURIComponent(r.email)
      : buildClientICSBlobUrl(r);

    return ''
      + '<div class="booking-card">'
      + '  <div class="booking-confirm-box">'
      + '    <div style="display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:12px;margin-bottom:12px">'
      + '      <span class="booking-ref-pill">Réf. ' + esc(r.ref) + '</span>'
      + '      <span class="booking-status booking-status--' + esc(r.status) + '">' + esc(STATUS_LABELS[r.status] || r.status) + '</span>'
      + '    </div>'
      + '    <h2 style="font-family:var(--font-display);font-size:1.55rem;font-weight:400;margin:0 0 8px;color:var(--ink)">Votre demande de rendez-vous est enregistrée.</h2>'
      + '    <p style="margin:0;font-size:.9rem;color:var(--slate);line-height:1.6">'
      + '      Conservez précieusement votre référence <strong>' + esc(r.ref) + '</strong> : elle vous permet à tout moment de suivre la validation du cabinet, télécharger l’invitation calendrier ou reporter votre créneau.'
      + '    </p>'
      + '  </div>'
      + '  <div class="facts" style="margin-bottom:26px">'
      + '    <div class="facts__row"><span class="facts__label">Client</span><span class="facts__value">' + esc(r.nom) + (r.societe ? ' (' + esc(r.societe) + ')' : '') + '</span></div>'
      + '    <div class="facts__row"><span class="facts__label">Date &amp; heure</span><span class="facts__value" style="text-transform:capitalize">' + esc(formatDateFR(r.date)) + ' à ' + esc(r.time) + ' (' + esc(r.duration) + ' min)</span></div>'
      + '    <div class="facts__row"><span class="facts__label">Format</span><span class="facts__value">' + esc(MODE_LABELS[r.mode] || r.mode) + '</span></div>'
      + '    <div class="facts__row"><span class="facts__label">Interlocuteur</span><span class="facts__value">' + esc(r.lawyerName) + '</span></div>'
      + '    <div class="facts__row"><span class="facts__label">Pôle</span><span class="facts__value">' + esc(r.pole) + '</span></div>'
      + '  </div>'
      + '  <div class="btn-row booking-no-print">'
      + '    <a class="btn" href="' + esc(icsHref) + '" download="JurisAffaires-' + esc(r.ref) + '.ics">Ajouter à mon agenda (.ics)</a>'
      + '    <button type="button" class="btn btn--ghost" data-action="copy-ref" data-ref="' + esc(r.ref) + '">Copier la référence</button>'
      + '    <button type="button" class="btn btn--ghost" data-action="print">Imprimer le récépissé</button>'
      + '    <button type="button" class="btn btn--ghost" data-action="open-manage" data-ref="' + esc(r.ref) + '" data-email="' + esc(r.email) + '">Gérer / Modifier</button>'
      + '  </div>'
      + '</div>';
  }

  function renderManageTab() {
    var recents = getRecentClientRefs();
    var m = state.managedReservation;
    var recentPills = recents.length
      ? '<div style="margin-top:16px"><p class="form__hint" style="margin-bottom:8px">Vos demandes récentes sur cet appareil :</p><div style="display:flex;flex-wrap:wrap;gap:8px">'
        + recents.map(function (x) {
          return '<button type="button" class="btn btn--ghost btn--sm" data-action="quick-lookup" data-ref="' + esc(x.ref) + '" data-email="' + esc(x.email) + '">'
            + esc(x.ref) + ' · ' + esc(x.date)
            + '</button>';
        }).join('')
        + '</div></div>'
      : '';

    var resultHtml = '';
    if (m) {
      var icsHref = state.onlineApi
        ? '/api/reservations/' + encodeURIComponent(m.ref) + '/ics?email=' + encodeURIComponent(m.email)
        : buildClientICSBlobUrl(m);
      var canModify = m.status !== 'cancelled' && m.status !== 'completed';

      var reschedBox = '';
      if (state.rescheduleOpen && canModify) {
        var rSlots = state.rescheduleSlots.map(function (s) {
          if (!s.available) return '<button type="button" class="slot-btn" disabled>' + esc(s.time) + '</button>';
          var cls = 'slot-btn' + (state.rescheduleTime === s.time ? ' is-selected' : '');
          return '<button type="button" class="' + cls + '" data-action="pick-resched-time" data-time="' + esc(s.time) + '">' + esc(s.time) + '</button>';
        }).join('');
        reschedBox = ''
          + '<div class="cal-box" style="margin-top:22px">'
          + '  <p class="booking-block__eyebrow">Reporter le rendez-vous</p>'
          + '  <div class="form__row form__row--2" style="margin:10px 0 16px">'
          + '    <div class="field">'
          + '      <label for="rs-date">Nouvelle date souhaitée</label>'
          + '      <input id="rs-date" type="date" min="' + esc(state.config.today) + '" value="' + esc(state.rescheduleDate) + '">'
          + '    </div>'
          + '  </div>'
          + '  <div class="slots-grid" style="margin-bottom:16px">' + (rSlots || '<span class="form__hint">Aucun créneau libre à cette date.</span>') + '</div>'
          + '  <div class="btn-row">'
          + '    <button type="button" class="btn btn--sm" data-action="confirm-reschedule"' + (!state.rescheduleDate || !state.rescheduleTime ? ' disabled' : '') + '>Valider le report</button>'
          + '    <button type="button" class="btn btn--ghost btn--sm" data-action="close-reschedule">Annuler</button>'
          + '  </div>'
          + '</div>';
      }

      resultHtml = ''
        + '<div class="booking-card" style="margin-top:24px">'
        + '  <div style="display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:12px;margin-bottom:18px">'
        + '    <span class="booking-ref-pill">' + esc(m.ref) + '</span>'
        + '    <span class="booking-status booking-status--' + esc(m.status) + '">' + esc(STATUS_LABELS[m.status] || m.status) + '</span>'
        + '  </div>'
        + (m.publicNote ? '<div class="booking-confirm-box" style="margin-bottom:20px"><strong>Message / informations du cabinet :</strong><br>' + esc(m.publicNote) + '</div>' : '')
        + '  <div class="facts">'
        + '    <div class="facts__row"><span class="facts__label">Titulaire</span><span class="facts__value">' + esc(m.nom) + (m.societe ? ' — ' + esc(m.societe) : '') + '</span></div>'
        + '    <div class="facts__row"><span class="facts__label">Date &amp; horaire</span><span class="facts__value" style="text-transform:capitalize">' + esc(formatDateFR(m.date)) + ' à ' + esc(m.time) + ' (' + esc(m.duration) + ' min)</span></div>'
        + '    <div class="facts__row"><span class="facts__label">Format</span><span class="facts__value">' + esc(MODE_LABELS[m.mode] || m.mode) + '</span></div>'
        + '    <div class="facts__row"><span class="facts__label">Interlocuteur</span><span class="facts__value">' + esc(m.lawyerName) + '</span></div>'
        + '    <div class="facts__row"><span class="facts__label">Pôle</span><span class="facts__value">' + esc(m.pole) + '</span></div>'
        + '  </div>'
        + '  <div class="btn-row" style="margin-top:24px">'
        + (m.status !== 'cancelled' ? '<a class="btn btn--sm" href="' + esc(icsHref) + '" download="JurisAffaires-' + esc(m.ref) + '.ics">Télécharger l’invitation (.ics)</a>' : '')
        + (canModify ? '<button type="button" class="btn btn--ghost btn--sm" data-action="open-reschedule">Reporter la date / l’heure</button>' : '')
        + (canModify ? '<button type="button" class="btn btn--ghost btn--sm" data-action="cancel-booking" style="color:#8C2F12;border-color:rgba(140,47,18,.35)">Annuler ce rendez-vous</button>' : '')
        + '  </div>'
        + reschedBox
        + '</div>';
    }

    return ''
      + '<div style="max-width:780px">'
      + '  <form class="booking-card form" id="lookupForm">'
      + '    <p class="booking-block__eyebrow">Suivi de dossier &amp; modification</p>'
      + '    <h2 class="booking-block__title">Retrouvez votre rendez-vous</h2>'
      + (state.lookupError ? '<div class="form__feedback" data-tone="error">' + esc(state.lookupError) + '</div>' : '')
      + '    <div class="form__row form__row--2">'
      + '      <div class="field">'
      + '        <label for="lk-ref">Référence du rendez-vous *</label>'
      + '        <input id="lk-ref" type="text" required placeholder="Ex : JA-2026-4108" value="' + esc(state.lookupRef) + '">'
      + '      </div>'
      + '      <div class="field">'
      + '        <label for="lk-email">Adresse e-mail utilisée *</label>'
      + '        <input id="lk-email" type="email" required placeholder="vous@societe.tn" value="' + esc(state.lookupEmail) + '">'
      + '      </div>'
      + '    </div>'
      + '    <div style="margin-top:18px">'
      + '      <button type="submit" class="btn">Consulter mon rendez-vous &rarr;</button>'
      + '    </div>'
      + recentPills
      + '  </form>'
      + resultHtml
      + '</div>';
  }

  function render() {
    var tabsHtml = ''
      + '<div class="booking-tabs" role="tablist" aria-label="Options de rendez-vous">'
      + '  <button type="button" class="booking-tab' + (state.tab === 'book' ? ' is-active' : '') + '" data-action="tab" data-tab="book">Planifier une consultation</button>'
      + '  <button type="button" class="booking-tab' + (state.tab === 'manage' ? ' is-active' : '') + '" data-action="tab" data-tab="manage">Suivre / Modifier un rendez-vous</button>'
      + '</div>';

    if (state.tab === 'manage') {
      root.innerHTML = tabsHtml + renderManageTab();
      return;
    }

    var stepsHtml = '';
    if (state.step <= 3) {
      var labels = ['Domaine & Avocat', 'Date & Créneau', 'Coordonnées'];
      stepsHtml = '<div class="booking-steps">' + labels.map(function (lb, i) {
        var n = i + 1;
        var cls = 'booking-step-pill' + (state.step === n ? ' is-active' : (state.step > n ? ' is-done' : ''));
        var canJump = n === 1 || (n === 2) || (n === 3 && state.date && state.time);
        return '<button type="button" class="' + cls + '"' + (canJump ? ' data-action="goto-step" data-step="' + n + '"' : ' disabled') + '>'
          + '<span class="booking-step-pill__num">0' + n + '</span>'
          + '<span class="booking-step-pill__label">' + esc(lb) + '</span>'
          + '</button>';
      }).join('') + '</div>';
    }

    var stepContent = state.step === 1
      ? renderStep1()
      : state.step === 2
        ? renderStep2()
        : state.step === 3
          ? renderStep3()
          : renderStep4();

    root.innerHTML = tabsHtml
      + (state.step <= 3
        ? '<div class="booking-shell"><div>' + stepsHtml + stepContent + '</div>' + renderSummaryAside() + '</div>'
        : stepContent);
  }

  async function syncFormFieldsIfVisible() {
    var nomEl = document.getElementById('bk-nom');
    if (!nomEl) return;
    state.form.nom = nomEl.value;
    state.form.societe = (document.getElementById('bk-societe') || {}).value || '';
    state.form.email = (document.getElementById('bk-email') || {}).value || '';
    state.form.tel = (document.getElementById('bk-tel') || {}).value || '';
    state.form.urgency = (document.getElementById('bk-urgency') || {}).value || 'normal';
    state.form.message = (document.getElementById('bk-message') || {}).value || '';
  }

  async function loadRescheduleSlotsFor(dateStr) {
    state.rescheduleDate = dateStr;
    state.rescheduleTime = '';
    if (state.onlineApi && state.managedReservation) {
      try {
        var r = await fetch('/api/reservations/slots?date=' + encodeURIComponent(dateStr)
          + '&lawyer=' + encodeURIComponent(state.managedReservation.lawyerSlug)
          + '&mode=' + encodeURIComponent(state.managedReservation.mode)
          + '&excludeId=' + encodeURIComponent(state.managedReservation.id));
        if (r.ok) {
          var j = await r.json();
          state.rescheduleSlots = j.slots || [];
          var first = state.rescheduleSlots.find(function (s) { return s.available; });
          if (first) state.rescheduleTime = first.time;
          render();
          return;
        }
      } catch (e) {}
    }
    state.rescheduleSlots = computeOfflineDaySlots(dateStr, state.mode).slots;
    if (state.rescheduleSlots[0]) state.rescheduleTime = state.rescheduleSlots[0].time;
    render();
  }

  async function performLookup(ref, email) {
    state.lookupRef = String(ref || '').trim().toUpperCase();
    state.lookupEmail = String(email || '').trim().toLowerCase();
    state.lookupError = '';
    state.rescheduleOpen = false;
    try {
      var r = await fetch('/api/reservations/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ref: state.lookupRef, email: state.lookupEmail })
      });
      var j = await r.json().catch(function () { return {}; });
      if (!r.ok) throw new Error(j.error || 'Rendez-vous introuvable.');
      state.managedReservation = j.reservation;
    } catch (e) {
      state.managedReservation = null;
      state.lookupError = e.message || 'Impossible de retrouver ce rendez-vous.';
    }
    render();
  }

  // Event delegation on root
  root.addEventListener('click', async function (e) {
    var btn = e.target.closest('[data-action]');
    if (!btn) return;
    var action = btn.getAttribute('data-action');
    await syncFormFieldsIfVisible();
    state.error = '';

    if (action === 'tab') {
      state.tab = btn.getAttribute('data-tab');
      render();
      return;
    }
    if (action === 'pole') {
      state.pole = btn.getAttribute('data-val');
      render();
      return;
    }
    if (action === 'lawyer') {
      state.lawyerSlug = btn.getAttribute('data-val');
      state.date = '';
      state.time = '';
      render();
      autoPickFirstAvailableDate();
      return;
    }
    if (action === 'mode') {
      state.mode = btn.getAttribute('data-val');
      state.date = '';
      state.time = '';
      render();
      autoPickFirstAvailableDate();
      return;
    }
    if (action === 'goto-step') {
      var target = parseInt(btn.getAttribute('data-step'), 10);
      state.step = target;
      if (target === 2 && !state.date) {
        await autoPickFirstAvailableDate();
      } else {
        render();
      }
      root.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    if (action === 'prev-month') {
      if (state.viewMonth === 1) { state.viewMonth = 12; state.viewYear -= 1; }
      else { state.viewMonth -= 1; }
      await loadMonthAvailability();
      render();
      return;
    }
    if (action === 'next-month') {
      if (state.viewMonth === 12) { state.viewMonth = 1; state.viewYear += 1; }
      else { state.viewMonth += 1; }
      await loadMonthAvailability();
      render();
      return;
    }
    if (action === 'pick-date') {
      await selectDateAndLoadSlots(btn.getAttribute('data-date'));
      return;
    }
    if (action === 'pick-time') {
      state.time = btn.getAttribute('data-time');
      render();
      return;
    }
    if (action === 'copy-ref') {
      var refVal = btn.getAttribute('data-ref');
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(refVal);
        btn.textContent = 'Référence copiée ✓';
      }
      return;
    }
    if (action === 'print') {
      window.print();
      return;
    }
    if (action === 'open-manage' || action === 'quick-lookup') {
      state.tab = 'manage';
      await performLookup(btn.getAttribute('data-ref'), btn.getAttribute('data-email'));
      return;
    }
    if (action === 'open-reschedule') {
      state.rescheduleOpen = true;
      await loadRescheduleSlotsFor(state.managedReservation.date);
      return;
    }
    if (action === 'close-reschedule') {
      state.rescheduleOpen = false;
      render();
      return;
    }
    if (action === 'pick-resched-time') {
      state.rescheduleTime = btn.getAttribute('data-time');
      render();
      return;
    }
    if (action === 'confirm-reschedule') {
      var m = state.managedReservation;
      try {
        var rr = await fetch('/api/reservations/client/' + encodeURIComponent(m.ref), {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: m.email,
            action: 'reschedule',
            date: state.rescheduleDate,
            time: state.rescheduleTime
          })
        });
        var rj = await rr.json().catch(function () { return {}; });
        if (!rr.ok) throw new Error(rj.error || 'Report impossible.');
        state.managedReservation = rj.reservation;
        state.rescheduleOpen = false;
        saveRecentClientRef(rj.reservation);
        await autoPickFirstAvailableDate();
      } catch (err) {
        state.lookupError = err.message;
        render();
      }
      return;
    }
    if (action === 'cancel-booking') {
      if (!window.confirm('Confirmer l’annulation de ce rendez-vous ?')) return;
      var cur = state.managedReservation;
      try {
        var cr = await fetch('/api/reservations/client/' + encodeURIComponent(cur.ref), {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: cur.email, action: 'cancel' })
        });
        var cj = await cr.json().catch(function () { return {}; });
        if (!cr.ok) throw new Error(cj.error || 'Annulation impossible.');
        state.managedReservation = cj.reservation;
        state.rescheduleOpen = false;
        await autoPickFirstAvailableDate();
      } catch (err2) {
        state.lookupError = err2.message;
        render();
      }
    }
  });

  root.addEventListener('change', function (e) {
    if (e.target && e.target.id === 'rs-date' && e.target.value) {
      loadRescheduleSlotsFor(e.target.value);
    }
  });

  root.addEventListener('submit', async function (e) {
    if (e.target && e.target.id === 'bookingDetailsForm') {
      e.preventDefault();
      await syncFormFieldsIfVisible();
      var f = state.form;
      if (f.nom.trim().length < 2) { state.error = 'Veuillez indiquer votre nom complet.'; render(); return; }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(f.email.trim())) { state.error = 'Veuillez saisir une adresse e-mail valide.'; render(); return; }
      if (f.tel.replace(/\D/g, '').length < 8) { state.error = 'Veuillez indiquer un numéro de téléphone joignable.'; render(); return; }
      if (f.message.trim().length < 8) { state.error = 'Veuillez préciser brièvement l’objet de votre consultation.'; render(); return; }

      state.submitting = true;
      state.error = '';
      render();

      var payload = {
        nom: f.nom.trim(),
        societe: f.societe.trim(),
        email: f.email.trim(),
        tel: f.tel.trim(),
        pole: state.pole,
        lawyerSlug: state.lawyerSlug,
        mode: state.mode,
        date: state.date,
        time: state.time,
        urgency: f.urgency,
        message: f.message.trim()
      };

      try {
        if (state.onlineApi) {
          var res = await fetch('/api/reservations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
          var j = await res.json().catch(function () { return {}; });
          if (res.status === 409) {
            state.submitting = false;
            state.step = 2;
            state.error = j.error || 'Ce créneau vient d’être réservé. Choisissez un nouvel horaire.';
            await loadMonthAvailability();
            await selectDateAndLoadSlots(state.date);
            return;
          }
          if (!res.ok) throw new Error(j.error || 'Erreur lors de la réservation.');
          state.confirmedReservation = j.reservation;
        } else {
          state.confirmedReservation = Object.assign({
            ref: 'JA-' + new Date().getFullYear() + '-' + Math.floor(1000 + Math.random() * 9000),
            lawyerName: currentLawyerObj().name,
            duration: currentModeDuration(),
            status: 'pending'
          }, payload);
        }
        saveRecentClientRef(state.confirmedReservation);
        state.submitting = false;
        state.step = 4;
        render();
        root.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } catch (err) {
        state.submitting = false;
        state.error = err.message || 'Une erreur est survenue.';
        render();
      }
      return;
    }

    if (e.target && e.target.id === 'lookupForm') {
      e.preventDefault();
      var refIn = document.getElementById('lk-ref');
      var emIn = document.getElementById('lk-email');
      await performLookup(refIn ? refIn.value : '', emIn ? emIn.value : '');
    }
  });

  // Initial bootstrap: read query params (?avocat=..., ?pole=..., ?tab=manage, ?ref=..., ?email=...) & load live config
  (async function init() {
    render();
    try {
      var r = await fetch('/api/reservations/config');
      if (r.ok) {
        state.config = await r.json();
        state.onlineApi = true;
      }
    } catch (e) {
      state.onlineApi = false;
    }

    if (state.config.today) {
      var tp = state.config.today.split('-').map(Number);
      state.viewYear = tp[0];
      state.viewMonth = tp[1];
    }
    if (state.config.poles && state.config.poles.length) {
      state.pole = state.config.poles[0].title;
    }

    var params = new URLSearchParams(window.location.search);
    var qAvocat = params.get('avocat');
    var qPole = params.get('pole');
    var qTab = params.get('tab');
    var qRef = params.get('ref');
    var qEmail = params.get('email');

    if (qAvocat && (state.config.lawyers || []).some(function (l) { return l.slug === qAvocat; })) {
      state.lawyerSlug = qAvocat;
    }
    if (qPole) {
      var matchPole = (state.config.poles || []).find(function (p) {
        return p.slug === qPole || p.title.toLowerCase() === qPole.toLowerCase();
      });
      if (matchPole) state.pole = matchPole.title;
    }
    if (qTab === 'manage' || qRef) {
      state.tab = 'manage';
      if (qRef && qEmail) {
        await performLookup(qRef, qEmail);
        return;
      }
      if (qRef) state.lookupRef = qRef.toUpperCase();
      render();
      return;
    }

    await autoPickFirstAvailableDate();
  })();
})();
