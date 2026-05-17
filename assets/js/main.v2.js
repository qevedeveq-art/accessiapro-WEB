/* ACCESSIA Pro — main.js v3 (CSP-clean, no inline styles) */
'use strict';

// ── Navbar scroll effect ───────────────────────
const navbar     = document.querySelector('.navbar');
const scrollTopBtn = document.querySelector('.scroll-top');

function handleScroll() {
  const y = window.scrollY;
  if (navbar)       navbar.classList.toggle('scrolled', y > 60);
  if (scrollTopBtn) scrollTopBtn.classList.toggle('visible', y > 400);
}
window.addEventListener('scroll', handleScroll, { passive: true });

// ── Hamburger menu (classList only – no inline styles) ──
const hamburger = document.querySelector('.hamburger');
const navLinks  = document.querySelector('.navbar-links');
if (hamburger && navLinks) {
  hamburger.addEventListener('click', () => {
    const isOpen = navLinks.classList.toggle('open');
    hamburger.classList.toggle('is-open', isOpen);
    hamburger.setAttribute('aria-expanded', String(isOpen));
  });
  // Close on nav link click
  navLinks.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', () => {
      navLinks.classList.remove('open');
      hamburger.classList.remove('is-open');
      hamburger.setAttribute('aria-expanded', 'false');
    });
  });
}

// ── Scroll to top ──────────────────────────────
if (scrollTopBtn) {
  scrollTopBtn.addEventListener('click', () =>
    window.scrollTo({ top: 0, behavior: 'smooth' })
  );
}

// ── Intersection Observer (fade-in) ───────────
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
document.querySelectorAll('.fade-in').forEach(el => observer.observe(el));

// ── FAQ accordion ──────────────────────────────
document.querySelectorAll('.faq-question').forEach(btn => {
  btn.addEventListener('click', () => {
    const item = btn.closest('.faq-item');
    const isOpen = item.classList.contains('open');

    document.querySelectorAll('.faq-item.open').forEach(i => {
      i.classList.remove('open');
      i.querySelector('.faq-question')?.setAttribute('aria-expanded', 'false');
    });

    if (!isOpen) {
      item.classList.add('open');
      btn.setAttribute('aria-expanded', 'true');
    }
  });
});

// ── Notification toast (uses CSS classes – no inline styles) ──
let toastTimer;
function showNotif(msg, type) {
  let toast = document.getElementById('notif-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'notif-toast';
    toast.className = 'notif-toast';
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'polite');
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.className = `notif-toast notif-${type}`;
  // Force reflow then show
  void toast.offsetWidth;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 4500);
}

// ── Contact form (local mail endpoint + honeypot + rate-limit) ──
const CONTACT_FORM_ENDPOINT = '/contact.php';
const CONTACT_EMAIL = 'contact@access-ia.pro';
const form = document.getElementById('contact-form');
if (form) {
  let submitLocked = false;

  // Email validation helper
  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
  }

  function buildMailtoUrl(formData) {
    const need = formData.get('need') || 'Non précise';
    const body = [
      `Nom : ${formData.get('name') || ''}`,
      `Email : ${formData.get('email') || ''}`,
      `Société : ${formData.get('company') || ''}`,
      `Besoin : ${need}`,
      '',
      'Message :',
      formData.get('message') || '',
    ].join('\n');

    return `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent('[ACCESSIA Pro] Demande de contact')}&body=${encodeURIComponent(body)}`;
  }

  function openMailFallback(formData) {
    window.location.href = buildMailtoUrl(formData);
  }

  form.addEventListener('submit', async function(e) {
    e.preventDefault();
    if (submitLocked) return;

    const btn     = form.querySelector('[type="submit"]');
    const name    = form.querySelector('#fname')?.value.trim();
    const email   = form.querySelector('#femail')?.value.trim();
    const company = form.querySelector('#fcompany')?.value.trim() || '';
    const message = form.querySelector('#fmessage')?.value.trim();

    // Client-side validation
    if (!name || !email || !message) {
      showNotif('Veuillez remplir tous les champs obligatoires.', 'error');
      return;
    }
    if (!isValidEmail(email)) {
      showNotif('Veuillez entrer une adresse email valide.', 'error');
      return;
    }
    if (name.length > 120 || email.length > 160 || company.length > 160 || message.length > 2000) {
      showNotif('Votre message dépasse la longueur autorisée.', 'error');
      return;
    }

    // Rate limiting: disable 30s after send attempt
    submitLocked = true;
    btn.textContent = 'Envoi en cours…';
    btn.disabled = true;

    const formData = new FormData(form);

    try {
      const res = await fetch(CONTACT_FORM_ENDPOINT, {
        method:  'POST',
        headers: { 'Accept': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
        body:    formData,
      });
      const payload = await res.json().catch(() => ({}));

      if (res.ok && payload.ok) {
        btn.textContent = 'Message envoyé ✓';
        btn.classList.add('btn-sent');
        form.reset();
        showNotif('Votre message a bien été envoyé. Nous vous répondrons sous 48h ouvrées.', 'success');
        // Unlock after 30s
        setTimeout(() => {
          submitLocked = false;
          btn.disabled = false;
          btn.textContent = 'Envoyer ma demande';
          btn.classList.remove('btn-sent');
        }, 30000);
      } else {
        throw new Error(payload.error || `Erreur serveur ${res.status}`);
      }
    } catch {
      openMailFallback(formData);
      showNotif('L’envoi automatique a échoué. Votre messagerie va s’ouvrir avec le message prérempli.', 'error');
      submitLocked = false;
      btn.disabled = false;
      btn.textContent = 'Envoyer ma demande';
    }
  });
}

// ── Smooth anchor scrolling ────────────────────
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function(e) {
    const target = document.querySelector(this.getAttribute('href'));
    if (target) {
      e.preventDefault();
      const offset = 80;
      window.scrollTo({ top: target.offsetTop - offset, behavior: 'smooth' });
    }
  });
});
