/*
==================================================
GENETIK
==================================================

Jeder Hund hat ein Genom: pro Merkmal-Gen ZWEI
Allele (diploid, wie bei Mendel). Sichtbar wird
das dominantere Allel (Reihenfolge in DOMINANCE).

Beim Züchten gibt jedes Elternteil pro Gen ein
zufälliges seiner beiden Allele weiter. Mit einer
kleinen Chance mutiert ein Allel zu einer
zufälligen Variante - so entstehen Überraschungen.

Rezessive Merkmale können Generationen lang
"schlummern" und tauchen später wieder auf.
==================================================
*/

export const GENE_KEYS = ["ears", "tail", "pattern", "coat"];

/* Dominanz: vorne = dominant, hinten = rezessiv */
export const DOMINANCE = {
  ears: ["upright", "button", "floppy"],
  tail: ["curl", "saber", "plume"],
  pattern: ["urajiro", "sesame", "pinto"],
  coat: ["red", "black_tan", "cream"]
};

/* Anzeige-Namen für die UI */
export const TRAIT_LABELS = {
  ears: {
    upright: "Stehohren",
    button: "Knickohren",
    floppy: "Schlappohren"
  },
  tail: {
    curl: "Ringelrute",
    saber: "Säbelrute",
    plume: "Federrute"
  },
  pattern: {
    urajiro: "Klassisch",
    sesame: "Sesam",
    pinto: "Gescheckt"
  },
  coat: {
    red: "Rot",
    black_tan: "Schwarz-Loh",
    cream: "Creme"
  }
};

export const PERSONALITIES = [
  "verspielt",
  "ruhig",
  "mutig",
  "schüchtern",
  "frech",
  "anhänglich"
];

export const STAT_KEYS = [
  "beweglichkeit",
  "charme",
  "klugheit",
  "ausdauer"
];

const DOG_NAMES = [
  "Kuro", "Hana", "Mochi", "Yuki", "Kiko", "Taro",
  "Suki", "Bento", "Nori", "Momo", "Kin", "Aki",
  "Fuji", "Miso", "Chibi", "Rin", "Sora", "Ume",
  "Goma", "Anko", "Kaya", "Tobi", "Nala", "Zen"
];

const MUTATION_CHANCE = 0.04;

function pick(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function randInt(min, max) {
  return min + Math.floor(Math.random() * (max - min + 1));
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function randomName() {
  return pick(DOG_NAMES);
}

/* Zufälliges Genom (z. B. für Starthunde) */
export function randomGenome() {
  const genes = {};

  for (const key of GENE_KEYS) {
    const variants = DOMINANCE[key];

    genes[key] = [pick(variants), pick(variants)];
  }

  const stats = {};

  for (const key of STAT_KEYS) {
    stats[key] = randInt(2, 8);
  }

  return {
    name: randomName(),
    genes,
    personality: pick(PERSONALITIES),
    stats,
    generation: 1
  };
}

/*
Phänotyp: was man sieht.
Pro Gen gewinnt das dominantere der beiden Allele.
*/
export function phenotype(genome) {
  const result = {};

  for (const key of GENE_KEYS) {
    const order = DOMINANCE[key];
    const [a, b] = genome.genes[key];

    result[key] =
      order.indexOf(a) <= order.indexOf(b) ? a : b;
  }

  return result;
}

/* Ist ein Hund reinerbig für ein Gen? (für UI/Info) */
export function isPurebred(genome, geneKey) {
  const [a, b] = genome.genes[geneKey];

  return a === b;
}

/*
Zucht: Mendel + Mutation.

Jedes Elternteil vererbt pro Gen ein zufälliges
seiner beiden Allele. Stats = Eltern-Mittel plus
Streuung. Persönlichkeit kommt meist von einem
Elternteil, manchmal ist sie ganz eigen.
*/
export function breed(parentA, parentB) {
  const genes = {};

  for (const key of GENE_KEYS) {
    let alleleA = pick(parentA.genes[key]);
    let alleleB = pick(parentB.genes[key]);

    if (Math.random() < MUTATION_CHANCE) {
      alleleA = pick(DOMINANCE[key]);
    }

    if (Math.random() < MUTATION_CHANCE) {
      alleleB = pick(DOMINANCE[key]);
    }

    genes[key] = [alleleA, alleleB];
  }

  const stats = {};

  for (const key of STAT_KEYS) {
    const average =
      (parentA.stats[key] + parentB.stats[key]) / 2;

    stats[key] = clamp(
      Math.round(average + randInt(-2, 2)),
      1,
      10
    );
  }

  const personalityPool = [
    parentA.personality,
    parentB.personality,
    pick(PERSONALITIES)
  ];

  return {
    name: randomName(),
    genes,
    personality: pick(personalityPool),
    stats,
    generation:
      Math.max(
        parentA.generation ?? 1,
        parentB.generation ?? 1
      ) + 1
  };
}

/* Kurze Beschreibung für die UI */
export function describe(genome) {
  const pheno = phenotype(genome);

  const traits = GENE_KEYS.map(
    (key) => TRAIT_LABELS[key][pheno[key]]
  ).join(", ");

  const stats = STAT_KEYS.map(
    (key) =>
      `${key.slice(0, 4).toUpperCase()} ${genome.stats[key]}`
  ).join("  ");

  return [
    `${genome.name} (Gen ${genome.generation}, ${genome.personality})`,
    traits,
    stats
  ];
}
