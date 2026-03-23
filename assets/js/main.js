/* ACCESSIA Pro — main.js */
'use strict';

// ── Navbar scroll effect ───────────────────────
const navbar = document.querySelector('.navbar');
const scrollTopBtn = document.querySelector('.scroll-top');

function handleScroll() {
  const y = window.scrollY;
  if (navbar) navbar.classList.toggle('scrolled', y > 60);
  if (scrollTopBtn) scrollTopBtn.classList.toggle('visible', y > 400);
}
window.addEventListener('scroll', handleScroll, { passive: true });

// ── Hamburger menu ─────────────────────────────
const hamburger = document.querySelector('.hamburger');
const navLinks  = document.querySelector('.navbar-links');
if (hamburger && navLinks) {
  hamburger.addEventListener('click', () => {
    navLinks.classList.toggle('open');
    const isOpen = navLinks.classList.contains('open');
    hamburger.setAttribute('aria-expanded', isOpen);
    hamburger.querySelectorAll('span').forEach((s, i) => {
      s.style.transform = isOpen
        ? (i === 0 ? 'translateY(7px) rotate(45deg)' : i === 2 ? 'translateY(-7px) rotate(-45deg)' : 'scaleX(0)')
        : '';
      s.style.opacity = (isOpen && i === 1) ? '0' : '1';
    });
  });
  // Close on link click
  navLinks.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', () => {
      navLinks.classList.remove('open');
      hamburger.querySelectorAll('span').forEach(s => {
        s.style.transform = '';
        s.style.opacity = '1';
      });
    });
  });
}

// ── Scroll to top ──────────────────────────────
if (scrollTopBtn) {
  scrollTopBtn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
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

// ── Contact form ───────────────────────────────
const form = document.getElementById('contact-form');
if (form) {
  form.addEventListener('submit', function(e) {
    e.preventDefault();
    const btn = form.querySelector('[type="submit"]');
    const name    = form.querySelector('#fname')?.value.trim();
    const email   = form.querySelector('#femail')?.value.trim();
    const message = form.querySelector('#fmessage')?.value.trim();

    if (!name || !email || !message) {
      showNotif('Veuillez remplir tous les champs obligatoires.', 'error');
      return;
    }

    // Build mailto link
    const subject = encodeURIComponent(`[ACCESSIA Pro] Demande de contact — ${name}`);
    const body    = encodeURIComponent(
      `Bonjour,\n\nNom : ${name}\nEmail : ${email}\nSociété : ${form.querySelector('#fcompany')?.value.trim() || 'N/A'}\nBesoin : ${form.querySelector('#fneed')?.value || 'N/A'}\n\nMessage :\n${message}\n\n--\nEnvoyé depuis accessia.pro`
    );
    btn.textContent = 'Envoi en cours…';
    btn.disabled = true;
    setTimeout(() => {
      window.location.href = `mailto:accessiapro@gmail.com?subject=${subject}&body=${body}`;
      btn.textContent = 'Message envoyé ✓';
      btn.style.background = '#17A09D';
    }, 600);
  });
}

function showNotif(msg, type) {
  const n = document.createElement('div');
  n.textContent = msg;
  n.style.cssText = `position:fixed;bottom:24px;left:50%;transform:translateX(-50%);
    background:${type==='error'?'#ef4444':'#17A09D'};color:#fff;padding:12px 24px;
    border-radius:8px;font-size:.9rem;z-index:9999;box-shadow:0 4px 16px rgba(0,0,0,.2);`;
  document.body.appendChild(n);
  setTimeout(() => n.remove(), 4000);
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
