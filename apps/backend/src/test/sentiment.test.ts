import { analyzeCommentSentiment } from "../libs/sentiment.lib.js";

// ============================================================================
// 6 CORE TEST CASES: Pedagogical, Multilingual, and Contrastive Statements
// ============================================================================
const TEST_CASES: { label: string; text: string }[] = [
  // 1. Pure Positive (English N-Grams & Approachability)
  {
    label: "English: High Praise & Mastery",
    text: "Sir is well prepared every meeting. He explains clearly, has full mastery of the subject, and is always open to questions.",
  },

  // 2. Pure Negative (English Friction & Slide-Reading)
  {
    label: "English: Severe Negative Pedagogy & Punctuality",
    text: "Total waste of time. He is a slide reader who is always late and gives zero consideration to students.",
  },

  // 3. Multilingual Positive (Bisaya with Post-Intensifier 'kaayo')
  {
    label: "Bisaya: Positive Pedagogy & Demeanor",
    text: "Maayo kaayo mutudlo si sir! Dali ra sabton ang mga lisod nga concepts ug buotan gyud kaayo.",
  },

  // 4. Multilingual Negative (Bisaya with Negation & Idioms)
  {
    label: "Bisaya: Negative Delivery & Grading",
    text: "Walay klaro mutudlo, dugay pa gyud mag-start. Dili masabtan ang exam tapos hasol kaayo manghatag ug requirements.",
  },

  // 5. Complex Contrastive Shift ('pero' Recency Weighting)
  {
    label: "Contrastive Shift: Hard exam shifted by positive delivery ('pero')",
    text: "Lisod kaayo iyang exam ug medyo strikto, pero maayo kaayo mutudlo ug dako ug natabang sa among project.",
  },

  // 6. Mixed Polarity (Strong Positive Pedagogy vs Strong Negative Attitude)
  {
    label: "Mixed Polarity: Great teacher, but terror personality",
    text: "Magaling mag-explain ng topics at dedicated teacher, kaso terror at suplado pag nagtanong ka sa consultation.",
  },
];

// ============================================================================
// CONSOLE RUNNER
// ============================================================================
console.clear();
console.log("================================================================================");
console.log("🧪 PIT-FES SENTIMENT & ASPECT ANALYSIS TEST (6 CASES)");
console.log("================================================================================\n");

TEST_CASES.forEach((test, index) => {
  const result = analyzeCommentSentiment(test.text);

  const color =
    result.classification === "POSITIVE"
      ? "\x1b[32m" // Green
      : result.classification === "NEGATIVE"
        ? "\x1b[31m" // Red
        : result.classification === "MIXED"
          ? "\x1b[33m" // Yellow
          : "\x1b[37m"; // White
  const reset = "\x1b[0m";

  console.log(`[TEST #${index + 1}] ${test.label}`);
  console.log(`Input Text   : "${test.text}"`);
  console.log(
    `Polarity     : ${color}${result.classification}${reset} (Score: ${result.score > 0 ? "+" : ""}${result.score.toFixed(2)} | Raw: ${result.rawScore})`,
  );
  console.log(`N-Grams      : ${JSON.stringify(result.detectedIdioms)}`);
  console.log(
    `Words Matched: +${JSON.stringify(result.positiveWords)} | -${JSON.stringify(result.negativeWords)}`,
  );

  if (result.primaryAspects.length > 0) {
    console.log("Aspects      :");
    result.primaryAspects.forEach((a) => {
      console.log(
        `  • ${a.aspect.padEnd(12)}: ${a.classification.padEnd(8)} (${a.score > 0 ? "+" : ""}${a.score.toFixed(2)})`,
      );
    });
  }

  console.log(`Summary      : ${result.summary}`);
  console.log("--------------------------------------------------------------------------------\n");
});
