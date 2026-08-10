/*
==================================================
GENETICS
==================================================

Every dog carries a genome: TWO alleles per trait
gene (diploid, Mendel-style). The more dominant
allele (order in DOMINANCE) is what you see.

When breeding, each parent passes one random
allele per gene. A small mutation chance keeps
surprises coming.

Recessive traits can stay hidden for generations
and suddenly pop up again.
==================================================
*/

import { randomDogName } from "./names.js";

export const GENE_KEYS = ["ears", "tail", "pattern", "coat"];

/* dominance: first = dominant, last = recessive */
export const DOMINANCE = {
  ears: ["upright", "button", "floppy"],
  tail: ["curl", "saber", "plume"],
  pattern: ["urajiro", "sesame", "pinto"],
  coat: ["red", "black_tan", "cream"]
};

/* display names for the UI */
export const TRAIT_LABELS = {
  ears: {
    upright: "Pointed Ears",
    button: "Button Ears",
    floppy: "Floppy Ears"
  },
  tail: {
    curl: "Curled Tail",
    saber: "Saber Tail",
    plume: "Plume Tail"
  },
  pattern: {
    urajiro: "Classic",
    sesame: "Sesame",
    pinto: "Pinto"
  },
  coat: {
    red: "Red",
    black_tan: "Black & Tan",
    cream: "Cream"
  }
};

export const PERSONALITIES = [
  "playful",
  "calm",
  "brave",
  "shy",
  "cheeky",
  "affectionate",
  "curious",
  "lazy",
  "loyal",
  "feisty"
];

export const STAT_KEYS = [
  "agility",
  "charm",
  "wits",
  "stamina"
];

const STAT_SHORT = {
  agility: "AGI",
  charm: "CHA",
  wits: "WIT",
  stamina: "STA"
};

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

/* random genome (e.g. for starter dogs) */
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
    name: randomDogName(),
    genes,
    personality: pick(PERSONALITIES),
    stats,
    generation: 1
  };
}

/*
Phenotype: what you can see.
For each gene the more dominant allele wins.
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

/* is a dog purebred for a gene? (for UI/info) */
export function isPurebred(genome, geneKey) {
  const [a, b] = genome.genes[geneKey];

  return a === b;
}

/*
Breeding: Mendel + mutation.

Each parent passes one random allele per gene.
Stats = parent average plus some spread. The
personality usually comes from a parent, but
sometimes a puppy is just its own dog.
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
    name: randomDogName(),
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

/* short description lines for the UI */
export function describe(genome) {
  const pheno = phenotype(genome);

  const traits = GENE_KEYS.map(
    (key) => TRAIT_LABELS[key][pheno[key]]
  ).join(", ");

  const stats = STAT_KEYS.map(
    (key) => `${STAT_SHORT[key]} ${genome.stats[key]}`
  ).join("  ");

  return [
    `${genome.name} (Gen ${genome.generation}, ${genome.personality})`,
    traits,
    stats
  ];
}
