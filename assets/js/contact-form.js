// Formulaire de contact editorial — amelioration progressive.
//
// Contrat serveur, etabli a partir de trois sources concordantes et non d'une
// supposition (voir CURRENT_HANDOFF.md) :
//   1. `docs/apps/my_webapp.md` du depot d'infrastructure : contact.php collecte
//      nom, email, societe, besoin, message et l'IP cote serveur ;
//   2. le blueprint n8n `ContactForm0001` : la charge utile transmise au webhook
//      porte les cles `name`, `email`, `company`, `need`, `message`, `ip` ;
//   3. l'ancien bundle `assets/js/main.v2.js` ecrit contre ce meme endpoint :
//      POST multipart vers `/contact.php`, en-tete `X-Requested-With`, reponse
//      JSON `{ ok: true }` ou `{ error: "..." }`.
//
// Ce fichier n'invente aucun champ. Toute evolution du contrat doit etre
// verifiee sur le serveur avant d'etre repercutee ici.
//
// Contraintes de securite du site : aucun script tiers, aucun cookie, aucun
// stockage navigateur, aucun HTML injecte. Le rendu passe exclusivement par
// `textContent`. La CSP autorise `connect-src 'self'` et `form-action 'self'
// mailto:` : la requete et le repli courriel sont couverts sans exception.

(function () {
  "use strict";

  var ENDPOINT = "/contact.php";
  var CONFIRMATION = "/contact-envoye.html";
  var CONTACT_EMAIL = "contact@access-ia.pro";

  // Limites alignees sur celles que contact.php applique cote serveur. Les
  // reproduire ici evite un aller-retour reseau pour une erreur previsible ;
  // elles ne remplacent pas la validation serveur, qui reste la seule opposable.
  var LIMITS = { name: 120, email: 160, company: 160, need: 160, message: 2000 };
  var REQUIRED = ["name", "email", "message"];
  var EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  var LABELS = {
    name: "votre nom",
    email: "votre adresse électronique",
    company: "votre organisation",
    need: "le sujet",
    message: "votre message",
  };

  var form = document.getElementById("contact-form");
  if (!form) return;

  var status = document.getElementById("contact-form-status");
  var fallback = document.getElementById("contact-form-fallback");
  var submit = form.querySelector('[type="submit"]');
  var submitLabel = submit ? submit.textContent : "Envoyer";
  var locked = false;

  function fieldByName(name) {
    return form.querySelector('[name="' + name + '"]');
  }

  function clearError(field) {
    if (!field) return;
    field.removeAttribute("aria-invalid");
    var describedBy = field.getAttribute("aria-describedby");
    if (describedBy) {
      var previous = document.getElementById(describedBy);
      if (previous && previous.classList.contains("form-error")) previous.remove();
      field.removeAttribute("aria-describedby");
    }
  }

  function setError(field, message) {
    if (!field) return;
    var id = (field.id || field.name) + "-error";
    field.setAttribute("aria-invalid", "true");
    field.setAttribute("aria-describedby", id);
    var node = document.getElementById(id);
    if (!node) {
      node = document.createElement("span");
      node.id = id;
      node.className = "form-error";
      field.insertAdjacentElement("afterend", node);
    }
    node.textContent = message;
  }

  function announce(message, kind) {
    if (!status) return;
    status.textContent = message;
    status.className = "seo-form-status" + (kind ? " is-" + kind : "");
  }

  // Repli explicite plutot qu'automatique : ouvrir la messagerie sans y avoir
  // ete invite detourne la navigation et surprend. On revele un lien, la
  // personne decide.
  function revealFallback(values) {
    if (!fallback) return;
    var body = [
      "Nom : " + (values.name || ""),
      "Organisation : " + (values.company || ""),
      "Sujet : " + (values.need || ""),
      "",
      "Message :",
      values.message || "",
    ].join("\n");
    var href =
      "mailto:" +
      CONTACT_EMAIL +
      "?subject=" +
      encodeURIComponent("Demande de contact — access-ia.pro") +
      "&body=" +
      encodeURIComponent(body);
    var link = fallback.querySelector("a");
    if (link) link.setAttribute("href", href);
    fallback.hidden = false;
  }

  function collect() {
    var values = {};
    Object.keys(LIMITS).forEach(function (name) {
      var field = fieldByName(name);
      values[name] = field ? String(field.value || "").trim() : "";
    });
    return values;
  }

  function validate(values) {
    var problems = 0;

    Object.keys(LIMITS).forEach(function (name) {
      clearError(fieldByName(name));
    });

    REQUIRED.forEach(function (name) {
      if (!values[name]) {
        setError(fieldByName(name), "Merci d’indiquer " + LABELS[name] + ".");
        problems += 1;
      }
    });

    if (values.email && !EMAIL_PATTERN.test(values.email)) {
      setError(fieldByName("email"), "Cette adresse électronique ne semble pas valide.");
      problems += 1;
    }

    Object.keys(LIMITS).forEach(function (name) {
      if (values[name] && values[name].length > LIMITS[name]) {
        setError(
          fieldByName(name),
          "Ce champ dépasse la longueur autorisée de " + LIMITS[name] + " caractères.",
        );
        problems += 1;
      }
    });

    return problems;
  }

  function unlock() {
    locked = false;
    if (submit) {
      submit.disabled = false;
      submit.textContent = submitLabel;
    }
  }

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    if (locked) return;

    var values = collect();
    var problems = validate(values);
    if (problems > 0) {
      announce(
        problems === 1
          ? "Un champ demande une correction."
          : problems + " champs demandent une correction.",
        "error",
      );
      var firstInvalid = form.querySelector('[aria-invalid="true"]');
      if (firstInvalid) firstInvalid.focus();
      return;
    }

    locked = true;
    if (submit) {
      submit.disabled = true;
      submit.textContent = "Envoi en cours…";
    }
    announce("Envoi en cours…", "pending");

    fetch(ENDPOINT, {
      method: "POST",
      headers: { Accept: "application/json", "X-Requested-With": "XMLHttpRequest" },
      body: new FormData(form),
    })
      .then(function (response) {
        return response
          .json()
          .catch(function () {
            return {};
          })
          .then(function (payload) {
            if (!response.ok || !payload.ok) {
              // 429 correspond au garde-fou anti-abus de contact.php : cinq
              // tentatives par adresse IP sur dix minutes glissantes.
              var reason =
                response.status === 429
                  ? "Trop d’envois depuis cette connexion. Merci de réessayer dans une dizaine de minutes, ou d’écrire directement."
                  : payload.error || "L’envoi n’a pas abouti (erreur " + response.status + ").";
              throw new Error(reason);
            }
            return payload;
          });
      })
      .then(function () {
        window.location.assign(CONFIRMATION);
      })
      .catch(function (error) {
        announce(
          (error && error.message) ||
            "L’envoi automatique n’a pas abouti. Vous pouvez écrire directement.",
          "error",
        );
        revealFallback(values);
        unlock();
      });
  });
})();
