// 학습 기록 저장소. localStorage 접근은 전부 여기를 거친다.

const KEYS = {
  progress: "econ.progress",
  session: "econ.session",
  prefs: "econ.prefs",
};

const EMPTY = { status: null, starred: false, seen: 0, wrong: 0, at: 0 };

function memoryBackend() {
  const map = new Map();
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: (k) => map.delete(k),
  };
}

function pickBackend(given) {
  if (given) return given;
  try {
    const probe = "__econ_probe__";
    globalThis.localStorage.setItem(probe, "1");
    globalThis.localStorage.removeItem(probe);
    return globalThis.localStorage;
  } catch {
    return memoryBackend();   // 사생활 보호 모드 등에서 접근이 막힌다
  }
}

export function createStore(backend) {
  const store = pickBackend(backend);

  const read = (key, fallback) => {
    try {
      const raw = store.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  };

  const write = (key, value) => {
    try {
      store.setItem(key, JSON.stringify(value));
      return true;
    } catch {
      return false;   // 저장에 실패해도 앱은 계속 간다
    }
  };

  const mutate = (id, fn) => {
    const all = read(KEYS.progress, {});
    const entry = { ...EMPTY, ...(all[id] || {}) };
    fn(entry);
    entry.at = Date.now();
    all[id] = entry;
    write(KEYS.progress, all);
    return entry;
  };

  return {
    getProgress(id) {
      return { ...EMPTY, ...(read(KEYS.progress, {})[id] || {}) };
    },
    getAllProgress() {
      return read(KEYS.progress, {});
    },
    setStatus(id, status) {
      return mutate(id, (e) => { e.status = status; });
    },
    toggleStar(id) {
      return mutate(id, (e) => { e.starred = !e.starred; }).starred;
    },
    recordQuiz(id, correct) {
      // status는 건드리지 않는다 — 외움/안외움은 사용자가 정한다
      return mutate(id, (e) => {
        e.seen += 1;
        if (!correct) e.wrong += 1;
      });
    },

    getSession() {
      return read(KEYS.session, null);
    },
    setSession(session) {
      write(KEYS.session, session);
    },
    clearSession() {
      try { store.removeItem(KEYS.session); } catch { /* 무시 */ }
    },

    getPrefs() {
      return read(KEYS.prefs, {});
    },
    setPrefs(prefs) {
      write(KEYS.prefs, prefs);
    },

    exportAll() {
      return JSON.stringify({
        version: 1,
        exportedAt: new Date().toISOString(),
        progress: read(KEYS.progress, {}),
        prefs: read(KEYS.prefs, {}),
      }, null, 1);
    },
    importAll(json) {
      let data;
      try {
        data = JSON.parse(json);
      } catch {
        return false;
      }
      if (!data || typeof data.progress !== "object" || data.progress === null) {
        return false;
      }
      write(KEYS.progress, data.progress);
      if (data.prefs) write(KEYS.prefs, data.prefs);
      return true;
    },
    clearAll() {
      for (const k of Object.values(KEYS)) {
        try { store.removeItem(k); } catch { /* 무시 */ }
      }
    },
  };
}

export const store = createStore();
