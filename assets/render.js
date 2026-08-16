export function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, character => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[character]));
}

export function highlight(value, terms = []) {
  let output = escapeHtml(value);
  for (const term of terms) {
    if (!term) continue;
    const safe = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    try { output = output.replace(new RegExp(`(${safe})`, "gi"), "<mark>$1</mark>"); } catch (_) {}
  }
  return output;
}

const detailTags = values => values?.length ? `<div class="detailtags">${values.map(value => `<span>${escapeHtml(value)}</span>`).join("")}</div>` : "";

function recommendationSection(title, ids, byId, t) {
  const items = (ids || []).map(id => byId.get(id)).filter(Boolean);
  if (!items.length) return "";
  return `<section class="recommendations"><h3>${escapeHtml(title)}</h3><div class="recommendgrid">${items.map(item => `
    <button type="button" class="recommendcard" data-detail="${escapeHtml(item.id)}">
      <b>${escapeHtml(item.name)}</b><span>${escapeHtml(item._desc || "")}</span>
    </button>`).join("")}</div></section>`;
}

export function cardMarkup(item, context) {
  const {t, kindLabels, categoryLabels, favoriteIds, compareIds, terms, reasons, officialUrl, officialCategory, popularity} = context;
  const kind = item.kind || "plugin";
  const favorite = favoriteIds.has(item.id);
  const compared = compareIds.has(item.id);
  const origin = item.suite || item.vendor || context.sourceLabels[item._src] || item._src;
  const category = categoryLabels[item.cat] ? `${categoryLabels[item.cat]} · ${item.cat}` : item.cat;
  const adobe = officialCategory(item);
  const adobeBadge = adobe ? `<a class="officialbadge" href="${escapeHtml(adobe.source)}" target="_blank" rel="noopener">Adobe · ${escapeHtml(adobe.label)}</a>` : "";
  const pop = popularity(item);
  const date = item.updated || item.released;
  const match = reasons?.length ? `<span class="matchreason">${escapeHtml(t("matchedBy"))} ${escapeHtml(context.reasonLabel(reasons[0]))}</span>` : "";
  const original = item._original ? `<small class="original-label">${escapeHtml(t("descriptionOriginal"))}</small>` : "";
  const stack = item.stack ? `<ul class="stack">${item.stack.map(value => `<li>▸ ${highlight(value, terms)}</li>`).join("")}${item.builtin ? `<li class="builtin-alt">${escapeHtml(t("builtinAlternative"))} ${highlight(item.builtin, terms)}</li>` : ""}</ul>` : "";
  const variants = item.variants ? `<div class="variants">${Object.entries(item.variants).map(([name, label]) => `<span>${escapeHtml(name)} · ${escapeHtml(label)}</span>`).join("")}</div>` : "";
  return `<article class="card kind-${escapeHtml(kind)}" data-id="${escapeHtml(item.id)}"><div class="top">
    <a class="name namelink" href="${escapeHtml(officialUrl(item.url))}" target="_blank" rel="noopener">${highlight(item.name, terms)}<span class="ext">↗</span></a>
    <span class="kindbadge kind-${escapeHtml(kind)}">${escapeHtml(kindLabels[kind] || kind)}</span>
    <span class="catbadge">${escapeHtml(category)}</span>${adobeBadge}
    ${date ? `<span class="datebadge">${escapeHtml(item.updated ? t("updated") : t("released"))} ${escapeHtml(date)}</span>` : ""}
    <span class="popscore" title="${escapeHtml(t("popularityTitle", {...pop, order:pop.curatedOrder}))}">${escapeHtml(t("popularity", {score:pop.total}))}</span>
    ${match}<span class="src">${escapeHtml(origin)}</span>
    <span class="cardactions"><button type="button" data-detail="${escapeHtml(item.id)}">${escapeHtml(t("details"))}</button><button type="button" data-compare="${escapeHtml(item.id)}" aria-pressed="${compared}">${escapeHtml(compared ? t("compareSelected") : t("compare"))}</button><button class="favbtn${favorite ? " on" : ""}" type="button" data-favorite="${escapeHtml(item.id)}" aria-pressed="${favorite}" aria-label="${escapeHtml(t("favoriteLabel", {name:item.name}))}">${favorite ? "★" : "☆"}</button></span>
  </div><div class="desc">${highlight(item._desc, terms)}${original}</div>${stack}${variants}<div class="tags">${(item.tags || []).slice(0, 12).map(tag => `<button type="button" data-q="${escapeHtml(tag)}">${escapeHtml(tag)}</button>`).join("")}</div></article>`;
}

export function detailMarkup(item, context) {
  const {t, kindLabels, categoryLabels, byId, favoriteIds, compareIds, officialUrl, officialCategory, popularity} = context;
  const pop = popularity(item);
  const origin = item.suite || item.vendor || context.sourceLabels[item._src] || item._src;
  const adobe = officialCategory(item);
  const original = item._original ? `<small class="original-label">${escapeHtml(t("descriptionOriginal"))}</small>` : "";
  const date = item.updated || item.released;
  const variants = item.variants ? `<h3>${escapeHtml(t("variants"))}</h3>${detailTags(Object.entries(item.variants).map(([name, label]) => `${name} · ${label}`))}` : "";
  const stack = item.stack ? `<h3>${escapeHtml(t("effectStack"))}</h3><ol>${item.stack.map(value => `<li>${escapeHtml(value)}</li>`).join("")}</ol>${item.builtin ? `<p><b>${escapeHtml(t("builtinAlternative"))}</b> ${escapeHtml(item.builtin)}</p>` : ""}` : "";
  return `<div class="detailmeta"><span class="kindbadge kind-${escapeHtml(item.kind)}">${escapeHtml(kindLabels[item.kind] || item.kind)}</span><span class="catbadge">${escapeHtml(categoryLabels[item.cat] || item.cat)}</span>${adobe ? `<a class="officialbadge" href="${escapeHtml(adobe.source)}" target="_blank" rel="noopener">Adobe · ${escapeHtml(adobe.label)}</a>` : ""}<span class="catbadge">${escapeHtml(origin)}</span></div>
    <p>${escapeHtml(item._desc)}${original}</p>${item._look ? `<p><b>${escapeHtml(t("appearance"))}</b> ${escapeHtml(item._look)}${original}</p>` : ""}
    ${date ? `<p><b>${escapeHtml(item.updated ? t("latestUpdate") : t("firstRelease"))}：</b>${escapeHtml(date)} · <a href="${escapeHtml(officialUrl(item.date_url || item.url))}" target="_blank" rel="noopener">${escapeHtml(t("dateSource"))}</a></p>` : ""}
    ${variants}${stack}<h3>${escapeHtml(t("searchTags"))}</h3>${detailTags(item.tags || [])}
    <h3>${escapeHtml(t("popularityHeading", {score:pop.total}))}</h3><div class="popbreak"><span><b>${pop.featured}</b>${escapeHtml(t("featured"))}</span><span><b>${pop.source}</b>${escapeHtml(t("sourceWeight"))}</span><span><b>${pop.quality}</b>${escapeHtml(t("dataQuality"))}</span><span><b>${pop.recency}</b>${escapeHtml(t("recentUpdate"))}</span><span><b>${pop.curatedOrder}</b>${escapeHtml(t("curatedOrder"))}</span></div>
    <div class="detailactions"><a href="${escapeHtml(officialUrl(item.url))}" target="_blank" rel="noopener">${escapeHtml(t("officialPage"))}</a><button type="button" data-favorite="${escapeHtml(item.id)}">${escapeHtml(favoriteIds.has(item.id) ? t("removeFavorite") : t("addFavorite"))}</button><button type="button" data-compare="${escapeHtml(item.id)}">${escapeHtml(compareIds.has(item.id) ? t("removeCompare") : t("addCompare"))}</button><button type="button" data-share-detail="${escapeHtml(item.id)}">${escapeHtml(t("copyDetailUrl"))}</button></div>
    ${recommendationSection(t("similarTools"), item._related?.similar, byId, t)}
    ${recommendationSection(t("builtinRecommendations"), item._related?.builtin, byId, t)}
    ${recommendationSection(t("relatedRecipes"), item._related?.recipes, byId, t)}`;
}

export function compareMarkup(items, context) {
  const {t, kindLabels, categoryLabels, officialUrl, popularity} = context;
  const fields = [
    ["fieldKind", item => kindLabels[item.kind] || item.kind], ["fieldCategory", item => categoryLabels[item.cat] || item.cat],
    ["fieldSource", item => item.suite || item.vendor || context.sourceLabels[item._src] || item._src], ["fieldUse", item => item._desc],
    ["fieldAppearance", item => item._look || "—"], ["fieldDate", item => item.updated || item.released || "—"],
    ["fieldPopularity", item => `${popularity(item).total}/100`], ["fieldTags", item => (item.tags || []).slice(0, 12).join("、")],
  ];
  return `<table class="comparetable"><thead><tr><th>${escapeHtml(t("compareItems"))}</th>${items.map(item => `<th>${escapeHtml(item.name)}</th>`).join("")}</tr></thead><tbody>${fields.map(([key, value]) => `<tr><th>${escapeHtml(t(key))}</th>${items.map(item => `<td>${escapeHtml(value(item))}</td>`).join("")}</tr>`).join("")}<tr><th>${escapeHtml(t("fieldOfficial"))}</th>${items.map(item => `<td><a href="${escapeHtml(officialUrl(item.url))}" target="_blank" rel="noopener">${escapeHtml(t("open"))}</a></td>`).join("")}</tr></tbody></table>`;
}
