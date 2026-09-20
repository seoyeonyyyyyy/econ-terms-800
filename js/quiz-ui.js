import { registerView, getTerms, getTerm, navigate, esc } from "./app.js";
import { store } from "./store.js";
import { makeOX, makeChoice, makeOddOne } from "./quiz.js";
import { CATEGORIES } from "./list.js";

function buildQuestions(mode, params) {
  const all = getTerms();

  if (mode === "review") {
    const ids = (params.ids || "").split(",").filter(Boolean);
    const subset = ids.map(getTerm).filter(Boolean);
    return [
      ...subset.slice(0, 10).map((t) => makeOX(t, all)).filter(Boolean),
      ...subset.slice(10).map((t) => makeChoice(t, all)).filter(Boolean),
    ];
  }

  const progress = store.getAllProgress();
  let pool = all;
  if (params.scope === "unknown") pool = all.filter((t) => progress[t.id]?.status !== "known");
  if (params.scope === "starred") pool = all.filter((t) => progress[t.id]?.starred);
  if (params.category) pool = pool.filter((t) => t.category === params.category);

  const count = params.count === "inf" ? Infinity : Number(params.count || 10);
  const make = mode === "ox" ? makeOX
             : mode === "odd" ? ((t) => makeOddOne(t))
             : makeChoice;
  const shuffled = [...pool].sort(() => Math.random() - 0.5);

  const out = [];
  for (const t of shuffled) {
    if (out.length >= count) break;
    const q = make(t, all);
    if (q) out.push(q);
  }
  return out;
}

function renderSetup(container, params) {
  const mode = params.mode || "ox";
  const title = mode === "ox" ? "OX 퀴즈"
              : mode === "odd" ? "옳지 않은 것 고르기"
              : "용어 맞히기";

  container.innerHTML = `
    <h2>${title}</h2>
    <div id="chips"></div>
    <div class="quiz-setup"><button class="primary home-start" id="start">시작하기</button></div>
  `;

  const picked = { scope: "all", count: "10", category: "" };
  const chips = container.querySelector("#chips");

  const row = (label, key, pairs) => {
    const div = document.createElement("div");
    div.className = "chip-row";
    div.innerHTML = `<span class="chip-label">${label}</span>` +
      pairs.map(([text, v]) =>
        `<button class="chip" aria-pressed="${picked[key] === v}" data-v="${esc(v)}">${esc(text)}</button>`
      ).join("");
    div.addEventListener("click", (e) => {
      const btn = e.target.closest(".chip");
      if (!btn) return;
      picked[key] = btn.dataset.v;
      div.querySelectorAll(".chip").forEach((c) =>
        c.setAttribute("aria-pressed", String(c.dataset.v === picked[key])));
    });
    chips.appendChild(div);
  };

  row("범위", "scope", [["전체", "all"], ["안외운 것만", "unknown"], ["중요만", "starred"]]);
  row("분야", "category", [["전부", ""], ...Object.keys(CATEGORIES).map((c) => [c, c])]);
  row("문항", "count", [["10", "10"], ["20", "20"], ["무한", "inf"]]);

  container.querySelector("#start").addEventListener("click", () => {
    navigate("quiz", { mode, ...picked });
  });

  const btn = container.querySelector("#start");
  btn.style.cssText = "background:var(--accent);color:#fff;border:1px solid var(--accent);padding:14px;border-radius:8px;cursor:pointer";
}

function renderQuiz(container, params) {
  const mode = params.mode || "ox";
  if (params.setup === "1") { renderSetup(container, params); return; }

  const questions = buildQuestions(mode, params);

  if (!questions.length) {
    container.innerHTML = `<p>출제할 문항이 없습니다.</p>
      <div class="home-actions"><button id="home">홈으로</button></div>`;
    container.querySelector("#home").addEventListener("click", () => navigate("home"));
    return;
  }

  let index = 0, correct = 0;
  const wrongIds = [];

  const draw = () => {
    const q = questions[index];
    const isOX = typeof q.answer === "boolean";

    container.innerHTML = `
      <p class="sub">${index + 1} / ${questions.length}</p>
      <div class="card"><p class="q">${esc(isOX ? q.statement : q.question)}</p></div>
      <div class="options${mode === "odd" ? " options-long" : ""}">
        ${isOX
          ? `<button data-v="true">O</button><button data-v="false">X</button>`
          : q.options.map((o) => `<button data-v="${esc(o)}">${esc(o)}</button>`).join("")}
      </div>
      <div id="feedback" hidden></div>
    `;

    container.querySelectorAll(".options button").forEach((btn) =>
      btn.addEventListener("click", () => answer(btn.dataset.v, q, isOX)));
  };

  const answer = (given, q, isOX) => {
    const right = isOX ? String(q.answer) === given : q.answer === given;
    if (right) correct++;
    else wrongIds.push(q.termId);
    store.recordQuiz(q.termId, right);

    const term = getTerm(q.termId);
    const wasKnown = store.getProgress(q.termId).status === "known";
    const fb = container.querySelector("#feedback");
    fb.hidden = false;
    fb.className = right ? "ok" : "no";
    fb.innerHTML = `
      <p><strong>${right ? "정답" : "오답"}</strong> — ${esc(q.explain || `정답은 '${q.answer}'입니다.`)}</p>
      <p class="sub">${esc(term.term)} · ${esc(term.subcategory)}</p>
      ${!right && wasKnown ? `<button id="demote">안외움으로 되돌리기</button>` : ""}
      <button id="see">이 용어 보기</button>
      <button id="next">${index + 1 < questions.length ? "다음" : "결과 보기"}</button>
    `;
    container.querySelectorAll(".options button").forEach((b) => (b.disabled = true));

    fb.querySelector("#demote")?.addEventListener("click", (e) => {
      store.setStatus(q.termId, "unknown");
      e.target.disabled = true;
      e.target.textContent = "되돌렸습니다";
    });
    fb.querySelector("#see").addEventListener("click", () => navigate("term", { id: q.termId }));
    fb.querySelector("#next").addEventListener("click", () => {
      index++;
      if (index < questions.length) draw();
      else finish();
    });
  };

  const finish = () => {
    container.innerHTML = `
      <h2>${questions.length}문항 중 ${correct}개 정답</h2>
      <p class="sub">${Math.round((correct / questions.length) * 100)}%</p>
      ${wrongIds.length ? `<h2>틀린 용어</h2><ul class="wrong-list">${
        [...new Set(wrongIds)].map((id) => {
          const t = getTerm(id);
          return t ? `<li><button data-id="${esc(id)}">${esc(t.term)}</button></li>` : "";
        }).join("")
      }</ul>` : "<p>전부 맞혔습니다.</p>"}
      <div class="home-actions">
        <button id="again">다시 풀기</button>
        <button id="home">홈으로</button>
      </div>
    `;
    container.querySelectorAll("[data-id]").forEach((b) =>
      b.addEventListener("click", () => navigate("term", { id: b.dataset.id })));
    container.querySelector("#again").addEventListener("click", () => renderQuiz(container, params));
    container.querySelector("#home").addEventListener("click", () => navigate("home"));
  };

  draw();
}

export function init() {
  registerView("quiz", renderQuiz);
}
