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

  var syncStickyBar = function () {};

  /* ------------------------------------------------------------------
     3. Mobile menu
     ------------------------------------------------------------------ */
  var burger = document.getElementById('burger');
  var menu = document.getElementById('mobileMenu');

  if (burger && menu) {
    var menuLinks = function () {
      return Array.prototype.slice.call(
        menu.querySelectorAll('a[href], button:not([disabled])'));
    };

    function setMenu(open, restoreFocus) {
      if (open && header) header.classList.remove('is-hidden');
      burger.classList.toggle('is-open', open);
      burger.setAttribute('aria-expanded', String(open));
      burger.setAttribute('aria-label', open ? 'Fermer le menu' : 'Ouvrir le menu');
      menu.classList.toggle('is-open', open);
      menu.setAttribute('aria-hidden', String(!open));
      document.body.classList.toggle('is-locked', open);
      syncStickyBar();
      if (open) {
        // Le panneau passe de `visibility: hidden` à `visible` avec une
        // transition : on attend la fin du fondu avant de déplacer le focus,
        // sinon `focus()` est refusé par le navigateur.
        window.setTimeout(function () {
          if (!menu.classList.contains('is-open')) return;
          var first = menuLinks()[0];
          if (first) first.focus();
        }, 240);
      } else if (restoreFocus) {
        burger.focus();
      }
    }

    burger.addEventListener('click', function () {
      setMenu(!menu.classList.contains('is-open'), true);
    });

    menu.addEventListener('click', function (e) {
      if (e.target.closest('a')) setMenu(false, false);
    });

    document.addEventListener('keydown', function (e) {
      if (!menu.classList.contains('is-open')) return;
      if (e.key === 'Escape') {
        setMenu(false, true);
        return;
      }
      // Focus trap: keep keyboard navigation inside the open drawer.
      if (e.key !== 'Tab') return;
      var items = menuLinks();
      if (!items.length) return;
      var firstEl = items[0];
      var lastEl = items[items.length - 1];
      if (e.shiftKey && document.activeElement === firstEl) {
        e.preventDefault(); lastEl.focus();
      } else if (!e.shiftKey && document.activeElement === lastEl) {
        e.preventDefault(); firstEl.focus();
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
    var stickyForm = document.getElementById('contactForm') || document.getElementById('bookingApp');
    var stickyFooter = document.querySelector('footer.footer');

    function overlapsViewport(el) {
      if (!el) return false;
      var r = el.getBoundingClientRect();
      return r.top < window.innerHeight - 8 && r.bottom > 0;
    }

    function applySticky(visible) {
      stickyBar.classList.toggle('is-visible', visible);
      // `inert` retire les deux liens de la barre de l'ordre de tabulation ;
      // `aria-hidden` la retire de l'arbre d'accessibilité tant qu'elle est
      // hors écran. Les deux attributs vont toujours ensemble.
      if (visible) {
        stickyBar.removeAttribute('inert');
        stickyBar.removeAttribute('aria-hidden');
      } else {
        stickyBar.setAttribute('inert', '');
        stickyBar.setAttribute('aria-hidden', 'true');
      }
    }

    function onSticky() {
      if (window.innerWidth >= 1024) {
        stickyBar.classList.remove('is-suppressed');
        applySticky(false);
        return;
      }
      var past = (window.pageYOffset || 0) > (hero ? hero.offsetHeight - 140 : 600);
      // La barre ne doit recouvrir ni le menu ouvert, ni un champ du
      // formulaire, ni la fin du pied de page.
      var menuOpen = Boolean(menu && menu.classList.contains('is-open'));
      var blocked = menuOpen || overlapsViewport(stickyForm) || overlapsViewport(stickyFooter);
      stickyBar.classList.toggle('is-suppressed', blocked);
      applySticky(past && !blocked);
    }

    syncStickyBar = onSticky;
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
    var feedback = document.getElementById('formFeedback');
    var successBox = document.getElementById('formSuccess');
    var submitBtn = form.querySelector('button[type="submit"], button');

    var RULES = {
      nom: function (v) {
        return v.length >= 2 ? '' : 'Indiquez votre nom et prénom (2 caractères minimum).';
      },
      email: function (v) {
        return /^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$/.test(v)
          ? '' : 'Saisissez une adresse e-mail valide, par exemple nom@societe.tn.';
      },
      tel: function (v) {
        if (!v) return '';
        var digits = v.replace(/\D/g, '');
        return digits.length >= 8 && digits.length <= 15
          ? '' : 'Saisissez un numéro valide (8 à 15 chiffres).';
      },
      sujet: function (v) {
        return v ? '' : 'Sélectionnez une expertise dans la liste.';
      },
      message: function (v) {
        return v.length >= 10 ? '' : 'Décrivez votre demande en quelques mots (10 caractères minimum).';
      }
    };

    var LABELS = {
      nom: 'Nom et prénom',
      email: 'Adresse e-mail',
      tel: 'Téléphone',
      sujet: 'Sujet du dossier',
      message: 'Votre message'
    };

    var fieldEl = function (name) { return form.querySelector('[name="' + name + '"]'); };
    var errorEl = function (name) { return document.getElementById('err-' + name); };

    var say = function (message, tone) {
      if (!feedback) return;
      feedback.textContent = message || '';
      if (!message) { feedback.hidden = true; return; }
      feedback.setAttribute('data-tone', tone);
      feedback.hidden = false;
    };

    var setFieldError = function (name, message) {
      var el = fieldEl(name);
      var err = errorEl(name);
      if (!el) return;
      if (message) {
        el.setAttribute('aria-invalid', 'true');
        el.classList.add('is-invalid');
        if (err) { err.textContent = message; err.hidden = false; }
      } else {
        el.removeAttribute('aria-invalid');
        el.classList.remove('is-invalid');
        if (err) { err.textContent = ''; err.hidden = true; }
      }
    };

    var validate = function (name) {
      var el = fieldEl(name);
      if (!el) return '';
      var value = (el.value || '').trim();
      if (el.required && !value) {
        return name === 'sujet'
          ? 'Sélectionnez une expertise dans la liste.'
          : 'Ce champ est obligatoire.';
      }
      return RULES[name] ? RULES[name](value) : '';
    };

    var validateAll = function () {
      var errors = [];
      Object.keys(RULES).forEach(function (name) {
        var message = validate(name);
        setFieldError(name, message);
        if (message) errors.push({ name: name, message: message });
      });
      return errors;
    };

    var summary = function (errors) {
      if (!errors.length) { say('', 'ok'); return; }
      var names = errors.map(function (e) { return LABELS[e.name]; });
      var list = names.length === 1
        ? names[0]
        : names.slice(0, -1).join(', ') + ' et ' + names[names.length - 1];
      say(errors.length === 1
        ? 'Un champ est à corriger : ' + list + '.'
        : errors.length + ' champs sont à corriger : ' + list + '.', 'error');
    };

    // Efface une erreur dès que la saisie devient valide.
    Object.keys(RULES).forEach(function (name) {
      var el = fieldEl(name);
      if (!el) return;
      var handler = function () {
        if (el.getAttribute('aria-invalid') === 'true') {
          var message = validate(name);
          setFieldError(name, message);
          var remaining = Object.keys(RULES).filter(function (n) { return validate(n); });
          if (!remaining.length) say('', 'ok');
          else summary(remaining.map(function (n) { return { name: n }; }));
        }
      };
      el.addEventListener('input', handler);
      el.addEventListener('change', handler);
      el.addEventListener('blur', function () {
        if (el.value.trim()) setFieldError(name, validate(name));
      });
    });

    if (form) {
      form.setAttribute('aria-describedby', 'formLegal');
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (successBox) successBox.hidden = true;

      var errors = validateAll();
      summary(errors);

      if (errors.length) {
        var first = fieldEl(errors[0].name);
        if (first) first.focus();
        return;
      }

      var get = function (n) {
        var el = fieldEl(n);
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

      if (submitBtn) {
        submitBtn.setAttribute('aria-busy', 'true');
        submitBtn.disabled = true;
      }
      if (successBox) {
        successBox.hidden = false;
        successBox.focus();
      }
      say('', 'ok');

      // Envoi silencieux à l'admin si le backend est disponible (VPS)
      try {
        fetch('/api/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nom: get('nom'), societe: get('societe'), email: get('email'), tel: get('tel'), sujet: get('sujet'), message: get('message') })
        }).catch(function(){});
      } catch(_e2) {}

      window.setTimeout(function () {
        window.location.href = href;
        window.setTimeout(function () {
          if (submitBtn) {
            submitBtn.removeAttribute('aria-busy');
            submitBtn.disabled = false;
          }
        }, 2500);
      }, 120);
    });
  }
})();