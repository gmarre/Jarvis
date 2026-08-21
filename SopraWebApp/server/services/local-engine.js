/**
 * Offline engine — deterministic heuristics with the same output shape as the
 * Claude generators in ./ai.js.
 *
 * This is not an imitation of an LLM. It is a rules-based decomposition that
 * produces a usable, honest backlog from a requirements document so the whole
 * pipeline can be exercised (and demoed) without network access or an API key.
 * Confidence scores are deliberately capped below the review threshold so the
 * UI keeps flagging these items for human review.
 */

const nlp = require("./nlp");

const FIB = [1, 2, 3, 5, 8, 13, 21];

/** Nearest Fibonacci value at or above `n`, capped at 21. */
function fib(n) {
  return FIB.find((f) => f >= n) || 21;
}

/** Title Case a phrase, leaving short joining words lowercase. */
function titleCase(s) {
  const small = new Set(["a", "an", "the", "of", "and", "or", "to", "in", "on", "for", "with", "de", "du", "des", "la", "le", "les", "et", "ou"]);
  return String(s)
    .split(/\s+/)
    .map((w, i) => (i > 0 && small.has(w.toLowerCase()) ? w.toLowerCase() : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(" ");
}

/** Trims a sentence into a short title. */
function toTitle(sentence, maxWords = 9) {
  const cleaned = String(sentence)
    .replace(/^\s*(the|le|la|les|a|an|un|une)\s+/i, "")
    .replace(/\s+/g, " ")
    .replace(/[.;:!?]+\s*$/, "")
    .trim();
  const words = cleaned.split(" ");
  const short = words.length > maxWords ? words.slice(0, maxWords).join(" ") + "…" : cleaned;
  return short.charAt(0).toUpperCase() + short.slice(1);
}

/* ------------------------------------------------------------------ *
 * Requirements
 * ------------------------------------------------------------------ */

function extractRequirements(text, { limit = 60 } = {}) {
  const sections = nlp.splitSections(text);
  const out = [];

  const pushFrom = (body, section) => {
    for (const sentence of nlp.sentences(body)) {
      if (out.length >= limit) return;
      if (!nlp.MODAL.test(sentence)) continue;
      out.push({
        title: toTitle(sentence),
        body: sentence,
        section: section || undefined,
        confidence: 0.62,
      });
    }
  };

  if (sections.length) {
    for (const s of sections) {
      if (out.length >= limit) break;
      pushFrom(s.body, s.number === "0" ? undefined : s.number);
    }
  }

  // No headings, or headings yielded nothing — scan the whole document.
  if (!out.length) pushFrom(text, undefined);

  // Still nothing normative: fall back to the longest sentences so the user
  // has something concrete to edit rather than an empty screen.
  if (!out.length) {
    for (const sentence of nlp.sentences(text).slice(0, Math.min(limit, 12))) {
      out.push({ title: toTitle(sentence), body: sentence, confidence: 0.35 });
    }
  }

  return { requirements: out.slice(0, limit) };
}

/* ------------------------------------------------------------------ *
 * Epics
 * ------------------------------------------------------------------ */

function generateEpics(requirements) {
  if (!requirements.length) return { epics: [] };

  const docs = requirements.map((r) => `${r.title} ${r.body || ""}`);
  const groups = nlp.clusterBySimilarity(docs, 0.2);

  // Aim for 3–6 epics: merge the smallest groups into the nearest big one.
  groups.sort((a, b) => b.members.length - a.members.length);
  const target = Math.max(1, Math.min(6, Math.round(requirements.length / 6) || 1));
  while (groups.length > target && groups.length > 1) {
    const smallest = groups.pop();
    groups[groups.length - 1].members.push(...smallest.members);
  }

  return {
    epics: groups.map((g) => {
      const members = g.members.map((i) => requirements[i]);
      const terms = nlp.topTerms(members.map((r) => `${r.title} ${r.body || ""}`), 2);
      const name = terms.length ? titleCase(terms.join(" ")) : "Core Capability";
      return {
        title: name,
        description: `Groups ${members.length} requirement${members.length > 1 ? "s" : ""} covering ${terms.join(", ") || "the core scope"}.`,
        requirementRefs: members.map((r) => r.ref).filter(Boolean),
        confidence: 0.55,
      };
    }),
  };
}

/* ------------------------------------------------------------------ *
 * Features
 * ------------------------------------------------------------------ */

function generateFeatures(epic, requirements) {
  if (!requirements.length) {
    return {
      features: [
        {
          title: epic.title,
          description: epic.description || `Deliver ${epic.title}.`,
          epicTitle: epic.title,
          requirementRefs: [],
          points: 8,
          moscow: "Should",
          confidence: 0.4,
        },
      ],
    };
  }

  const docs = requirements.map((r) => `${r.title} ${r.body || ""}`);
  const groups = nlp.clusterBySimilarity(docs, 0.3);
  groups.sort((a, b) => b.members.length - a.members.length);
  while (groups.length > 5 && groups.length > 1) {
    const smallest = groups.pop();
    groups[groups.length - 1].members.push(...smallest.members);
  }

  return {
    features: groups.map((g) => {
      const members = g.members.map((i) => requirements[i]);
      const terms = nlp.topTerms(members.map((r) => `${r.title} ${r.body || ""}`), 3);
      return {
        title: titleCase(terms.join(" ")) || toTitle(members[0].title),
        description: members.map((r) => r.title).join(" · "),
        epicTitle: epic.title,
        requirementRefs: members.map((r) => r.ref).filter(Boolean),
        points: fib(members.length * 3),
        moscow: hasUrgency(members) ? "Must" : "Should",
        confidence: 0.5,
      };
    }),
  };
}

const URGENT = /\b(must|shall|obligatoire|required|mandatory|doit|critical|security|s[ée]curit[ée]|compliance|rgpd|gdpr|psd2|legal)\b/i;

function hasUrgency(items) {
  return items.some((r) => URGENT.test(`${r.title} ${r.body || ""}`));
}

/* ------------------------------------------------------------------ *
 * Stories
 * ------------------------------------------------------------------ */

function generateStories(feature, requirements) {
  const source = requirements.length
    ? requirements
    : [{ title: feature.title, body: feature.description || feature.title }];

  const stories = source.slice(0, 6).map((r) => {
    const want = String(r.title)
      .replace(/^(the\s+)?(system|application|platform|site)\s+(must|shall|should|will)\s+/i, "")
      .replace(/^(le\s+|la\s+)?(syst[eè]me|application|plateforme)\s+(doit|devra|devrait)\s+/i, "")
      .replace(/[.;:]+\s*$/, "")
      .trim();

    return {
      actor: guessActor(`${r.title} ${r.body || ""}`),
      want: want.charAt(0).toLowerCase() + want.slice(1),
      benefit: `the capability described in ${r.ref || feature.title} is available`,
      points: fib(Math.max(2, Math.round((r.body || "").length / 120))),
      moscow: hasUrgency([r]) ? "Must" : "Should",
      confidence: 0.48,
      acceptanceCriteria: [
        {
          given: "a user with the required permissions",
          when: `they perform the action described in ${r.ref || feature.title}`,
          then: "the system responds as the requirement specifies",
        },
        {
          given: "the preconditions are not met",
          when: "the same action is attempted",
          then: "the system rejects it and explains why",
        },
      ],
    };
  });

  return { stories };
}

const ACTOR_HINTS = [
  [/\b(admin|administrator|administrateur)\b/i, "administrator"],
  [/\b(agent|support|conseiller)\b/i, "support agent"],
  [/\b(manager|gestionnaire|responsable)\b/i, "manager"],
  [/\b(supplier|fournisseur|vendor)\b/i, "supplier"],
  [/\b(customer|client|acheteur|shopper)\b/i, "customer"],
  [/\b(user|utilisateur|visiteur)\b/i, "user"],
];

function guessActor(text) {
  for (const [re, actor] of ACTOR_HINTS) if (re.test(text)) return actor;
  return "user";
}

/* ------------------------------------------------------------------ *
 * Tasks
 * ------------------------------------------------------------------ */

function generateTasks(story) {
  const subject = story.want || story.title || "the story";
  const criteria = story.acceptanceCriteria || story.criteria || [];
  const tasks = [
    { title: `Design the data model and interfaces for ${subject}`, hours: 4 },
    { title: `Implement ${subject}`, hours: Math.max(4, (story.points || 3) * 2) },
    { title: `Add validation and error handling`, hours: 3 },
    { title: `Write unit tests`, hours: 3 },
  ];
  if (criteria.length) {
    tasks.push({ title: `Cover ${criteria.length} acceptance criteria with automated tests`, hours: 2 * criteria.length });
  }
  tasks.push({ title: "Update the technical documentation", hours: 1 });
  return { tasks };
}

/* ------------------------------------------------------------------ *
 * Prioritisation
 * ------------------------------------------------------------------ */

function scoreBacklog(items) {
  return {
    scores: items.map((s) => {
      const text = `${s.want || s.title || ""} ${s.benefit || ""}`;
      const urgent = URGENT.test(text);
      const points = s.points || 5;

      // Spread the numerators using signals actually present in the text so the
      // ranking is not flat, without pretending to more insight than we have.
      const businessValue = clamp(urgent ? 9 : 5 + lengthSignal(text), 1, 10);
      const timeCriticality = clamp(urgent ? 8 : 4 + (/\b(deadline|sprint|launch|lancement|imm[ée]diat)\b/i.test(text) ? 3 : 0), 1, 10);
      const riskReduction = clamp(/\b(security|s[ée]curit[ée]|fraud|compliance|rgpd|gdpr|audit|backup)\b/i.test(text) ? 8 : 3, 1, 10);
      const jobSize = clamp(points, 1, 20);

      return {
        ref: s.ref,
        businessValue,
        timeCriticality,
        riskReduction,
        jobSize,
        moscow: urgent ? "Must" : points <= 3 ? "Could" : "Should",
        rationale: urgent
          ? "Contains a normative or compliance signal, so it is treated as required."
          : "Scored from size and the wording of the story; review before committing.",
      };
    }),
  };
}

function clamp(n, lo, hi) {
  return Math.max(lo, Math.min(hi, Math.round(n)));
}

function lengthSignal(text) {
  return Math.min(3, Math.floor(String(text).length / 80));
}

/* ------------------------------------------------------------------ *
 * Dependencies
 * ------------------------------------------------------------------ */

/**
 * Flags pairs that share distinctive vocabulary. Deliberately conservative —
 * a shared rare term is weak evidence, so everything it finds is low severity
 * unless the two items sit in different projects.
 */
function detectDependencies(items) {
  const docs = items.map((s) => `${s.title || s.want || ""} ${s.description || s.benefit || ""}`);
  const pairs = nlp.nearDuplicatePairs(docs, 0.45);
  const seen = new Set();
  const dependencies = [];

  for (const { a, b, similarity } of pairs) {
    const from = items[a];
    const to = items[b];
    const key = `${from.ref}>${to.ref}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const crossProject = from.projectId && to.projectId && from.projectId !== to.projectId;
    dependencies.push({
      fromRef: from.ref,
      toRef: to.ref,
      kind: "blocks",
      severity: crossProject ? "blocking" : "normal",
      note: `Shared vocabulary (similarity ${similarity}) suggests a common component. Confirm before planning.`,
    });
    if (dependencies.length >= 12) break;
  }

  return { dependencies };
}

/* ------------------------------------------------------------------ *
 * Clustering
 * ------------------------------------------------------------------ */

function clusterStories(stories) {
  if (!stories.length) return { clusters: [] };

  const docs = stories.map((s) => `${s.want || s.title || ""} ${s.benefit || ""}`);
  const groups = nlp.clusterBySimilarity(docs, 0.26);
  const dupes = new Map();
  for (const { a, b } of nlp.nearDuplicatePairs(docs, 0.62)) {
    // Keep the first occurrence, flag the later one.
    if (!dupes.has(stories[b].ref)) dupes.set(stories[b].ref, stories[a].ref);
  }

  return {
    clusters: groups.map((g) => {
      const members = g.members.map((i) => stories[i]);
      const terms = nlp.topTerms(members.map((s) => `${s.want || s.title || ""}`), 2);
      return {
        name: titleCase(terms.join(" ")) || "Ungrouped stories",
        summary: `${members.length} stor${members.length > 1 ? "ies" : "y"} with a cohesion of ${g.cohesion}.`,
        storyRefs: members.map((s) => s.ref),
        duplicateRefs: members.map((s) => s.ref).filter((ref) => dupes.has(ref)),
      };
    }),
  };
}

module.exports = {
  extractRequirements,
  generateEpics,
  generateFeatures,
  generateStories,
  generateTasks,
  scoreBacklog,
  detectDependencies,
  clusterStories,
};
