# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: full_pipeline.spec.ts >> Full pipeline >> intake → LERS → dispatch → upload → parse → records
- Location: e2e\full_pipeline.spec.ts:29:3

# Error details

```
"beforeAll" hook timeout of 30000ms exceeded.
```

# Test source

```ts
  1  | import { test, expect } from "@playwright/test";
  2  | import path from "path";
  3  | import { fileURLToPath } from "url";
  4  | import { randomUUID } from "crypto";
  5  | 
  6  | const __dirname = path.dirname(fileURLToPath(import.meta.url));
  7  | const API_BASE = process.env.VITE_API_BASE_URL ?? "http://localhost:8080";
  8  | 
  9  | async function waitForBackend() {
  10 |   for (let i = 0; i < 30; i++) {
  11 |     try {
  12 |       const res = await fetch(`${API_BASE}/api/v1/health`);
  13 |       if (res.ok) return;
  14 |     } catch {
  15 |       // retry
  16 |     }
  17 |     await new Promise((r) => setTimeout(r, 1000));
  18 |   }
  19 |   throw new Error(
  20 |     `Backend not reachable at ${API_BASE}. Start it with: cd backend && go run ./cmd/server`
  21 |   );
  22 | }
  23 | 
  24 | test.describe("Full pipeline", () => {
> 25 |   test.beforeAll(async () => {
     |        ^ "beforeAll" hook timeout of 30000ms exceeded.
  26 |     await waitForBackend();
  27 |   });
  28 | 
  29 |   test("intake → LERS → dispatch → upload → parse → records", async ({
  30 |     page,
  31 |   }) => {
  32 |     const caseId = randomUUID();
  33 |     const complaintText =
  34 |       "Victim reported repeated fraud calls from +919876543210 and +919123456789 on 15-Jan-2024.";
  35 | 
  36 |     await page.goto(`/cases/${caseId}/intake`);
  37 | 
  38 |     await page.getByLabel(/paste complaint text/i).fill(complaintText);
  39 |     await page.getByRole("button", { name: /extract entities/i }).click();
  40 | 
  41 |     await expect(page.getByRole("table")).toBeVisible({ timeout: 15_000 });
  42 | 
  43 |     while (await page.getByRole("button", { name: "Confirm" }).count()) {
  44 |       await page.getByRole("button", { name: "Confirm" }).first().click();
  45 |       await page.waitForTimeout(300);
  46 |     }
  47 | 
  48 |     await page.getByRole("link", { name: "LERS Console" }).click();
  49 |     await expect(page.getByText("Draft Legal Request")).toBeVisible();
  50 | 
  51 |     await page.locator("#provider").selectOption({ index: 1 });
  52 |     await page.locator("#template-type").selectOption("CDR_REQUEST");
  53 | 
  54 |     const checkboxes = page.locator('input[type="checkbox"]');
  55 |     const count = await checkboxes.count();
  56 |     for (let i = 0; i < count; i++) {
  57 |       await checkboxes.nth(i).check();
  58 |     }
  59 | 
  60 |     await page.getByRole("button", { name: /create draft request/i }).click();
  61 |     await expect(page.getByRole("button", { name: "Approve" })).toBeVisible({
  62 |       timeout: 10_000,
  63 |     });
  64 | 
  65 |     await page.getByRole("button", { name: "Approve" }).click();
  66 |     await expect(page.getByText("QUEUED")).toBeVisible({ timeout: 10_000 });
  67 | 
  68 |     await page.getByRole("link", { name: "Dispatch Tracker" }).click();
  69 |     await page.getByRole("button", { name: "Dispatch" }).click();
  70 | 
  71 |     await expect(page.getByText("ACKNOWLEDGED")).toBeVisible({
  72 |       timeout: 20_000,
  73 |     });
  74 | 
  75 |     await page.getByRole("link", { name: "Analytics" }).click();
  76 |     await expect(page.getByText("Upload Provider Response")).toBeVisible();
  77 | 
  78 |     const csvPath = path.join(__dirname, "fixtures", "cdr_response.csv");
  79 |     await page.locator('input[type="file"]').setInputFiles(csvPath);
  80 |     await page.getByRole("button", { name: /upload response/i }).click();
  81 | 
  82 |     await expect(page.getByText(/parse status.*PARSED/i)).toBeVisible({
  83 |       timeout: 60_000,
  84 |     });
  85 | 
  86 |     await expect(page.getByRole("table").locator("tbody tr")).not.toHaveCount(
  87 |       0,
  88 |       { timeout: 15_000 }
  89 |     );
  90 | 
  91 |     await expect(page.getByText("Intelligence Flags")).toBeVisible();
  92 |   });
  93 | });
  94 | 
```