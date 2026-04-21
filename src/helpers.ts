/**
 * Helpers génériques : dates relatives, parsing de filtres, formatage métriques.
 */

/** Convertit "today", "7daysAgo", "2024-01-15" en YYYY-MM-DD (UTC). */
export function resolveDate(value: string): string {
  const v = value.trim();
  if (v === "today") {
    return new Date().toISOString().slice(0, 10);
  }
  const m = v.match(/^(\d+)daysAgo$/);
  if (m) {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - parseInt(m[1], 10));
    return d.toISOString().slice(0, 10);
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
  throw new Error(`Invalid date format: "${value}". Use YYYY-MM-DD, "today", or "NdaysAgo".`);
}

/** Opérateurs de filtre GSC supportés. */
const GSC_OPERATORS = [
  "includingRegex",
  "excludingRegex",
  "notContains",
  "notEquals",
  "contains",
  "equals",
] as const;

export type GscOperator = (typeof GSC_OPERATORS)[number];

export interface ParsedFilter {
  dimension: string;
  operator: GscOperator;
  expression: string;
}

/**
 * Parse un filtre de la forme : `<dimension> <operator> <expression>`
 *   ex: "query contains seo", "page notContains /admin/"
 */
export function parseDimensionFilter(input: string): ParsedFilter | null {
  const s = input.trim();
  if (!s) return null;
  for (const op of GSC_OPERATORS) {
    const needle = ` ${op} `;
    const idx = s.indexOf(needle);
    if (idx > 0) {
      return {
        dimension: s.slice(0, idx).trim(),
        operator: op,
        expression: s.slice(idx + needle.length).trim(),
      };
    }
  }
  return null;
}

/** Arrondit proprement les métriques GSC pour affichage. */
export function formatMetrics(row: {
  clicks?: number | null;
  impressions?: number | null;
  ctr?: number | null;
  position?: number | null;
}) {
  return {
    clicks: row.clicks ?? 0,
    impressions: row.impressions ?? 0,
    ctr: Math.round((row.ctr ?? 0) * 10000) / 10000,
    position: Math.round((row.position ?? 0) * 10) / 10,
  };
}
