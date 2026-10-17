/* =====================================================================
   JURISAFFAIRES — Homepage concept demo
   Vanilla JavaScript · no dependencies
   ---------------------------------------------------------------------
   1. Header state on scroll
   2. Reading-progress hairline
   3. Mobile menu
   4. Scroll reveal (IntersectionObserver)
   5. Active navigation state
   6. Mobile sticky contact bar
   7. Dynamic copyright year
   8. Hero intro
   ===================================================================== */

(function () {
  'use strict';

  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ------------------------------------------------------------------
     1. Header state (smart sticky: hides on scroll down, reveals on up)
     ------------------------------------------------------------------ */
  var header = document.getElementById('header');
  var burger = document.getElementById('burger');
  var menu = document.getElementById('mobileMenu');
  var lastY = window.pageYOffset || document.documentElement.scrollTop;
  var scrollThreshold = 8;

  function onScroll() {
    if (!header) return;
    var y = window.pageYOffset || document.documentElement.scrollTop;
    header.classList.toggle('is-stuck', y > 40);

    // Keep header visible when mobile menu is open
    if (menu && menu.classList.contains('is-open')) {
      header.classList.remove('is-hidden');
      lastY = y;
      return;
    }

    if (y <= 50) {
      header.classList.remove('is-hidden');
    } else if (y > lastY + scrollThreshold) {
      // Scrolling down: hide floating header so content and portraits are unobstructed
      header.classList.add('is-hidden');
    } else if (y < lastY - scrollThreshold) {
      // Scrolling up: reveal header for easy navigation
      header.classList.remove('is-hidden');
    }
    lastY = y;
  }

  /* ------------------------------------------------------------------
     2. Reading progress
     ------------------------------------------------------------------ */
  var progress = document.getElementById('progress');

  function onScrollProgress() {
    if (!progress) return;
    var doc = document.documentElement;
    var max = doc.scrollHeight - window.innerHeight;
    var ratio = max > 0 ? (window.pageYOffset || doc.scrollTop) / max : 0;
    progress.style.transform = 'scaleX(' + Math.min(Math.max(ratio, 0), 1) + ')';
  }

  var ticking = false;
  function onScrollFrame() {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(function () {
      onScroll();
      onScrollProgress();
      ticking = false;
    });
  }

  window.addEventListener('scroll', onScrollFrame, { passive: true });
  window.addEventListener('resize', onScrollFrame, { passive: true });
  onScroll();
  onScrollProgress();

  /* ------------------------------------------------------------------
     3. Mobile menu
     ------------------------------------------------------------------ */
  var burger = document.getElementById('burger');
  var menu = document.getElementById('mobileMenu');

  if (burger && menu) {
    function setMenu(open) {
      if (open && header) header.classList.remove('is-hidden');
      burger.classList.toggle('is-open', open);
      burger.setAttribute('aria-expanded', String(open));
      burger.setAttribute('aria-label', open ? 'Fermer le menu' : 'Ouvrir le menu');
      menu.classList.toggle('is-open', open);
      menu.setAttribute('aria-hidden', String(!open));
      document.body.classList.toggle('is-locked', open);
    }

    burger.addEventListener('click', function () {
      setMenu(!menu.classList.contains('is-open'));
    });

    menu.addEventListener('click', function (e) {
      if (e.target.closest('a')) setMenu(false);
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && menu.classList.contains('is-open')) {
        setMenu(false);
        burger.focus();
      }
    });

    // Close the drawer if the viewport grows past the desktop breakpoint.
    var desktop = window.matchMedia('(min-width: 1060px)');
    var onBreakpoint = function (e) { if (e.matches) setMenu(false); };
    if (desktop.addEventListener) desktop.addEventListener('change', onBreakpoint);
    else if (desktop.addListener) desktop.addListener(onBreakpoint);
  }

  /* ------------------------------------------------------------------
     4. Scroll reveal
     ------------------------------------------------------------------ */
  var revealTargets = document.querySelectorAll('[data-reveal], .wipe, .draw-x');

  if (!('IntersectionObserver' in window) || reducedMotion) {
    revealTargets.forEach(function (el) { el.classList.add('is-visible'); });
  } else {
    var revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        revealObserver.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });

    revealTargets.forEach(function (el) { revealObserver.observe(el); });

    // Anything already inside the first viewport reveals immediately.
    window.requestAnimationFrame(function () {
      revealTargets.forEach(function (el) {
        var r = el.getBoundingClientRect();
        if (r.top < window.innerHeight * 0.92 && r.bottom > 0) {
          el.classList.add('is-visible');
          revealObserver.unobserve(el);
        }
      });
    });
  }

  /* ------------------------------------------------------------------
     5. Active navigation state
     ------------------------------------------------------------------ */
  var sections = Array.prototype.slice.call(
    document.querySelectorAll('main section[id]')
  );
  var navLinks = Array.prototype.slice.call(
    document.querySelectorAll('.nav__link[href^="#"]')
  );

  var byId = {};
  navLinks.forEach(function (link) {
    byId[link.getAttribute('href').slice(1)] = link;
  });

  if ('IntersectionObserver' in window && sections.length) {
    var visible = {};
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        visible[entry.target.id] = entry.isIntersecting ? entry.intersectionRatio : 0;
      });

      var bestId = null;
      var best = 0;
      Object.keys(visible).forEach(function (id) {
        if (visible[id] > best) { best = visible[id]; bestId = id; }
      });

      navLinks.forEach(function (link) { link.classList.remove('is-active'); });
      if (bestId && byId[bestId]) byId[bestId].classList.add('is-active');
    }, { threshold: [0.15, 0.35, 0.6], rootMargin: '-88px 0px -40% 0px' });

    sections.forEach(function (section) { spy.observe(section); });
  }

  /* ------------------------------------------------------------------
     6. Mobile sticky contact bar
     ------------------------------------------------------------------ */
  var stickyBar = document.getElementById('stickyBar');

  if (stickyBar) {
    var hero = document.getElementById('hero');

    function onSticky() {
      if (window.innerWidth >= 1060) {
        stickyBar.classList.remove('is-visible');
        return;
      }
      var past = (window.pageYOffset || 0) > (hero ? hero.offsetHeight - 140 : 600);
      var atBottom =
        (window.pageYOffset || 0) + window.innerHeight > document.body.scrollHeight - 40;
      stickyBar.classList.toggle('is-visible', past && !atBottom);
    }

    window.addEventListener('scroll', onSticky, { passive: true });
    window.addEventListener('resize', onSticky, { passive: true });
    onSticky();
  }

  /* ------------------------------------------------------------------
     7. Dynamic copyright year — no stale hard-coded year
     ------------------------------------------------------------------ */
  var year = document.getElementById('year');
  if (year) year.textContent = String(new Date().getFullYear());

  /* ------------------------------------------------------------------
     8. Hero intro
     ------------------------------------------------------------------ */
  var heroEl = document.getElementById('hero');
  if (heroEl) {
    window.requestAnimationFrame(function () {
      heroEl.classList.add('is-ready');
    });
  }

  /* ------------------------------------------------------------------
     9. Contact form — concept demo, no back-end.
     Composes a pre-filled e-mail in the visitor's own mail client.
     Nothing is transmitted or stored by this page.
     ------------------------------------------------------------------ */
  var form = document.getElementById('contactForm');

  if (form) {
    var feedback = form.querySelector('.form__feedback');

    var say = function (message, tone) {
      if (!feedback) return;
      feedback.textContent = message;
      if (!message) { feedback.hidden = true; return; }   // plus rien a signaler
      feedback.setAttribute('data-tone', tone);
      feedback.hidden = false;
    };

    var clearField = function (el) {
      el.removeAttribute('aria-invalid');
      el.classList.remove('is-invalid');
    };

    var fields = function () {
      return Array.prototype.slice.call(
        form.querySelectorAll('input[required], textarea[required], select[required]'));
    };

    // On efface l'erreur d'un champ dès que l'utilisateur le corrige,
    // et le compteur du message est recalculé à chaque frappe.
    var recount = function () {
      var left = fields().filter(function (el) { return !el.value.trim(); }).length;
      if (left === 0) { say('', 'ok'); return; }
      say(left === 1
        ? 'Ce champ est obligatoire.'
        : left + ' champs obligatoires sont encore vides.', 'error');
    };

    fields().forEach(function (el) {
      var handler = function () {
        var wasInvalid = el.getAttribute('aria-invalid') === 'true';
        if (el.value.trim()) clearField(el);
        if (wasInvalid) recount();
      };
      el.addEventListener('input', handler);
      el.addEventListener('change', handler);
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();

      var required = fields();
      var missing = required.filter(function (el) { return !el.value.trim(); });

      required.forEach(clearField);

      if (missing.length) {
        missing.forEach(function (el) {
          el.setAttribute('aria-invalid', 'true');
          el.classList.add('is-invalid');
        });
        say(missing.length === 1
          ? 'Ce champ est obligatoire.'
          : missing.length + ' champs obligatoires sont encore vides.', 'error');
        missing[0].focus();
        return;
      }

      var get = function (n) {
        var el = form.querySelector('[name="' + n + '"]');
        return el ? el.value.trim() : '';
      };

      var body = [
        'Nom et prénom : ' + get('nom'),
        'Société        : ' + (get('societe') || '—'),
        'E-mail         : ' + get('email'),
        'Téléphone      : ' + (get('tel') || '—'),
        'Sujet          : ' + get('sujet'),
        '',
        'Message :',
        get('message')
      ].join('\n');

      var href = 'mailto:avocats-conseils@jurisaffaires.net'
        + '?subject=' + encodeURIComponent('Demande de contact — ' + get('sujet'))
        + '&body=' + encodeURIComponent(body);

      var btn = form.querySelector('button[type="submit"], button');
      if (btn) { btn.disabled = true; btn.setAttribute('aria-busy', 'true'); }
      say('Votre messagerie s’ouvre avec le message pré-rempli. '
        + 'Si rien ne s’ouvre, écrivez directement à avocats-conseils@jurisaffaires.net.', 'ok');

      window.location.href = href;
    });
  }
})();