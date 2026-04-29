/**
 * Collision-resistant unique id with an optional prefix.
 * crypto.randomUUID() provides 122 bits of entropy (UUID v4) — replaces the
 * legacy `Date.now()_Math.random().toString(36).slice(...)` pattern that
 * scattered across the codebase.
 */
export function makeId(prefix = 'p'): string {
  return `${prefix}_${crypto.randomUUID()}`;
}
