/**
 * Mulberry32 — a fast, high-quality 32-bit PRNG.
 * Given the same numeric seed it always produces the same sequence.
 */
function mulberry32(seed: number): () => number {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Convert a string seed into a 32-bit integer via DJB2 hash.
 */
function seedToNumber(seed: string): number {
  let hash = 5381;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) + hash + seed.charCodeAt(i)) | 0;
  }
  return hash;
}

/**
 * Fisher-Yates shuffle driven by a deterministic PRNG.
 * Same seed + same input array → same output every time.
 */
export function deterministicShuffle<T>(array: T[], seed: string): T[] {
  const result = [...array];
  const random = mulberry32(seedToNumber(seed));

  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }

  return result;
}
