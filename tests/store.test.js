import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { createStore } from "../js/store.js";

function fakeBackend() {
  const map = new Map();
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: (k) => map.delete(k),
  };
}

describe("store", () => {
  test("처음 조회하면 빈 진행 상태를 준다", () => {
    const s = createStore(fakeBackend());
    assert.deepEqual(s.getProgress("기준금리"), {
      status: null, starred: false, seen: 0, wrong: 0, at: 0,
    });
  });

  test("상태를 저장하고 다시 읽는다", () => {
    const b = fakeBackend();
    createStore(b).setStatus("기준금리", "known");
    assert.equal(createStore(b).getProgress("기준금리").status, "known");
  });

  test("중요 표시를 토글한다", () => {
    const s = createStore(fakeBackend());
    assert.equal(s.toggleStar("기준금리"), true);
    assert.equal(s.toggleStar("기준금리"), false);
  });

  test("퀴즈 오답은 wrong을 올리되 status를 바꾸지 않는다", () => {
    const s = createStore(fakeBackend());
    s.setStatus("기준금리", "known");
    s.recordQuiz("기준금리", false);
    const p = s.getProgress("기준금리");
    assert.equal(p.wrong, 1);
    assert.equal(p.seen, 1);
    assert.equal(p.status, "known", "status는 사용자만 바꾼다");
  });

  test("저장소가 던져도 앱은 계속 동작한다", () => {
    const broken = {
      getItem() { throw new Error("blocked"); },
      setItem() { throw new Error("blocked"); },
      removeItem() { throw new Error("blocked"); },
    };
    const s = createStore(broken);
    assert.doesNotThrow(() => s.setStatus("기준금리", "known"));
    assert.equal(s.getProgress("기준금리").status, null);
  });

  test("내보내고 불러오면 기록이 복원된다", () => {
    const a = createStore(fakeBackend());
    a.setStatus("기준금리", "known");
    a.toggleStar("가계수지");
    const dump = a.exportAll();

    const b = createStore(fakeBackend());
    assert.equal(b.importAll(dump), true);
    assert.equal(b.getProgress("기준금리").status, "known");
    assert.equal(b.getProgress("가계수지").starred, true);
  });

  test("깨진 JSON을 불러오면 false를 주고 기존 기록을 지키지 않는다", () => {
    const s = createStore(fakeBackend());
    s.setStatus("기준금리", "known");
    assert.equal(s.importAll("{{{"), false);
    assert.equal(s.getProgress("기준금리").status, "known");
  });

  test("세션을 저장하고 지운다", () => {
    const s = createStore(fakeBackend());
    s.setSession({ ids: ["기준금리"], cursor: 0, startedAt: 1 });
    assert.equal(s.getSession().cursor, 0);
    s.clearSession();
    assert.equal(s.getSession(), null);
  });

  test("전체 초기화", () => {
    const s = createStore(fakeBackend());
    s.setStatus("기준금리", "known");
    s.clearAll();
    assert.equal(s.getProgress("기준금리").status, null);
  });
});
