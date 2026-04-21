import {
  resolveDate,
  parseDimensionFilter,
  formatMetrics
} from "./helpers.js";
const API_BASE = "https://searchconsole.googleapis.com";
class GscClient {
  constructor(auth) {
    this.auth = auth;
    this.defaultSiteUrl = auth.defaultSiteUrl;
  }
  auth;
  defaultSiteUrl;
  resolveSite(siteUrl) {
    const s = (siteUrl || "").trim() || this.defaultSiteUrl;
    if (!s) {
      throw new Error(
        "No site_url provided and no default configured. Pass site_url explicitly, or set GSC_DEFAULT_SITE_URL, or re-run mcp-gsc-lucky-auth to pick a default."
      );
    }
    return s;
  }
  /** Appel REST générique avec auth + gestion d'erreurs. */
  async call(method, path, body) {
    const token = await this.auth.getAccessToken();
    const res = await fetch(`${API_BASE}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/json"
      },
      body: body === void 0 ? void 0 : JSON.stringify(body)
    });
    if (!res.ok) {
      let detail = "";
      try {
        const errJson = await res.json();
        detail = errJson.error?.message || "";
      } catch {
        detail = await res.text().catch(() => "");
      }
      throw new Error(`GSC API ${res.status} ${res.statusText}: ${detail}`);
    }
    if (res.status === 204) return {};
    return await res.json();
  }
  // ==========================================================================
  // 1. SITES
  // ==========================================================================
  async listSites() {
    const data = await this.call("GET", "/webmasters/v3/sites");
    return (data.siteEntry || []).map((s) => ({
      site_url: s.siteUrl || "",
      permission_level: s.permissionLevel || ""
    }));
  }
  // ==========================================================================
  // 2. SITEMAPS
  // ==========================================================================
  async listSitemaps(siteUrl) {
    const resolved = this.resolveSite(siteUrl);
    const data = await this.call(
      "GET",
      `/webmasters/v3/sites/${encodeURIComponent(resolved)}/sitemaps`
    );
    return {
      site_url: resolved,
      sitemaps: (data.sitemap || []).map((s) => ({
        path: s.path || "",
        last_submitted: s.lastSubmitted || null,
        last_downloaded: s.lastDownloaded || null,
        is_pending: s.isPending || false,
        is_sitemaps_index: s.isSitemapsIndex || false,
        type: s.type || "",
        errors: s.errors ? parseInt(s.errors, 10) : 0,
        warnings: s.warnings ? parseInt(s.warnings, 10) : 0,
        contents: (s.contents || []).map((c) => ({
          type: c.type || "",
          submitted: c.submitted ? parseInt(c.submitted, 10) : 0,
          indexed: c.indexed ? parseInt(c.indexed, 10) : 0
        }))
      }))
    };
  }
  // ==========================================================================
  // 3. SEARCH ANALYTICS (cœur)
  // ==========================================================================
  async searchAnalytics(params) {
    const siteUrl = this.resolveSite(params.siteUrl);
    const startDate = resolveDate(params.startDate);
    const endDate = resolveDate(params.endDate);
    const dimensions = params.dimensions?.length ? params.dimensions : ["query"];
    const requestBody = {
      startDate,
      endDate,
      dimensions,
      rowLimit: Math.min(params.rowLimit ?? 100, 25e3),
      startRow: params.startRow ?? 0,
      searchType: params.searchType ?? "web",
      aggregationType: params.aggregationType ?? "auto"
    };
    const parsedFilter = params.dimensionFilter ? parseDimensionFilter(params.dimensionFilter) : null;
    if (parsedFilter) {
      requestBody.dimensionFilterGroups = [
        {
          groupType: "and",
          filters: [
            {
              dimension: parsedFilter.dimension,
              operator: parsedFilter.operator,
              expression: parsedFilter.expression
            }
          ]
        }
      ];
    }
    const data = await this.call(
      "POST",
      `/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`,
      requestBody
    );
    const rows = (data.rows || []).map((row) => {
      const out = {};
      (row.keys || []).forEach((k, i) => {
        out[dimensions[i]] = k;
      });
      Object.assign(out, formatMetrics(row));
      return out;
    });
    return {
      site_url: siteUrl,
      date_range: `${startDate} to ${endDate}`,
      search_type: requestBody.searchType,
      row_count: rows.length,
      rows
    };
  }
  // ==========================================================================
  // 4. URL INSPECTION
  // ==========================================================================
  async inspectUrl(url, siteUrl) {
    const resolved = this.resolveSite(siteUrl);
    const data = await this.call(
      "POST",
      "/v1/urlInspection/index:inspect",
      {
        inspectionUrl: url,
        siteUrl: resolved
      }
    );
    const r = data.inspectionResult || {};
    const idx = r.indexStatusResult || {};
    const mobile = r.mobileUsabilityResult || {};
    const rich = r.richResultsResult || {};
    return {
      url,
      site_url: resolved,
      inspection_url: r.inspectionResultLink || null,
      index_status: {
        verdict: idx.verdict || "UNKNOWN",
        coverage_state: idx.coverageState || "",
        indexing_state: idx.indexingState || "",
        last_crawl_time: idx.lastCrawlTime || "",
        page_fetch_state: idx.pageFetchState || "",
        robots_txt_state: idx.robotsTxtState || "",
        crawled_as: idx.crawledAs || "",
        google_canonical: idx.googleCanonical || "",
        user_canonical: idx.userCanonical || "",
        referring_urls: idx.referringUrls || [],
        sitemap: idx.sitemap || []
      },
      mobile_usability: {
        verdict: mobile.verdict || "UNKNOWN",
        issues: (mobile.issues || []).map((i) => ({
          type: i.issueType || "",
          severity: i.severity || "",
          message: i.message || ""
        }))
      },
      rich_results: {
        verdict: rich.verdict || "UNKNOWN",
        detected_items: (rich.detectedItems || []).map((it) => ({
          rich_result_type: it.richResultType || "",
          items: it.items || []
        }))
      }
    };
  }
  // ==========================================================================
  // 5. COMPARE PERFORMANCE
  // ==========================================================================
  async comparePerformance(args) {
    const dim = args.dimension ?? "query";
    const rowLimit = Math.min(args.rowLimit ?? 200, 25e3);
    const [periodA, periodB] = await Promise.all([
      this.searchAnalytics({
        siteUrl: args.siteUrl ?? "",
        startDate: args.periodAStart,
        endDate: args.periodAEnd,
        dimensions: [dim],
        rowLimit,
        dimensionFilter: args.dimensionFilter
      }),
      this.searchAnalytics({
        siteUrl: args.siteUrl ?? "",
        startDate: args.periodBStart,
        endDate: args.periodBEnd,
        dimensions: [dim],
        rowLimit,
        dimensionFilter: args.dimensionFilter
      })
    ]);
    const aMap = /* @__PURE__ */ new Map();
    for (const row of periodA.rows) aMap.set(String(row[dim]), row);
    const bMap = /* @__PURE__ */ new Map();
    for (const row of periodB.rows) bMap.set(String(row[dim]), row);
    const allKeys = /* @__PURE__ */ new Set([...aMap.keys(), ...bMap.keys()]);
    const comparison = [];
    for (const key of allKeys) {
      const a = aMap.get(key);
      const b = bMap.get(key);
      const clicksA = Number(a?.clicks ?? 0);
      const clicksB = Number(b?.clicks ?? 0);
      const imprA = Number(a?.impressions ?? 0);
      const imprB = Number(b?.impressions ?? 0);
      const posA = Number(a?.position ?? 0);
      const posB = Number(b?.position ?? 0);
      comparison.push({
        [dim]: key,
        period_a: a ? { clicks: clicksA, impressions: imprA, ctr: a.ctr, position: posA } : null,
        period_b: b ? { clicks: clicksB, impressions: imprB, ctr: b.ctr, position: posB } : null,
        clicks_delta: clicksB - clicksA,
        clicks_delta_pct: clicksA > 0 ? Math.round((clicksB - clicksA) / clicksA * 1e3) / 10 : null,
        impressions_delta: imprB - imprA,
        position_delta: posA && posB ? Math.round((posB - posA) * 10) / 10 : null
      });
    }
    comparison.sort((x, y) => Number(y.clicks_delta ?? 0) - Number(x.clicks_delta ?? 0));
    return {
      site_url: periodA.site_url,
      dimension: dim,
      period_a: `${args.periodAStart} to ${args.periodAEnd}`,
      period_b: `${args.periodBStart} to ${args.periodBEnd}`,
      row_count: comparison.length,
      rows: comparison
    };
  }
  // ==========================================================================
  // 6. FIND KEYWORD OPPORTUNITIES
  // ==========================================================================
  async findKeywordOpportunities(args) {
    const data = await this.searchAnalytics({
      siteUrl: args.siteUrl ?? "",
      startDate: args.startDate ?? "28daysAgo",
      endDate: args.endDate ?? "today",
      dimensions: ["query"],
      rowLimit: Math.min(args.rowLimit ?? 1e3, 25e3)
    });
    const minImpr = args.minImpressions ?? 100;
    const minPos = args.minPosition ?? 5;
    const maxPos = args.maxPosition ?? 20;
    const opportunities = data.rows.filter((r) => {
      const impr = Number(r.impressions);
      const pos = Number(r.position);
      return impr >= minImpr && pos >= minPos && pos <= maxPos;
    }).map((r) => ({
      ...r,
      opportunity_score: Math.round(Number(r.impressions) / Math.max(Number(r.position), 1) * 10) / 10
    })).sort((a, b) => b.opportunity_score - a.opportunity_score);
    return {
      site_url: data.site_url,
      date_range: data.date_range,
      criteria: {
        min_impressions: minImpr,
        position_range: [minPos, maxPos]
      },
      row_count: opportunities.length,
      rows: opportunities
    };
  }
  // ==========================================================================
  // 7. TOP PAGES
  // ==========================================================================
  async getTopPages(args) {
    const sortBy = args.sortBy ?? "clicks";
    const data = await this.searchAnalytics({
      siteUrl: args.siteUrl ?? "",
      startDate: args.startDate ?? "28daysAgo",
      endDate: args.endDate ?? "today",
      dimensions: ["page"],
      rowLimit: Math.min(args.rowLimit ?? 100, 25e3),
      dimensionFilter: args.dimensionFilter
    });
    const sorted = [...data.rows].sort((a, b) => {
      const av = Number(a[sortBy] ?? 0);
      const bv = Number(b[sortBy] ?? 0);
      return sortBy === "position" ? av - bv : bv - av;
    });
    return { ...data, sorted_by: sortBy, rows: sorted };
  }
}
export {
  GscClient
};
