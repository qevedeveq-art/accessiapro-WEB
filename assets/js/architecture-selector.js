/* ACCESSIA Pro — Sélecteur d'architecture indicatif, calcul local */
"use strict";

(function () {
  const form = document.getElementById("architecture-selector-form");
  if (!form) return;

  const result = document.getElementById("architecture-selector-result");
  const title = document.getElementById("architecture-selector-title");
  const explanation = document.getElementById("architecture-selector-explanation");
  const controls = document.getElementById("architecture-selector-controls");

  const profiles = Object.freeze({
    cloud: {
      label: "Cloud professionnel géré",
      explanation:
        "Point de départ possible pour avancer vite avec une équipe déjà équipée, à condition de vérifier l’édition, les données, les connecteurs, les droits et la réversibilité.",
      controls: [
        "Utiliser une édition professionnelle administrée, pas des comptes personnels.",
        "Vérifier contrat, rétention, entraînement, sous-traitants et export.",
        "Limiter les connecteurs et appliquer le moindre privilège.",
      ],
    },
    european: {
      label: "Service européen ou hébergement maîtrisé en Europe",
      explanation:
        "Piste à examiner lorsque la localisation, le droit applicable ou la chaîne de sous-traitance pèsent fortement, sans supposer que le seul hébergement européen règle tout le risque.",
      controls: [
        "Vérifier l’entité contractante et chaque sous-traitant, pas seulement la région d’hébergement.",
        "Documenter les transferts, les accès de support et les sauvegardes.",
        "Tester la réversibilité et l’interopérabilité avant engagement.",
      ],
    },
    hybrid: {
      label: "Architecture hybride avec routage par règle",
      explanation:
        "Piste cohérente quand plusieurs niveaux de sensibilité coexistent. Les tâches sont dirigées vers l’environnement autorisé selon une règle explicite et contrôlable.",
      controls: [
        "Classer les données avant le routage et bloquer les contournements.",
        "Journaliser la destination de chaque flux sans enregistrer plus que nécessaire.",
        "Prévoir un mode dégradé et un responsable de la règle de routage.",
      ],
    },
    local: {
      label: "IA locale ou environnement privé isolé",
      explanation:
        "Piste à étudier lorsqu’un corpus fermé, une contrainte réseau ou une politique interne justifie l’exploitation supplémentaire et que l’équipe peut maintenir la pile complète.",
      controls: [
        "Ne pas exposer le moteur d’inférence sans authentification, TLS et filtrage.",
        "Gérer licences, mises à jour, journaux, sauvegardes et correctifs.",
        "Tester la qualité en français et le matériel sur les vrais cas synthétiques.",
      ],
    },
  });

  function scoreAnswers(data) {
    const scores = { cloud: 0, european: 0, hybrid: 0, local: 0 };
    const reasons = [];

    const sensitivity = data.get("sensitivity");
    if (sensitivity === "public") scores.cloud += 4;
    if (sensitivity === "internal") {
      scores.cloud += 2;
      scores.european += 2;
      scores.hybrid += 2;
    }
    if (sensitivity === "confidential") {
      scores.european += 3;
      scores.hybrid += 4;
      scores.local += 4;
      reasons.push("Les données confidentielles exigent une architecture et des habilitations explicitement validées.");
    }
    if (sensitivity === "sensitive") {
      scores.hybrid += 4;
      scores.local += 5;
      reasons.push("Les données sensibles imposent une analyse juridique et de sécurité avant tout choix technique.");
    }

    const connectivity = data.get("connectivity");
    if (connectivity === "online") scores.cloud += 3;
    if (connectivity === "intermittent") {
      scores.hybrid += 3;
      scores.local += 2;
    }
    if (connectivity === "offline") {
      scores.local += 5;
      reasons.push("Le fonctionnement hors ligne favorise une exécution locale, avec maintien et mises à jour organisés.");
    }

    const operations = data.get("operations");
    if (operations === "limited") {
      scores.cloud += 4;
      scores.european += 3;
    }
    if (operations === "partner") {
      scores.european += 2;
      scores.hybrid += 3;
      scores.local += 2;
    }
    if (operations === "internal") {
      scores.hybrid += 3;
      scores.local += 4;
    }

    const ecosystem = data.get("ecosystem");
    if (ecosystem === "microsoft" || ecosystem === "google") scores.cloud += 4;
    if (ecosystem === "mixed") {
      scores.european += 2;
      scores.hybrid += 3;
    }
    if (ecosystem === "isolated") scores.local += 4;

    const urgency = data.get("urgency");
    if (urgency === "weeks") scores.cloud += 3;
    if (urgency === "months") {
      scores.european += 2;
      scores.hybrid += 2;
    }
    if (urgency === "controlled") {
      scores.hybrid += 2;
      scores.local += 3;
    }

    const ordered = Object.entries(scores).sort((a, b) => b[1] - a[1]);
    if (ordered[0][1] === ordered[1][1]) {
      reasons.push(`Deux profils sont proches : ${profiles[ordered[0][0]].label} et ${profiles[ordered[1][0]].label}. Un test comparatif est préférable.`);
    }
    return { profile: ordered[0][0], reasons };
  }

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    if (!form.reportValidity()) return;
    const decision = scoreAnswers(new FormData(form));
    const profile = profiles[decision.profile];
    title.textContent = profile.label;
    explanation.textContent = profile.explanation;
    controls.replaceChildren();
    for (const item of [...decision.reasons, ...profile.controls]) {
      const entry = document.createElement("li");
      entry.textContent = item;
      controls.appendChild(entry);
    }
    result.hidden = false;
    result.focus();
  });
})();
