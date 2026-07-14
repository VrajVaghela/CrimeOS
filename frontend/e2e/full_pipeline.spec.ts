import { test, expect } from "@playwright/test";
import path from "path";
import { fileURLToPath } from "url";
import { randomUUID } from "crypto";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const API_BASE = process.env.VITE_API_BASE_URL ?? "http://localhost:8080";

async function waitForBackend() {
  for (let i = 0; i < 30; i++) {
    try {
      const res = await fetch(`${API_BASE}/api/v1/health`);
      if (res.ok) return;
    } catch {
      // retry
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error(
    `Backend not reachable at ${API_BASE}. Start it with: cd backend && go run ./cmd/server`
  );
}

test.describe("Full pipeline", () => {
  test.beforeAll(async () => {
    await waitForBackend();
  });

  test("intake → LERS → dispatch → upload → parse → records", async ({
    page,
  }) => {
    const caseId = randomUUID();
    const complaintText =
      "Victim reported repeated fraud calls from +919876543210 and +919123456789 on 15-Jan-2024.";

    await page.goto(`/cases/${caseId}/intake`);

    await page.getByLabel(/paste complaint text/i).fill(complaintText);
    await page.getByRole("button", { name: /extract entities/i }).click();

    await expect(page.getByRole("table")).toBeVisible({ timeout: 15_000 });

    while (await page.getByRole("button", { name: "Confirm" }).count()) {
      await page.getByRole("button", { name: "Confirm" }).first().click();
      await page.waitForTimeout(300);
    }

    await page.getByRole("link", { name: "LERS Console" }).click();
    await expect(page.getByText("Draft Legal Request")).toBeVisible();

    await page.locator("#provider").selectOption({ index: 1 });
    await page.locator("#template-type").selectOption("CDR_REQUEST");

    const checkboxes = page.locator('input[type="checkbox"]');
    const count = await checkboxes.count();
    for (let i = 0; i < count; i++) {
      await checkboxes.nth(i).check();
    }

    await page.getByRole("button", { name: /create draft request/i }).click();
    await expect(page.getByRole("button", { name: "Approve" })).toBeVisible({
      timeout: 10_000,
    });

    await page.getByRole("button", { name: "Approve" }).click();
    await expect(page.getByText("QUEUED")).toBeVisible({ timeout: 10_000 });

    await page.getByRole("link", { name: "Dispatch Tracker" }).click();
    await page.getByRole("button", { name: "Dispatch" }).click();

    await expect(page.getByText("ACKNOWLEDGED")).toBeVisible({
      timeout: 20_000,
    });

    await page.getByRole("link", { name: "Analytics" }).click();
    await expect(page.getByText("Upload Provider Response")).toBeVisible();

    const csvPath = path.join(__dirname, "fixtures", "cdr_response.csv");
    await page.locator('input[type="file"]').setInputFiles(csvPath);
    await page.getByRole("button", { name: /upload response/i }).click();

    await expect(page.getByText(/parse status.*PARSED/i)).toBeVisible({
      timeout: 60_000,
    });

    await expect(page.getByRole("table").locator("tbody tr")).not.toHaveCount(
      0,
      { timeout: 15_000 }
    );

    await expect(page.getByText("Intelligence Flags")).toBeVisible();
  });
});
