import { registerView, getTerms, getTerm, navigate, esc } from "./app.js";
import { store } from "./store.js";
import { filterTerms } from "./filter.js";
import { renderGraph } from "./graphs.js";

const PAGE = 50;

export const CATEGORIES = {
  "경제상식": ["물가·인플레이션", "경기·경기지표", "성장·국민계정", "재정·조세", "노동·산업"],
  "금융상식": ["통화정책", "금융시장", "금융기관·감독", "금융안정·리스크", "지급결제·디지털금융"],
  "국제·외환": ["외환·환율", "국제수지·무역", "국제기구·협정"],
  "경영·회계": ["회계·재무", "기업경영"],
};

function renderList(container, params) {
  const saved = store.getPrefs().filters || {};
  const criteria = { ...saved, ...params };
  let shown = PAGE;

  container.innerHTML = `
    <input id="q" type="search" placeholder="용어·뜻·초성 검색" value="${esc(criteria.q || "")}">
    <div id="chips"></div>
    <p id="count"></p>
    <ul id="items"></ul>
    <button id="more" hidden>더 보기</button>
  `;

  const draw = () => {
    const progress = store.getAllProgress();
    const hits = filterTerms(getTerms(), progress, criteria);
    container.querySelector("#count").textContent = `${hits.length}개`;

    container.querySelector("#items").innerHTML = hits.slice(0, shown).map((t) => {
      const p = progress[t.id] || {};
      return `<li data-id="${esc(t.id)}">
        <button class="go">${esc(t.term)}<small>${esc(t.subcategory)}</small></button>
        <button class="star" aria-pressed="${!!p.starred}" aria-label="중요">${p.starred ? "★" : "☆"}</button>
        <button class="known" aria-pressed="${p.status === "known"}" aria-label="외움">${p.status === "known" ? "●" : "○"}</button>
      </li>`;
    }).join("");

    container.querySelector("#more").hidden = hits.length <= shown;
    store.setPrefs({ ...store.getPrefs(), lastView: "list", filters: criteria });
  };

  container.querySelector("#q").addEventListener("input", (e) => {
    criteria.q = e.target.value;
    shown = PAGE;
    draw();
  });

  container.querySelector("#more").addEventListener("click", () => {
    shown += PAGE;
    draw();
  });

  container.querySelector("#items").addEventListener("click", (e) => {
    const li = e.target.closest("li");
    if (!li) return;
    const id = li.dataset.id;
    if (e.target.classList.contains("go")) navigate("term", { id });
    if (e.target.classList.contains("star")) { store.toggleStar(id); draw(); }
    if (e.target.classList.contains("known")) {
      const cur = store.getProgress(id).status;
      store.setStatus(id, cur === "known" ? "unknown" : "known");
      draw();
    }
  });

  const chips = container.querySelector("#chips");
  const redraw = () => { shown = PAGE; drawChips(); draw(); };
  const drawChips = () => renderChips(chips, criteria, redraw);
  drawChips();
  draw();
}

function renderChips(host, criteria, onChange) {
  host.innerHTML = "";

  const row = (label, key, values) => {
    const div = document.createElement("div");
    div.className = "chip-row";
    div.innerHTML = `<span class="chip-label">${label}</span>` +
      values.map((v) =>
        `<button class="chip" aria-pressed="${criteria[key] === v}" data-v="${esc(v)}">${esc(v)}</button>`
      ).join("");
    div.addEventListener("click", (e) => {
      const btn = e.target.closest(".chip");
      if (!btn) return;
      const v = btn.dataset.v;
      criteria[key] = criteria[key] === v ? undefined : v;
      if (key === "category") criteria.subcategory = undefined;
      onChange();
    });
    host.appendChild(div);
  };

  const labeled = (label, key, pairs) => {
    const div = document.createElement("div");
    div.className = "chip-row";
    div.innerHTML = `<span class="chip-label">${label}</span>` +
      pairs.map(([text, v]) =>
        `<button class="chip" aria-pressed="${criteria[key] === v}" data-v="${esc(v)}">${esc(text)}</button>`
      ).join("");
    div.addEventListener("click", (e) => {
      const btn = e.target.closest(".chip");
      if (!btn) return;
      const v = btn.dataset.v;
      criteria[key] = criteria[key] === v ? undefined : v;
      onChange();
    });
    host.appendChild(div);
  };

  row("대분류", "category", Object.keys(CATEGORIES));
  if (criteria.category) row("소분류", "subcategory", CATEGORIES[criteria.category]);
  labeled("상태", "status", [["외움", "known"], ["안외움", "unknown"], ["미학습", "none"]]);
  labeled("중요", "starred", [["중요만", "1"]]);
  row("초성", "chosung", [..."ㄱㄴㄷㄹㅁㅂㅅㅇㅈㅊㅋㅌㅍㅎ"]);
}

/** 정리본 + 원문. 정리본이 없으면 원문만 보여준다. */
export function renderBody(t) {
  const hasOutline = t.outline?.length;
  if (!hasOutline) return `<p class="def">${esc(t.def)}</p>`;

  return `
    <ul class="outline">
      ${t.outline.map(([label, text]) =>
        `<li><b>${esc(label)}</b><span>${esc(text)}</span></li>`).join("")}
    </ul>
    <details class="raw">
      <summary>원문 보기</summary>
      <p class="def">${esc(t.def)}</p>
    </details>`;
}

function renderTerm(container, { id }) {
  const t = getTerm(id);
  if (!t) { container.innerHTML = "<p>용어를 찾을 수 없습니다.</p>"; return; }
  const p = store.getProgress(id);

  const cfItems = t.related
    .map((r) => getTerm(r))
    .filter(Boolean)
    .map((r) => `<li><button data-rel="${esc(r.id)}">${esc(r.term)}</button>${
      r.summary ? ` — <span>${esc(r.summary)}</span>` : ""}</li>`)
    .join("");

  container.innerHTML = `
    <h2 class="term-head">${esc(t.term)}${
      t.alt ? `<span class="term-alt">${esc(t.alt)}</span>` : ""}</h2>
    <p class="sub">${esc(t.category)} · ${esc(t.subcategory)} · ${t.page}쪽</p>
    ${t.summary ? `<p class="summary">${esc(t.summary)}</p>` : ""}
    ${renderBody(t)}
    ${t.formulas?.length ? `<div class="formulas">
      <h3>계산식</h3>
      ${t.formulas.map((f) => `<p class="formula">${esc(f)}</p>`).join("")}
    </div>` : ""}
    <div id="graph-slot"></div>
    ${cfItems ? `<ul class="cf-list">${cfItems}</ul>` : ""}
    <div class="term-actions">
      <button id="t-known" aria-pressed="${p.status === "known"}">
        ${p.status === "known" ? "외움 ●" : "외움으로 표시"}
      </button>
      <button id="t-star" aria-pressed="${p.starred}">${p.starred ? "중요 ★" : "중요 표시"}</button>
    </div>
  `;

  container.querySelector("#t-known").addEventListener("click", () => {
    const cur = store.getProgress(id).status;
    store.setStatus(id, cur === "known" ? "unknown" : "known");
    renderTerm(container, { id });
  });
  container.querySelector("#t-star").addEventListener("click", () => {
    store.toggleStar(id);
    renderTerm(container, { id });
  });
  const slot = container.querySelector("#graph-slot");
  if (t.graph && slot) {
    const svg = renderGraph(t.graph);
    if (svg) slot.innerHTML = `<figure class="graph">${svg}</figure>`;
  }

  container.querySelectorAll("[data-rel]").forEach((b) =>
    b.addEventListener("click", () => navigate("term", { id: b.dataset.rel })));
}

export function init() {
  registerView("list", renderList);
  registerView("term", renderTerm);
}
