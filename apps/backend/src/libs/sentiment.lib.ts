import type {
  AspectBreakdown,
  SentimentAnalysisResult,
  SentimentClassification,
} from "@my-app/shared";

// ============================================================================
// 1. DOMAIN-SPECIFIC N-GRAM LEXICON (Priority Multi-word matching)
// ============================================================================
const NGRAM_LEXICON: Record<string, number> = {
  // English Pedagogy & Teaching Positive
  "well prepared": 3,
  "well-prepared": 3,
  "master of subject": 4,
  "mastery of subject": 4,
  "mastered the subject": 4,
  "explains clearly": 3,
  "explains very clearly": 4,
  "easy to understand": 3,
  "open for questions": 3,
  "open to questions": 3,
  "fair grader": 3,
  "fair grading": 3,
  "constructive feedback": 3,
  "gives feedback": 2,
  "second chance": 2,
  "gives consideration": 3,
  "dedicated teacher": 4,
  "passionate about teaching": 4,
  "makes class fun": 3,
  "hands on": 2,
  "hands-on": 2,

  // Filipino / Tagalog & Taglish Positive
  "magaling mag-explain": 4,
  "magaling magturo": 4,
  "madaling lapitan": 3,
  "mabait magturo": 3,
  "masipag magturo": 3,
  "hindi madamot": 3,
  "maayos magturo": 3,
  "laging handa": 3,

  // Bisaya / Cebuano Positive
  "dali ra sabton": 3,
  "sayon ra sabton": 3,
  "maayo mutudlo": 4,
  "maayo motudlo": 4,
  "maayong mutudlo": 4,
  "mabuot kaayo": 3,
  "buotan kaayo": 3,
  "dali ra pangutan-on": 3,
  "dali pangutan-on": 3,
  "dako ug tabang": 3,
  "dako ug natabang": 3,
  "kugihan mutudlo": 3,
  "tarong mutudlo": 3,
  "dili boring": 3,
  "lingaw kaayo": 3,

  // English Negative
  "reads off slides": -3,
  "reads ppt": -3,
  "slide reader": -3,
  "powerpoint reader": -3,
  "hard to understand": -3,
  "difficult to understand": -3,
  "always late": -3,
  "no feedback": -3,
  "zero consideration": -3,
  "no consideration": -3,
  "too much requirements": -2,
  "heavy workload": -2,
  "high failing rate": -3,
  "waste of time": -4,
  "not prepared": -3,
  "never on time": -3,
  "does not explain": -3,

  // Filipino / Tagalog & Taglish Negative
  "nagbasa ra sa ppt": -3,
  "nagbasa ra sa powerpoint": -3,
  "palaging late": -3,
  "sige lang late": -3,
  "sige ra late": -3,
  "walay feedback": -3,
  "hindi nagbibigay ng feedback": -3,
  "walay consideration": -3,
  "walay ka-consideration": -3,
  "walang consideration": -3,
  "walang natutunan": -4,
  "dili masabtan": -3,
  "di masabtan": -3,
  "walay masabtan": -3,
  "way klaro": -3,
  "walay klaro": -3,
  "walay ka-klaro": -3,
  "dili kabalo magturo": -4,
  "di kabalo mutudlo": -4,
  "walay matutunan": -4,
  "walay natun-an": -4,
  "bagsakan class": -3,
  "good luck nalang": -2,
  "good luck na lang": -2,
  "sana all nagturo": -2,
  "usik sa oras": -4,
};

const NGRAM_PATTERNS = Object.keys(NGRAM_LEXICON)
  .sort((a, b) => b.length - a.length)
  .map((phrase) => phrase.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&"));

const NGRAM_REGEX = new RegExp(NGRAM_PATTERNS.join("|"), "gi");

// ============================================================================
// 2. UNIGRAM MULTILINGUAL VOCABULARY (English, Tagalog, Bisaya)
// ============================================================================
const UNIGRAM_LEXICON: Record<string, number> = {
  // English Positive
  approachable: 2,
  knowledgeable: 3,
  accommodating: 2,
  engaging: 3,
  inspiring: 3,
  prepared: 2,
  organized: 2,
  passionate: 3,
  understanding: 2,
  fair: 2,
  patient: 2,
  punctual: 2,
  resourceful: 2,
  supportive: 2,
  clear: 2,
  helpful: 2,
  effective: 3,
  interactive: 2,
  considerate: 2,
  encouraging: 3,
  mastery: 3,
  expert: 3,
  dedication: 3,
  kind: 2,
  friendly: 2,
  great: 3,
  good: 2,
  best: 3,
  love: 3,
  awesome: 3,
  thorough: 2,

  // English Negative
  unapproachable: -2,
  unprepared: -3,
  monotone: -2,
  disorganized: -2,
  confusing: -2,
  terror: -3,
  bias: -3,
  biased: -3,
  unfair: -3,
  late: -2,
  absent: -2,
  tardy: -2,
  boring: -2,
  dull: -2,
  rude: -3,
  arrogant: -3,
  harsh: -2,
  unclear: -2,
  unreasonable: -3,
  strict: -1,
  favoritism: -3,
  ghosting: -2,
  bad: -2,
  poor: -2,
  terrible: -3,
  worst: -4,
  hate: -3,

  // Tagalog Positive
  magaling: 3,
  mabait: 2,
  masipag: 2,
  maunawain: 2,
  maaasahan: 2,
  maayos: 2,
  madaling: 1,
  lodi: 2,
  petmalu: 2,
  husay: 3,
  galing: 3,

  // Tagalog Negative
  tamad: -3,
  magulo: -2,
  suplado: -2,
  suplada: -2,
  masungit: -2,
  bagsak: -2,
  bagsakan: -3,
  madamot: -2,
  pahirap: -3,
  kwenta: -3,
  walangkwenta: -4,

  // Bisaya Positive
  maayo: 3,
  maayong: 3,
  mabuot: 2,
  buotan: 2,
  kugi: 2,
  kugihan: 2,
  hawod: 3,
  masabtan: 3,
  sabtonon: 3,
  chada: 2,
  tsada: 2,
  lingaw: 3,
  malingaw: 3,
  kalingaw: 3,
  alisto: 2,
  abtik: 2,
  tarong: 2,
  sinabtanay: 2,
  sayon: 2,
  sayun: 2,
  humot: 2,

  // Bisaya Negative
  langay: -2,
  dugay: -2,
  tapulan: -3,
  tapolan: -3,
  maldito: -3,
  maldita: -3,
  isog: -1,
  samok: -2,
  lisod: -2,
  lisud: -2,
  hasol: -2,
  paantos: -3,
  antos: -2,
  gubot: -2,
  salbahis: -3,
  kapoy: -1,
  yawyawan: -2,
  yawyaw: -2,
  gara: -2,
  garaon: -2,
  sabaan: -1,
  hilas: -3,
  bogo: -4,
};

// ============================================================================
// 3. CONTEXTUAL MODIFIERS & ASPECTS
// ============================================================================

const PRE_INTENSIFIERS = new Set([
  "very",
  "extremely",
  "super",
  "so",
  "highly",
  "exceptionally",
  "really",
  "sobrang",
  "lubos",
  "napaka",
  "grabe",
  "grabi",
  "talaga",
  "pierte",
  "pierteng",
  "pwerte",
  "pwerteng",
  "hastang",
  "subra",
  "subrang",
  "mas",
]);

const POST_INTENSIFIERS = new Set(["kaayo", "kayo", "kaau", "gyud", "gud", "ka-ayo", "gid"]);
const DIMINISHERS = new Set(["slightly", "somewhat", "medyo", "bahagya", "gamay", "dyutay"]);
const CONTRASTIVE_CONJUNCTIONS = new Set([
  "but",
  "however",
  "although",
  "though",
  "yet",
  "pero",
  "kaso",
  "subalit",
  "bagamat",
  "apan",
  "ugali",
]);

const NEGATIONS = new Set([
  "not",
  "never",
  "no",
  "none",
  "hardly",
  "barely",
  "dont",
  "don't",
  "isnt",
  "isn't",
  "hindi",
  "di",
  "wala",
  "huwag",
  "dili",
  "walay",
  "way",
  "wai",
  "ayaw",
]);

const ASPECT_KEYWORDS: Record<AspectBreakdown["aspect"], string[]> = {
  PEDAGOGY: [
    "explain",
    "discuss",
    "tudlo",
    "turo",
    "lecture",
    "lesson",
    "ppt",
    "slides",
    "subject",
    "mastery",
    "concept",
    "clear",
    "confusing",
    "sabton",
    "matutunan",
    "teaching",
    "teach",
    "topic",
    "materials",
  ],
  PUNCTUALITY: [
    "late",
    "absent",
    "time",
    "schedule",
    "dugay",
    "langay",
    "tardy",
    "punctual",
    "sayo",
    "oras",
    "attend",
    "meeting",
  ],
  GRADING: [
    "grade",
    "exam",
    "test",
    "quiz",
    "score",
    "fair",
    "bias",
    "bagsak",
    "singko",
    "consideration",
    "madamot",
    "retake",
    "failing",
    "checking",
    "rubric",
  ],
  ATTITUDE: [
    "approachable",
    "mabuot",
    "mabait",
    "terror",
    "isog",
    "suplado",
    "masungit",
    "patient",
    "rude",
    "polite",
    "arrogant",
    "understanding",
    "kind",
    "attitude",
    "respect",
  ],
  WORKLOAD: [
    "requirement",
    "project",
    "assignment",
    "workload",
    "task",
    "pahirap",
    "hasol",
    "overwhelming",
    "demanding",
    "deadline",
  ],
};

const ASPECT_REGEXES: Record<string, RegExp> = {};
for (const [aspect, keywords] of Object.entries(ASPECT_KEYWORDS)) {
  ASPECT_REGEXES[aspect] = new RegExp(`\\b(${keywords.join("|")})\\b`, "i");
}

// ============================================================================
// 4. CORE SCORING & TOKEN LOOKUP ENGINE
// ============================================================================

const getWordScore = (word: string): number => {
  return UNIGRAM_LEXICON[word.toLowerCase()] ?? 0;
};

const getNearbyWordScore = (
  tokens: string[],
  startIndex: number,
  direction: 1 | -1,
  maxDistance = 2,
): number => {
  for (let d = 1; d <= maxDistance; d++) {
    const idx = startIndex + d * direction;
    if (idx < 0 || idx >= tokens.length) break;

    const word = tokens[idx]?.toLowerCase() ?? "";
    if (word !== "") {
      const score = getWordScore(word);
      if (score !== 0) return score;
    }
  }
  return 0;
};

/**
 * Deep Multilingual, Idiom-Aware, & Aspect-Categorized Sentiment Analyzer.
 * Returns normalized score between -1.00 and +1.00 (fits SQL decimal(5, 2)).
 */
export function analyzeCommentSentiment(text?: string | null): SentimentAnalysisResult {
  if (!text || !text.trim()) {
    return {
      score: 0.0,
      rawScore: 0,
      comparative: 0.0,
      classification: "NEUTRAL",
      primaryAspects: [],
      detectedIdioms: [],
      positiveWords: [],
      negativeWords: [],
      summary: "No qualitative comment provided.",
    };
  }

  const cleanText = text.trim();
  let textToAnalyze = cleanText.toLowerCase();
  const detectedIdioms: string[] = [];
  const positiveWords: string[] = [];
  const negativeWords: string[] = [];
  let nGramBonusScore = 0;

  // 1. Match & Mask Multi-Word N-Grams
  textToAnalyze = textToAnalyze.replace(NGRAM_REGEX, (match) => {
    const phrase = match.toLowerCase();
    const score = NGRAM_LEXICON[phrase];
    if (score !== undefined) {
      detectedIdioms.push(phrase);
      nGramBonusScore += score;
      if (score > 0) positiveWords.push(phrase);
      else if (score < 0) negativeWords.push(phrase);
    }
    return " "; // Mask out matched n-gram so unigrams don't double count
  });

  // 2. Clause Segmentation by Contrastive Conjunctions (e.g. "pero", "but", "however")
  const contrastPattern = /\b(but|however|although|though|yet|pero|kaso|subalit|bagamat|apan)\b/gi;
  const clauses = textToAnalyze.split(contrastPattern);

  let cumulativeScore = nGramBonusScore;
  const aspectScores: Record<AspectBreakdown["aspect"], number> = {
    PEDAGOGY: 0,
    PUNCTUALITY: 0,
    GRADING: 0,
    ATTITUDE: 0,
    WORKLOAD: 0,
  };

  for (let cIdx = 0; cIdx < clauses.length; cIdx++) {
    const clause = clauses[cIdx]!.trim();
    if (!clause || CONTRASTIVE_CONJUNCTIONS.has(clause)) continue;

    // Recency weighting for post-contrast thoughts
    const isPostContrast =
      cIdx > 0 && CONTRASTIVE_CONJUNCTIONS.has(clauses[cIdx - 1]?.trim() || "");
    const clauseWeight = isPostContrast ? 1.6 : 1.0;

    let clauseScore = 0;
    const tokens = clause
      .replace(/[^\w\s-]/g, "")
      .split(/\s+/)
      .filter(Boolean);

    // Identify matched pedagogical aspects in this clause
    const matchedAspects = new Set<AspectBreakdown["aspect"]>();
    for (const [aspect, regex] of Object.entries(ASPECT_REGEXES)) {
      if (regex.test(clause)) {
        matchedAspects.add(aspect as AspectBreakdown["aspect"]);
      }
    }

    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i]!.toLowerCase();
      let wordScore = getWordScore(token);

      if (wordScore !== 0) {
        // Check for preceding negation (e.g. "not good", "dili masabtan")
        if (i > 0 && NEGATIONS.has(tokens[i - 1]!.toLowerCase())) {
          wordScore = -wordScore * 1.2;
        }

        clauseScore += wordScore;
        if (wordScore > 0) positiveWords.push(token);
        else if (wordScore < 0) negativeWords.push(token);
      }

      // Check intensifiers & diminishers
      if (PRE_INTENSIFIERS.has(token)) {
        const targetScore = getNearbyWordScore(tokens, i, 1, 2);
        if (targetScore !== 0) clauseScore += targetScore * 0.5;
      }

      if (POST_INTENSIFIERS.has(token)) {
        const targetScore = getNearbyWordScore(tokens, i, -1, 2);
        if (targetScore !== 0) clauseScore += targetScore * 0.5;
      }

      if (DIMINISHERS.has(token)) {
        const targetScore = getNearbyWordScore(tokens, i, 1, 2);
        if (targetScore !== 0) clauseScore -= targetScore * 0.5;
      }
    }

    const weightedClauseScore = clauseScore * clauseWeight;
    cumulativeScore += weightedClauseScore;

    if (matchedAspects.size > 0) {
      const splitScore = weightedClauseScore / matchedAspects.size;
      matchedAspects.forEach((aspect) => {
        aspectScores[aspect] = (aspectScores[aspect] || 0) + splitScore;
      });
    }
  }

  // 3. Score Normalization strictly into [-1.00, 1.00]
  const rawScore = Number(cumulativeScore.toFixed(2));
  const wordCount = cleanText.split(/\s+/).length || 1;
  const comparative = Number((rawScore / wordCount).toFixed(2));

  // Soft-sign normalization curves large positive/negative values smoothly into [-1.00, 1.00]
  const normalizedRaw =
    cumulativeScore === 0 ? 0 : cumulativeScore / Math.sqrt(cumulativeScore * cumulativeScore + 10);
  const score = Number(Math.max(-1.0, Math.min(1.0, normalizedRaw)).toFixed(2));

  // 4. Extract Primary Aspect Breakdowns
  const primaryAspects: AspectBreakdown[] = (
    Object.entries(aspectScores) as [AspectBreakdown["aspect"], number][]
  )
    .filter(([_idx, aScore]) => Math.abs(aScore) > 0.1)
    .map(([aspect, aScore]) => ({
      aspect,
      score: Number(Math.max(-1.0, Math.min(1.0, aScore / 5)).toFixed(2)),
      classification: aScore > 0.3 ? "POSITIVE" : aScore < -0.3 ? "NEGATIVE" : "NEUTRAL",
    }));

  // 5. Categorize Polarity & Mixed Sentiments
  const hasStrongPos = primaryAspects.some((a) => a.score > 0.3) || positiveWords.length >= 2;
  const hasStrongNeg = primaryAspects.some((a) => a.score < -0.3) || negativeWords.length >= 2;

  let classification: SentimentClassification = "NEUTRAL";
  if (hasStrongPos && hasStrongNeg) {
    classification = "MIXED";
  } else if (score >= 0.15) {
    classification = "POSITIVE";
  } else if (score <= -0.15) {
    classification = "NEGATIVE";
  }

  let summary = `Overall ${classification.toLowerCase()} sentiment (${score > 0 ? "+" : ""}${score.toFixed(2)}).`;
  if (primaryAspects.length > 0) {
    const aspectSummary = primaryAspects
      .map((a) => `${a.aspect.toLowerCase()}: ${a.classification.toLowerCase()}`)
      .join(", ");
    summary += ` Highlights: [${aspectSummary}].`;
  }

  return {
    score,
    rawScore,
    comparative,
    classification,
    primaryAspects,
    detectedIdioms: Array.from(new Set(detectedIdioms)),
    positiveWords: Array.from(new Set(positiveWords)),
    negativeWords: Array.from(new Set(negativeWords)),
    summary,
  };
}
