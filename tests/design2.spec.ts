import { expect, test } from "@playwright/test";
import { portfolio } from "../src/content/portfolio";

/** Design 2 (homepage): content, chapter paging, rail navigation and the toolkit chapter. */
test("design 2 homepage pages one chapter per gesture and shows every section", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto("/");
  await expect(page.locator("h1")).toContainText(portfolio.person.name.split(" ")[0]);
  await page.waitForTimeout(2500);

  const ids = await page.$$eval(".d2-section", (els) => els.map((e) => e.id));
  expect(ids).toEqual([
    "hero",
    "dive",
    "about",
    "projects",
    "build",
    "experience",
    "beliefs",
    "toolkit",
    "contact",
  ]);
  // Every chapter is exactly one viewport tall, so nothing is shown twice while paging.
  const heights = await page.$$eval(".d2-section", (els) => els.map((e) => (e as HTMLElement).offsetHeight));
  const vh = await page.evaluate(() => window.innerHeight);
  for (const h of heights) expect(h).toBe(vh);

  const chapterIndex = () => page.evaluate(() => Math.round(window.scrollY / window.innerHeight));

  // One hard flick moves exactly one chapter.
  await page.mouse.move(400, 400);
  await page.mouse.wheel(0, 3000);
  await expect.poll(chapterIndex, { timeout: 4000 }).toBe(1);
  await page.waitForTimeout(600);
  await page.mouse.wheel(0, 3000);
  await expect.poll(chapterIndex, { timeout: 4000 }).toBe(2);
  await expect(page.locator("#about")).toHaveClass(/is-active/);

  // Rail jumps straight to the toolkit, which lists every tool.
  await page.locator('.d2-rail a[href="#toolkit"]').click();
  await expect.poll(chapterIndex, { timeout: 4000 }).toBe(7);
  await expect(page.locator(".d2-tools li")).toHaveCount(portfolio.toolkit.length);

  // No site-switch header, brand badge or live clock on the final design.
  await expect(page.locator(".d2-top")).toHaveCount(0);
  await expect(page.getByText(/IST \d/)).toHaveCount(0);

  // Contact links are present and correct.
  await page.locator('.d2-rail a[href="#contact"]').click();
  await expect.poll(chapterIndex, { timeout: 4000 }).toBe(8);
  await expect(page.locator(`a[href="mailto:${portfolio.person.email}"]`)).toBeVisible();

  expect(errors).toEqual([]);
});
