/*
 * ACCESSIA Pro — mesure first-party optionnelle.
 * Inactive tant que <html data-measurement="enabled"> n'est pas présent.
 * Aucun cookie, stockage local, identifiant utilisateur ou contenu de formulaire.
 */
"use strict";

(function () {
  if (document.documentElement.dataset.measurement !== "enabled") {
    return;
  }

  const allowedEvents = new Set([
    "contact_form_submit_valid",
    "mailto_fallback_opened",
    "cta_contact_click",
    "roi_calculator_submit",
    "resource_search_submit",
    "resource_filter_click",
    "llms_link_click",
    "external_author_link_click",
    "maturity_assessment_submit",
  ]);
  const allowedFields = new Set([
    "cta_slot",
    "result",
    "bucketed_value",
    "page_type",
  ]);

  function canonicalPath() {
    const canonical = document.querySelector('link[rel="canonical"]');

    try {
      return canonical
        ? new URL(canonical.href).pathname
        : window.location.pathname;
    } catch {
      return "/";
    }
  }

  function sanitizeFields(fields) {
    const safe = {};

    for (const [key, value] of Object.entries(fields ?? {})) {
      if (
        allowedFields.has(key) &&
        typeof value === "string" &&
        value.length <= 40 &&
        /^[a-z0-9_-]+$/i.test(value)
      ) {
        safe[key] = value;
      }
    }

    return safe;
  }

  function track(eventName, fields = {}) {
    if (!allowedEvents.has(eventName)) {
      return;
    }

    const payload = {
      event_name: eventName,
      event_version: 1,
      timestamp_day: new Date().toISOString().slice(0, 10),
      page_path: canonicalPath(),
      consent_mode: "cookieless_essential_measurement",
      ...sanitizeFields(fields),
    };

    fetch("/analytics/event.php", {
      method: "POST",
      credentials: "omit",
      keepalive: true,
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    }).catch(function () {
      // La mesure ne doit jamais bloquer ni dégrader la navigation.
    });
  }

  window.ACCESSIAMeasurement = Object.freeze({ track });
})();
