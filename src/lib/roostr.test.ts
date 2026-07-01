import { describe, it, expect } from "vitest";
import {
  BREEDS,
  ARCHETYPES,
  FAMILIES,
  GENES,
  GENE_MAX_LEVEL,
  SKILL_IDS,
  TIERS,
  WEIGHT_CLASSES,
  canUpgradeGene,
  computeMaxHealth,
  computeRating,
  computeStats,
  deriveRole,
  geneLevelOf,
  geneUpgradeCost,
  hydrateRoostr,
  upgradeGeneLevel,
  mulberry32,
  pickBreedTrait,
  pickGenes,
  pickWeighted,
  rollRoostr,
  sellPriceBounds,
  statContributions,
  tierFor,
  type Gene,
  type SynthGene,
} from "@/lib/roostr";

const BASE_STAT = 4;
const byFamily = (f: string) => GENES.filter((g) => g.family === f);

describe("relation catalog", () => {
  it("keeps families, archetypes, genes, weights, and tiers wired by ids", () => {
    const skills = new Set<string>(SKILL_IDS);
    const families = new Set(FAMILIES.map((family) => family.id));
    const archetypes = new Set(ARCHETYPES.map((archetype) => archetype.id));

    expect(families.size).toBe(FAMILIES.length);
    expect(archetypes.size).toBe(ARCHETYPES.length);

    for (const family of FAMILIES) {
      expect(archetypes.has(family.role)).toBe(true);
      expect(family.boosts.every((skill) => skills.has(skill))).toBe(true);
      expect(family.weakens.every((skill) => skills.has(skill))).toBe(true);
    }

    for (const archetype of ARCHETYPES) {
      expect(archetype.families.every((family) => families.has(family))).toBe(true);
      expect(archetype.strengths.every((skill) => skills.has(skill))).toBe(true);
      expect(archetype.weaknesses.every((skill) => skills.has(skill))).toBe(true);
    }

    for (const gene of GENES) {
      expect(families.has(gene.family)).toBe(true);
      expect(archetypes.has(gene.role)).toBe(true);
      expect(gene.boosts.every((skill) => skills.has(skill))).toBe(true);
    }

    for (const weightClass of WEIGHT_CLASSES) {
      expect(weightClass.weight).toBeGreaterThan(0);
      expect(
        Object.keys(weightClass.statMods ?? {}).every((stat) => skills.has(stat)),
      ).toBe(true);
    }

    expect(TIERS.map((tier) => tier.min)).toEqual(
      [...TIERS].map((tier) => tier.min).sort((a, b) => a - b),
    );
  });

  it("keeps family boosts aligned with rolled gene boost branches", () => {
    const familyBoosts = Object.fromEntries(
      FAMILIES.map((family) => [family.id, new Set<string>(family.boosts)]),
    );

    for (const gene of GENES) {
      const boosts = familyBoosts[gene.family];
      expect(boosts).toBeDefined();
      expect(gene.boosts.every((skill) => boosts.has(skill))).toBe(true);

      for (const [stat, value] of Object.entries(gene.statMods ?? {})) {
        if (stat !== "Health" && typeof value === "number" && value > 0) {
          expect(boosts.has(stat)).toBe(true);
        }
      }
    }
  });
});

describe("gene catalog", () => {
  it("has unique ids and sequential gene numbers", () => {
    expect(new Set(GENES.map((g) => g.id)).size).toBe(GENES.length);
    expect(new Set(GENES.map((g) => g.no)).size).toBe(GENES.length);
    expect([...GENES].map((g) => g.no).sort((a, b) => a - b)).toEqual(
      Array.from({ length: GENES.length }, (_, i) => i + 1),
    );
  });

  it("covers utility and tradeoff stats in rolled genes", () => {
    const boosted = (stat: string) =>
      GENES.filter((g) => (g.statMods?.[stat as keyof typeof g.statMods] ?? 0) > 0)
        .length;
    const debuffed = (stat: string) =>
      GENES.filter((g) => (g.statMods?.[stat as keyof typeof g.statMods] ?? 0) < 0)
        .length;

    expect(boosted("Endurance")).toBeGreaterThanOrEqual(2);
    expect(boosted("Intellect")).toBeGreaterThanOrEqual(4);
    expect(boosted("Stealth")).toBeGreaterThanOrEqual(4);
    expect(debuffed("Accuracy")).toBeGreaterThanOrEqual(2);
    expect(debuffed("Crow")).toBeGreaterThanOrEqual(2);
    expect(debuffed("Luck")).toBeGreaterThanOrEqual(2);
  });

  it("keeps gene passives localized when present", () => {
    const passiveGenes = GENES.filter((g) => g.passive);
    expect(passiveGenes.length).toBeGreaterThanOrEqual(12);
    for (const gene of passiveGenes) {
      expect(gene.passive?.en).toEqual(expect.any(String));
      expect(gene.passive?.ru).toEqual(expect.any(String));
      expect(gene.passive?.en.length).toBeGreaterThan(0);
      expect(gene.passive?.ru.length).toBeGreaterThan(0);
    }
  });

  it("keeps breed gene affinities pointed at existing rolled gene ids", () => {
    const geneIds = new Set(GENES.map((g) => g.id));
    const missing = BREEDS.flatMap((breed) =>
      Object.keys(breed.geneAffinities?.genes ?? {})
        .filter((id) => !geneIds.has(id))
        .map((id) => `${breed.id}:${id}`),
    );
    expect(missing).toEqual([]);
  });

  it("keeps breed trait effects pointed at existing stat ids", () => {
    const stats = new Set<string>([...SKILL_IDS, "Health"]);
    const missing = BREEDS.flatMap((breed) =>
      breed.traits.flatMap((trait) =>
        trait.effects
          .filter((effect) => !stats.has(effect.stat))
          .map((effect) => `${breed.id}:${trait.id}:${effect.stat}`),
      ),
    );
    expect(missing).toEqual([]);
  });
});

describe("geneUpgradeCost", () => {
  it("is strictly increasing with level", () => {
    for (let lvl = 1; lvl < GENE_MAX_LEVEL; lvl++) {
      expect(geneUpgradeCost(lvl + 1)).toBeGreaterThan(geneUpgradeCost(lvl));
    }
  });
  it("is positive at level 1", () => {
    expect(geneUpgradeCost(1)).toBeGreaterThan(0);
  });
});

describe("tierFor", () => {
  it("maps ratings to the right tier band", () => {
    expect(tierFor(0).id).toBe("D");
    expect(tierFor(74).id).toBe("D");
    expect(tierFor(75).id).toBe("C"); // C threshold = 75
    expect(tierFor(175).id).toBe("X");
    expect(tierFor(1_000_000).id).toBe("X");
  });
  it("returns each tier exactly at its min", () => {
    for (const t of TIERS) expect(tierFor(t.min).id).toBe(t.id);
  });
});

describe("computeStats", () => {
  it("is BASE_STAT for every skill with no genes / no weight", () => {
    const s = computeStats([], {});
    for (const id of SKILL_IDS) expect(s[id]).toBe(BASE_STAT);
  });

  it("applies weight-class body mods", () => {
    const light = WEIGHT_CLASSES.find((w) => w.id === "light")!;
    const s = computeStats([], {}, light);
    // light: Speed+1, Recovery+1, Stealth+1, Guard-1, Endurance-1
    expect(s.Speed).toBe(BASE_STAT + 1);
    expect(s.Guard).toBe(BASE_STAT - 1);
  });

  it("scales a gene's statMods by its level", () => {
    const gene = GENES.find((g) => g.id === "old-blood")!; // Recovery+1, Damage-1
    const l1 = computeStats([gene], { [gene.id]: 1 });
    const l2 = computeStats([gene], { [gene.id]: 2 });
    expect(l1.Recovery).toBe(BASE_STAT + 1);
    expect(l2.Recovery).toBe(BASE_STAT + 2);
    expect(l2.Damage).toBe(BASE_STAT - 2);
  });

  it("never lets Health leak into the skill block", () => {
    const gene = { id: "h", statMods: { Health: 5 } } as unknown as Gene;
    const s = computeStats([gene], { h: 3 });
    expect(Object.keys(s).sort()).toEqual([...SKILL_IDS].sort());
    for (const id of SKILL_IDS) expect(s[id]).toBe(BASE_STAT);
  });

  it("floors skills at 0 (heavy debuff)", () => {
    const gene = { id: "x", statMods: { Damage: -2 } } as unknown as Gene;
    const s = computeStats([gene], { x: 5 }); // 4 - 10 = -6 → 0
    expect(s.Damage).toBe(0);
  });
});

describe("statContributions", () => {
  const light = WEIGHT_CLASSES.find((w) => w.id === "light")!;
  const synth = [{ id: "sp", statMods: { Speed: 2 } } as unknown as SynthGene];

  it("total matches computeStats exactly (same order + 0-floor)", () => {
    const gene = GENES.find((g) => g.id === "old-blood")!; // Recovery+1, Damage-1
    const levels = { [gene.id]: 3 };
    const synthLevels = { sp: 2 };
    const c = statContributions({
      genes: [gene],
      geneLevels: levels,
      synthGenes: synth,
      synthGeneLevels: synthLevels,
      weightClass: light,
    });
    const expected = computeStats([gene], levels, light, synth, synthLevels);
    for (const id of SKILL_IDS) expect(c[id].total).toBe(expected[id]);
  });

  it("splits base (BASE_STAT + weight), signed gene, and synth", () => {
    const gene = GENES.find((g) => g.id === "old-blood")!; // Recovery+1, Damage-1
    const c = statContributions({
      genes: [gene],
      geneLevels: { [gene.id]: 3 },
      synthGenes: synth,
      synthGeneLevels: { sp: 2 },
      weightClass: light,
    });
    // base = BASE_STAT + weight body mod
    expect(c.Speed.base).toBe(BASE_STAT + 1); // light: Speed+1
    expect(c.Guard.base).toBe(BASE_STAT - 1); // light: Guard-1
    // gene is signed: +3 Recovery, -3 Damage at level 3
    expect(c.Recovery.gene).toBe(3);
    expect(c.Damage.gene).toBe(-3);
    // synth only adds (Speed +2 × level 2 = +4), never debuffs
    expect(c.Speed.synth).toBe(4);
    expect(c.Recovery.synth).toBe(0);
  });

  it("keeps the gene debuff sign even when the total floors at 0", () => {
    const gene = { id: "x", statMods: { Damage: -2 } } as unknown as Gene;
    const c = statContributions({ genes: [gene], geneLevels: { x: 5 } });
    // 4 + (-10) = -6 → total floors to 0, but the raw debuff is still reported
    expect(c.Damage.total).toBe(0);
    expect(c.Damage.gene).toBe(-10);
    expect(c.Damage.base).toBe(BASE_STAT);
  });
});

describe("computeMaxHealth", () => {
  const breed = BREEDS[0];
  const wc = WEIGHT_CLASSES.find((w) => w.id === "middle")!;

  it("is base + weight + gene health × level", () => {
    const gene = { id: "hp", statMods: { Health: 2 } } as unknown as Gene;
    const expected = breed.baseHealth + wc.healthMod + 2 * 3;
    expect(computeMaxHealth(breed, wc, [gene], { hp: 3 })).toBe(expected);
  });

  it("floors at 1", () => {
    const gene = { id: "drain", statMods: { Health: -100 } } as unknown as Gene;
    expect(computeMaxHealth(breed, wc, [gene], { drain: 1 })).toBe(1);
  });
});

describe("computeRating", () => {
  it("is the sum of skills plus HALF maxHealth (rounded)", () => {
    const stats = computeStats([], {});
    const sum = SKILL_IDS.reduce((a, id) => a + stats[id], 0);
    expect(computeRating(stats, 30)).toBe(sum + 15); // HP weighted ×0.5
  });
});

describe("deriveRole", () => {
  it("is Hybrid for a Work gene plus another family", () => {
    const work = byFamily("Work")[0];
    const other = GENES.find((g) => g.family !== "Work")!;
    expect(deriveRole([work, other])).toBe("Hybrid");
  });
  it("uses the dominant family's role otherwise", () => {
    const mind = byFamily("Mind");
    expect(mind.length).toBeGreaterThanOrEqual(2);
    // Mind family → Tactician (per RELATIONS families.role)
    expect(deriveRole([mind[0], mind[1]])).toBe("Tactician");
  });
});

describe("pickWeighted (seeded)", () => {
  it("always returns an entry from the pool", () => {
    const rng = mulberry32(7);
    const pool = [
      { id: "a", weight: 1 },
      { id: "b", weight: 1 },
    ];
    for (let i = 0; i < 100; i++) expect(pool).toContain(pickWeighted(pool, rng));
  });

  it("respects the weights over many samples", () => {
    const rng = mulberry32(123);
    const pool = [
      { id: "heavy", weight: 90 },
      { id: "rare", weight: 10 },
    ];
    const count: Record<string, number> = { heavy: 0, rare: 0 };
    for (let i = 0; i < 5000; i++) count[pickWeighted(pool, rng).id]++;
    expect(count.heavy).toBeGreaterThan(count.rare * 3); // ~9:1
  });
});

describe("pickGenes (seeded)", () => {
  it("returns 1–4 distinct genes", () => {
    const breed = BREEDS[0];
    for (let seed = 0; seed < 50; seed++) {
      const genes = pickGenes(breed, mulberry32(seed));
      expect(genes.length).toBeGreaterThanOrEqual(1);
      expect(genes.length).toBeLessThanOrEqual(4);
      const ids = genes.map((g) => g.id);
      expect(new Set(ids).size).toBe(ids.length); // distinct
    }
  });
});

describe("breed traits", () => {
  it("every breed has at least two rollable traits, with some three-trait breeds", () => {
    expect(BREEDS.every((b) => b.traits.length >= 2)).toBe(true);
    expect(BREEDS.some((b) => b.traits.length >= 3)).toBe(true);
  });

  it("picks a trait from the breed's trait pool", () => {
    const breed = BREEDS.find((b) => b.traits.length >= 3) ?? BREEDS[0];
    const trait = pickBreedTrait(breed, mulberry32(3));
    expect(breed.traits.map((t) => t.id)).toContain(trait.id);
  });
});

describe("rollRoostr (seeded)", () => {
  it("is deterministic for the same seed", () => {
    const a = rollRoostr(mulberry32(42));
    const b = rollRoostr(mulberry32(42));
    expect(a.seed).toBe(b.seed);
    expect(a.breed.id).toBe(b.breed.id);
    expect(a.breed.trait.id).toBe(b.breed.trait.id);
    expect(a.weightClass.id).toBe(b.weightClass.id);
    expect(a.genes.map((g) => g.id)).toEqual(b.genes.map((g) => g.id));
  });

  it("produces a valid composition", () => {
    const r = rollRoostr(mulberry32(99));
    expect(r.genes.length).toBeGreaterThanOrEqual(1);
    expect(r.genes.length).toBeLessThanOrEqual(4);
    expect(r.maxHealth).toBeGreaterThanOrEqual(1);
  });
});

describe("gene upgrade helpers", () => {
  it("geneLevelOf defaults a missing gene to level 1", () => {
    expect(geneLevelOf({}, "x")).toBe(1);
    expect(geneLevelOf({ x: 5 }, "x")).toBe(5);
  });

  it("canUpgradeGene is false only at max level", () => {
    expect(canUpgradeGene(1)).toBe(true);
    expect(canUpgradeGene(GENE_MAX_LEVEL - 1)).toBe(true);
    expect(canUpgradeGene(GENE_MAX_LEVEL)).toBe(false);
  });

  it("upgradeGeneLevel bumps by one, is immutable, and clamps at max", () => {
    const levels = { a: 1 };
    const next = upgradeGeneLevel(levels, "a");
    expect(next.a).toBe(2);
    expect(levels.a).toBe(1); // original untouched
    expect(upgradeGeneLevel({}, "b").b).toBe(2); // missing → 1 → 2
    const maxed = { a: GENE_MAX_LEVEL };
    expect(upgradeGeneLevel(maxed, "a")).toBe(maxed); // unchanged when maxed
  });
});

describe("hydrateRoostr", () => {
  it("rebuilds a model from a DB row and recomputes derived stats", () => {
    const rolled = rollRoostr(mulberry32(7));
    const row = {
      breedId: rolled.breed.id,
      weightClassId: rolled.weightClass.id,
      geneIds: rolled.genes.map((g) => g.id),
      geneLevels: {},
      seed: rolled.seed,
    };
    const h = hydrateRoostr(row);
    expect(h.breed.id).toBe(rolled.breed.id);
    expect(h.genes.map((g) => g.id)).toEqual(row.geneIds);
    expect(h.rating).toBe(computeRating(h.stats, h.maxHealth));
    expect(h.tier.id).toBe(tierFor(h.rating).id);
  });

  it("hydrates the selected trait from meta.traitId", () => {
    const breed = BREEDS.find((b) => b.traits.length >= 2)!;
    const selected = breed.traits[1];
    const h = hydrateRoostr({
      breedId: breed.id,
      weightClassId: WEIGHT_CLASSES[2].id,
      geneIds: [],
      geneLevels: {},
      seed: 1,
      meta: { traitId: selected.id },
    });
    expect(h.breed.trait.id).toBe(selected.id);
  });
});

describe("sellPriceBounds", () => {
  const wc = WEIGHT_CLASSES.find((w) => w.id === "middle")!;

  it("clamps to a sane floor/ceiling and keeps min ≤ max", () => {
    const b = sellPriceBounds(GENES.slice(0, 2), {}, wc);
    expect(b.min).toBeGreaterThanOrEqual(25);
    expect(b.max).toBeLessThanOrEqual(1_000_000);
    expect(b.min).toBeLessThanOrEqual(b.max);
  });

  it("more genes → higher max", () => {
    const few = sellPriceBounds(GENES.slice(0, 1), {}, wc);
    const many = sellPriceBounds(GENES.slice(0, 4), {}, wc);
    expect(many.max).toBeGreaterThan(few.max);
  });

  it("sunk gene upgrades raise the max", () => {
    const genes = GENES.slice(0, 2);
    const base = sellPriceBounds(genes, {}, wc);
    const leveled = sellPriceBounds(genes, { [genes[0].id]: 6 }, wc);
    expect(leveled.max).toBeGreaterThan(base.max);
  });
});
