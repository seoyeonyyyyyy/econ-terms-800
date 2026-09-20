import { registerView, getTerms, getTerm, navigate, esc } from "./app.js";
import { store } from "./store.js";
import { renderGraph } from "./graphs.js";

const SIZE = 20;

function pickIds() {
  const progress = store.getAllProgress();
  const fresh = [], weak = [];
  for (const t of getTerms()) {
    const s = progress[t.id]?.status;
    if (!s) fresh.push(t.id);
    else if (s === "unknown") weak.push(t.id);
  }
  return [...fresh, ...weak].slice(0, SIZE);
}

function renderSession(container) {
  let session = store.getSession();
  if (!session || session.cursor >= session.ids.length) {
    const ids = pickIds();
    if (ids.length === 0) {
      container.innerHTML = `<p>외울 용어가 남아 있지 않습니다. 훌륭합니다.</p>
        <div class="home-actions"><button id="home">홈으로</button></div>`;
      container.querySelector("#home").addEventListener("click", () => navigate("home"));
      return;
    }
    session = { ids, cursor: 0, startedAt: Date.now() };
    store.setSession(session);
  }
  drawCard(container, session);
}

function drawCard(container, session) {
  const id = session.ids[session.cursor];
  const t = getTerm(id);
  if (!t) {   // 데이터가 갱신되어 사라진 용어는 건너뛴다
    advance(container, session, null);
    return;
  }

  const starred = store.getProgress(id).starred;
  // 상세 화면과 같은 재료를 쓴다 — 카드에서도 영문명·계산식·그래프·cf.를 본다
  const cfItems = t.related
    .map((r) => getTerm(r))
    .filter(Boolean)
    .map((r) => `<li><button data-rel="${esc(r.id)}">${esc(r.term)}</button>${
      r.summary ? ` — <span>${esc(r.summary)}</span>` : ""}</li>`)
    .join("");

  container.innerHTML = `
    <p class="sub">오늘의 학습 ${session.cursor + 1} / ${session.ids.length}</p>
    <div class="card">
      <button id="card-star" class="card-star" aria-pressed="${starred}"
              aria-label="중요 표시">${starred ? "★" : "☆"}</button>
      <h2 class="term-head card-term">${esc(t.term)}${
        t.alt ? `<span class="term-alt">${esc(t.alt)}</span>` : ""}</h2>
      <div id="meaning" hidden>
        ${t.summary ? `<p class="summary">${esc(t.summary)}</p>` : ""}
        <p class="def">${esc(t.def)}</p>
        ${t.formulas?.length ? `<div class="formulas">
          <h3>계산식</h3>
          ${t.formulas.map((f) => `<p class="formula">${esc(f)}</p>`).join("")}
        </div>` : ""}
        ${t.graph ? `<figure class="graph">${renderGraph(t.graph)}</figure>` : ""}
        ${cfItems ? `<ul class="cf-list">${cfItems}</ul>` : ""}
      </div>
      <button id="reveal">뜻 보기</button>
    </div>
    <div class="card-actions" hidden id="actions">
      <button id="no">모르겠음</button>
      <button id="yes">외웠음</button>
    </div>
  `;

  container.querySelector("#reveal").addEventListener("click", (e) => {
    container.querySelector("#meaning").hidden = false;
    container.querySelector("#actions").hidden = false;
    e.target.hidden = true;
  });

  const starBtn = container.querySelector("#card-star");
  starBtn.addEventListener("click", () => {
    const on = store.toggleStar(id);
    starBtn.setAttribute("aria-pressed", String(on));
    starBtn.textContent = on ? "★" : "☆";
  });

  container.querySelectorAll("[data-rel]").forEach((b) =>
    b.addEventListener("click", () => navigate("term", { id: b.dataset.rel })));

  container.querySelector("#no").addEventListener("click", () => advance(container, session, "unknown"));
  container.querySelector("#yes").addEventListener("click", () => advance(container, session, "known"));
}

function advance(container, session, status) {
  const id = session.ids[session.cursor];
  if (status) store.setStatus(id, status);

  const next = { ...session, cursor: session.cursor + 1 };
  store.setSession(next);

  if (next.cursor >= next.ids.length) {
    store.clearSession();
    navigate("quiz", { mode: "review", ids: next.ids.join(",") });
  } else {
    drawCard(container, next);
  }
}

export function init() {
  registerView("session", renderSession);
}
