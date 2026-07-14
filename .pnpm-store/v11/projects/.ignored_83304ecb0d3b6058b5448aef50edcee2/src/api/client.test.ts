
import { describe, it, expect, vi, beforeEach } from "vitest";
import { apiFetch, ApiError } from "./client";

describe("apiFetch", () => {
  const mockFetch = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("fetch", mockFetch);
  });

  it("should throw ApiError with correct status and message on 422 response", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 422,
      statusText: "Unprocessable Entity",
      json: async () => ({ error: "Invalid request" }),
    } as Response);

    await expect(apiFetch("/test")).rejects.toThrow(ApiError);
  });

  it("should return parsed JSON on successful response", async () => {
    const data = { success: true };
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => data,
    } as Response);

    const result = await apiFetch("/test");
    expect(result).toEqual(data);
  });
});
