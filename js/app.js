import { store } from "./store.js";

let TERMS = [];
const views = new Map();

export function registerView(name, renderFn) {
  views.set(name, renderFn);
}

export function getTerms() {
  return TERMS;
}

export function getTerm(id) {
  return TERMS.find((t) => t.id === id) || null;
}

export function navigate(view, params = {}) {
  const qs = new URLSearchParams(params).toString();
  location.hash = `#/${view}${qs ? "?" + qs : ""}`;
}

export function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function parseHash() {
  const raw = location.hash.slice(2) || "home";
  const [view, qs] = raw.split("?");
  return { view, params: Object.fromEntries(new URLSearchParams(qs || "")) };
}

function render() {
  const { view, params } = parseHash();
  const container = document.getElementById("view");
  const renderFn = views.get(view) || views.get("home");

  container.innerHTML = "";
  document.getElementById("back").hidden = view === "home";
  window.scrollTo(0, 0);
  renderFn(container, params);
}

function renderHome(container) {
  const progress = store.getAllProgress();
  const known = TERMS.filter((t) => progress[t.id]?.status === "known").length;
  const pct = TERMS.length ? Math.round((known / TERMS.length) * 100) : 0;

  const session = store.getSession();
  const resume = session && session.cursor < session.ids.length;

  const byCat = {};
  for (const t of TERMS) {
    byCat[t.category] ??= { total: 0, known: 0 };
    byCat[t.category].total += 1;
    if (progress[t.id]?.status === "known") byCat[t.category].known += 1;
  }

  container.innerHTML = `
    <p><strong>${known}</strong> / ${TERMS.length} 외움 (${pct}%)</p>
    <div class="progress-bar"><div class="progress-fill" style="width:${pct}%"></div></div>
    ${Object.entries(byCat).map(([cat, v]) => `
      <p class="stat-row"><span>${esc(cat)}</span><span>${v.known}/${v.total}</span></p>
      <div class="progress-bar"><div class="progress-fill"
           style="width:${Math.round((v.known / v.total) * 100)}%"></div></div>
    `).join("")}
    <div class="home-actions">
      <button class="primary" data-go="session">
        ${resume ? `이어하기 (${session.cursor}/${session.ids.length})` : "오늘의 학습 20개 시작"}
      </button>
      <button data-go="list">용어장</button>
      <button data-go="quiz" data-mode="ox">OX 퀴즈</button>
      <button data-go="quiz" data-mode="choice">용어 맞히기</button>
      <button data-go="quiz" data-mode="odd">옳지 않은 것 고르기</button>
      <button data-go="stats">통계</button>
    </div>
  `;

  container.querySelectorAll("[data-go]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const params = btn.dataset.mode ? { mode: btn.dataset.mode, setup: "1" } : {};
      navigate(btn.dataset.go, params);
    });
  });
}

async function boot() {
  try {
    // 배포본은 terms.json을 인라인해 window.TERMS로 넘긴다 (file:// 에서도 열리도록)
    TERMS = globalThis.TERMS_INLINE || await (await fetch("data/terms.json")).json();
  } catch {
    document.getElementById("view").innerHTML =
      `<p>용어 데이터를 불러오지 못했습니다.</p>
       <p class="sub">로컬 파일로 열었다면 <code>python -m http.server</code>로 띄워 주세요.</p>`;
    return;
  }

  registerView("home", renderHome);
  const modules = await Promise.all([
    import("./list.js").catch(() => null),
    import("./session.js").catch(() => null),
    import("./quiz-ui.js").catch(() => null),
    import("./stats.js").catch(() => null),
  ]);
  for (const m of modules) m?.init?.();

  window.addEventListener("hashchange", render);
  document.getElementById("back").addEventListener("click", () => navigate("home"));
  render();

  if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
    navigator.serviceWorker.register("sw.js").catch(() => { /* 무시 */ });
  }
}

boot();
