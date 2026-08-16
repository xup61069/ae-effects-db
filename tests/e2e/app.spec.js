const {test, expect} = require("@playwright/test");
const AxeBuilder = require("@axe-core/playwright").default;
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "../..");
const CATALOG = JSON.parse(fs.readFileSync(path.join(ROOT, "dist/web/catalog.json"), "utf8"));
const LOCALES = Object.fromEntries(["en", "ja"].map(lang => [
  lang, JSON.parse(fs.readFileSync(path.join(ROOT, `dist/web/locales/${lang}.json`), "utf8")),
]));
const FIRST = CATALOG[0];
const PAGE_ERRORS = new WeakMap();

test.beforeEach(async ({page}) => {
  const errors = [];
  PAGE_ERRORS.set(page, errors);
  page.on("pageerror", error => errors.push(error.message));
});

test.afterEach(async ({page}) => {
  expect(PAGE_ERRORS.get(page) || []).toEqual([]);
});

async function ready(page, url = "/") {
  await page.goto(url);
  await expect(page.locator(".card").first()).toBeVisible();
}

async function verifySuggestionKeyboard(page, inputSelector, listSelector) {
  const input = page.locator(inputSelector);
  const list = page.locator(listSelector);
  const options = list.locator('[role="option"]');
  await input.fill("gl");
  await expect(list).toBeVisible();
  expect(await options.count()).toBeGreaterThan(1);
  const touchTarget = await options.first().boundingBox();
  expect(touchTarget).not.toBeNull();
  expect(touchTarget.height).toBeGreaterThanOrEqual(44);
  await input.press("ArrowDown");
  await expect(options.nth(0)).toBeFocused();
  await expect(options.nth(0)).toHaveAttribute("aria-selected", "true");
  await page.keyboard.press("ArrowDown");
  await expect(options.nth(1)).toBeFocused();
  await expect(options.nth(0)).toHaveAttribute("aria-selected", "false");
  await expect(options.nth(1)).toHaveAttribute("aria-selected", "true");
  await page.keyboard.press("End");
  await expect(options.last()).toBeFocused();
  await page.keyboard.press("Home");
  await expect(options.nth(0)).toBeFocused();
  await page.keyboard.press("ArrowUp");
  await expect(input).toBeFocused();
  await input.press("ArrowDown");
  await page.keyboard.press("Escape");
  await expect(list).toBeHidden();
  await expect(input).toBeFocused();
  await expect(options.nth(0)).toHaveAttribute("aria-selected", "false");
  await input.press("ArrowDown");
  await expect(list).toBeVisible();
  await expect(options.nth(0)).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(input).toBeFocused();
}

test("search suggestions, dynamic facets, history, detail and compare", async ({page}) => {
  await ready(page);
  await page.locator("#q").fill("glwo");
  await expect(page.locator('#suggestions [role="option"]')).toHaveCount(1);
  await expect(page.locator('#suggestions [role="option"]')).toContainText("glow");
  await page.locator("#q").fill("deep glo");
  await expect(page.locator("#suggestions")).toBeVisible();
  await page.locator("#q").fill("glow");
  await expect(page.locator("#count")).toContainText("結果");
  await expect(page.locator(".matchreason").first()).toBeVisible();
  await page.keyboard.press("Escape");

  await page.locator("#catBtn").click();
  const glowFacet = page.locator('#catPanel [data-k="glow"]');
  await expect(glowFacet.locator(".n")).not.toHaveText("0");
  await glowFacet.click();
  await expect(page.locator('#activeFilters [data-value="glow"]')).toBeVisible();
  await page.locator("#kindBtn").click();
  await page.locator('#kindPanel [data-k="plugin"]').click();
  await expect(page).toHaveURL(/kind=plugin/);
  await page.goBack();
  await expect(page).not.toHaveURL(/kind=plugin/);
  await page.goForward();
  await expect(page).toHaveURL(/kind=plugin/);

  await page.locator("[data-clear-all]").last().click();
  await page.locator("[data-detail]").first().click();
  await expect(page.locator("#detailDialog")).toBeVisible();
  await expect(page).toHaveURL(/item=[a-z0-9-]+/);
  await expect(page.locator(".recommendations").first()).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator("#detailDialog")).not.toBeVisible();
  await expect(page).not.toHaveURL(/item=/);

  await page.locator("[data-compare]").nth(0).click();
  await page.locator("[data-compare]").nth(1).click();
  await expect(page.locator("#compareOpen")).toBeEnabled();
  await page.locator("#compareOpen").click();
  await expect(page.locator("#compareDialog .comparetable")).toBeVisible();
});

test("desktop and mobile suggestions support arrow navigation and focus recovery", async ({page}) => {
  await ready(page);
  await verifySuggestionKeyboard(page, "#q", "#suggestions");
  await page.locator("#q").fill("gl");
  await expect(page.locator("#suggestions")).toBeVisible();
  const accessibility = await new AxeBuilder({page}).analyze();
  expect(accessibility.violations.filter(result => ["critical", "serious"].includes(result.impact))).toEqual([]);
  await page.keyboard.press("Escape");
  await page.locator("#q").fill("glwo");
  await page.locator("#q").press("ArrowDown");
  await page.locator('#suggestions [role="option"]:focus').dispatchEvent("keydown", {key:"Enter", bubbles:true});
  await expect(page.locator("#q")).toHaveValue("glow");
  await expect(page.locator("#q")).toBeFocused();
  await expect(page.locator("#suggestions")).toBeHidden();
  await expect(page).toHaveURL(/q=glow/);

  await page.locator("#q").fill("glwo");
  await page.locator("#q").press("ArrowDown");
  await page.locator('#suggestions [role="option"]:focus').dispatchEvent("keydown", {key:" ", bubbles:true});
  await expect(page.locator("#q")).toHaveValue("glow");
  await expect(page.locator("#q")).toBeFocused();

  await page.setViewportSize({width:390, height:844});
  await verifySuggestionKeyboard(page, "#mq", "#mobileSuggestions");
});

test("legacy URLs and v1 favorites migrate to stable IDs", async ({page}) => {
  await page.addInitScript(legacy => localStorage.setItem("ae-effects-db:favorites:v1", JSON.stringify([legacy])), FIRST._legacy);
  await ready(page, `/?item=${encodeURIComponent(FIRST._legacy)}`);
  await expect(page.locator("#detailDialog")).toBeVisible();
  await expect(page).toHaveURL(new RegExp(`item=${FIRST.id}`));
  const storage = await page.evaluate(() => ({v1:localStorage.getItem("ae-effects-db:favorites:v1"), v2:JSON.parse(localStorage.getItem("ae-effects-db:favorites:v2"))}));
  expect(storage.v1).toBeNull();
  expect(storage.v2).toContain(FIRST.id);
});

test("three languages and local-only visual finder", async ({page}) => {
  const requests = [];
  page.on("request", request => { if (request.method() !== "GET") requests.push(request.url()); });
  await ready(page);
  await page.locator('[data-lang="en"]').click();
  await expect(page.locator("#siteSubtitle")).toContainText("Describe the look");
  await expect(page).toHaveURL(/lang=en/);
  await page.locator('[data-lang="ja"]').click();
  await expect(page.locator("#siteSubtitle")).toContainText("After Effects");

  await page.locator("#aiBtn").click();
  await expect(page.locator("#visualDialog")).toBeVisible();
  await page.locator("#visualFile").setInputFiles({
    name:"reference.png", mimeType:"image/png",
    buffer:Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", "base64"),
  });
  await expect(page.locator("#visualPreview")).toBeVisible();
  await page.locator('[data-visual="glow"]').click();
  await page.locator('[data-visual="texture"]').click();
  await page.locator("#visualSearch").click();
  await expect(page.locator("#q")).toHaveValue(/glow bloom/);
  expect(requests).toEqual([]);
});

test.describe("locale request ordering", () => {
  test.use({serviceWorkers:"block"});

  test("the latest language wins when locale requests finish out of order", async ({page}) => {
    await page.route("**/dist/web/locales/en.json*", async route => {
      await new Promise(resolve => setTimeout(resolve, 500));
      await route.continue();
    });
    await ready(page, `/?q=${encodeURIComponent(FIRST.name)}`);
    await page.locator('[data-lang="en"]').click();
    await page.locator('[data-lang="ja"]').click();
    await page.waitForTimeout(700);
    const card = page.locator(`article:has([data-detail="${FIRST.id}"])`);
    await expect(page.locator("html")).toHaveAttribute("lang", "ja");
    await expect(card.locator(".desc")).toHaveText(LOCALES.ja[FIRST.id][0]);
    await expect(card.locator(".desc")).not.toHaveText(LOCALES.en[FIRST.id][0]);
  });
});

test("390px filter drawer has 44px controls and no serious axe violations", async ({page}) => {
  await page.setViewportSize({width:390, height:844});
  await ready(page);
  await expect(page.locator("#mq")).toBeVisible();
  await page.locator("#mobileFilterToggle").click();
  await expect(page.locator("#filterDialog")).toBeVisible();
  for (const selector of ["#filterClose", "#catBtn", "#srcBtn", "#kindBtn", "#sort", "#favBtn", "#favManageBtn", "#aiBtn"]) {
    const box = await page.locator(selector).boundingBox();
    expect(box, selector).not.toBeNull();
    expect(box.height, selector).toBeGreaterThanOrEqual(44);
    expect(box.width, selector).toBeGreaterThanOrEqual(44);
  }
  await page.locator("#catBtn").click();
  await expect(page.locator('#catPanel [data-k="glow"]')).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator("#filterDialog")).not.toBeVisible();
  const accessibility = await new AxeBuilder({page}).analyze();
  expect(accessibility.violations.filter(result => ["critical", "serious"].includes(result.impact))).toEqual([]);
});

test("PWA reloads the full catalog offline", async ({page, context}) => {
  await ready(page);
  await page.evaluate(() => navigator.serviceWorker.ready);
  if (!(await page.evaluate(() => Boolean(navigator.serviceWorker.controller)))) {
    await page.reload();
    await expect(page.locator(".card").first()).toBeVisible();
  }
  await context.setOffline(true);
  await page.reload();
  await expect(page.locator(".card").first()).toBeVisible();
  await page.locator("#q").fill("glow");
  await expect(page.locator("#count")).toContainText(/結果|results|件/);
});
