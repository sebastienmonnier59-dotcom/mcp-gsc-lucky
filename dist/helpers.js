function resolveDate(value) {
  const v = value.trim();
  if (v === "today") {
    return (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
  }
  const m = v.match(/^(\d+)daysAgo$/);
  if (m) {
    const d = /* @__PURE__ */ new Date();
    d.setUTCDate(d.getUTCDate() - parseInt(m[1], 10));
    return d.toISOString().slice(0, 10);
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
  throw new Error(`Invalid date format: "${value}". Use YYYY-MM-DD, "today", or "NdaysAgo".`);
}
const GSC_OPERATORS = [
  "includingRegex",
  "excludingRegex",
  "notContains",
  "notEquals",
  "contains",
  "equals"
];
function parseDimensionFilter(input) {
  const s = input.trim();
  if (!s) return null;
  for (const op of GSC_OPERATORS) {
    const needle = ` ${op} `;
    const idx = s.indexOf(needle);
    if (idx > 0) {
      return {
        dimension: s.slice(0, idx).trim(),
        operator: op,
        expression: s.slice(idx + needle.length).trim()
      };
    }
  }
  return null;
}
function formatMetrics(row) {
  return {
    clicks: row.clicks ?? 0,
    impressions: row.impressions ?? 0,
    ctr: Math.round((row.ctr ?? 0) * 1e4) / 1e4,
    position: Math.round((row.position ?? 0) * 10) / 10
  };
}
export {
  formatMetrics,
  parseDimensionFilter,
  resolveDate
};
