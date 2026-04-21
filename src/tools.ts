/**
 * Enregistrement des 7 tools MCP GSC.
 * Utilise l'API moderne `registerTool` du SDK v1.
 */
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { GscClient } from "./gsc-client.js";

type TextContent = { type: "text"; text: string };

function jsonResult(data: unknown): { content: TextContent[] } {
  return {
    content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
  };
}

function errorResult(err: unknown): { content: TextContent[]; isError: true } {
  const message = err instanceof Error ? err.message : String(err);
  return {
    content: [{ type: "text", text: JSON.stringify({ error: true, message }, null, 2) }],
    isError: true,
  };
}

export function registerTools(server: McpServer, gsc: GscClient): void {
  // --------------------------------------------------------------------------
  // 1. gsc_list_sites
  // --------------------------------------------------------------------------
  server.registerTool(
    "gsc_list_sites",
    {
      title: "List GSC sites",
      description:
        "List all Search Console properties accessible with the current credentials, with their permission levels.",
      inputSchema: {},
    },
    async () => {
      try {
        return jsonResult(await gsc.listSites());
      } catch (e) {
        return errorResult(e);
      }
    },
  );

  // --------------------------------------------------------------------------
  // 2. gsc_list_sitemaps
  // --------------------------------------------------------------------------
  server.registerTool(
    "gsc_list_sitemaps",
    {
      title: "List sitemaps",
      description:
        "List sitemaps submitted for a property, with submission/download dates, error and warning counts, and indexed URL counts per content type.",
      inputSchema: {
        site_url: z
          .string()
          .optional()
          .describe("Target property (e.g. 'sc-domain:example.com'). Falls back to the default."),
      },
    },
    async ({ site_url }) => {
      try {
        return jsonResult(await gsc.listSitemaps(site_url));
      } catch (e) {
        return errorResult(e);
      }
    },
  );

  // --------------------------------------------------------------------------
  // 3. gsc_search_analytics
  // --------------------------------------------------------------------------
  server.registerTool(
    "gsc_search_analytics",
    {
      title: "Query search analytics",
      description:
        "Query Search Console performance data (clicks, impressions, CTR, position). Supports dimensions (query, page, device, country, date, searchAppearance), a single filter expression, search_type (web/image/video/news/discover/googleNews), and aggregation type.",
      inputSchema: {
        site_url: z.string().optional(),
        start_date: z
          .string()
          .default("28daysAgo")
          .describe("YYYY-MM-DD, or 'today', or 'NdaysAgo'."),
        end_date: z.string().default("today"),
        dimensions: z
          .string()
          .default("query")
          .describe("Comma-separated list: query, page, device, country, date, searchAppearance."),
        search_type: z
          .enum(["web", "image", "video", "news", "discover", "googleNews"])
          .default("web"),
        dimension_filter: z
          .string()
          .optional()
          .describe("Single filter, e.g. 'query contains seo' or 'page notContains /admin/'."),
        row_limit: z.number().int().min(1).max(25000).default(100),
        aggregation_type: z.enum(["auto", "byPage", "byProperty"]).default("auto"),
        start_row: z.number().int().min(0).default(0),
      },
    },
    async (args) => {
      try {
        const dims = args.dimensions
          .split(",")
          .map((d) => d.trim())
          .filter(Boolean);
        return jsonResult(
          await gsc.searchAnalytics({
            siteUrl: args.site_url ?? "",
            startDate: args.start_date,
            endDate: args.end_date,
            dimensions: dims,
            searchType: args.search_type,
            dimensionFilter: args.dimension_filter,
            rowLimit: args.row_limit,
            aggregationType: args.aggregation_type,
            startRow: args.start_row,
          }),
        );
      } catch (e) {
        return errorResult(e);
      }
    },
  );

  // --------------------------------------------------------------------------
  // 4. gsc_inspect_url
  // --------------------------------------------------------------------------
  server.registerTool(
    "gsc_inspect_url",
    {
      title: "Inspect a URL",
      description:
        "Inspect a URL to check index status, crawl state, mobile usability, rich results, and canonical resolution.",
      inputSchema: {
        url: z.string().describe("Full URL to inspect (must belong to the property)."),
        site_url: z.string().optional(),
      },
    },
    async ({ url, site_url }) => {
      try {
        return jsonResult(await gsc.inspectUrl(url, site_url));
      } catch (e) {
        return errorResult(e);
      }
    },
  );

  // --------------------------------------------------------------------------
  // 5. gsc_compare_performance
  // --------------------------------------------------------------------------
  server.registerTool(
    "gsc_compare_performance",
    {
      title: "Compare two periods",
      description:
        "Compare search performance between two date ranges for a given dimension (query or page). Returns per-key deltas in clicks, impressions, and average position. Ideal for monthly client reports.",
      inputSchema: {
        site_url: z.string().optional(),
        period_a_start: z.string().describe("Reference period start."),
        period_a_end: z.string().describe("Reference period end."),
        period_b_start: z.string().describe("Comparison period start."),
        period_b_end: z.string().describe("Comparison period end."),
        dimension: z.enum(["query", "page"]).default("query"),
        row_limit: z.number().int().min(1).max(25000).default(200),
        dimension_filter: z.string().optional(),
      },
    },
    async (args) => {
      try {
        return jsonResult(
          await gsc.comparePerformance({
            siteUrl: args.site_url,
            periodAStart: args.period_a_start,
            periodAEnd: args.period_a_end,
            periodBStart: args.period_b_start,
            periodBEnd: args.period_b_end,
            dimension: args.dimension,
            rowLimit: args.row_limit,
            dimensionFilter: args.dimension_filter,
          }),
        );
      } catch (e) {
        return errorResult(e);
      }
    },
  );

  // --------------------------------------------------------------------------
  // 6. gsc_find_keyword_opportunities
  // --------------------------------------------------------------------------
  server.registerTool(
    "gsc_find_keyword_opportunities",
    {
      title: "Find keyword opportunities",
      description:
        "Identify queries with high impressions but poor positions — prime candidates for content optimization. Returns an opportunity_score per query (higher = bigger quick win).",
      inputSchema: {
        site_url: z.string().optional(),
        start_date: z.string().default("28daysAgo"),
        end_date: z.string().default("today"),
        min_impressions: z.number().int().min(1).default(100),
        min_position: z.number().min(1).default(5),
        max_position: z.number().min(1).default(20),
        row_limit: z.number().int().min(1).max(25000).default(1000),
      },
    },
    async (args) => {
      try {
        return jsonResult(
          await gsc.findKeywordOpportunities({
            siteUrl: args.site_url,
            startDate: args.start_date,
            endDate: args.end_date,
            minImpressions: args.min_impressions,
            minPosition: args.min_position,
            maxPosition: args.max_position,
            rowLimit: args.row_limit,
          }),
        );
      } catch (e) {
        return errorResult(e);
      }
    },
  );

  // --------------------------------------------------------------------------
  // 7. gsc_get_top_pages
  // --------------------------------------------------------------------------
  server.registerTool(
    "gsc_get_top_pages",
    {
      title: "Top pages",
      description:
        "Return top-performing pages sorted by clicks, impressions, CTR, or average position.",
      inputSchema: {
        site_url: z.string().optional(),
        start_date: z.string().default("28daysAgo"),
        end_date: z.string().default("today"),
        sort_by: z.enum(["clicks", "impressions", "ctr", "position"]).default("clicks"),
        row_limit: z.number().int().min(1).max(25000).default(100),
        dimension_filter: z.string().optional(),
      },
    },
    async (args) => {
      try {
        return jsonResult(
          await gsc.getTopPages({
            siteUrl: args.site_url,
            startDate: args.start_date,
            endDate: args.end_date,
            sortBy: args.sort_by,
            rowLimit: args.row_limit,
            dimensionFilter: args.dimension_filter,
          }),
        );
      } catch (e) {
        return errorResult(e);
      }
    },
  );
}
