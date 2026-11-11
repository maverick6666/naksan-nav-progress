// NAKSAN.NAV 작업 현황 — data/tracker.json 하나를 읽어 화면을 그린다.
"use strict";

const STATUS = { doing: "진행 중", waiting: "결정 필요", todo: "할 일", done: "완료" };
const PRIORITY = { 1: "먼저", 2: "다음", 3: "나중" };
const FEATURE = { done: "완료", partial: "일부", todo: "아직" };
const EVENT = { request: "요청", start: "시작", done: "완료", wait: "결정 필요", note: "메모" };
const WD = ["일", "월", "화", "수", "목", "금", "토"];

const esc = (v) =>
  String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

// 날짜는 모두 한국 시간 기준 "YYYY-MM-DD"(또는 뒤에 시각이 붙은) 문자열로 다룬다.
const ymd = (s) => s.slice(0, 10).split("-").map(Number);
const utc = (s) => {
  const [y, m, d] = ymd(s);
  return Date.UTC(y, m - 1, d);
};
const daysBetween = (a, b) => Math.round((utc(b) - utc(a)) / 864e5);
const addDays = (s, n) => new Date(utc(s) + n * 864e5).toISOString().slice(0, 10);
const todayKST = () => new Date(Date.now() + 9 * 36e5).toISOString().slice(0, 10);
const md = (s) => {
  const [, m, d] = ymd(s);
  return `${m}/${d}`;
};
const longDate = (s) => {
  const [, m, d] = ymd(s);
  return `${m}월 ${d}일 (${WD[new Date(utc(s)).getUTCDay()]})`;
};
const hm = (at) => (at.length > 10 ? at.slice(11, 16) : "");
const dday = (today, d) => {
  const n = daysBetween(today, d);
  return n < 0 ? "지남" : n === 0 ? "오늘" : n === 1 ? "내일" : `D-${n}`;
};

let DATA = null;
let TODAY = "";
let ownerFilter = "all";

const byId = (id) => DATA.items.find((i) => i.id === id);
const ownerName = (o) => DATA.owners[o] ?? o;
const areaName = (a) => DATA.areas[a] ?? a;
// 요약 줄에는 담당만. 영역은 펼쳤을 때 보인다.
const tags = (it) => `<span class="tg">${esc(ownerName(it.owner))}</span>`;
const prio = (it) => (it.priority && it.status !== "done" ? `<span class="pr pr--${it.priority}">${PRIORITY[it.priority] ?? ""}</span>` : "");
const due = (it) => (it.due && it.status !== "done" ? `<span class="due">${md(it.due)} 마감 · ${dday(TODAY, it.due)}</span>` : "");
const chev = `<svg class="chev" viewBox="0 0 12 12" aria-hidden="true"><path d="M3 4.5l3 3 3-3"/></svg>`;
// 우선순위 → 마감이 가까운 순 → 직접 정한 순서(rank) → 번호
const byPriority = (a, b) =>
  (a.priority ?? 9) - (b.priority ?? 9) ||
  (a.due ?? "9999").localeCompare(b.due ?? "9999") ||
  (a.rank ?? 99) - (b.rank ?? 99) ||
  a.id.localeCompare(b.id);

/* ───────── 눌러서 펼치는 상세 ───────── */
function stepsList(steps) {
  const next = steps.findIndex((s) => !s.done);
  return `<ol class="steps">${steps
    .map((s, k) => `<li class="${s.done ? "is-done" : k === next ? "is-next" : ""}"><i></i>${esc(s.text)}</li>`)
    .join("")}</ol>`;
}

const block = (title, html) => `<div class="d-block"><h4>${esc(title)}</h4>${html}</div>`;

function detail(it) {
  const out = [];
  if (it.desc) out.push(`<p class="d-desc">${esc(it.desc)}</p>`);
  if (it.request) out.push(`<p class="quote">${esc(it.request)}</p>`);
  if (it.includes?.length) out.push(block("들어간 것", `<ul class="d-list">${it.includes.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>`));
  if (it.steps?.length) {
    const n = it.steps.filter((s) => s.done).length;
    out.push(block(`단계 ${n} / ${it.steps.length}`, stepsList(it.steps)));
  }
  if (it.accept) out.push(block("끝났다고 볼 기준", `<p class="d-p">${esc(it.accept)}</p>`));
  if (it.note) out.push(block("메모", `<p class="d-p">${esc(it.note)}</p>`));
  if (it.check) out.push(`<p class="d-check">11월 2일 메모에서 옮긴 일이라 이미 끝났을 수 있어요.</p>`);

  const meta = [
    ["담당", ownerName(it.owner)],
    ["영역", areaName(it.area)],
    ["상태", STATUS[it.status] ?? it.status],
    it.waitingOn && ["기다리는 사람", it.waitingOn],
    it.requested && ["올라온 날", longDate(it.requested)],
    it.started && ["시작", longDate(it.started)],
    it.done && ["끝낸 날", longDate(it.done)],
    it.due && ["마감", longDate(it.due)],
    it.source && ["출처", it.source],
    it.ref && ["참고", it.ref],
  ].filter(Boolean);
  const rel = (it.related ?? []).map(byId).filter(Boolean);
  const relHtml = rel.length
    ? `<dt>관련</dt><dd>${rel.map((r) => `<a href="#${esc(r.id)}">${esc(r.id)} ${esc(r.title)}</a>`).join("<br>")}</dd>`
    : "";
  return `<div class="detail">${out.join("")}<dl class="d-meta">${meta
    .map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`)
    .join("")}${relHtml}</dl></div>`;
}

const preview = (it) => {
  const text = it.desc ?? it.note ?? (it.includes ? it.includes.join(" · ") : "");
  return text ? `<p class="row__sub">${esc(text)}</p>` : "";
};

/** 항목 하나: 요약 줄을 누르면 상세가 펼쳐진다. */
function item(it, lead) {
  const steps = it.steps?.length && it.status !== "done" ? `<span class="tg">단계 ${it.steps.filter((s) => s.done).length}/${it.steps.length}</span>` : "";
  const extra = it.status === "done" && it.includes?.length ? `<span class="tg">${it.includes.length}가지</span>` : "";
  return `<details class="it" id="${esc(it.id)}"><summary class="row">${lead}<div class="row__main"><p class="row__t"><span class="id">${esc(it.id)}</span> ${esc(
    it.title,
  )}</p>${preview(it)}</div><div class="row__tags">${prio(it)}${due(it)}${it.check ? `<span class="tg tg--check">확인 필요</span>` : ""}${steps}${extra}${tags(it)}${
    it.ref && it.status === "done" ? `<span class="ref">${esc(it.ref)}</span>` : ""
  }${chev}</div></summary>${detail(it)}</details>`;
}

/* ───────── 지금 어디까지 ───────── */
function secNow() {
  const today = TODAY;
  const ms = DATA.milestones;
  const start = ms[0].from;
  const end = ms[ms.length - 1].to;
  const total = daysBetween(start, end) + 1;
  const at = (d) => (Math.min(Math.max(daysBetween(start, d), 0), total) / total) * 100;
  // 일찍 끝낸 단계(done)는 기간이 남아 있어도 지난 단계로 본다.
  const phase = (m) => (m.done || today > m.to ? "past" : today >= m.from ? "now" : "next");
  const cls = (m) => `is-${phase(m)}${m.done ? " is-done" : ""}`;
  const cur = ms.find((m) => phase(m) === "now") ?? ms.find((m) => phase(m) === "next");
  const early = ms.filter((m) => m.done && today <= m.to).pop();

  let stage = "";
  if (cur) {
    const isNow = phase(cur) === "now";
    const left = daysBetween(today, cur.to);
    const d = isNow ? (left === 0 ? "오늘 마감" : `마감까지 ${left}일`) : `${daysBetween(today, cur.from)}일 뒤 시작`;
    const span = cur.from === cur.to ? md(cur.from) : `${md(cur.from)}–${md(cur.to)}`;
    stage = `<div class="stage">${early ? `<span class="stage__ok">${esc(early.name)} 끝</span>` : ""}<span>${isNow ? "지금 단계" : "다음 단계"}</span><b>${esc(
      cur.name,
    )}</b><span class="dday">${d}</span><span>${span}${cur.note ? ` · ${esc(cur.note)}` : ""}</span></div>`;
  }

  const segs = ms
    .map((m) => {
      const w = Math.max(((daysBetween(m.from, m.to) + 1) / total) * 100, 0.8);
      return `<i class="${cls(m)}" style="left:${at(m.from)}%;width:${w}%" title="${esc(m.name)}"></i>`;
    })
    .join("");
  const keys = (DATA.keyDates ?? [])
    .filter((k) => k.date >= start && k.date <= end)
    .map(
      (k) =>
        `<b class="ms__key${k.done ? " is-done" : ""}" style="left:${((daysBetween(start, k.date) + 0.5) / total) * 100}%" title="${esc(md(k.date))} ${esc(k.name)}"></b>`,
    )
    .join("");
  const mark =
    today >= start && today <= end
      ? `<span class="ms__today" style="left:${((daysBetween(start, today) + 0.5) / total) * 100}%"><span>오늘 ${md(today)}</span></span>`
      : "";
  const list = ms
    .map(
      (m) =>
        `<li class="${cls(m)}"><b>${esc(m.name)}${m.done ? `<em> · 끝</em>` : ""}</b>${m.from === m.to ? md(m.from) : `${md(m.from)}–${md(m.to)}`}</li>`,
    )
    .join("");

  const upcoming = (DATA.keyDates ?? []).filter((k) => k.date >= today).slice(0, 4);
  const dates = upcoming.length
    ? `<div class="dates"><h3>다가오는 일정</h3><ul>${upcoming
        .map((k) => {
          const name = k.item ? `<a href="#${esc(k.item)}">${esc(k.name)}</a>` : esc(k.name);
          const when = k.done ? `<span class="dates__d is-done">${esc(k.doneLabel ?? "끝")}</span>` : `<span class="dates__d">${dday(today, k.date)}</span>`;
          return `<li class="${k.done ? "is-done" : ""}">${when}<span class="dates__when">${longDate(k.date)}${k.time ? ` ${esc(k.time)}` : ""}</span><span class="dates__name">${name}</span></li>`;
        })
        .join("")}</ul></div>`
    : "";

  const c = { done: 0, doing: 0, waiting: 0, todo: 0 };
  for (const it of DATA.items) if (it.status in c) c[it.status]++;
  const n = DATA.items.length;
  const pct = (k) => (c[k] / n) * 100;

  const first = DATA.items.filter((i) => i.status !== "done" && i.priority === 1).sort(byPriority);
  const firstHtml = first.length
    ? `<div class="next"><h3>먼저 할 일 <span>${first.length}</span></h3><ol>${first
        .map(
          (it) =>
            `<li><a href="#${esc(it.id)}"><span class="id">${esc(it.id)}</span> ${esc(it.title)}</a><span class="next__tags">${due(it)}${
              it.status === "todo" ? "" : `<span class="st st--${esc(it.status)}">${esc(STATUS[it.status])}</span>`
            }${tags(it)}</span></li>`,
        )
        .join("")}</ol></div>`
    : "";

  const doing = DATA.items.filter((i) => i.status === "doing").sort(byPriority);
  const waiting = DATA.items.filter((i) => i.status === "waiting").sort(byPriority);

  return `<section class="sec" id="now">
    <div class="sec__head"><h2>지금 어디까지 왔나</h2><span>오늘 ${longDate(today)}</span></div>
    ${stage}
    <div class="ms" aria-hidden="true">${segs}${keys}${mark}</div>
    <ol class="ms-list">${list}</ol>
    <div class="overview">
      ${firstHtml}
      ${dates}
    </div>
    <div class="counts">
      <div><small>진행 중</small><p class="num">${c.doing}</p></div>
      <div><small>결정 필요</small><p class="num">${c.waiting}</p></div>
      <div><small>할 일</small><p class="num">${c.todo}</p></div>
      <div><small>완료</small><p class="num">${c.done}<small> / ${n}</small></p></div>
    </div>
    <div class="stack" role="img" aria-label="완료 ${c.done}, 진행 중 ${c.doing}, 결정 필요 ${c.waiting}, 할 일 ${c.todo}">
      <i style="width:${pct("done")}%"></i><i style="width:${pct("doing")}%"></i><i style="width:${pct("waiting")}%"></i><i style="width:${pct("todo")}%"></i>
    </div>
    <div class="legend">
      <span style="--c:var(--done)">완료 ${c.done}</span><span style="--c:var(--accent)">진행 중 ${c.doing}</span><span style="--c:#d9a250">결정 필요 ${c.waiting}</span><span style="--c:#c3cad4">할 일 ${c.todo}</span>
    </div>
    <div class="duo">
      <div class="panel"><h3>지금 하는 일 <span>${doing.length}</span></h3>${
        doing.length ? doing.map((it) => item(it, `<i class="dot dot--doing"></i>`)).join("") : `<p class="empty">지금 진행 중인 일이 없어요.</p>`
      }</div>
      <div class="panel"><h3>결정이 필요한 것 <span>${waiting.length}</span></h3>${
        waiting.length ? waiting.map((it) => item(it, `<i class="dot dot--waiting"></i>`)).join("") : `<p class="empty">기다리는 결정이 없어요.</p>`
      }</div>
    </div>
  </section>`;
}

/* ───────── 할 일 ───────── */
function secTodo() {
  const todo = DATA.items.filter((i) => i.status === "todo");
  const count = (o) => (o === "all" ? todo.length : todo.filter((i) => i.owner === o).length);
  const chips = ["all", ...Object.keys(DATA.owners)]
    .filter((o) => count(o) > 0)
    .map(
      (o) =>
        `<button type="button" data-owner="${esc(o)}" aria-pressed="${ownerFilter === o}">${o === "all" ? "전체" : esc(ownerName(o))}<span class="num">${count(o)}</span></button>`,
    )
    .join("");
  const shown = todo.filter((i) => ownerFilter === "all" || i.owner === ownerFilter);
  // 1단계 → 시기 미정 → 이후 단계 순서
  const [firstStage, ...rest] = DATA.milestones;
  const html = [firstStage, null, ...rest]
    .map((m) => {
      const list = shown.filter((i) => (i.stage ?? null) === (m ? m.id : null)).sort(byPriority);
      if (!list.length) return "";
      const head = m
        ? `${esc(m.name)}<span>${md(m.from)}–${md(m.to)} · ${list.length}개</span>`
        : `시기 미정<span>단계와 상관없이 할 일 · ${list.length}개</span>`;
      return `<div class="group"><h3>${head}</h3>${list.map((it) => item(it, `<i class="dot"></i>`)).join("")}</div>`;
    })
    .join("");
  return `<section class="sec" id="todo">
    <div class="sec__head"><h2>할 일</h2><span>${todo.length}개 · 줄을 누르면 자세히 보여요</span></div>
    <div class="chips" role="group" aria-label="담당 고르기">${chips}</div>
    ${html || `<p class="note">이 담당의 할 일이 없어요.</p>`}
  </section>`;
}

function bindChips() {
  document.querySelectorAll("#todo .chips button").forEach((b) =>
    b.addEventListener("click", () => {
      ownerFilter = b.dataset.owner;
      document.getElementById("todo").outerHTML = secTodo();
      bindChips();
    }),
  );
}

/* ───────── 한 일 ───────── */
function secDone() {
  const done = DATA.items.filter((i) => i.status === "done").sort((a, b) => (b.done ?? "").localeCompare(a.done ?? "") || b.id.localeCompare(a.id));
  const days = [];
  for (const it of done) {
    let g = days.find((x) => x.d === it.done);
    if (!g) days.push((g = { d: it.done, list: [] }));
    g.list.push(it);
  }
  return `<section class="sec" id="done">
    <div class="sec__head"><h2>한 일</h2><span>${done.length}개 · 줄을 누르면 들어간 기능이 보여요</span></div>
    ${days
      .map(
        (g) =>
          `<div class="group"><h3>${longDate(g.d)}<span>${g.list.length}개</span></h3>${g.list.map((it) => item(it, `<i class="dot dot--done"></i>`)).join("")}</div>`,
      )
      .join("")}
  </section>`;
}

/* ───────── 요청 이력 ───────── */
function burnup() {
  const its = DATA.items.filter((i) => i.requested);
  const first = its.map((i) => i.requested).sort()[0];
  const lastDone = its.map((i) => i.done).filter(Boolean).sort().pop() ?? first;
  const end = TODAY > lastDone ? TODAY : lastDone;
  const n = daysBetween(first, end) + 1;
  const req = [];
  const fin = [];
  for (let k = 0; k < n; k++) {
    const d = addDays(first, k);
    req.push(its.filter((i) => i.requested <= d).length);
    fin.push(its.filter((i) => i.done && i.done <= d).length);
  }
  // 좁은 화면에서도 글자가 작아지지 않게 그래프 폭을 화면에 맞춘다.
  const W = Math.round(Math.min(720, Math.max(320, (document.getElementById("app")?.clientWidth ?? 760) - 40)));
  const H = 210;
  const L = 34;
  const R = 96;
  const T = 12;
  const B = 26;
  const max = Math.max(...req, 1);
  const x = (k) => L + (n === 1 ? 0 : (k / (n - 1)) * (W - L - R));
  const y = (v) => H - B - (v / max) * (H - T - B);
  const f = (v) => v.toFixed(1);
  const path = (arr) => arr.map((v, k) => (k ? `H${f(x(k))}V${f(y(v))}` : `M${f(x(0))} ${f(y(v))}`)).join("");
  const grid = [...new Set([0, Math.round(max / 2), max])]
    .map((v) => `<line x1="${L}" x2="${W - R}" y1="${f(y(v))}" y2="${f(y(v))}" stroke="#eef0f3"/><text class="axis" x="${L - 8}" y="${f(y(v) + 4)}" text-anchor="end">${v}</text>`)
    .join("");
  const ticks = [...new Set([0, Math.floor((n - 1) / 2), n - 1])]
    .map((k) => `<text class="axis" x="${f(x(k))}" y="${H - 6}" text-anchor="middle">${md(addDays(first, k))}</text>`)
    .join("");
  const lr = req[n - 1];
  const lf = fin[n - 1];
  const yr = y(lr) + 4;
  let yf = y(lf) + 4;
  if (Math.abs(yr - yf) < 16) yf = yr + 16;
  return `<div class="chart">
    <h3>올라간 일과 끝낸 일</h3>
    <p>날마다 쌓인 일(요청·계획)과 끝낸 일의 누적 개수예요. 두 선 사이가 아직 남은 일이에요.</p>
    <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="누적 올라간 일 ${lr}개, 끝낸 일 ${lf}개">
      ${grid}${ticks}
      <path d="${path(fin)}V${f(y(0))}H${f(x(0))}Z" fill="#e7f3ec"/>
      <path d="${path(req)}" fill="none" stroke="#8b95a1" stroke-width="2"/>
      <path d="${path(fin)}" fill="none" stroke="#1d7a4f" stroke-width="2"/>
      <text class="lbl" x="${W - R + 8}" y="${f(yr)}" fill="#4e5968">올라간 일 ${lr}</text>
      <text class="lbl" x="${W - R + 8}" y="${f(yf)}" fill="#1d7a4f">끝낸 일 ${lf}</text>
    </svg>
  </div>`;
}

function secLog() {
  // 날짜 순서, 같은 날은 적힌 순서. 화면에는 최근 것이 위로.
  const evs = DATA.events
    .map((e, i) => ({ ...e, i }))
    .sort((a, b) => a.at.slice(0, 10).localeCompare(b.at.slice(0, 10)) || a.i - b.i)
    .reverse();
  const days = [];
  for (const e of evs) {
    const d = e.at.slice(0, 10);
    let g = days.find((x) => x.d === d);
    if (!g) days.push((g = { d, list: [] }));
    g.list.push(e);
  }
  const evRow = (e) => {
    const it = e.item ? byId(e.item) : null;
    const main = it ? `<p><a href="#${esc(it.id)}"><span class="id">${esc(it.id)}</span>${esc(it.title)}</a></p>` : `<p>${esc(e.text)}</p>`;
    const sub = it && e.text ? `<p class="note">${esc(e.text)}</p>` : it && e.type === "request" && it.request ? `<p class="quote">${esc(it.request)}</p>` : "";
    return `<div class="ev"><time class="num">${hm(e.at)}</time><span class="st st--${esc(e.type)}">${esc(EVENT[e.type] ?? e.type)}</span><div>${main}${sub}</div></div>`;
  };
  return `<section class="sec" id="log">
    <div class="sec__head"><h2>요청 이력</h2><span>${DATA.events.length}건</span></div>
    ${burnup()}
    ${days.map((g) => `<div class="day"><h3>${longDate(g.d)}</h3>${g.list.map(evRow).join("")}</div>`).join("")}
  </section>`;
}

/* ───────── 기능 현황 ───────── */
function secFeatures() {
  const all = DATA.features.flatMap((g) => g.rows);
  const c = { done: 0, partial: 0, todo: 0 };
  for (const r of all) if (r.status in c) c[r.status]++;
  const table = (g) => `<div class="ft"><h3>${esc(g.group)}</h3><table>
      <colgroup><col style="width:22%" /><col style="width:12%" /><col style="width:33%" /><col style="width:33%" /></colgroup>
      <thead><tr><th>기능</th><th>상태</th><th>있는 것</th><th>남은 것</th></tr></thead>
      <tbody>${g.rows
        .map(
          (r) =>
            `<tr><td>${esc(r.name)}</td><td><span class="st st--${esc(r.status)}">${esc(FEATURE[r.status] ?? r.status)}</span></td><td class="${
              r.have ? "" : "none"
            }" data-label="있는 것">${esc(r.have || "아직 없음")}</td><td data-label="남은 것">${esc(r.left)}</td></tr>`,
        )
        .join("")}</tbody>
    </table></div>`;
  return `<section class="sec" id="features">
    <div class="sec__head"><h2>기능 현황</h2><span>기능 ${all.length}개 · 완료 ${c.done} · 일부 ${c.partial} · 아직 ${c.todo}</span></div>
    ${DATA.features.map(table).join("")}
  </section>`;
}

/* ───────── 주소의 #N-000 으로 항목 열기 ───────── */
function openFromHash() {
  const id = decodeURIComponent(location.hash.slice(1));
  if (!/^N-\d{3}$/.test(id)) return;
  let el = document.getElementById(id);
  if (!el && ownerFilter !== "all") {
    // 담당 거르기 때문에 숨어 있으면 전체로 되돌린다
    ownerFilter = "all";
    document.getElementById("todo").outerHTML = secTodo();
    bindChips();
    el = document.getElementById(id);
  }
  if (el instanceof HTMLDetailsElement) {
    el.open = true;
    el.scrollIntoView({ block: "start" });
  }
}

/* ───────── 시작 ───────── */
async function main() {
  const app = document.getElementById("app");
  try {
    const res = await fetch("data/tracker.json", { cache: "no-store" });
    if (!res.ok) throw new Error(String(res.status));
    DATA = await res.json();
  } catch {
    app.innerHTML = `<p class="error">데이터를 불러오지 못했어요. 파일을 바로 열었다면 웹 서버로 열어 주세요 (README 참고).</p>`;
    return;
  }
  const { meta } = DATA;
  document.title = meta.title;
  document.getElementById("title").textContent = meta.title;
  document.getElementById("subtitle").textContent = meta.subtitle;
  const log = /^https:\/\/github\.com\//.test(meta.repo ?? "") ? ` · <a href="${esc(meta.repo)}/commits/main">변경 기록 보기</a>` : "";
  document.getElementById("updated").innerHTML = `마지막 업데이트 ${esc(longDate(meta.updated))} ${esc(hm(meta.updated))}${log}`;

  TODAY = todayKST();
  app.innerHTML = secNow() + secTodo() + secDone() + secLog() + secFeatures();
  bindChips();
  window.addEventListener("hashchange", openFromHash);
  openFromHash();
}

main();
