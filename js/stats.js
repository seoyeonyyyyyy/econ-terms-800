import { registerView, getTerms, getTerm, navigate, esc } from "./app.js";
import { store } from "./store.js";

function renderStats(container) {
  const terms = getTerms();
  const progress = store.getAllProgress();

  const bySub = {};
  for (const t of terms) {
    const key = `${t.category} · ${t.subcategory}`;
    bySub[key] ??= { total: 0, known: 0 };
    bySub[key].total += 1;
    if (progress[t.id]?.status === "known") bySub[key].known += 1;
  }

  let seen = 0, wrong = 0;
  for (const p of Object.values(progress)) {
    seen += p.seen || 0;
    wrong += p.wrong || 0;
  }
  const rate = seen ? Math.round(((seen - wrong) / seen) * 100) : 0;

  const worst = Object.entries(progress)
    .filter(([, p]) => p.wrong > 0)
    .sort((a, b) => b[1].wrong - a[1].wrong)
    .slice(0, 20);

  container.innerHTML = `
    <h2>진도</h2>
    ${Object.entries(bySub).map(([name, v]) => `
      <p class="stat-row"><span>${esc(name)}</span><span>${v.known}/${v.total}</span></p>
      <div class="progress-bar"><div class="progress-fill"
           style="width:${Math.round((v.known / v.total) * 100)}%"></div></div>
    `).join("")}

    <h2>퀴즈</h2>
    <p>누적 ${seen}문항 · 정답률 ${rate}%</p>

    <h2>자주 틀린 용어</h2>
    ${worst.length
      ? `<ul class="wrong-list">${worst.map(([id, p]) => {
          const t = getTerm(id);
          return t ? `<li><button data-id="${esc(id)}">${esc(t.term)}</button> ${p.wrong}회</li>` : "";
        }).join("")}</ul>`
      : "<p>아직 없습니다.</p>"}

    <h2>백업</h2>
    <p class="sub">기록은 이 브라우저에만 저장됩니다. 브라우저 데이터를 지우면 사라지니
       가끔 아래 내용을 복사해 보관하세요.</p>
    <textarea id="dump" rows="5" spellcheck="false"></textarea>
    <div class="backup-actions">
      <button id="copy">복사</button>
      <button id="load">붙여넣은 내용 불러오기</button>
      <button id="reset">전체 초기화</button>
    </div>
    <p id="backup-msg" class="sub"></p>
  `;

  const dump = container.querySelector("#dump");
  dump.value = store.exportAll();
  const msg = container.querySelector("#backup-msg");

  container.querySelectorAll("[data-id]").forEach((b) =>
    b.addEventListener("click", () => navigate("term", { id: b.dataset.id })));

  container.querySelector("#copy").addEventListener("click", async () => {
    dump.select();
    try {
      await navigator.clipboard.writeText(dump.value);
      msg.textContent = "복사했습니다.";
    } catch {
      msg.textContent = "Ctrl+C로 복사하세요.";
    }
  });

  container.querySelector("#load").addEventListener("click", () => {
    if (!confirm("지금 기록을 덮어씁니다. 계속할까요?")) return;
    if (store.importAll(dump.value)) {
      renderStats(container);
      container.querySelector("#backup-msg").textContent = "불러왔습니다.";
    } else {
      msg.textContent = "형식이 올바르지 않습니다. 백업 JSON 전체를 붙여넣으세요.";
    }
  });

  container.querySelector("#reset").addEventListener("click", () => {
    if (!confirm("모든 학습 기록을 지웁니다. 되돌릴 수 없습니다. 계속할까요?")) return;
    store.clearAll();
    renderStats(container);
    container.querySelector("#backup-msg").textContent = "초기화했습니다.";
  });
}

export function init() {
  registerView("stats", renderStats);
}
