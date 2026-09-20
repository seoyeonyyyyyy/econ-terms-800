// 용어 상세에 붙는 설명용 그래프.
// 축과 곡선에 반드시 이름을 단다. 이름 없는 장식용 그림은 그리지 않는다.
// 색은 CSS 변수를 쓴다 — 다크모드에서도 읽혀야 한다.

const W = 300, H = 200, P = 34;   // 그리는 영역과 여백

function frame(inner, xLabel, yLabel) {
  return `<svg viewBox="0 0 ${W} ${H}" role="img" class="graph-svg">
    <defs><marker id="arrowhead" viewBox="0 0 8 8" refX="7" refY="4"
      markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M0 1 L7 4 L0 7 z" class="g-arrowhead"/></marker></defs>
    <line x1="${P}" y1="${H - P}" x2="${W - 8}" y2="${H - P}" class="g-axis"/>
    <line x1="${P}" y1="12" x2="${P}" y2="${H - P}" class="g-axis"/>
    <text x="${W - 8}" y="${H - P + 16}" text-anchor="end" class="g-label">${xLabel}</text>
    <text x="${P - 6}" y="14" text-anchor="end" class="g-label">${yLabel}</text>
    ${inner}
  </svg>`;
}

/** 상자와 화살표로 흐름을 그린다. 단계마다 이름을 단다. */
function flow(rows, caption) {
  const boxW = 74, boxH = 28, gapX = 22, gapY = 34;
  const startX = 22, startY = 30;
  let inner = "";
  rows.forEach((row, r) => {
    row.forEach((label, c) => {
      if (!label) return;
      const x = startX + c * (boxW + gapX);
      const y = startY + r * (boxH + gapY);
      inner += `<rect x="${x}" y="${y}" width="${boxW}" height="${boxH}" rx="4" class="g-box"/>`;
      inner += `<text x="${x + boxW / 2}" y="${y + 18}" text-anchor="middle" class="g-note">${label}</text>`;
      if (c > 0 && row[c - 1]) {
        inner += `<path d="M${x - gapX + 2} ${y + boxH / 2} L ${x - 3} ${y + boxH / 2}" class="g-arrow"/>`;
      }
    });
  });
  inner += `<text x="150" y="${H - 8}" text-anchor="middle" class="g-label">${caption}</text>`;
  return `<svg viewBox="0 0 ${W} ${H}" role="img" class="graph-svg"><defs><marker id="arrowhead" viewBox="0 0 8 8" refX="7" refY="4"
      markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M0 1 L7 4 L0 7 z" class="g-arrowhead"/></marker></defs>${inner}</svg>`;
}

const DRAW = {
  // 소득 불평등: 45도선에서 멀수록 불평등하다
  lorenz: () => frame(`
    <line x1="${P}" y1="${H - P}" x2="${W - 8}" y2="12" class="g-guide"/>
    <path d="M${P} ${H - P} Q 190 165 ${W - 8} 12" class="g-line"/>
    <text x="150" y="150" class="g-note">실제 분배</text>
    <text x="196" y="60" class="g-note">완전평등선</text>
  `, "인구 누적비율", "소득 누적비율"),

  // 세율을 올릴수록 세수가 늘다가 어느 점을 넘으면 줄어든다
  laffer: () => frame(`
    <path d="M${P} ${H - P} Q 160 6 ${W - 8} ${H - P}" class="g-line"/>
    <line x1="160" y1="44" x2="160" y2="${H - P}" class="g-guide"/>
    <text x="164" y="40" class="g-note">세수가 가장 큰 세율</text>
  `, "세율", "조세수입"),

  // 물가와 실업의 맞바꿈
  phillips: () => frame(`
    <path d="M${P + 8} 20 Q 90 150 ${W - 12} ${H - P - 6}" class="g-line"/>
    <text x="150" y="80" class="g-note">단기 필립스곡선</text>
  `, "실업률", "물가상승률"),

  // 만기가 길수록 금리가 높은 것이 보통(우상향)
  yieldcurve: () => frame(`
    <path d="M${P} ${H - P - 10} Q 130 60 ${W - 8} 38" class="g-line"/>
    <path d="M${P} 60 Q 130 96 ${W - 8} 120" class="g-line g-dash"/>
    <text x="150" y="52" class="g-note">정상(우상향)</text>
    <text x="150" y="136" class="g-note">역전(경기침체 신호)</text>
  `, "만기", "금리"),

  // 빈 일자리와 실업의 관계
  beveridge: () => frame(`
    <path d="M${P + 10} 24 Q 100 140 ${W - 12} ${H - P - 8}" class="g-line"/>
    <text x="140" y="72" class="g-note">노동시장이 나빠지면 →</text>
  `, "실업률", "빈일자리율"),

  // 환율이 올라도 처음엔 수지가 나빠졌다가 뒤에 좋아진다
  jcurve: () => frame(`
    <line x1="${P}" y1="120" x2="${W - 8}" y2="120" class="g-guide"/>
    <path d="M${P} 108 C 70 160 96 168 130 150 S 220 40 ${W - 8} 24" class="g-line"/>
    <text x="64" y="182" class="g-note">처음엔 악화</text>
    <text x="196" y="44" class="g-note">뒤이어 개선</text>
  `, "시간", "경상수지"),

  // 호황 → 후퇴 → 불황 → 회복이 되풀이된다
  cycle: () => frame(`
    <line x1="${P}" y1="100" x2="${W - 8}" y2="100" class="g-guide"/>
    <path d="M${P} 100 Q 70 40 108 100 T 186 100 T 264 100" class="g-line"/>
    <text x="64" y="36" class="g-note">호황</text>
    <text x="132" y="152" class="g-note">불황</text>
    <text x="${W - 8}" y="114" text-anchor="end" class="g-note">추세선</text>
  `, "시간", "경제활동"),

  // 값이 조금 변할 때 수요가 크게 변하면 탄력적
  elasticity: () => frame(`
    <path d="M${P + 6} 24 L ${W - 12} ${H - P - 6}" class="g-line"/>
    <path d="M${P + 6} ${H - P - 20} L 132 24" class="g-line g-dash"/>
    <text x="150" y="60" class="g-note">탄력적(완만)</text>
    <text x="52" y="${H - P - 26}" class="g-note">비탄력적(가파름)</text>
  `, "수요량", "가격"),

  // 많이 만들수록 개당 비용이 줄어든다
  scale: () => frame(`
    <path d="M${P + 6} 28 Q 110 150 ${W - 12} 142" class="g-line"/>
    <text x="150" y="112" class="g-note">평균비용</text>
  `, "생산량", "단위당 비용"),

  // 실제와 잠재의 차이
  gdpgap: () => frame(`
    <line x1="${P}" y1="${H - P}" x2="${W - 8}" y2="30" class="g-guide"/>
    <path d="M${P} ${H - P - 4} Q 100 86 160 104 T ${W - 8} 40" class="g-line"/>
    <text x="196" y="66" class="g-note">잠재GDP</text>
    <text x="96" y="128" class="g-note">실제GDP</text>
  `, "시간", "GDP"),

  // ── 흐름과 구조를 보여주는 도해 ──────────────────────────────

  // 금리를 내리면 어떤 길을 거쳐 물가에 닿는가
  transmission: () => flow([
    ["기준금리", "시장금리", "투자·소비"],
    ["", "자산가격", "총수요"],
    ["", "환율", "물가"],
  ], "통화정책이 실물로 퍼지는 길"),

  // 예금이 대출을 낳고 대출이 다시 예금이 된다
  creation: () => frame(`
    <rect x="46" y="28" width="66" height="26" rx="4" class="g-box"/>
    <text x="79" y="45" text-anchor="middle" class="g-note">예금 100</text>
    <rect x="46" y="86" width="66" height="26" rx="4" class="g-box"/>
    <text x="79" y="103" text-anchor="middle" class="g-note">대출 90</text>
    <rect x="152" y="86" width="66" height="26" rx="4" class="g-box"/>
    <text x="185" y="103" text-anchor="middle" class="g-note">예금 90</text>
    <rect x="152" y="140" width="66" height="26" rx="4" class="g-box"/>
    <text x="185" y="157" text-anchor="middle" class="g-note">대출 81</text>
    <path d="M79 54 L79 84" class="g-arrow"/>
    <path d="M112 99 L150 99" class="g-arrow"/>
    <path d="M185 112 L185 138" class="g-arrow"/>
    <text x="240" y="103" class="g-note">…되풀이</text>
    <text x="150" y="190" text-anchor="middle" class="g-label">지급준비금만 남기고 다시 빌려준다</text>
  `, "", ""),

  // 경상수지와 금융계정
  bop: () => frame(`
    <rect x="30" y="26" width="240" height="30" rx="4" class="g-box"/>
    <text x="150" y="45" text-anchor="middle" class="g-note">국제수지</text>
    <rect x="30" y="78" width="112" height="28" rx="4" class="g-box"/>
    <text x="86" y="96" text-anchor="middle" class="g-note">경상수지</text>
    <rect x="158" y="78" width="112" height="28" rx="4" class="g-box"/>
    <text x="214" y="96" text-anchor="middle" class="g-note">금융계정</text>
    <path d="M86 56 L86 76" class="g-arrow"/>
    <path d="M214 56 L214 76" class="g-arrow"/>
    <text x="86" y="126" text-anchor="middle" class="g-note">상품·서비스</text>
    <text x="86" y="142" text-anchor="middle" class="g-note">본원소득·이전소득</text>
    <text x="214" y="126" text-anchor="middle" class="g-note">직접투자·증권투자</text>
    <text x="214" y="142" text-anchor="middle" class="g-note">준비자산</text>
  `, "", ""),

  // 지급 → 청산 → 결제
  settlement: () => flow([
    ["지급", "청산", "결제"],
  ], "돈을 건네고, 주고받을 액을 따지고, 실제로 옮긴다"),

  // 수요가 밀어 올리는 물가
  demandpull: () => frame(`
    <path d="M${P + 6} ${H - P - 6} L ${W - 12} 30" class="g-line"/>
    <path d="M${P + 6} 34 L ${W - 12} ${H - P - 10}" class="g-line g-dash"/>
    <path d="M${P + 40} 24 L ${W - 12} ${H - P - 40}" class="g-line"/>
    <text x="196" y="44" class="g-note">수요 증가 →</text>
    <text x="52" y="46" class="g-note">공급</text>
  `, "생산량", "물가"),

  // 비용이 밀어 올리는 물가
  costpush: () => frame(`
    <path d="M${P + 6} ${H - P - 6} L ${W - 12} 30" class="g-line g-dash"/>
    <path d="M${P + 6} 34 L ${W - 12} ${H - P - 10}" class="g-line"/>
    <path d="M${P + 6} 20 L 190 ${H - P - 10}" class="g-line"/>
    <text x="54" y="30" class="g-note">↑ 공급 감소</text>
    <text x="210" y="48" class="g-note">수요</text>
  `, "생산량", "물가"),

  // 예금금리와 대출금리의 차이가 은행의 몫
  spread: () => frame(`
    <rect x="60" y="40" width="46" height="112" rx="4" class="g-box"/>
    <text x="83" y="34" text-anchor="middle" class="g-note">대출금리</text>
    <rect x="170" y="100" width="46" height="52" rx="4" class="g-box"/>
    <text x="193" y="94" text-anchor="middle" class="g-note">예금금리</text>
    <path d="M118 44 L158 44" class="g-guide"/>
    <path d="M118 96 L158 96" class="g-guide"/>
    <text x="138" y="76" text-anchor="middle" class="g-note">예대마진</text>
    <path d="M138 50 L138 90" class="g-arrow"/>
  `, "", "금리"),

  // 기회비용
  opportunity: () => frame(`
    <rect x="44" y="60" width="86" height="34" rx="4" class="g-box"/>
    <text x="87" y="82" text-anchor="middle" class="g-note">고른 것</text>
    <rect x="172" y="60" width="86" height="34" rx="4" class="g-box"/>
    <text x="215" y="82" text-anchor="middle" class="g-note">포기한 것</text>
    <path d="M130 77 L170 77" class="g-arrow"/>
    <text x="150" y="130" text-anchor="middle" class="g-label">포기한 것의 가치가 기회비용</text>
  `, "", ""),

  // 자산유동화 흐름
  abs: () => flow([
    ["자산보유자", "특수목적기구", "투자자"],
  ], "자산을 넘기고 그것을 담보로 증권을 발행한다"),

  // 만기가 길수록 금리 민감도가 크다
  duration: () => frame(`
    <path d="M${P} 60 L ${W - 8} 130" class="g-line"/>
    <text x="150" y="80" class="g-note">듀레이션이 길수록</text>
    <text x="150" y="96" class="g-note">금리에 민감</text>
  `, "듀레이션", "가격 변동폭"),
};

export function renderGraph(key) {
  const draw = DRAW[key];
  return draw ? draw() : "";
}

export const GRAPH_KEYS = Object.keys(DRAW);
