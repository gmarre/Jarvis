/**
 * Small, dependency-free text utilities.
 *
 * Used in two places: the offline fallback engine (when no Claude API key is
 * configured) and the clustering screen, which groups stories by similarity
 * regardless of whether the AI provider is available.
 */

const STOPWORDS = new Set(
  // English
  ("a an the and or but if then else for of to in on at by with from as is are was were be been being " +
    "this that these those it its his her their our your my me we they he she you i not no can could " +
    "should would shall will may might must do does did done have has had having so such than too very " +
    "system user able allow allows allowed via when while where which who whom what how also each per " +
    // French — URDs in this domain are frequently French
    "le la les un une des du de et ou mais si alors pour dans sur avec depuis comme est sont etait " +
    "ce cette ces il elle ils elles nous vous je tu leur son sa ses mon ma mes notre votre ne pas " +
    "peut pourrait devrait doit devra faire fait fais avoir a ete etre plus moins tres tout tous " +
    "utilisateur systeme permettre permet lorsque quand ou quel quelle comment aussi chaque par")
    .split(/\s+/),
);

/** Lowercase, strip accents and punctuation, drop stopwords and short tokens. */
function tokenize(text) {
  if (!text) return [];
  return String(text)
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/[\s-]+/)
    .filter((t) => t.length > 2 && !STOPWORDS.has(t) && !/^\d+$/.test(t));
}

/** Term-frequency map for one document. */
function termFreq(tokens) {
  const tf = new Map();
  for (const t of tokens) tf.set(t, (tf.get(t) || 0) + 1);
  return tf;
}

/**
 * TF-IDF vectors for a corpus of strings, L2-normalised so a dot product is
 * the cosine similarity.
 */
function tfidfVectors(docs) {
  const tokenized = docs.map(tokenize);
  const df = new Map();
  for (const tokens of tokenized) {
    for (const t of new Set(tokens)) df.set(t, (df.get(t) || 0) + 1);
  }
  const N = docs.length || 1;
  return tokenized.map((tokens) => {
    const tf = termFreq(tokens);
    const vec = new Map();
    let norm = 0;
    for (const [term, count] of tf) {
      const idf = Math.log(1 + N / (1 + (df.get(term) || 0)));
      const w = (count / tokens.length) * idf;
      vec.set(term, w);
      norm += w * w;
    }
    norm = Math.sqrt(norm) || 1;
    for (const [term, w] of vec) vec.set(term, w / norm);
    return vec;
  });
}

/** Cosine similarity of two L2-normalised sparse vectors. */
function cosine(a, b) {
  // Iterate the smaller map.
  const [small, large] = a.size <= b.size ? [a, b] : [b, a];
  let dot = 0;
  for (const [term, w] of small) {
    const other = large.get(term);
    if (other) dot += w * other;
  }
  return dot;
}

/**
 * Agglomerative clustering by cosine similarity, single-linkage with a
 * threshold. Deterministic: items keep their input order.
 *
 * Returns an array of clusters, each `{ members: number[], cohesion: number }`
 * where members are indices into `docs`.
 */
function clusterBySimilarity(docs, threshold = 0.28) {
  const vectors = tfidfVectors(docs);
  const n = docs.length;
  const parent = Array.from({ length: n }, (_, i) => i);
  const find = (i) => (parent[i] === i ? i : (parent[i] = find(parent[i])));
  const union = (i, j) => {
    const a = find(i), b = find(j);
    if (a !== b) parent[Math.max(a, b)] = Math.min(a, b);
  };

  const sims = [];
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const s = cosine(vectors[i], vectors[j]);
      if (s >= threshold) {
        union(i, j);
        sims.push({ i, j, s });
      }
    }
  }

  const groups = new Map();
  for (let i = 0; i < n; i++) {
    const root = find(i);
    if (!groups.has(root)) groups.set(root, []);
    groups.get(root).push(i);
  }

  return [...groups.values()].map((members) => {
    const inner = sims.filter((p) => members.includes(p.i) && members.includes(p.j));
    const cohesion = inner.length ? inner.reduce((a, p) => a + p.s, 0) / inner.length : 1;
    return { members, cohesion: Number(cohesion.toFixed(3)) };
  });
}

/** Pairs above `threshold` — used to flag likely duplicates. */
function nearDuplicatePairs(docs, threshold = 0.62) {
  const vectors = tfidfVectors(docs);
  const pairs = [];
  for (let i = 0; i < docs.length; i++) {
    for (let j = i + 1; j < docs.length; j++) {
      const s = cosine(vectors[i], vectors[j]);
      if (s >= threshold) pairs.push({ a: i, b: j, similarity: Number(s.toFixed(3)) });
    }
  }
  return pairs.sort((x, y) => y.similarity - x.similarity);
}

/** The most distinctive terms in a group of documents — used to name clusters. */
function topTerms(docs, limit = 3) {
  const counts = new Map();
  for (const d of docs) {
    for (const t of new Set(tokenize(d))) counts.set(t, (counts.get(t) || 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([t]) => t);
}

/**
 * Splits a requirements document into numbered sections.
 *
 * Recognises "3.1 Title." / "3.1. Title" / "Section 4 — Title" headings, which
 * is what URD exports from Word and Confluence typically produce.
 */
function splitSections(text) {
  if (!text) return [];
  const lines = String(text).replace(/\r\n?/g, "\n").split("\n");
  const heading = /^\s*(?:(?:section|chapitre|chapter)\s+)?(\d+(?:\.\d+)*)[.)]?\s+(.{2,120}?)\s*$/i;

  const sections = [];
  let current = null;
  for (const line of lines) {
    const m = line.match(heading);
    // A heading line is short and not a full sentence.
    if (m && line.trim().length < 120 && !/[.;:]\s\S/.test(line.trim())) {
      if (current) sections.push(current);
      current = { number: m[1], title: m[2].replace(/[.:]\s*$/, ""), body: "" };
    } else if (current) {
      current.body += line + "\n";
    } else if (line.trim()) {
      current = { number: "0", title: "Preamble", body: line + "\n" };
    }
  }
  if (current) sections.push(current);
  return sections.map((s) => ({ ...s, body: s.body.trim() }));
}

/** Modal verbs that mark a normative statement, in English and French. */
const MODAL = /\b(must|shall|should|will|has to|have to|is required to|doit|doivent|devra|devront|devrait|il faut)\b/i;

/** Splits prose into sentences, tolerating abbreviations reasonably well. */
function sentences(text) {
  if (!text) return [];
  return String(text)
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+(?=[A-Z0-9«"'(])/)
    .map((s) => s.trim())
    .filter((s) => s.length > 15);
}

module.exports = {
  tokenize,
  tfidfVectors,
  cosine,
  clusterBySimilarity,
  nearDuplicatePairs,
  topTerms,
  splitSections,
  sentences,
  MODAL,
};
