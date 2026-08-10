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

/*
==================================================
COAT COLORATION & RARE MUTATIONS
==================================================

A dog's visible coloration has three channels:

  primary   - base fur        (sprite letter B, plus S/D shades)
  secondary - cream areas     (sprite letter C)
  marking   - pattern marking (sprite letter M)

Normally all three come from the coat gene
(STANDARD_COLORATION). But mutations can override
single channels with SPECIAL colors.

Rules of rarity:
  - each channel has a small base mutation chance
  - BOOST: breeding two dogs with the SAME primary
    color but DIFFERENT secondary colors makes the
    coat "unstable" and multiplies the chance
  - every special channel the puppy already has
    divides further mutation chances (so pups where
    ALL channels are special - e.g. pink/red/blue -
    are very, very rare)
  - special colors are inheritable: each parent's
    special channel passes on with 40% chance,
    which turns crazy combos into a long-term
    breeding project instead of a pure lottery

Rarity tiers by number of special channels:
  0 = Common, 1 = Rare, 2 = Exotic, 3 = Legendary
==================================================
*/

export const COLOR_CHANNELS = ["primary", "secondary", "marking"];

export const COLOR_DEFS = {
  /* standard colors (from the coat gene) */
  red:      { name: "Red",      hex: "#e08a3c", special: false },
  black:    { name: "Black",    hex: "#3e3436", special: false },
  cream:    { name: "Cream",    hex: "#ebd3a5", special: false },
  milk:     { name: "Milk",     hex: "#f7ecd4", special: false },
  tan:      { name: "Tan",      hex: "#e8cfa0", special: false },
  ivory:    { name: "Ivory",    hex: "#fcf8ee", special: false },
  sesame:   { name: "Sesame",   hex: "#7a4a28", special: false },
  charcoal: { name: "Charcoal", hex: "#241e1f", special: false },
  ginger:   { name: "Ginger",   hex: "#d0a874", special: false },

  /* special mutation colors */
  sakura:   { name: "Sakura",   hex: "#e89ab5", special: true },
  sky:      { name: "Sky",      hex: "#7fa8d9", special: true },
  mint:     { name: "Mint",     hex: "#8ec9a8", special: true },
  lavender: { name: "Lavender", hex: "#a893d1", special: true },
  gold:     { name: "Gold",     hex: "#e8c153", special: true },
  silver:   { name: "Silver",   hex: "#c3c7cf", special: true },
  crimson:  { name: "Crimson",  hex: "#c04848", special: true },
  midnight: { name: "Midnight", hex: "#3c4a70", special: true },
  snow:     { name: "Snow",     hex: "#f8f8f4", special: true }
};

export const SPECIAL_COLOR_IDS = Object.keys(COLOR_DEFS)
  .filter((id) => COLOR_DEFS[id].special);

export const STANDARD_COLORATION = {
  red:       { primary: "red",   secondary: "milk",  marking: "sesame" },
  black_tan: { primary: "black", secondary: "tan",   marking: "charcoal" },
  cream:     { primary: "cream", secondary: "ivory", marking: "ginger" }
};

/* mutation tuning */
const MUTATION_BASE_CHANCE = 0.012;   // per channel
const MUTATION_BOOST = 6;             // same primary + different secondary
const WILDNESS_DAMPER = 6;            // divides chance per existing special
const SPECIAL_INHERIT_CHANCE = 0.4;   // per parent with a special channel

export const RARITY_TIERS = ["Common", "Rare", "Exotic", "Legendary"];
export const RARITY_COLORS = ["#8a6a42", "#4a7fb5", "#8a5fb0", "#d9a520"];

export function isSpecialColor(colorId) {
  return COLOR_DEFS[colorId]?.special === true;
}

/* resolved coloration: standard from coat gene + special overrides */
export function coloration(genome) {
  const coat = phenotype(genome).coat;
  const std = STANDARD_COLORATION[coat];
  const overrides = genome.colors ?? {};

  return {
    primary: overrides.primary ?? std.primary,
    secondary: overrides.secondary ?? std.secondary,
    marking: overrides.marking ?? std.marking
  };
}

export function rarityTier(genome) {
  const col = coloration(genome);

  return COLOR_CHANNELS.filter(
    (ch) => isSpecialColor(col[ch])
  ).length;
}

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
    colors: {},
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

  /* ---- coat color inheritance & mutations ---- */

  const colA = coloration(parentA);
  const colB = coloration(parentB);

  const sameLine =
    phenotype(parentA).coat === phenotype(parentB).coat;

  const unstable =
    sameLine && colA.secondary !== colB.secondary;

  const boost = unstable ? MUTATION_BOOST : 1;

  const colors = {};
  let specialCount = 0;

  for (const channel of COLOR_CHANNELS) {
    /* inherit a parent's special color on this channel */
    const pool = [];

    if (isSpecialColor(colA[channel])) pool.push(colA[channel]);
    if (isSpecialColor(colB[channel])) pool.push(colB[channel]);

    let picked = null;

    for (const candidate of pool) {
      if (Math.random() < SPECIAL_INHERIT_CHANCE) {
        picked = candidate;
        break;
      }
    }

    /* fresh mutation roll */
    if (!picked) {
      const chance =
        (MUTATION_BASE_CHANCE * boost) /
        Math.pow(WILDNESS_DAMPER, specialCount);

      if (Math.random() < chance) {
        picked = pick(SPECIAL_COLOR_IDS);
      }
    }

    if (picked) {
      colors[channel] = picked;
      specialCount++;
    }
  }

  return {
    name: randomDogName(),
    genes,
    colors,
    personality: pick(personalityPool),
    stats,
    generation:
      Math.max(
        parentA.generation ?? 1,
        parentB.generation ?? 1
      ) + 1
  };
}

/* human readable coloration, e.g. "Sakura / Milk" */
export function colorationLabel(genome) {
  const col = coloration(genome);

  return COLOR_CHANNELS
    .map((ch) => COLOR_DEFS[col[ch]].name)
    .join(" / ");
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

  const lines = [
    `${genome.name} (Gen ${genome.generation}, ${genome.personality})`,
    traits,
    stats
  ];

  const tier = rarityTier(genome);

  if (tier > 0) {
    lines.push(
      `${"✦".repeat(tier)} ${RARITY_TIERS[tier]} coat: ${colorationLabel(genome)}`
    );
  }

  return lines;
}
