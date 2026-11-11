// NAKSAN.NAV 작업 현황 — data/tracker.json 하나를 읽어 화면을 그린다.
"use strict";

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

let DATA = null;
let ownerFilter = "all";

const byId = (id) => DATA.items.find((i) => i.id === id);
const ownerName = (o) => DATA.owners[o] ?? o;
const areaName = (a) => DATA.areas[a] ?? a;
const tags = (it) => `<span class="tg">${esc(ownerName(it.owner))}</span><span class="tg">${esc(areaName(it.area))}</span>`;

/* ───────── 지금 어디까지 ───────── */
function secNow(today) {
  const ms = DATA.milestones;
  const start = ms[0].from;
  const end = ms[ms.length - 1].to;
  const total = daysBetween(start, end) + 1;
  const at = (d) => (Math.min(Math.max(daysBetween(start, d), 0), total) / total) * 100;
  const phase = (m) => (today > m.to ? "past" : today >= m.from ? "now" : "next");
  const cur = ms.find((m) => phase(m) === "now") ?? ms.find((m) => phase(m) === "next");

  let stage = "";
  if (cur) {
    const isNow = phase(cur) === "now";
    const left = daysBetween(today, cur.to);
    const dday = isNow ? (left === 0 ? "오늘 마감" : `마감까지 ${left}일`) : `${daysBetween(today, cur.from)}일 뒤 시작`;
    const span = cur.from === cur.to ? md(cur.from) : `${md(cur.from)}–${md(cur.to)}`;
    stage = `<div class="stage"><span>${isNow ? "지금 단계" : "다음 단계"}</span><b>${esc(cur.name)}</b><span class="dday">${dday}</span><span>${span}${cur.note ? ` · ${esc(cur.note)}` : ""}</span></div>`;
  }

  const segs = ms
    .map((m) => {
      const w = Math.max(((daysBetween(m.from, m.to) + 1) / total) * 100, 0.8);
      return `<i class="is-${phase(m)}" style="left:${at(m.from)}%;width:${w}%" title="${esc(m.name)}"></i>`;
    })
    .join("");
  const mark =
    today >= start && today <= end
      ? `<span class="ms__today" style="left:${((daysBetween(start, today) + 0.5) / total) * 100}%"><span>오늘 ${md(today)}</span></span>`
      : "";
  const list = ms
    .map((m) => `<li class="is-${phase(m)}"><b>${esc(m.name)}</b>${m.from === m.to ? md(m.from) : `${md(m.from)}–${md(m.to)}`}</li>`)
    .join("");

  const c = { done: 0, doing: 0, waiting: 0, todo: 0 };
  for (const it of DATA.items) if (it.status in c) c[it.status]++;
  const n = DATA.items.length;
  const pct = (k) => (c[k] / n) * 100;

  const doing = DATA.items.filter((i) => i.status === "doing");
  const waiting = DATA.items.filter((i) => i.status === "waiting");
  const waitRow = (it) =>
    `<div class="wait"><p class="wait__t"><span class="id">${esc(it.id)}</span>${esc(it.title)}<span class="tg">${esc(it.waitingOn ?? ownerName(it.owner))}</span></p>${
      it.note ? `<p class="note">${esc(it.note)}</p>` : ""
    }</div>`;

  return `<section class="sec" id="now">
    <div class="sec__head"><h2>지금 어디까지 왔나</h2><span>오늘 ${longDate(today)}</span></div>
    ${stage}
    <div class="ms" aria-hidden="true">${segs}${mark}</div>
    <ol class="ms-list">${list}</ol>
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
      <div class="panel"><h3>지금 하는 일 <span>${doing.length}</span></h3>${doing.length ? doing.map(workCard).join("") : `<p class="empty">지금 진행 중인 일이 없어요.</p>`}</div>
      <div class="panel"><h3>결정이 필요한 것 <span>${waiting.length}</span></h3>${waiting.length ? waiting.map(waitRow).join("") : `<p class="empty">기다리는 결정이 없어요.</p>`}</div>
    </div>
  </section>`;
}

function workCard(it) {
  const steps = it.steps ?? [];
  const doneN = steps.filter((s) => s.done).length;
  const next = steps.findIndex((s) => !s.done);
  const list = steps.map((s, k) => `<li class="${s.done ? "is-done" : k === next ? "is-next" : ""}"><i></i>${esc(s.text)}</li>`).join("");
  return `<div class="work">
    <p class="work__t"><span class="id">${esc(it.id)}</span>${esc(it.title)}</p>
    ${it.request ? `<p class="quote">${esc(it.request)}</p>` : ""}
    ${it.started ? `<p class="note">${longDate(it.started)} 시작</p>` : ""}
    ${
      steps.length
        ? `<ol class="steps">${list}</ol><div class="steps__bar"><div><i style="width:${(doneN / steps.length) * 100}%"></i></div><span class="num">${doneN} / ${steps.length}</span></div>`
        : ""
    }
  </div>`;
}

/* ───────── 할 일 ───────── */
const todoRow = (it) =>
  `<div class="row"><i></i><div><p class="row__t"><span class="id">${esc(it.id)}</span> ${esc(it.title)}</p>${
    it.note ? `<p class="note">${esc(it.note)}</p>` : ""
  }</div><div class="row__tags">${it.check ? `<span class="tg tg--check">확인 필요</span>` : ""}${tags(it)}</div></div>`;

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
  const [first, ...rest] = DATA.milestones;
  const groups = [first, null, ...rest];
  const html = groups
    .map((m) => {
      const list = shown.filter((i) => (i.stage ?? null) === (m ? m.id : null));
      if (!list.length) return "";
      const head = m
        ? `${esc(m.name)}<span>${md(m.from)}–${md(m.to)} · ${list.length}개</span>`
        : `시기 미정<span>틈틈이 할 일 · ${list.length}개</span>`;
      return `<div class="group"><h3>${head}</h3>${list.map(todoRow).join("")}</div>`;
    })
    .join("");
  return `<section class="sec" id="todo">
    <div class="sec__head"><h2>할 일</h2><span>${todo.length}개</span></div>
    <p class="hint">‘확인 필요’는 11월 2일 메모에서 옮긴 일이라 이미 끝났을 수 있어요.</p>
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
  const done = DATA.items
    .filter((i) => i.status === "done")
    .sort((a, b) => (b.done ?? "").localeCompare(a.done ?? "") || b.id.localeCompare(a.id));
  const row = (it) =>
    `<div class="row"><time class="num" datetime="${esc(it.done)}">${md(it.done)}</time><div><p class="row__t">${esc(it.title)}</p>${
      it.request ? `<p class="quote">${esc(it.request)}</p>` : ""
    }${it.note ? `<p class="note">${esc(it.note)}</p>` : ""}</div><div class="row__tags">${tags(it)}${it.ref ? `<span class="ref">${esc(it.ref)}</span>` : ""}</div></div>`;
  return `<section class="sec" id="done">
    <div class="sec__head"><h2>한 일</h2><span>${done.length}개</span></div>
    <div class="done-list">${done.map(row).join("")}</div>
  </section>`;
}

/* ───────── 요청 이력 ───────── */
function burnup(today) {
  const its = DATA.items.filter((i) => i.requested);
  const first = its.map((i) => i.requested).sort()[0];
  const lastDone = its.map((i) => i.done).filter(Boolean).sort().pop() ?? first;
  const end = today > lastDone ? today : lastDone;
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
  let yr = y(lr) + 4;
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

function secLog(today) {
  const days = [];
  for (const e of [...DATA.events].reverse()) {
    const d = e.at.slice(0, 10);
    let g = days.find((x) => x.d === d);
    if (!g) days.push((g = { d, list: [] }));
    g.list.push(e);
  }
  const evRow = (e) => {
    const it = e.item ? byId(e.item) : null;
    const main = it ? `<p><span class="id">${esc(it.id)}</span>${esc(it.title)}</p>` : `<p>${esc(e.text)}</p>`;
    const sub =
      it && e.text ? `<p class="note">${esc(e.text)}</p>` : it && e.type === "request" && it.request ? `<p class="quote">${esc(it.request)}</p>` : "";
    return `<div class="ev"><time class="num">${hm(e.at)}</time><span class="st st--${esc(e.type)}">${esc(EVENT[e.type] ?? e.type)}</span><div>${main}${sub}</div></div>`;
  };
  return `<section class="sec" id="log">
    <div class="sec__head"><h2>요청 이력</h2><span>${DATA.events.length}건</span></div>
    ${burnup(today)}
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
    <div class="sec__head"><h2>기능 현황</h2><span>기획서 기능 ${all.length}개 · 완료 ${c.done} · 일부 ${c.partial} · 아직 ${c.todo}</span></div>
    ${DATA.features.map(table).join("")}
  </section>`;
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

  const today = todayKST();
  app.innerHTML = secNow(today) + secTodo() + secDone() + secLog(today) + secFeatures();
  bindChips();
}

main();
