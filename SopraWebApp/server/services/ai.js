/**
 * AI service — Claude API with a deterministic offline fallback.
 *
 * Every generator here has two implementations:
 *
 *   1. Claude (`claude-opus-5`) with structured JSON output, used whenever an
 *      API key is configured.
 *   2. A local heuristic engine (see ./local-engine.js) used when there is no
 *      key, when the network is unavailable, or when a request is declined.
 *
 * The caller never has to care which ran — the return shape is identical, and
 * each result carries `engine: "claude" | "local"` so the UI can label it.
 */

const Anthropic = require("@anthropic-ai/sdk");
const { getSetting } = require("../db");
const local = require("./local-engine");

const MODEL = "claude-opus-5";
const MAX_TOKENS = 16000;

/* ------------------------------------------------------------------ *
 * Client
 * ------------------------------------------------------------------ */

let cachedClient = null;
let cachedKey = null;

/** Reads the key from the admin settings table first, then the environment. */
function apiKey() {
  return getSetting("anthropic_api_key") || process.env.ANTHROPIC_API_KEY || null;
}

function getClient() {
  const key = apiKey();
  if (!key) return null;
  if (cachedClient && cachedKey === key) return cachedClient;
  const Ctor = Anthropic.default || Anthropic;
  cachedClient = new Ctor({ apiKey: key, maxRetries: 2, timeout: 120_000 });
  cachedKey = key;
  return cachedClient;
}

/** True when the app is configured to call Claude. */
function isConfigured() {
  return Boolean(apiKey());
}

function status() {
  return {
    configured: isConfigured(),
    provider: getSetting("ai_provider", "Anthropic"),
    model: getSetting("ai_model", MODEL),
    minConfidence: Number(getSetting("ai_min_confidence", "0.7")),
    engine: isConfigured() ? "claude" : "local",
    keyPreview: maskKey(apiKey()),
  };
}

function maskKey(key) {
  if (!key) return null;
  return key.length <= 8 ? "•".repeat(key.length) : key.slice(0, 3) + "•".repeat(20) + key.slice(-4);
}

/* ------------------------------------------------------------------ *
 * Core call
 * ------------------------------------------------------------------ */

/**
 * One structured-output request.
 *
 * `system` is sent as a cached block so repeated calls with the same
 * instructions only pay full price once (caching is a prefix match, so the
 * volatile document text goes in `messages`, after the cached prefix).
 *
 * Returns the parsed object, or throws. Callers catch and fall back to local.
 */
async function ask({ system, user, schema, effort = "high", maxTokens = MAX_TOKENS }) {
  const client = getClient();
  if (!client) throw new Error("no_api_key");

  const model = getSetting("ai_model", MODEL);

  const request = {
    model,
    max_tokens: maxTokens,
    system: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }],
    messages: [{ role: "user", content: user }],
    output_config: {
      effort,
      format: { type: "json_schema", schema },
    },
  };

  let response;
  try {
    // Server-side fallback re-runs a declined request on another model inside
    // the same call, so a false-positive policy decline still returns work.
    response = await client.beta.messages.create({
      ...request,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
    });
  } catch (err) {
    // Older API surfaces reject the beta; retry without it rather than failing.
    if (err && (err.status === 400 || err.status === 404)) {
      response = await client.messages.create(request);
    } else {
      throw err;
    }
  }

  if (response.stop_reason === "refusal") {
    const category = response.stop_details ? response.stop_details.category : null;
    const err = new Error(`claude_refused${category ? `:${category}` : ""}`);
    err.refusal = true;
    throw err;
  }
  if (response.stop_reason === "max_tokens") {
    throw new Error("claude_truncated");
  }

  const text = (response.content || []).filter((b) => b.type === "text").map((b) => b.text).join("");
  if (!text.trim()) throw new Error("claude_empty_response");

  try {
    return JSON.parse(text);
  } catch {
    // output_config.format guarantees valid JSON, but a truncated or wrapped
    // response can still slip through — recover the outermost object.
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start !== -1 && end > start) return JSON.parse(text.slice(start, end + 1));
    throw new Error("claude_unparseable_response");
  }
}

/**
 * Runs the Claude implementation, falling back to the local one on any
 * failure. Logs the reason so the Administration screen can surface it.
 */
async function withFallback(name, claudeFn, localFn) {
  if (!isConfigured()) {
    return { ...localFn(), engine: "local", reason: "no_api_key" };
  }
  try {
    const result = await claudeFn();
    return { ...result, engine: "claude" };
  } catch (err) {
    const reason = err && err.message ? err.message : "unknown_error";
    console.warn(`[ai] ${name} fell back to the local engine: ${reason}`);
    return { ...localFn(), engine: "local", reason };
  }
}

/* ------------------------------------------------------------------ *
 * Shared prompt preamble
 *
 * Stable across every call so it caches once and is read thereafter.
 * ------------------------------------------------------------------ */

const SAFE_CONTEXT = `You are the extraction and decomposition engine inside a SAFe PI Planning
assistant used by business analysts and product owners preparing a Program Increment.

Domain vocabulary, from coarsest to finest:
- Requirement: one normative statement taken from a user requirements document (URD).
- Epic: a large body of work spanning a whole capability area, delivered over several sprints.
- Feature: the unit that gets scheduled into a single sprint. Sits between Epic and Story.
- User Story: "As a <role>, I want <capability>, so that <benefit>", small enough for one sprint.
- Acceptance criterion: a Given / When / Then triple that makes a story testable.
- Task: a concrete engineering activity under a story, estimated in hours.

Rules that apply to everything you produce:
- Stay strictly faithful to the source material. Never invent capabilities the
  source does not support. If the source is thin, produce fewer items rather
  than padding with plausible-sounding filler.
- Write in the language of the source document. If the source is French, write
  French; if English, write English. Do not translate.
- Titles are short noun phrases, no trailing punctuation, no numbering prefix.
- Every item carries a confidence between 0 and 1 reflecting how directly the
  source supports it. Be honest: below 0.7 means a human should review it.
- MoSCoW priority is one of exactly: Must, Should, Could, Wont.
- Story points use the Fibonacci scale: 1, 2, 3, 5, 8, 13, 21.
- Return only the JSON described by the schema. No commentary.`;

/* ------------------------------------------------------------------ *
 * Schemas
 * ------------------------------------------------------------------ */

const CONFIDENCE = { type: "number", minimum: 0, maximum: 1 };
const MOSCOW = { type: "string", enum: ["Must", "Should", "Could", "Wont"] };

const requirementsSchema = {
  type: "object",
  properties: {
    requirements: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          body: { type: "string" },
          section: { type: "string" },
          page: { type: "integer" },
          confidence: CONFIDENCE,
        },
        required: ["title", "body", "confidence"],
        additionalProperties: false,
      },
    },
  },
  required: ["requirements"],
  additionalProperties: false,
};

const epicsSchema = {
  type: "object",
  properties: {
    epics: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          description: { type: "string" },
          requirementRefs: { type: "array", items: { type: "string" } },
          confidence: CONFIDENCE,
        },
        required: ["title", "description", "confidence"],
        additionalProperties: false,
      },
    },
  },
  required: ["epics"],
  additionalProperties: false,
};

const featuresSchema = {
  type: "object",
  properties: {
    features: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          description: { type: "string" },
          epicTitle: { type: "string" },
          requirementRefs: { type: "array", items: { type: "string" } },
          points: { type: "integer" },
          moscow: MOSCOW,
          confidence: CONFIDENCE,
        },
        required: ["title", "description", "points", "moscow", "confidence"],
        additionalProperties: false,
      },
    },
  },
  required: ["features"],
  additionalProperties: false,
};

const storiesSchema = {
  type: "object",
  properties: {
    stories: {
      type: "array",
      items: {
        type: "object",
        properties: {
          actor: { type: "string" },
          want: { type: "string" },
          benefit: { type: "string" },
          points: { type: "integer" },
          moscow: MOSCOW,
          confidence: CONFIDENCE,
          acceptanceCriteria: {
            type: "array",
            items: {
              type: "object",
              properties: {
                given: { type: "string" },
                when: { type: "string" },
                then: { type: "string" },
              },
              required: ["given", "when", "then"],
              additionalProperties: false,
            },
          },
        },
        required: ["actor", "want", "benefit", "points", "moscow", "confidence", "acceptanceCriteria"],
        additionalProperties: false,
      },
    },
  },
  required: ["stories"],
  additionalProperties: false,
};

const tasksSchema = {
  type: "object",
  properties: {
    tasks: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          hours: { type: "number" },
        },
        required: ["title", "hours"],
        additionalProperties: false,
      },
    },
  },
  required: ["tasks"],
  additionalProperties: false,
};

const wsjfSchema = {
  type: "object",
  properties: {
    scores: {
      type: "array",
      items: {
        type: "object",
        properties: {
          ref: { type: "string" },
          businessValue: { type: "number" },
          timeCriticality: { type: "number" },
          riskReduction: { type: "number" },
          jobSize: { type: "number" },
          moscow: MOSCOW,
          rationale: { type: "string" },
        },
        required: ["ref", "businessValue", "timeCriticality", "riskReduction", "jobSize", "moscow"],
        additionalProperties: false,
      },
    },
  },
  required: ["scores"],
  additionalProperties: false,
};

const dependencySchema = {
  type: "object",
  properties: {
    dependencies: {
      type: "array",
      items: {
        type: "object",
        properties: {
          fromRef: { type: "string" },
          toRef: { type: "string" },
          kind: { type: "string", enum: ["blocks", "depends_on"] },
          severity: { type: "string", enum: ["normal", "blocking"] },
          note: { type: "string" },
        },
        required: ["fromRef", "toRef", "kind", "severity", "note"],
        additionalProperties: false,
      },
    },
  },
  required: ["dependencies"],
  additionalProperties: false,
};

const clusterSchema = {
  type: "object",
  properties: {
    clusters: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          summary: { type: "string" },
          storyRefs: { type: "array", items: { type: "string" } },
          duplicateRefs: { type: "array", items: { type: "string" } },
        },
        required: ["name", "summary", "storyRefs", "duplicateRefs"],
        additionalProperties: false,
      },
    },
  },
  required: ["clusters"],
  additionalProperties: false,
};

/* ------------------------------------------------------------------ *
 * Generators
 * ------------------------------------------------------------------ */

/** Document text → normative requirements. */
async function extractRequirements(text, { projectName = "", limit = 60 } = {}) {
  return withFallback(
    "extractRequirements",
    () =>
      ask({
        system: `${SAFE_CONTEXT}

TASK: Extract every distinct normative requirement from the requirements document below.

A requirement is a statement of something the system must do or must satisfy —
functional behaviour, a constraint, a rule, a quality attribute. Skip narrative
context, scope notes, glossaries, and revision history.

Split compound statements: "the system must do A and B" is two requirements when
A and B can be accepted independently.

Set "section" to the document's own section number when one is visible (e.g. "3.1").
Produce at most ${limit} requirements, ordered as they appear in the document.`,
        user: `Project: ${projectName || "(unnamed)"}\n\n--- REQUIREMENTS DOCUMENT ---\n${text}`,
        schema: requirementsSchema,
        effort: "high",
      }),
    () => local.extractRequirements(text, { limit }),
  );
}

/** Requirements → epics. */
async function generateEpics(requirements, { projectName = "" } = {}) {
  const list = requirements
    .map((r) => `${r.ref} [${r.status}] ${r.title}\n    ${(r.body || "").slice(0, 400)}`)
    .join("\n");
  return withFallback(
    "generateEpics",
    () =>
      ask({
        system: `${SAFE_CONTEXT}

TASK: Group the approved requirements below into epics.

An epic is a capability area, not a feature and not a task. Aim for 3 to 6 epics
for a typical project — if you find yourself producing ten, you are working at
feature granularity and should merge.

Every requirement should map into exactly one epic. List the requirement refs you
assigned in "requirementRefs". A requirement that fits nowhere is a signal the
epic set is wrong, not a reason to create a catch-all "Miscellaneous" epic.`,
        user: `Project: ${projectName || "(unnamed)"}\n\n--- REQUIREMENTS ---\n${list}`,
        schema: epicsSchema,
        effort: "high",
      }),
    () => local.generateEpics(requirements),
  );
}

/** Epic + its requirements → features (the unit scheduled into a sprint). */
async function generateFeatures(epic, requirements, { projectName = "" } = {}) {
  const list = requirements.map((r) => `${r.ref} ${r.title}\n    ${(r.body || "").slice(0, 400)}`).join("\n");
  return withFallback(
    "generateFeatures",
    () =>
      ask({
        system: `${SAFE_CONTEXT}

TASK: Decompose one epic into features.

A feature must be deliverable inside a single sprint by a single team. Size each
one in story points on the Fibonacci scale — a feature above 21 points is too big
and should be split. Typical epics yield 2 to 5 features.

Set "epicTitle" to the epic you were given, verbatim, and list in
"requirementRefs" the requirements each feature covers. Every requirement you
were given should land in exactly one feature.`,
        user: `Project: ${projectName || "(unnamed)"}
Epic: ${epic.title}
Epic description: ${epic.description || "(none)"}

--- REQUIREMENTS IN THIS EPIC ---
${list || "(none — infer from the epic description)"}`,
        schema: featuresSchema,
        effort: "high",
      }),
    () => local.generateFeatures(epic, requirements),
  );
}

/** Feature → user stories with Given/When/Then acceptance criteria. */
async function generateStories(feature, requirements, { projectName = "" } = {}) {
  const list = requirements.map((r) => `${r.ref} ${r.title}\n    ${(r.body || "").slice(0, 300)}`).join("\n");
  return withFallback(
    "generateStories",
    () =>
      ask({
        system: `${SAFE_CONTEXT}

TASK: Decompose one feature into user stories.

Each story is independently demoable and fits comfortably in one sprint —
typically 1 to 8 points. Produce 2 to 6 stories for a normal feature.

"actor" is the role that benefits, in the source language, lowercase, no article
("customer", "support agent", "client", "gestionnaire").
"want" is the capability, phrased as an infinitive without the leading "I want".
"benefit" is the outcome, phrased without the leading "so that".

Give every story 2 or 3 acceptance criteria. Cover the nominal path and at least
one failure or edge case. Criteria must be concrete and checkable — reference
real limits, timings, and error states from the source where they exist.`,
        user: `Project: ${projectName || "(unnamed)"}
Feature: ${feature.title}
Feature description: ${feature.description || "(none)"}

--- RELATED REQUIREMENTS ---
${list || "(none — infer from the feature description)"}`,
        schema: storiesSchema,
        effort: "high",
      }),
    () => local.generateStories(feature, requirements),
  );
}

/** Story → engineering tasks. */
async function generateTasks(story, { projectName = "" } = {}) {
  const ac = (story.acceptanceCriteria || [])
    .map((c, i) => `${i + 1}. Given ${c.given_txt || c.given}, when ${c.when_txt || c.when}, then ${c.then_txt || c.then}`)
    .join("\n");
  return withFallback(
    "generateTasks",
    () =>
      ask({
        system: `${SAFE_CONTEXT}

TASK: Break one user story into the engineering tasks needed to deliver it.

Cover the work that actually has to happen: implementation, tests, and anything
the acceptance criteria imply (migration, configuration, instrumentation).
Estimate each task in hours — whole or half hours, typically 1 to 16.

Produce 3 to 7 tasks. Do not add generic ceremony tasks ("attend standup",
"write the ticket"). Do not restate the story as a task.`,
        user: `Project: ${projectName || "(unnamed)"}
Story: As a ${story.actor}, I want ${story.want}, so that ${story.benefit || "(no benefit stated)"}
Points: ${story.points || "unestimated"}

--- ACCEPTANCE CRITERIA ---
${ac || "(none)"}`,
        schema: tasksSchema,
        effort: "medium",
        maxTokens: 4000,
      }),
    () => local.generateTasks(story),
  );
}

/** Stories → WSJF scores and a MoSCoW suggestion. */
async function scoreBacklog(items, { projectName = "" } = {}) {
  const list = items
    .map((s) => `${s.ref} (${s.points || "?"} pts) As a ${s.actor}, I want ${s.want}, so that ${s.benefit || "-"}`)
    .join("\n");
  return withFallback(
    "scoreBacklog",
    () =>
      ask({
        system: `${SAFE_CONTEXT}

TASK: Score each backlog item for prioritisation.

WSJF = (Business Value + Time Criticality + Risk Reduction) / Job Size.
Score the three numerators from 1 to 10 and Job Size from 1 to 20, using the
Fibonacci-ish spread teams actually use — do not cluster everything around 5.

Then assign MoSCoW. Reserve "Must" for items without which the increment has no
value; "Wont" for items explicitly deferred or out of scope. Most items are
"Should" or "Could".

Give a one-sentence rationale per item, referring to the item's own content.
Return one entry per input ref, using the ref verbatim.`,
        user: `Project: ${projectName || "(unnamed)"}\n\n--- BACKLOG ---\n${list}`,
        schema: wsjfSchema,
        effort: "high",
      }),
    () => local.scoreBacklog(items),
  );
}

/** Cross-item dependency detection. */
async function detectDependencies(items, { projectName = "" } = {}) {
  const list = items
    .map((s) => `${s.ref} [${s.projectName || ""}] ${s.title || s.want}`)
    .join("\n");
  return withFallback(
    "detectDependencies",
    () =>
      ask({
        system: `${SAFE_CONTEXT}

TASK: Identify real delivery dependencies between the items below.

Report a dependency only when one item genuinely cannot be completed before the
other — a shared data model that must exist first, an API one item publishes and
another consumes, an authentication mechanism a payment flow needs. Thematic
similarity is not a dependency.

"blocks" means fromRef must ship before toRef. Use severity "blocking" when the
two items sit in different projects, because those threaten the train's plan;
otherwise "normal".

Prefer precision over recall — an empty list is a valid answer.
Give a one-sentence note per dependency explaining the mechanism.`,
        user: `Project: ${projectName || "(train-wide)"}\n\n--- ITEMS ---\n${list}`,
        schema: dependencySchema,
        effort: "high",
      }),
    () => local.detectDependencies(items),
  );
}

/** Semantic grouping of stories, flagging near-duplicates. */
async function clusterStories(stories, { projectName = "" } = {}) {
  const list = stories.map((s) => `${s.ref} As a ${s.actor}, I want ${s.want}`).join("\n");
  return withFallback(
    "clusterStories",
    () =>
      ask({
        system: `${SAFE_CONTEXT}

TASK: Group the stories below into coherent clusters, and flag duplicates.

A cluster gathers stories that touch the same capability and would sensibly be
refined, estimated, or demoed together. Name each cluster with a short noun
phrase, and summarise in one sentence what the group covers.

In "duplicateRefs", list stories inside that cluster that describe substantially
the same capability as another story in the cluster and should be merged. Only
flag genuine overlap — two stories about the same screen are not duplicates if
they deliver different behaviour.

Every story must appear in exactly one cluster's storyRefs.`,
        user: `Project: ${projectName || "(unnamed)"}\n\n--- STORIES ---\n${list}`,
        schema: clusterSchema,
        effort: "high",
      }),
    () => local.clusterStories(stories),
  );
}

module.exports = {
  MODEL,
  isConfigured,
  status,
  maskKey,
  extractRequirements,
  generateEpics,
  generateFeatures,
  generateStories,
  generateTasks,
  scoreBacklog,
  detectDependencies,
  clusterStories,
};
