import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as auth from "./auth.service";
import * as catalog from "./catalog.service";
import * as events from "./event.service";
import { api, ApiError, tokenStore } from "./http";
import * as orgs from "./org.service";
import * as payments from "./payment.service";
import * as royalties from "./royalty.service";
import * as users from "./user.service";

/** Records every request and answers with the queued responses (200 {} by default). */
function mockFetch(...responses: Response[]) {
  const calls: { url: string; method: string; body: unknown; authorization?: string }[] = [];
  const fetchMock = vi.fn(async (url: string, init: RequestInit = {}) => {
    const headers = (init.headers ?? {}) as Record<string, string>;
    calls.push({
      url,
      method: init.method ?? "GET",
      body: typeof init.body === "string" ? JSON.parse(init.body) : undefined,
      authorization: headers.authorization,
    });
    return responses.shift() ?? json(200, {});
  });
  vi.stubGlobal("fetch", fetchMock);
  return calls;
}

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

beforeEach(() => tokenStore.set(null));
afterEach(() => vi.unstubAllGlobals());

describe("http client", () => {
  it("sends JSON with the access token and the refresh cookie", async () => {
    const calls = mockFetch(json(200, { ok: true }));
    tokenStore.set({ accessToken: "token-1", expiresIn: 900, user: {} as never });

    await expect(api("/things", { method: "POST", body: { a: 1 } })).resolves.toEqual({ ok: true });
    expect(calls).toEqual([{ url: "/api/v1/things", method: "POST", body: { a: 1 }, authorization: "Bearer token-1" }]);
  });

  it("turns error bodies into ApiError with the code, message and details", async () => {
    mockFetch(json(422, { error: { code: "VALIDATION_FAILED", message: "Invalid", details: [{ code: "TITLE_REQUIRED" }] } }));

    const error = await api("/things").catch((err: unknown) => err);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 422, code: "VALIDATION_FAILED", message: "Invalid", details: [{ code: "TITLE_REQUIRED" }] });
  });

  it("refreshes the session once on 401, then retries with the new token", async () => {
    const session = { accessToken: "token-2", expiresIn: 900, user: { id: "u1" } };
    const calls = mockFetch(json(401, {}), json(200, session), json(200, ["retried"]));
    tokenStore.set({ accessToken: "expired", expiresIn: 900, user: {} as never });

    await expect(api("/things")).resolves.toEqual(["retried"]);
    expect(calls.map((call) => `${call.method} ${call.url} ${call.authorization ?? "-"}`)).toEqual([
      "GET /api/v1/things Bearer expired",
      "POST /api/v1/auth/refresh -",
      "GET /api/v1/things Bearer token-2",
    ]);
  });

  it("returns nothing for 202 and 204", async () => {
    mockFetch(new Response(null, { status: 204 }));
    await expect(api("/things", { method: "DELETE" })).resolves.toBeUndefined();
  });
});

describe("service paths (unchanged from the monorepo app)", () => {
  const ARTIST = { type: "ARTIST", id: "a1" } as const;

  const cases: [string, () => Promise<unknown>, string, string, unknown?][] = [
    ["login", () => auth.login("ama@monkii.test", "secret"), "POST", "/api/v1/auth/login", { email: "ama@monkii.test", password: "secret" }],
    ["account type", () => auth.changeAccountType("ARTIST"), "PATCH", "/api/v1/auth/account-type", { accountType: "ARTIST" }],
    ["admin users", () => auth.getAdminUsers("ama b"), "GET", "/api/v1/admin/users?pageSize=50&search=ama%20b"],
    ["countries", () => users.getCountries(), "GET", "/api/v1/users/reference/countries"],
    ["follow", () => users.toggleFollow("a1", false), "POST", "/api/v1/artists/a1/follow"],
    ["unfollow", () => users.toggleFollow("a1", true), "DELETE", "/api/v1/artists/a1/follow"],
    ["managed profile", () => users.updateArtistProfile("a1", {} as never), "PATCH", "/api/v1/artists/a1/profile", {}],
    ["search", () => catalog.search("makossa & co"), "GET", "/api/v1/search?q=makossa%20%26%20co"],
    ["like", () => catalog.toggleLike("t1", false), "PUT", "/api/v1/tracks/t1/like"],
    ["publish release", () => catalog.publishRelease("r1", null), "POST", "/api/v1/releases/r1/publish", { publishAt: null }],
    ["track order", () => catalog.reorderTracks("r1", ["t2", "t1"]), "PUT", "/api/v1/releases/r1/track-order", { trackIds: ["t2", "t1"] }],
    ["reject release", () => catalog.decideRelease("r1", false, "Cover"), "POST", "/api/v1/admin/releases/r1/reject", { reason: "Cover" }],
    ["events", () => events.getEvents(new URLSearchParams({ pageSize: "30", city: "Douala" })), "GET", "/api/v1/events?pageSize=30&city=Douala"],
    ["interest", () => events.toggleInterest("e1", undefined), "PUT", "/api/v1/events/e1/interest"],
    ["reserve", () => events.reserveTickets("e1", "tier1", 2), "POST", "/api/v1/events/e1/tickets", { tierId: "tier1", quantity: 2 }],
    ["delete tier", () => events.deleteTier("tier1"), "DELETE", "/api/v1/tiers/tier1"],
    ["check-in", () => events.checkIn("e1", "ABC123"), "POST", "/api/v1/events/e1/check-in", { code: "ABC123" }],
    ["respond to contract", () => orgs.respondToContract("c1", "accept"), "POST", "/api/v1/contracts/c1/accept"],
    ["imprint", () => orgs.addImprint("o1", "Wouri Records"), "POST", "/api/v1/orgs/o1/imprints", { name: "Wouri Records" }],
    ["checkout", () => payments.checkout({ kind: "SUBSCRIPTION" }), "POST", "/api/v1/payments/checkout", { kind: "SUBSCRIPTION" }],
    ["platform settings", () => payments.getPlatformSettings(), "GET", "/api/v1/admin/settings"],
    ["earnings", () => royalties.getEarnings(ARTIST), "GET", "/api/v1/earnings?beneficiaryType=ARTIST&beneficiaryId=a1"],
    ["payout", () => royalties.requestPayout(ARTIST, 25000), "POST", "/api/v1/payouts", { beneficiaryType: "ARTIST", beneficiaryId: "a1", amountXaf: 25000 }],
    ["approve payout", () => royalties.decidePayout("p1", true), "POST", "/api/v1/admin/payouts/p1/approve"],
  ];

  it.each(cases)("%s", async (_name, call, method, url, body) => {
    const calls = mockFetch();
    await call();
    expect(calls).toHaveLength(1);
    expect(calls[0]).toMatchObject({ method, url, body });
  });

  it("builds the statement link on the gateway path", () => {
    expect(royalties.statementUrl(ARTIST, "2027-02")).toBe("/api/v1/earnings/statement.csv?beneficiaryType=ARTIST&beneficiaryId=a1&period=2027-02");
  });
});
