import { describe, it, expect, vi, beforeEach } from "vitest";
import FinnhubProvider from "../finnhub";

describe("FinnhubProvider", () => {
  let provider: FinnhubProvider;

  beforeEach(() => {
    provider = new FinnhubProvider();
  });

  describe("getMarketNews", () => {
    it("fetches news with correct URL and auth header", async () => {
      const mockData = [{ id: 1, headline: "Test" }];
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          json: () => Promise.resolve(mockData),
        }),
      );

      const result = await provider.getMarketNews("technology");

      expect(fetch).toHaveBeenCalledOnce();
      const [url, opts] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url.href).toContain("finnhub.io/api/v1/news");
      expect(url.href).toContain("category=technology");
      expect(opts.headers).toHaveProperty("X-Finnhub-Token");
      expect(result).toEqual(mockData);
    });

    it("returns undefined when response is not ok", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({ ok: false, status: 500 }),
      );

      const result = await provider.getMarketNews("general");

      expect(result).toBeUndefined();
    });

    it("logs error and returns undefined on network failure", async () => {
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
      vi.stubGlobal(
        "fetch",
        vi.fn().mockRejectedValue(new Error("Network error")),
      );

      const result = await provider.getMarketNews("general");

      expect(consoleSpy).toHaveBeenCalledWith(expect.any(Error));
      expect(result).toBeUndefined();
    });
  });

  describe("getBasicFinancials", () => {
    it("fetches financials with correct URL and ticker symbol", async () => {
      const mockData = { metric: { eps: 1.5 } };
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          json: () => Promise.resolve(mockData),
        }),
      );

      const result = await provider.getBasicFinancials({
        symbol: "AAPL",
        exchange: "",
      });

      expect(fetch).toHaveBeenCalledOnce();
      const [url] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url.href).toContain("finnhub.io/api/v1/stock/metric");
      expect(url.href).toContain("symbol=AAPL");
      expect(url.href).toContain("metric=all");
      expect(result).toEqual(mockData);
    });

    it("returns undefined when response is not ok", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({ ok: false, status: 500 }),
      );

      const result = await provider.getBasicFinancials({
        symbol: "AAPL",
        exchange: "",
      });

      expect(result).toBeUndefined();
    });

    it("logs error and returns undefined on network failure", async () => {
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
      vi.stubGlobal(
        "fetch",
        vi.fn().mockRejectedValue(new Error("Network error")),
      );

      const result = await provider.getBasicFinancials({
        symbol: "AAPL",
        exchange: "",
      });

      expect(consoleSpy).toHaveBeenCalledWith(expect.any(Error));
      expect(result).toBeUndefined();
    });
  });
});
