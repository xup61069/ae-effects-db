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

async function verifyDialogAccessibility(page, dialogSelector, targetSelector) {
  const dialog = page.locator(dialogSelector);
  await expect(dialog).toBeVisible();
  await expect(dialog.locator(".close")).toHaveAttribute("aria-label", /.+/);
  const accessibility = await new AxeBuilder({page}).include(dialogSelector).analyze();
  expect(accessibility.violations.filter(result => ["critical", "serious"].includes(result.impact))).toEqual([]);
  const targets = dialog.locator(targetSelector);
  expect(await targets.count()).toBeGreaterThan(0);
  for (let index = 0; index < await targets.count(); index += 1) {
    const box = await targets.nth(index).boundingBox();
    expect(box, `${dialogSelector} target ${index}`).not.toBeNull();
    expect(box.height, `${dialogSelector} target ${index} height`).toBeGreaterThanOrEqual(44);
    expect(box.width, `${dialogSelector} target ${index} width`).toBeGreaterThanOrEqual(44);
  }
}

test("clickable kind and category badges toggle their facets like tags", async ({page}) => {
  await ready(page);
  const card = page.locator(".card").first();
  const cat = await card.locator(".catbadge").getAttribute("data-cat-filter");
  const kind = await card.locator(".kindbadge").getAttribute("data-kind-filter");
  expect(cat).toBeTruthy();
  expect(kind).toBeTruthy();

  await card.locator(".catbadge").click();
  await expect(page).toHaveURL(new RegExp(`cat=${cat}`));
  await expect(page.locator(`#activeFilters [data-filter="cat"][data-value="${cat}"]`)).toBeVisible();
  await expect(card.locator(".catbadge")).toHaveAttribute("aria-pressed", "true");

  await card.locator(".kindbadge").click();
  await expect(page).toHaveURL(new RegExp(`kind=${kind}`));
  await expect(page.locator(`#activeFilters [data-filter="kind"][data-value="${kind}"]`)).toBeVisible();

  await card.locator(".catbadge").click();
  await expect(page).not.toHaveURL(/cat=/);
  await card.locator(".kindbadge").click();
  await expect(page).not.toHaveURL(/kind=/);
});

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
  for (let i = 0; i < 60; i++) {
    const detail = page.locator("[data-detail]").nth(i);
    if (!(await detail.isVisible().catch(() => false))) break;
    await detail.click();
    if (await page.locator("#detailDialog .recommendations").first().isVisible().catch(() => false)) break;
    await page.keyboard.press("Escape");
  }
  await expect(page.locator("#detailDialog .recommendations").first()).toBeVisible();
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

test("localized category suggestions apply a facet instead of a fragile text query", async ({page}) => {
  await ready(page, "/?lang=ja");
  await expect(page.locator("html")).toHaveAttribute("lang", "ja");
  await page.locator("#q").fill("ブラー／グロー");
  const suggestion = page.locator('#suggestions [data-suggestion-type="category"][data-suggestion="blur-glow"]');
  await expect(suggestion).toBeVisible();
  await suggestion.click();
  await expect(page.locator("#q")).toHaveValue("");
  await expect(page.locator('#activeFilters [data-filter="cat"][data-value="blur-glow"]')).toBeVisible();
  await expect(page.locator(".card").first()).toBeVisible();
  await expect(page).toHaveURL(/cat=blur-glow/);
  await expect(page).not.toHaveURL(/q=/);
});

test("programmatic result scrolling honors reduced-motion changes", async ({page}) => {
  await page.emulateMedia({reducedMotion:"reduce"});
  await ready(page);
  await page.evaluate(() => {
    window.__scrollOptions = [];
    window.scrollTo = options => window.__scrollOptions.push(options);
  });
  await page.locator("[data-discovery-query]").nth(0).click();
  await expect.poll(() => page.evaluate(() => window.__scrollOptions.at(-1)?.behavior)).toBe("auto");

  await page.emulateMedia({reducedMotion:"no-preference"});
  await page.locator("[data-discovery-query]").nth(1).click();
  await expect.poll(() => page.evaluate(() => window.__scrollOptions.at(-1)?.behavior)).toBe("smooth");
});

test("discovery buttons never land on an empty category (query falls back to category-only)", async ({page}) => {
  await ready(page);
  for (const cat of ["mograph", "film"]) {
    await page.locator(`[data-discovery-query][data-discovery-cat="${cat}"]`).click();
    await expect(page.locator(`#activeFilters [data-filter="cat"][data-value="${cat}"]`)).toBeVisible();
    await expect(page.locator(".card").first()).toBeVisible();
    await expect(page).toHaveURL(new RegExp(`cat=${cat}`));
    await expect(page.locator("#count")).toContainText("筆結果");
  }
});

test("every card shows a last-updated badge, with a dash fallback for undated entries", async ({page}) => {
  await ready(page);
  const cards = page.locator(".card");
  expect(await cards.count()).toBeGreaterThan(0);
  const badges = page.locator(".card .datebadge");
  expect(await badges.count()).toBe(await cards.count());
  for (const text of await badges.allTextContents()) {
    expect(text).toMatch(/(更新|發行)/);
  }
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

test("stale URL filters and sort modes are canonicalized on load and popstate", async ({page}) => {
  const params = new URLSearchParams({
    q:FIRST.name,
    cat:`${FIRST.cat},retired-category`,
    src:`${FIRST._src},missing-source`,
    kind:`${FIRST.kind},bogus-kind`,
    sort:"unsupported-sort",
    compare:JSON.stringify([FIRST.id, "missing-item"]),
    item:"missing-item",
  });
  await ready(page, `/?${params}`);
  await expect(page.locator(`[data-detail="${FIRST.id}"]`)).toBeVisible();
  await expect(page.locator("#sort")).toHaveValue("latest");
  await expect(page.locator("#activeFilters .a")).toHaveCount(3);
  await expect.poll(() => page.evaluate(() => Object.fromEntries(new URL(location.href).searchParams))).toEqual({
    q:FIRST.name, cat:FIRST.cat, src:FIRST._src, kind:FIRST.kind, compare:JSON.stringify([FIRST.id]),
  });

  await page.evaluate(() => history.pushState(null, "", "/?cat=missing-category&sort=unsupported-sort"));
  await expect.poll(() => page.evaluate(() => location.search)).toContain("missing-category");
  await page.goBack();
  await expect.poll(() => page.evaluate(() => new URL(location.href).searchParams.get("q"))).toBe(FIRST.name);
  await page.goForward();
  await expect.poll(() => page.evaluate(() => location.search)).toBe("");
  await expect(page.locator("#activeFilters .a")).toHaveCount(0);
  await expect(page.locator("#sort")).toHaveValue("latest");
  await page.locator("#catBtn").click();
  await page.locator(`#catPanel [data-k="${FIRST.cat}"]`).click();
  await expect(page.locator("#activeFilters .a")).toHaveCount(1);
  await expect.poll(() => page.evaluate(() => new URL(location.href).searchParams.get("cat"))).toBe(FIRST.cat);
});

test("favorites repair malformed storage and import only known stable IDs", async ({page}) => {
  await page.addInitScript(() => localStorage.setItem("ae-effects-db:favorites:v2", "null"));
  await ready(page);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("ae-effects-db:favorites:v2")))).toEqual([]);

  await page.locator("#favManageBtn").click();
  await page.locator("#favImportFile").setInputFiles({
    name:"favorites.json", mimeType:"application/json",
    buffer:Buffer.from(JSON.stringify({version:2, favorites:[FIRST._legacy, FIRST.id, "unknown-effect", 42]})),
  });
  await expect(page.locator("#favManageMsg")).toContainText("1");
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem("ae-effects-db:favorites:v2")));
  expect(stored).toEqual([FIRST.id]);
  await expect(page.locator("#favBtn .n")).toHaveText("1");

  await page.evaluate(() => {
    window.__originalStorageSetItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key === "ae-effects-db:favorites:v2") throw new DOMException("blocked", "QuotaExceededError");
      return window.__originalStorageSetItem.call(this, key, value);
    };
  });
  await page.locator("#favImportFile").setInputFiles({
    name:"more-favorites.json", mimeType:"application/json",
    buffer:Buffer.from(JSON.stringify({version:2, favorites:[CATALOG[1].id]})),
  });
  await expect(page.locator("#favManageMsg")).toContainText("匯入失敗");
  await expect(page.locator("#favBtn .n")).toHaveText("1");
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("ae-effects-db:favorites:v2")))).toEqual([FIRST.id]);
});

test("three languages and local-only visual finder", async ({page}) => {
  await page.addInitScript(() => {
    const create = URL.createObjectURL.bind(URL), revoke = URL.revokeObjectURL.bind(URL);
    window.__visualUrls = {created:[], revoked:[]};
    URL.createObjectURL = value => { const url = create(value); window.__visualUrls.created.push(url); return url; };
    URL.revokeObjectURL = url => { window.__visualUrls.revoked.push(url); return revoke(url); };
  });
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
  await page.locator("#visualFile").setInputFiles({name:"reference.gif", mimeType:"image/gif", buffer:Buffer.from("GIF89a")});
  await expect(page.locator("#visualMsg")).toContainText("PNG、JPEG、WebP");
  await page.evaluate(() => {
    const transfer = new DataTransfer();
    transfer.items.add(new File([new Uint8Array(20 * 1024 * 1024 + 1)], "too-large.png", {type:"image/png"}));
    const input = document.getElementById("visualFile");
    input.files = transfer.files;
    input.dispatchEvent(new Event("change", {bubbles:true}));
  });
  await expect(page.locator("#visualMsg")).toContainText("20 MB");
  expect(await page.evaluate(() => window.__visualUrls.created)).toEqual([]);
  await page.locator("#visualFile").setInputFiles({
    name:"reference.png", mimeType:"image/png",
    buffer:Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", "base64"),
  });
  await expect(page.locator("#visualPreview")).toBeVisible();
  const validPreview = await page.locator("#visualPreview").getAttribute("src");
  await page.locator("#visualFile").setInputFiles({
    name:"damaged.png", mimeType:"image/png", buffer:Buffer.from("not an image"),
  });
  await expect(page.locator("#visualMsg")).toContainText("読み込めません");
  await expect(page.locator("#visualPreview")).toHaveAttribute("src", validPreview);
  await page.locator('[data-visual="glow"]').click();
  await page.locator('[data-visual="texture"]').click();
  await page.locator("#visualSearch").click();
  await expect(page.locator("#q")).toHaveValue(/glow bloom/);
  const urls = await page.evaluate(() => window.__visualUrls);
  expect(urls.created.length).toBe(2);
  expect(new Set(urls.revoked)).toEqual(new Set(urls.created));
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

  test("a failed locale request preserves the active language and can be retried", async ({page}) => {
    let failEnglish = true;
    await page.route("**/dist/web/locales/en.json*", route => failEnglish ? route.abort("failed") : route.continue());
    await ready(page);
    await page.locator('[data-lang="en"]').click();
    await expect(page.locator("#toast")).toContainText("無法載入語言資料");
    await expect(page.locator("html")).toHaveAttribute("lang", "zh-Hant");
    await expect(page.locator('[data-lang="zh"]')).toHaveAttribute("aria-pressed", "true");
    await expect(page).not.toHaveURL(/lang=en/);

    failEnglish = false;
    await page.locator('[data-lang="en"]').click();
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect(page.locator('[data-lang="en"]')).toHaveAttribute("aria-pressed", "true");
    await expect(page).toHaveURL(/lang=en/);

    await page.goBack();
    await expect(page.locator("html")).toHaveAttribute("lang", "zh-Hant");
    await page.route("**/dist/web/locales/ja.json*", route => route.abort("failed"));
    await page.locator('[data-lang="ja"]').click();
    await expect(page.locator("#toast")).toContainText("無法載入語言資料");
    await expect(page.locator("html")).toHaveAttribute("lang", "zh-Hant");
    await expect(page.locator('[data-lang="zh"]')).toHaveAttribute("aria-pressed", "true");
  });

  test("an unavailable locale in the initial URL falls back without breaking the app", async ({page}) => {
    await page.route("**/dist/web/locales/en.json*", route => route.abort("failed"));
    await ready(page, "/?lang=en");
    await expect(page.locator("html")).toHaveAttribute("lang", "zh-Hant");
    await expect(page.locator('[data-lang="zh"]')).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator("#toast")).toContainText("無法載入語言資料");
    await expect(page).not.toHaveURL(/lang=en/);
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

test("390px navigation, empty state, tags, footer, and update actions are 44px targets", async ({page}) => {
  await page.setViewportSize({width:390, height:844});
  await ready(page);
  const selectors = [".langswitch button", ".card:first-of-type .tags button", "footer nav a", ".skip"];
  for (const selector of selectors) {
    const targets = page.locator(selector);
    expect(await targets.count(), selector).toBeGreaterThan(0);
    for (let index = 0; index < await targets.count(); index += 1) {
      const box = await targets.nth(index).boundingBox();
      expect(box, `${selector} target ${index}`).not.toBeNull();
      expect(box.width, `${selector} target ${index} width`).toBeGreaterThanOrEqual(44);
      expect(box.height, `${selector} target ${index} height`).toBeGreaterThanOrEqual(44);
    }
  }

  await page.locator("#mq").fill("definitely-no-such-effect");
  await expect(page.locator(".empty")).toBeVisible();
  await page.evaluate(() => { const banner = document.getElementById("updateBanner"); banner.hidden = false; banner.querySelector("button").textContent = "Update"; });
  for (const selector of [".empty button", "#updateBanner button"]) {
    const box = await page.locator(selector).boundingBox();
    expect(box, selector).not.toBeNull();
    expect(box.width, `${selector} width`).toBeGreaterThanOrEqual(44);
    expect(box.height, `${selector} height`).toBeGreaterThanOrEqual(44);
  }
  const english = await page.locator('[data-lang="en"]').boundingBox();
  expect(english.x + english.width).toBeLessThanOrEqual(390);
});

test("mobile dialogs expose named 44px targets, pass axe, and restore focus", async ({page}) => {
  await page.setViewportSize({width:390, height:844});
  await ready(page);

  const detailOpener = page.locator("[data-detail]").first();
  await detailOpener.click();
  await verifyDialogAccessibility(page, "#detailDialog", ".close, .detailactions a, .detailactions button, .recommendcard");
  await page.keyboard.press("Escape");
  await expect(detailOpener).toBeFocused();

  await page.locator("[data-compare]").nth(0).click();
  await page.locator("[data-compare]").nth(1).click();
  const compareOpener = page.locator("#compareOpen");
  await compareOpener.click();
  await verifyDialogAccessibility(page, "#compareDialog", ".close, .comparetable a");
  await page.keyboard.press("Escape");
  await expect(compareOpener).toBeFocused();

  await page.locator("#mobileFilterToggle").click();
  const favoritesOpener = page.locator("#favManageBtn");
  await favoritesOpener.click();
  await verifyDialogAccessibility(page, "#favoritesDialog", ".close, .favtools button");
  await page.keyboard.press("Escape");
  await expect(favoritesOpener).toBeFocused();

  const visualOpener = page.locator("#aiBtn");
  await visualOpener.click();
  await verifyDialogAccessibility(page, "#visualDialog", ".close, #visualDrop, [data-visual], .visualactions button");
  await page.keyboard.press("Escape");
  await expect(visualOpener).toBeFocused();
});

test("PWA isolates the current catalog version and reloads offline", async ({page, context}) => {
  await ready(page);
  await page.evaluate(() => navigator.serviceWorker.ready);
  if (!(await page.evaluate(() => Boolean(navigator.serviceWorker.controller)))) {
    await page.reload();
    await expect(page.locator(".card").first()).toBeVisible();
  }
  const version = await page.evaluate(async () => (await fetch("dist/web/asset-manifest.json", {cache:"no-store"})).json().then(value => value.version));
  await page.evaluate(async currentVersion => {
    await caches.delete(`ae-effects-db-${currentVersion}`);
    const stale = await caches.open("ae-effects-db-stale-regression");
    await stale.put(new URL("dist/web/catalog.json", location.href), new Response("[]", {headers:{"Content-Type":"application/json"}}));
  }, version);
  await page.reload();
  await expect(page.locator(".card").first()).toBeVisible();
  await page.evaluate(() => caches.delete("ae-effects-db-stale-regression"));
  await context.setOffline(true);
  await page.reload();
  await expect(page.locator(".card").first()).toBeVisible();
  await page.locator("#q").fill(FIRST.name);
  await expect(page.locator(`[data-detail="${FIRST.id}"]`)).toBeVisible();
  await page.locator('[data-lang="en"]').click();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.locator(`article:has([data-detail="${FIRST.id}"]) .desc`)).toHaveText(LOCALES.en[FIRST.id][0]);
  await page.locator('[data-lang="ja"]').click();
  await expect(page.locator("html")).toHaveAttribute("lang", "ja");
  await expect(page.locator(`article:has([data-detail="${FIRST.id}"]) .desc`)).toHaveText(LOCALES.ja[FIRST.id][0]);
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("lang", "ja");
  await expect(page.locator(`article:has([data-detail="${FIRST.id}"]) .desc`)).toHaveText(LOCALES.ja[FIRST.id][0]);
});

test("site title, count header and summary kind chips are clickable", async ({page}) => {
  await ready(page);
  const pluginChip = page.locator('.summary .kindchip[data-kind-filter="plugin"]');
  await expect(pluginChip).toBeVisible();
  await pluginChip.click();
  await expect(page).toHaveURL(/kind=plugin/);
  await expect(pluginChip).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator('#activeFilters [data-filter="kind"][data-value="plugin"]')).toBeVisible();

  const countBrowse = page.locator(".countbrowse");
  await expect(countBrowse).toBeVisible();
  await countBrowse.click();
  await expect(page).not.toHaveURL(/kind=plugin/);
  await expect(pluginChip).toHaveAttribute("aria-pressed", "false");

  await page.locator("#q").fill("glow");
  await expect(page.locator("#count")).toContainText("結果");
  await page.locator("#siteTitle").click();
  await expect(page.locator("#q")).toHaveValue("");
  await expect(page.locator(".countbrowse")).toContainText("瀏覽全部");
});

test("PWA update waits for explicit activation and reloads", async ({page}) => {
  await ready(page);
  await page.evaluate(() => navigator.serviceWorker.ready);
  if (!(await page.evaluate(() => Boolean(navigator.serviceWorker.controller)))) {
    await page.reload();
    await expect(page.locator(".card").first()).toBeVisible();
  }
  const originalController = await page.evaluate(() => navigator.serviceWorker.controller.scriptURL);
  await page.evaluate(() => navigator.serviceWorker.register("service-worker.js?e2e-update=1", {scope:"./", updateViaCache:"none"}));
  const updateButton = page.locator("#updateBanner button");
  await expect(updateButton).toBeVisible();
  await expect.poll(() => page.evaluate(() => navigator.serviceWorker.controller.scriptURL)).toBe(originalController);
  await Promise.all([
    page.waitForNavigation({waitUntil:"domcontentloaded"}),
    updateButton.click(),
  ]);
  await expect(page.locator(".card").first()).toBeVisible();
  await expect.poll(() => page.evaluate(() => navigator.serviceWorker.controller.scriptURL)).toContain("e2e-update=1");
});
