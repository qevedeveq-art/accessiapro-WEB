/* ACCESSIA Pro — Calculateur ROI IA pour PME (CSP-clean, no inline) */
'use strict';

(function () {
  const form = document.getElementById('roi-form');
  if (!form) return;

  const fmt = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 });
  const fmtEur = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });

  const out = {
    weeklyHours: document.getElementById('out-weekly-hours'),
    annualHours: document.getElementById('out-annual-hours'),
    annualValue: document.getElementById('out-annual-value'),
    annualCost: document.getElementById('out-annual-cost'),
    netGain: document.getElementById('out-net-gain'),
    roiMonths: document.getElementById('out-roi-months'),
    payback: document.getElementById('out-payback'),
    panel: document.getElementById('roi-result')
  };

  function clamp(n, min, max) {
    if (Number.isNaN(n)) return min;
    return Math.min(Math.max(n, min), max);
  }

  function computeAndRender() {
    const collaborateurs = clamp(parseFloat(form.collaborateurs.value), 1, 5000);
    const heuresGagnees = clamp(parseFloat(form.heuresGagnees.value), 0, 40);
    const tauxHoraire = clamp(parseFloat(form.tauxHoraire.value), 5, 500);
    const coutOutil = clamp(parseFloat(form.coutOutil.value), 0, 500);
    const setup = clamp(parseFloat(form.setup.value), 0, 100000);

    const semaines = 46;
    const weeklyHours = collaborateurs * heuresGagnees;
    const annualHours = weeklyHours * semaines;
    const annualValue = annualHours * tauxHoraire;
    const annualToolCost = collaborateurs * coutOutil * 12;
    const annualCost = annualToolCost + setup;
    const netGain = annualValue - annualCost;
    const monthlyValue = annualValue / 12;
    const monthlyToolCost = annualToolCost / 12;
    const monthlyNet = monthlyValue - monthlyToolCost;

    let payback = null;
    if (monthlyNet > 0) {
      payback = setup / monthlyNet;
    }

    const roiMonths = annualCost > 0 ? (annualCost / monthlyValue) : 0;

    out.weeklyHours.textContent = fmt.format(Math.round(weeklyHours));
    out.annualHours.textContent = fmt.format(Math.round(annualHours));
    out.annualValue.textContent = fmtEur.format(Math.round(annualValue));
    out.annualCost.textContent = fmtEur.format(Math.round(annualCost));
    out.netGain.textContent = fmtEur.format(Math.round(netGain));
    out.netGain.classList.toggle('roi-negative', netGain < 0);
    out.netGain.classList.toggle('roi-positive', netGain >= 0);

    if (monthlyValue > 0) {
      out.roiMonths.textContent = roiMonths < 1
        ? 'moins d\'un mois'
        : (roiMonths > 36 ? 'au-delà de 36 mois' : (Math.round(roiMonths * 10) / 10).toString().replace('.', ',') + ' mois');
    } else {
      out.roiMonths.textContent = '—';
    }

    if (payback === null) {
      out.payback.textContent = 'non atteint avec ces paramètres';
    } else if (payback < 1) {
      out.payback.textContent = 'moins d\'un mois';
    } else if (payback > 60) {
      out.payback.textContent = 'au-delà de 5 ans';
    } else {
      out.payback.textContent = (Math.round(payback * 10) / 10).toString().replace('.', ',') + ' mois';
    }

    out.panel.removeAttribute('hidden');
  }

  form.addEventListener('input', computeAndRender);
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    computeAndRender();
    out.panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  computeAndRender();
})();
