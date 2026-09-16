// 용어 필터링. 순수 함수이며 DOM을 모른다.

export function filterTerms(terms, progress, criteria = {}) {
  const { q, category, subcategory, status, starred, chosung } = criteria;
  const needle = (q || "").trim().toLowerCase();

  return terms.filter((t) => {
    const p = progress[t.id] || {};

    if (category && t.category !== category) return false;
    if (subcategory && t.subcategory !== subcategory) return false;

    if (status === "known" && p.status !== "known") return false;
    if (status === "unknown" && p.status !== "unknown") return false;
    if (status === "none" && p.status) return false;

    if (starred && !p.starred) return false;

    if (chosung && !t.chosung.startsWith(chosung)) return false;

    if (needle) {
      // aliases 덕분에 "단리/복리" 카드가 "복리" 검색에도 걸린다
      const hay = [t.term, t.chosung, t.alt || "", ...(t.aliases || []), t.def]
        .join(" ").toLowerCase();
      if (!hay.includes(needle)) return false;
    }
    return true;
  });
}
