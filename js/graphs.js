// 용어 상세에 붙는 설명용 그래프.
// 축과 곡선에 반드시 이름을 단다. 이름 없는 장식용 그림은 그리지 않는다.
// 색은 CSS 변수를 쓴다 — 다크모드에서도 읽혀야 한다.

const W = 300, H = 200, P = 34;   // 그리는 영역과 여백

function frame(inner, xLabel, yLabel) {
  return `<svg viewBox="0 0 ${W} ${H}" role="img" class="graph-svg">
    <line x1="${P}" y1="${H - P}" x2="${W - 8}" y2="${H - P}" class="g-axis"/>
    <line x1="${P}" y1="12" x2="${P}" y2="${H - P}" class="g-axis"/>
    <text x="${W - 8}" y="${H - P + 16}" text-anchor="end" class="g-label">${xLabel}</text>
    <text x="${P - 6}" y="14" text-anchor="end" class="g-label">${yLabel}</text>
    ${inner}
  </svg>`;
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
};

export function renderGraph(key) {
  const draw = DRAW[key];
  return draw ? draw() : "";
}

export const GRAPH_KEYS = Object.keys(DRAW);
