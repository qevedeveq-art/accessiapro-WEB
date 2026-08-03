/* ACCESSIA Pro — matrice locale IA, innovation et conformité */
"use strict";

(function () {
  const AXES = Object.freeze({
    value: Object.freeze({
      questions: Object.freeze(["q1", "q2", "q3", "q4", "q5"]),
      scoreId: "maturity-value-score",
      levelId: "maturity-value-level",
      action:
        "Précisez la valeur attendue, la mesure de départ et l’implication des personnes concernées.",
    }),
    innovation: Object.freeze({
      questions: Object.freeze(["q6", "q7", "q8", "q9", "q10"]),
      scoreId: "maturity-innovation-score",
      levelId: "maturity-innovation-level",
      action:
        "Documentez l’architecture, la responsabilité d’exploitation, le mode manuel et le coût complet.",
    }),
    compliance: Object.freeze({
      questions: Object.freeze(["q11", "q12", "q13", "q14", "q15"]),
      scoreId: "maturity-compliance-score",
      levelId: "maturity-compliance-level",
      action:
        "Consolidez la classification des données, les accès, le contrôle humain et la réponse à incident.",
    }),
  });
  const CRITICAL_BLOCKERS = Object.freeze({
    q8: "Aucun responsable d’exploitation n’est identifié.",
    q9: "Le mode manuel et la sortie réversible ne sont pas testables.",
    q11: "Les données ne sont pas classées et les données personnelles ne sont pas identifiées.",
    q13: "Les décisions humaines et les limites d’autonomie ne sont pas définies.",
  });
  const VALID_SCORES = new Set([0, 1, 2]);

  if (typeof module === "object" && module.exports) {
    module.exports = Object.freeze({
      AXES,
      CRITICAL_BLOCKERS,
      calculateSubscores,
      findCriticalBlockers,
      interpretAxis,
      interpretTotal,
    });
  }

  const form = typeof document === "object"
    ? document.getElementById("maturity-form")
    : null;

  if (!form) {
    return;
  }

  const result = document.getElementById("maturity-result");
  const scoreNode = document.getElementById("maturity-score");
  const levelNode = document.getElementById("maturity-level");
  const actionNode = document.getElementById("maturity-action");
  const actionList = document.getElementById("maturity-action-list");
  const blockersNode = document.getElementById("maturity-blockers");
  const blockerList = document.getElementById("maturity-blocker-list");
  const calculateButton = document.getElementById("maturity-calculate");
  const exportButton = document.getElementById("maturity-export");
  let currentResult = null;

  function interpretAxis(score) {
    if (score <= 3) {
      return "Prérequis manquants";
    }
    if (score <= 7) {
      return "Cadrage incomplet";
    }
    return "Axe préparé";
  }

  function interpretTotal(total, blockers) {
    if (blockers.length > 0) {
      return {
        level: "Sécuriser les prérequis avant tout pilote",
        action: "Le total ne compense pas un blocage critique. Traitez chaque point bloquant, puis refaites la matrice.",
      };
    }
    if (total <= 10) {
      return {
        level: "Explorer et cadrer avant d’outiller",
        action: "Plusieurs fondations restent à construire. Commencez par le problème métier et l’axe le plus faible.",
      };
    }
    if (total <= 21) {
      return {
        level: "Consolider avant un pilote limité",
        action: "Le besoin peut être approfondi, mais le protocole, les responsabilités et les garde-fous restent à compléter.",
      };
    }
    return {
      level: "Préparer un pilote limité et réversible",
      action: "Les réponses déclarées permettent de préparer un pilote. Faites valider les exigences métier, juridiques et de sécurité avant son lancement.",
    };
  }

  function readAnswers() {
    const data = new FormData(form);
    const answers = {};
    for (let index = 1; index <= 15; index += 1) {
      const name = `q${index}`;
      const parsed = Number.parseInt(String(data.get(name) ?? ""), 10);
      answers[name] = VALID_SCORES.has(parsed) ? parsed : 0;
    }
    return answers;
  }

  function calculateSubscores(answers) {
    return Object.fromEntries(
      Object.entries(AXES).map(([name, axis]) => [
        name,
        axis.questions.reduce((total, question) => total + answers[question], 0),
      ]),
    );
  }

  function findCriticalBlockers(answers) {
    return Object.entries(CRITICAL_BLOCKERS)
      .filter(([question]) => answers[question] === 0)
      .map(([, message]) => message);
  }

  function buildActions(subscores, blockers) {
    const sortedAxes = Object.entries(subscores).sort((left, right) => left[1] - right[1]);
    const actions = sortedAxes
      .filter(([, score]) => score < 8)
      .slice(0, 2)
      .map(([name]) => AXES[name].action);
    if (blockers.length > 0) {
      actions.unshift("Lever les blocages critiques avant de planifier le pilote.");
    }
    if (actions.length === 0) {
      actions.push("Formaliser un protocole limité, mesurable et réversible, puis le faire valider.");
    }
    return actions;
  }

  function renderList(node, items) {
    const entries = items.map((item) => {
      const listItem = document.createElement("li");
      listItem.textContent = item;
      return listItem;
    });
    node.replaceChildren(...entries);
  }

  form.addEventListener("submit", function (event) {
    event.preventDefault();
  });

  calculateButton.addEventListener("click", function () {
    if (!form.reportValidity()) {
      return;
    }
    const answers = readAnswers();
    const subscores = calculateSubscores(answers);
    const blockers = findCriticalBlockers(answers);
    const total = Object.values(subscores).reduce((sum, score) => sum + score, 0);
    const actions = buildActions(subscores, blockers);
    const interpretation = interpretTotal(total, blockers);

    for (const [name, axis] of Object.entries(AXES)) {
      document.getElementById(axis.scoreId).textContent = String(subscores[name]);
      document.getElementById(axis.levelId).textContent = interpretAxis(subscores[name]);
    }
    scoreNode.textContent = String(total);
    levelNode.textContent = interpretation.level;
    actionNode.textContent = interpretation.action;
    renderList(actionList, actions);
    renderList(blockerList, blockers);
    blockersNode.hidden = blockers.length === 0;
    currentResult = {
      version: "2.0",
      generatedAt: new Date().toISOString(),
      localOnly: true,
      answers,
      subscores,
      total,
      blockers,
      actions,
      disclaimer:
        "Résultat indicatif : cette matrice ne certifie ni la maturité, ni la conformité, ni la sécurité de l’entreprise.",
    };
    exportButton.disabled = false;
    result.hidden = false;
    result.focus();
  });

  form.addEventListener("reset", function () {
    currentResult = null;
    exportButton.disabled = true;
    result.hidden = true;
    blockersNode.hidden = true;
    actionList.replaceChildren();
    blockerList.replaceChildren();
  });

  exportButton.addEventListener("click", function () {
    if (!currentResult) {
      return;
    }
    const blob = new Blob([JSON.stringify(currentResult, null, 2)], {
      type: "application/json;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const downloadLink = document.createElement("a");
    downloadLink.href = url;
    downloadLink.download = "maturite-ia-innovation-conformite.json";
    document.body.append(downloadLink);
    downloadLink.click();
    downloadLink.remove();
    URL.revokeObjectURL(url);
  });
})();
