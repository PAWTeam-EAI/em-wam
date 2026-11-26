(function () {
  "use strict";
  const $ = (s, r = document) => r.querySelector(s),
    $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const D = JSON.parse($("#page-data").textContent);
  const reduce =
    window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;

  function setSrc(element, path) {
    element.src = path;
    return Promise.resolve(path);
  }

  /* ---------- page chrome (light theme only) ---------- */
  (function () {
    const root = document.documentElement;
    if (reduce) root.classList.add("still"); // respect the system's reduced-motion setting
    // active nav link
    const links = $$("nav a");
    const secs = links.map((a) => $(a.getAttribute("href")));
    const io = new IntersectionObserver(
      (es) =>
        es.forEach((e) => {
          if (e.isIntersecting)
            links.forEach((a, i) =>
              a.classList.toggle("active", secs[i] === e.target),
            );
        }),
      { rootMargin: "-45% 0px -50% 0px" },
    );
    secs.forEach((s) => s && io.observe(s));
  })();

  /* ---------- Figure 1: four synchronised head-camera videos (2 methods x 2 seeds), one row of cues ---------- */
  (function () {
    const F = {
      t: 0,
      max: 20,
      playing: false,
      user: false,
      hm: true,
      map: "surprise",
      hold: 0,
      held: false,
      endWait: 0,
      last: 0,
      started: false,
    };
    const CUE = [9.6, 12.0]; // frames 243-250 are the button press (9.72-10.00 s)
    const HOLD_AT = 9.9,
      HOLD_S = 3.8,
      END_S = 3.2; // the decisive frame stays on screen; the result stays at the end
    const VERDICT = {
      // time at which the block is placed, and what the README says happened
      lb: {
        s0: { t: 16.36, ok: true, txt: "✔ Left Mat" },
        s1: { t: 16.4, ok: false, txt: "✘ Left Mat" },
      },
      em: {
        s0: { t: 16.28, ok: true, txt: "✔ Left Mat" },
        s1: { t: 15.16, ok: true, txt: "✔ Right Mat" },
      },
    };
    const wide = $("#f1");
    const cells = $$(".f1-cell", wide).map((el) => ({
      el,
      m: el.dataset.m,
      s: el.dataset.s,
      v: $(".a video", el),
      w: $(".b video", el),
      box: $(".vid-box.a", el),
      boxB: $(".vid-box.b", el),
      ov: $("img.overlay", el),
      vd: $(".verdict", el),
      d: 0,
    }));
    const still = () => document.documentElement.classList.contains("still");
    function setOverlays() {
      cells.forEach((c) => {
        const key =
          c.m === "lb"
            ? "lingbot_attn_" + c.s
            : (F.map === "surprise" ? "emwam_surprise_" : "emwam_action_") +
              c.s;
        c.ov.src = "media/fig1/" + key + ".webp";
      });
    }
    function ui() {
      const t = F.t;
      cells.forEach((c) => {
        c.box.classList.toggle("cue", F.hm && t >= CUE[0]);
        c.box.classList.toggle("nomap", !F.hm);
        c.boxB.classList.toggle("wait", t < HOLD_AT);
        const v = VERDICT[c.m][c.s];
        c.vd.textContent = v.txt;
        c.vd.className =
          "verdict " + (v.ok ? "ok" : "fail") + (t >= v.t ? " show" : "");
      });
      const holding = F.hold > 0;
      wide.classList.toggle("hold", holding);
    }
    function seek(t) {
      F.t = Math.min(Math.max(t, 0), F.max);
      cells.forEach((c) => {
        if (c.d) {
          c.v.currentTime = Math.min(F.t, HOLD_AT, c.d - 0.04);
          c.w.currentTime = Math.min(Math.max(F.t, HOLD_AT), c.d - 0.04);
        }
      });
      ui();
    }
    function restart() {
      F.t = 0;
      F.held = false;
      F.hold = 0;
      F.endWait = 0;
      seek(0);
    }
    function play() {
      if (F.playing) return;
      if (F.t >= F.max - 0.05 && F.endWait <= 0) restart();
      F.playing = true;
      F.last = performance.now();
      requestAnimationFrame(frame);
    }
    const pauseAll = () =>
      cells.forEach((c) => {
        c.v.pause();
        c.w.pause();
      });
    function pause() {
      F.playing = false;
      pauseAll();
    }
    function frame(now) {
      if (!F.playing) return;
      if (still()) {
        pause();
        return;
      }
      const dt = Math.min((now - F.last) / 1000, 0.1);
      F.last = now;
      if (F.hold > 0) {
        F.hold -= dt;
        pauseAll();
        if (F.hold <= 0) F.hold = 0;
        ui();
        requestAnimationFrame(frame);
        return;
      }
      if (F.endWait > 0) {
        F.endWait -= dt;
        if (F.endWait <= 0) {
          restart();
        }
        ui();
        requestAnimationFrame(frame);
        return;
      }
      F.t += dt;
      if (!F.held && F.t >= HOLD_AT) {
        F.t = HOLD_AT;
        F.held = true;
        F.hold = HOLD_S;
        pauseAll();
        seek(HOLD_AT);
        requestAnimationFrame(frame);
        return;
      }
      if (F.t >= F.max) {
        F.t = F.max;
        F.endWait = END_S;
        pauseAll();
        ui();
        requestAnimationFrame(frame);
        return;
      }
      cells.forEach((c) => {
        if (F.t < HOLD_AT) {
          // pane 1 plays up to the button press; pane 2 waits on that frame
          if (c.v.paused) c.v.play().catch(() => {});
          if (Math.abs(c.v.currentTime - F.t) > 0.3) c.v.currentTime = F.t;
          if (!c.w.paused) c.w.pause();
        } else {
          if (!c.v.paused) c.v.pause();
          if (F.t < c.d - 0.05) {
            if (c.w.paused) c.w.play().catch(() => {});
            if (Math.abs(c.w.currentTime - F.t) > 0.3) c.w.currentTime = F.t;
          } else {
            c.w.pause();
            c.w.currentTime = c.d - 0.04;
          }
        }
      });
      ui();
      requestAnimationFrame(frame);
    }
    const ready = (c) =>
      new Promise((res) => {
        const f = () => {
          c.d = c.v.duration;
          res();
        };
        if (c.v.readyState >= 1 && c.v.src) f();
        else c.v.addEventListener("loadedmetadata", f, { once: true });
      });
    let loading;
    let visible = false;
    function loadTeaser() {
      if (loading) return loading;
      loading = Promise.all(
        cells.map((c) => {
          const k =
            "media/fig1/" +
            (c.m === "lb" ? "lingbot_" : "emwam_") +
            c.s +
            ".mp4";
          return Promise.all([setSrc(c.v, k), setSrc(c.w, k)]).then(() =>
            ready(c),
          );
        }),
      ).then(() => {
        F.max = Math.max(...cells.map((c) => c.d));
        setOverlays();
        seek(0);
      });
      return loading;
    }
    wide.addEventListener("click", () => {
      if (F.playing) {
        F.user = true;
        pause();
      } else {
        F.user = false;
        loadTeaser().then(() => {
          if (visible && !F.user) play();
        });
      }
    });
    new IntersectionObserver(
      (es) =>
        es.forEach((e) => {
          visible = e.isIntersecting;
          if (visible) {
            const loaded = loadTeaser();
            if (!F.user && !still())
              loaded.then(() =>
                setTimeout(
                  () => {
                    if (visible && !F.playing && !F.user) play();
                  },
                  F.started ? 0 : 500,
                ),
              );
            F.started = true;
          } else if (F.playing) pause();
        }),
      { threshold: 0.35 },
    ).observe(wide);
  })();

  /* ---------- Figure 2: stepper over the architecture diagram ---------- */
  (function () {
    const STEPS = [
      [
        "Overview",
        "Two memories for a world action model",
        "One decides what to keep; the other notices what surprises.",
      ],
      [
        "Hybrid cache",
        "Each past frame: full tokens or a short summary",
        "Recent frames stay in full; older ones can shrink to 4 summary tokens.",
      ],
      [
        "Refresh score",
        "A free score from the decay gates",
        "A large gate step means the frame adds something new.",
      ],
      [
        "Retention",
        "High score: keep in full. Low score: keep a summary",
        "Frames right after a finished subtask tend to stay in full.",
      ],
      [
        "Surprise",
        "Prediction error shows where something unexpected happened",
        "The error between predicted and observed latents gives a surprise per region.",
      ],
      [
        "Event bank",
        "Only surprising frames are written",
        "Above an adaptive threshold, a frame is stored as a few event tokens.",
      ],
      [
        "Modulation",
        "The bank steers the action expert",
        "Action tokens read it by cross-attention; the result feeds the adaLN.",
      ],
    ];
    const svg = $("#arch"),
      tabs = $("#arch-tabs");
    STEPS.forEach((s, i) => {
      const b = document.createElement("button");
      b.className = "method-tab";
      b.setAttribute("role", "tab");
      b.innerHTML = "<i>" + i + "</i>" + s[0];
      tabs.appendChild(b);
    });
    function go(i) {
      $$(".method-tab", tabs).forEach((b, k) =>
        b.setAttribute("aria-selected", String(k === i)),
      );
      svg.classList.toggle("focus", i > 0);
      $$(".g", svg).forEach((g) => {
        const ids = g.dataset.g.split(" ");
        g.classList.toggle(
          "on",
          i === 0 || ids.includes("*") || ids.includes(String(i)),
        );
      });
      $("#arch-no").textContent = i;
      $("#arch-title").textContent = STEPS[i][1];
      $("#arch-text").textContent = STEPS[i][2];
    }
    let cur = 0,
      timer = null,
      visible = false,
      auto = true;
    const AUTO_MS = 3400,
      autoB = $("#arch-auto");
    const still = () => document.documentElement.classList.contains("still");
    const goRaw = go;
    function tick() {
      timer = null;
      if (auto && visible && !still()) goTo((cur + 1) % STEPS.length);
    }
    function arm() {
      if (timer) clearTimeout(timer);
      timer = null;
      if (auto && visible && !still()) timer = setTimeout(tick, AUTO_MS);
    }
    function goTo(i) {
      cur = i;
      goRaw(i);
      arm();
    }
    $$(".method-tab", tabs).forEach((b, k) =>
      b.addEventListener("click", () => goTo(k)),
    );
    autoB.addEventListener("click", () => {
      auto = !auto;
      autoB.setAttribute("aria-pressed", String(auto));
      autoB.textContent = auto ? "❚❚" : "▶";
      arm();
    });
    new IntersectionObserver(
      (es) =>
        es.forEach((e) => {
          visible = e.isIntersecting;
          arm();
        }),
      { threshold: 0.4 },
    ).observe($(".arch-panel"));
    go(0);
  })();

  /* ---------- RMBench-Dynamic gallery ---------- */
  (function () {
    const list = $("#task-list"),
      vid = $("#task-video"),
      info = $("#task-info"),
      strip = $("#sample-strip");
    const EVN = {
      goal: "Goal revision",
      noop: "Ineffective action",
      pert: "Perturbation",
      defer: "Deferred feedback",
    };
    const S = { task: 0, sample: 0 };
    const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
    function fmtNote(id, n) {
      // selection notes come from the benchmark README; show them as plain phrases
      let m;
      const nums = (x) =>
        x
          .replace(/[\[\]]/g, "")
          .split(/,\s*/)
          .map((v) => v.replace(/^-/, "−"))
          .join(", ");
      if (
        id === "press_button_update" &&
        (m = n.match(/^(\w+) target (\+\d) at physical press (\d+)$/))
      )
        return cap(m[1]) + " target, " + m[2] + " at press " + m[3];
      if (id === "put_back_block_relocate")
        return cap(
          n.replace(/; /, " · ").replace("visible cue", "cue visible"),
        );
      if (id === "rearrange_blocks_interrupt")
        return cap(n.replace(" / ", " cue · "));
      if (
        id === "switch_panel_revision" &&
        (m = n.match(/^(\d+) target revision; (\d+) rollback\(s\)$/))
      )
        return (
          m[1] +
          (m[1] === "1" ? " revision" : " revisions") +
          " · " +
          m[2] +
          (m[2] === "1" ? " rollback" : " rollbacks")
        );
      if (
        id === "press_button_noop" &&
        (m = n.match(/^(\d+) no-op presses at indices \[(.*)\]$/))
      )
        return (
          m[1] +
          (m[1] === "1" ? " no-op press" : " no-op presses") +
          " (at " +
          m[2] +
          ")"
        );
      if (
        id === "restore_layout" &&
        (m = n.match(/^(\w+)\/(\w+)\/(\w+); swap (\w+)_(\w+)$/))
      )
        return (
          cap(m[1]) +
          " · " +
          m[2] +
          " · " +
          m[3] +
          "; swap " +
          m[4] +
          " ↔ " +
          m[5]
        );
      if (id === "rmbenchpp_shuffle" && (m = n.match(/\[(.*)\]/)))
        return "Initial slots: " + nums(m[1]);
      if (id === "ordered_card_memory" && (m = n.match(/\[(.*)\]/)))
        return "Cards " + m[1].split(/,\s*/).join(" · ");
      return n.replace(/_/g, " ");
    }

    D.tasks.forEach((t, i) => {
      const b = document.createElement("button");
      b.className = "task-btn ev-" + t.event;
      b.setAttribute("role", "tab");
      b.dataset.i = i;
      b.innerHTML = "<b>" + t.title + "</b>";
      b.title = EVN[t.event];
      b.addEventListener("click", () => select(i, 0, true));
      b.addEventListener("keydown", (e) => {
        if (
          ["ArrowDown", "ArrowUp", "ArrowRight", "ArrowLeft"].includes(e.key)
        ) {
          e.preventDefault();
          const n =
            (i +
              (e.key === "ArrowDown" || e.key === "ArrowRight" ? 1 : -1) +
              D.tasks.length) %
            D.tasks.length;
          select(n, 0, false);
          $$(".task-btn", list)[n].focus();
        }
      });
      list.appendChild(b);
    });
    function select(i, s, play) {
      S.task = i;
      S.sample = s;
      const t = D.tasks[i];
      $$(".task-btn", list).forEach((b, k) => {
        b.setAttribute("aria-selected", String(k === i));
        b.tabIndex = k === i ? 0 : -1;
      });
      info.innerHTML =
        "<h3>" +
        t.title +
        ' <span class="ev ev-' +
        t.event +
        '">' +
        EVN[t.event] +
        '</span></h3><p class="tagline">' +
        t.tagline +
        '</p><p class="desc">' +
        t.description +
        '</p><details><summary>Task instruction</summary><p style="margin-top:6px">' +
        t.instruction +
        "</p></details>";
      strip.innerHTML = "";
      t.samples.forEach((sm, k) => {
        const b = document.createElement("button");
        b.className = "sample";
        b.setAttribute("role", "tab");
        b.innerHTML = '<img alt="" width="480" height="360">';
        b.setAttribute(
          "aria-label",
          "Sample " + (k + 1) + ": " + fmtNote(t.id, sm.note),
        );
        b.querySelector("img").src =
          "media/rmbench/" + t.id + "/sample_0" + sm.n + ".jpg";
        b.addEventListener("click", () => pick(k, true));
        b.addEventListener("keydown", (e) => {
          if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
            e.preventDefault();
            const n = (S.sample + (e.key === "ArrowRight" ? 1 : -1) + 5) % 5;
            pick(n, true);
            $$(".sample", strip)[n].focus();
          }
        });
        strip.appendChild(b);
      });
      pick(s, play);
    }
    function pick(k, play) {
      S.sample = k;
      const t = D.tasks[S.task],
        sm = t.samples[k];
      $("#sample-note").textContent =
        fmtNote(t.id, sm.note) + " · " + sm.dur.toFixed(1) + " s";
      $$(".sample", strip).forEach((b, j) => {
        b.setAttribute("aria-selected", String(j === k));
        b.tabIndex = j === k ? 0 : -1;
      });
      vid.pause();
      vid.removeAttribute("src");
      vid.poster = "media/rmbench/" + t.id + "/sample_0" + sm.n + ".jpg";
      setSrc(vid, "media/rmbench/" + t.id + "/sample_0" + sm.n + ".mp4").then(
        () => {
          vid.load();
          if (play && !document.documentElement.classList.contains("still"))
            vid.play().catch(() => {});
        },
      );
    }
    new IntersectionObserver(
      (entries, observer) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          vid.preload = "metadata";
          select(0, 0, false);
          observer.disconnect();
        }
      },
      { rootMargin: "350px" },
    ).observe(list);
    new IntersectionObserver(
      (es) =>
        es.forEach((e) => {
          if (!e.isIntersecting) vid.pause();
          else if (
            vid.paused &&
            vid.readyState > 0 &&
            !document.documentElement.classList.contains("still")
          )
            vid.play().catch(() => {});
        }),
      { threshold: 0.35 },
    ).observe(vid);
  })();

  /* ---------- leaderboard (RoboDojo-style) ---------- */
  (function () {
    const table = $("#lb-table"),
      medals = ["\u{1F947}", "\u{1F948}", "\u{1F949}"];
    const CFG = {
      tab1: {
        title: "RMBench-Dynamic · success rate (%)",
        sub: "100 evaluation seeds per task · click a column to sort",
        cols: D.taskNames,
        rows: D.tab1,
        foot: "Success rate (%) per task; best results in bold. EM-WAM w/o exogenous is an ablation of EM-WAM and is not ranked.",
      },
      tab2: {
        title: "RMBench · success rate (%)",
        sub: "M(1): five tasks · M(n): four tasks · click a column to sort",
        cols: D.taskNames2,
        groups: [
          ["", 4],
          ["M(1)", 5],
          ["M(n)", 4],
        ],
        rows: D.tab2,
        foot: "Success rate (%) per task, grouped by memory complexity as in RMBench; best results in bold. Results of the other methods are taken from MemoryWAM.",
      },
    };
    let cur = "tab1",
      sortKey = "avg",
      dir = -1;
    const ini = (n) => n.replace(/[^A-Za-z0-9π]/g, "").slice(0, 2);
    function render() {
      const c = CFG[cur],
        rows = c.rows.map((r) => ({ ...r }));
      const ranked = rows.filter((r) => !r.ghost).sort((a, b) => b.avg - a.avg);
      ranked.forEach((r, i) => (r.rank = i));
      const val = (r, k) => (k === "avg" ? r.avg : r.v[k]);
      const best = c.cols.map((_, k) =>
        Math.max(...rows.filter((r) => !r.ghost).map((r) => r.v[k])),
      );
      const bestAvg = Math.max(
        ...rows.filter((r) => !r.ghost).map((r) => r.avg),
      );
      rows.sort(
        (a, b) => (val(b, sortKey) - val(a, sortKey)) * (dir < 0 ? 1 : -1),
      );
      const grp = c.groups
        ? '<tr class="grp">' +
          c.groups
            .map(
              (g) => '<th class="grp" colspan="' + g[1] + '">' + g[0] + "</th>",
            )
            .join("") +
          "</tr>"
        : "";
      const head =
        "<thead>" +
        grp +
        '<tr><th>Rank</th><th class="left">Model</th><th>Type</th><th class="sortable' +
        (sortKey === "avg" ? " sorted" : "") +
        '" data-k="avg">Average ' +
        (sortKey === "avg" ? (dir < 0 ? "↓" : "↑") : "") +
        "</th>" +
        c.cols
          .map(
            (n, k) =>
              '<th class="sortable' +
              (sortKey === k ? " sorted" : "") +
              '" data-k="' +
              k +
              '">' +
              n.replace(/ /g, " ") +
              (sortKey === k ? (dir < 0 ? " ↓" : " ↑") : "") +
              "</th>",
          )
          .join("") +
        "</tr></thead>";
      const fmt = (v) => (Number.isInteger(v) ? String(v) : v.toFixed(1));
      const body =
        "<tbody>" +
        rows
          .map((r) => {
            const rk = r.ghost
              ? "—"
              : r.rank < 3
                ? medals[r.rank]
                : String(r.rank + 1);
            return (
              '<tr class="' +
              (r.ours ? "ours " : "") +
              (r.ghost ? "ghost" : "") +
              '"><td class="rank">' +
              rk +
              '</td><td class="model"><span class="mono">' +
              ini(r.name) +
              "</span>" +
              r.name +
              (r.ours ? '<span class="tag-ours">ours</span>' : "") +
              '</td><td><span class="type ' +
              r.type +
              '">' +
              r.type +
              "</span></td>" +
              '<td class="avg' +
              (!r.ghost && r.avg === bestAvg ? " best" : "") +
              '">' +
              r.avg.toFixed(1) +
              "</td>" +
              r.v
                .map(
                  (v, k) =>
                    '<td class="' +
                    (!r.ghost && v === best[k] ? "best" : "") +
                    '">' +
                    fmt(v) +
                    "</td>",
                )
                .join("") +
              "</tr>"
            );
          })
          .join("") +
        "</tbody>";
      table.innerHTML = head + body;
      $("#lb-title").textContent = c.title;
      $("#lb-sub").textContent = c.sub;
      $("#lb-foot").textContent = c.foot;
      $$("th.sortable", table).forEach((th) =>
        th.addEventListener("click", () => {
          const k = th.dataset.k === "avg" ? "avg" : +th.dataset.k;
          if (sortKey === k) dir *= -1;
          else {
            sortKey = k;
            dir = -1;
          }
          render();
        }),
      );
    }
    $$(".lb-tab").forEach((b) =>
      b.addEventListener("click", () => {
        cur = b.dataset.lb;
        sortKey = "avg";
        dir = -1;
        $$(".lb-tab").forEach((x) =>
          x.setAttribute("aria-selected", String(x === b)),
        );
        render();
      }),
    );
    render();
  })();

  /* ---------- real world ---------- */
  (function () {
    // rollouts video + chapters (times found by scene-change detection on the team's video)
    const rv = $("#rollout-video");
    rv.poster = "media/real/rollouts.jpg";
    let loaded = false;
    const load = () => {
      if (loaded) return;
      loaded = true;
      rv.src = "media/real/rollouts.mp4";
    };
    new IntersectionObserver(
      (es, o) =>
        es.forEach((e) => {
          if (e.isIntersecting) {
            load();
            o.disconnect();
          }
        }),
      { rootMargin: "400px" },
    ).observe(rv);
    const CH = [
      ["Overview", 0],
      ["RMBench-Dynamic", 21.1],
      ["EM-WAM real-world · Cover Blocks", 31.1],
      ["EM-WAM real-world · Restore Layout", 54.4],
      ["vs LingBot-VA · Cover Blocks", 81.1],
      ["vs LingBot-VA · Restore Layout", 93.5],
    ];
    const ch = $("#chapters");
    CH.forEach(([n, t], i) => {
      if (i === 4) {
        const s = document.createElement("i");
        s.className = "ch-break";
        ch.appendChild(s);
      }
      const b = document.createElement("button");
      b.className = i >= 4 ? "chapter r2" : "chapter";
      b.textContent = n;
      b.addEventListener("click", () => {
        load();
        const go = () => {
          rv.currentTime = t;
          rv.play().catch(() => {});
        };
        if (rv.readyState >= 1) go();
        else {
          rv.addEventListener("loadedmetadata", go, { once: true });
        }
      });
      ch.appendChild(b);
    });
    rv.addEventListener("timeupdate", () => {
      let k = 0;
      CH.forEach((c, i) => {
        if (rv.currentTime >= c[1]) k = i;
      });
      $$(".chapter", ch).forEach((b, i) => b.classList.toggle("on", i === k));
    });
    // autoplay (muted) while the section is on screen; pause when it leaves, unless the person paused it
    const stillOn = () => document.documentElement.classList.contains("still");
    let userPaused = false,
      byCode = false;
    rv.muted = true;
    rv.loop = true;
    rv.addEventListener("pause", () => {
      if (!byCode && !rv.ended) userPaused = true;
      byCode = false;
    });
    rv.addEventListener("play", () => {
      userPaused = false;
    });
    new IntersectionObserver(
      (es) =>
        es.forEach((e) => {
          if (e.isIntersecting) {
            load();
            if (!userPaused && !stillOn()) {
              const go = () => rv.play().catch(() => {});
              if (rv.readyState >= 1) go();
              else rv.addEventListener("loadedmetadata", go, { once: true });
            }
          } else if (!rv.paused) {
            byCode = true;
            rv.pause();
          }
        }),
      { threshold: 0.4 },
    ).observe(rv);

    // success bars
    const bars = $("#bars");
    const TASKTIP = {
      "Cover Blocks":
        "Cover three blocks with cups, then uncover them in the order red, green, blue.",
      "Restore Layout":
        "A person rearranges the blocks; the robot restores the original order.",
    };
    Object.entries(D.real).forEach(([task, r]) => {
      const row = (cls, name, v) =>
        '<div class="bar-row"><span class="name">' +
        name +
        '</span><div class="bar-track"><div class="bar-fill ' +
        cls +
        '" data-w="' +
        (v / 30) * 100 +
        '" style="width:0"> ' +
        v +
        " / 30</div></div></div>";
      bars.insertAdjacentHTML(
        "beforeend",
        '<div class="bar-task"><h4 title="' +
          (TASKTIP[task] || "") +
          '">' +
          task +
          "<span>30 trials</span></h4>" +
          row("lb", "LingBot-VA", r.lb) +
          row("wo", "EM-WAM w/o exogenous", r.wo) +
          row("ours", "EM-WAM", r.em) +
          "</div>",
      );
    });
    new IntersectionObserver(
      (es, o) =>
        es.forEach((e) => {
          if (e.isIntersecting) {
            $$(".bar-fill", bars).forEach(
              (b) => (b.style.width = Math.max(+b.dataset.w, 22) + "%"),
            );
            o.disconnect();
          }
        }),
      { threshold: 0.3 },
    ).observe(bars);

    // trial viewer: the two clips of one scene side by side, each with a live clock (the files are recorded at 2x)
    let pairsVisible = false,
      endedAt = 0,
      touched = -1e9;
    const BASE = 2,
      tsel = $("#trial-task"),
      esel = $("#trial-ep"),
      ssel = $("#trial-speed"),
      pairs = $("#trial-pairs"),
      sum = $("#trial-sum");
    const dir = (t) =>
      t === "Cover Blocks" ? "cover_blocks" : "restore_layout";
    const mmss = (s) => {
      s = Math.floor(s);
      return Math.floor(s / 60) + ":" + ("0" + (s % 60)).slice(-2);
    };
    function fillEps() {
      esel.innerHTML = "";
      D.trials[tsel.value].forEach((x, i) => {
        const o = document.createElement("option");
        o.value = i;
        o.textContent =
          "Trial " +
          (i + 1) +
          " · EM-WAM " +
          (x.em.ok ? "success" : "failure") +
          " · LingBot-VA " +
          (x.lb.ok ? "success" : "failure");
        esel.appendChild(o);
      });
    }
    function rate() {
      return Number(ssel.value) / BASE;
    }
    function clip(label, m, info, key, poster) {
      const ok = info.ok;
      return (
        '<div class="trial ' +
        m +
        '"><div class="t-head"><span>' +
        label +
        '</span><span class="t-right"><span class="t-time" data-ok="' +
        (ok ? 1 : 0) +
        '" data-sec="' +
        info.sec +
        '" data-tz="' +
        info.cut.tz +
        '">0:00</span><span class="res ' +
        (ok ? "ok" : "fail") +
        '">' +
        (ok ? "SUCCESS" : "FAILURE") +
        '</span></span></div><div class="vwrap"><video playsinline muted preload="auto" controls data-key="' +
        key +
        '" data-poster="' +
        poster +
        '"></video><span class="speed-badge"></span><span class="done-tag"></span></div>' +
        '<div class="t-foot">' +
        (info.rearr
          ? "Original layout (left to right): " +
            info.layout +
            "<br>Rearranged by hand: " +
            info.rearr +
            ". The clock starts once the hand is out; waiting time before the robot moves is cut."
          : "Initial layout (left to right): " + info.layout) +
        "</div></div>"
      );
    }
    function clock() {
      // real elapsed time of each trial; once a clip has ended it shows how long the trial took
      $$(".trial", pairs).forEach((t) => {
        const v = $("video", t),
          c = $(".t-time", t),
          ok = c.dataset.ok === "1",
          sec = Math.round(+c.dataset.sec);
        const w = $(".vwrap", t),
          dt = $(".done-tag", t);
        const bar = $(
          ".sb." + (t.classList.contains("em") ? "em" : "lb") + " .sb-track i",
          sum,
        ); // the time bar below grows with the clip and gets its Done tag at the end
        if (bar) {
          const el = v.ended
            ? +c.dataset.sec
            : Math.max(0, v.currentTime - (+c.dataset.tz || 0)) * BASE;
          bar.style.width =
            Math.min(+bar.dataset.w, (el / (+sum.dataset.mx || 1)) * 100) + "%";
          $(".bar-done", bar).classList.toggle("show", v.ended);
        }
        if (v.ended) {
          c.className = "t-time done " + (ok ? "ok" : "end");
          c.textContent = (ok ? "Done · " : "Ended · ") + sec + " s";
          dt.textContent = (ok ? "✓ Done · " : "Ended · ") + sec + " s";
          dt.className = "done-tag show " + (ok ? "ok" : "end");
        } else {
          c.className = "t-time";
          c.textContent = mmss(
            Math.max(0, v.currentTime - (+c.dataset.tz || 0)) * BASE,
          );
          dt.className = "done-tag";
        }
      });
      const vs = $$("video", pairs); // both finished: wait a moment, then replay the pair together
      if (vs.length && vs.every((v) => v.ended)) {
        if (!endedAt) endedAt = performance.now();
        else if (
          performance.now() - endedAt > 2800 &&
          performance.now() - touched > 7000 &&
          pairsVisible &&
          !stillOn()
        ) {
          endedAt = 0;
          startPair();
        }
      } else endedAt = 0;
    }
    function startPair() {
      const vs = $$("video", pairs);
      Promise.all(
        vs.map(
          (v) =>
            new Promise((res) => {
              if (v.readyState >= 3) res();
              else v.addEventListener("canplay", res, { once: true });
            }),
        ),
      ).then(() => {
        vs.forEach((v) => {
          v.currentTime = 0;
          v.playbackRate = rate();
        });
        if (pairsVisible && !stillOn())
          vs.forEach((v) => v.play().catch(() => {}));
        clock();
      });
    }
    function showTrial() {
      const task = tsel.value,
        it = D.trials[task][+esel.value || 0],
        d = dir(task),
        pe = ("0" + it.em.ep).slice(-2),
        pl = ("0" + it.lb.ep).slice(-2);
      pairs.innerHTML =
        clip(
          "EM-WAM",
          "em",
          it.em,
          "media/real/" + d + "/em_wam/ep" + pe + ".mp4",
          "media/real/" + d + "/em_wam/ep" + pe + ".jpg",
        ) +
        clip(
          "LingBot-VA",
          "lb",
          it.lb,
          "media/real/" + d + "/lingbot_va/ep" + pl + ".mp4",
          "media/real/" + d + "/lingbot_va/ep" + pl + ".jpg",
        );
      const e = it.em.sec,
        l = it.lb.sec;
      const mx = Math.max(e, l);
      sum.innerHTML =
        "" +
        '<div class="sb em"><span class="sb-l">EM-WAM</span><span class="sb-track"><i data-w="' +
        ((e / mx) * 100).toFixed(1) +
        '"><u class="bar-done">✓ Done</u></i></span><b>' +
        Math.round(e) +
        " s</b><span></span></div>" +
        '<div class="sb lb"><span class="sb-l">LingBot-VA</span><span class="sb-track"><i data-w="' +
        ((l / mx) * 100).toFixed(1) +
        '"><u class="bar-done ' +
        (it.lb.ok ? "" : "bad") +
        '">' +
        (it.lb.ok ? "✓ Done" : "Ended") +
        "</u></i></span><b>" +
        Math.round(l) +
        " s</b>" +
        (it.lb.ok ? "<span></span>" : "<em>failed</em>") +
        "</div>";
      sum.dataset.mx = mx;
      clock();
      endedAt = 0;
      $$("video", pairs).forEach((v) => {
        v.poster = v.dataset.poster;
        setSrc(v, v.dataset.key).then(() => {
          v.defaultPlaybackRate = rate();
          v.playbackRate = rate();
        });
      });
      badges();
      startPair();
    }
    function badges() {
      $$(".speed-badge", pairs).forEach(
        (b) => (b.textContent = ssel.value + "×"),
      );
      $$("video", pairs).forEach((v) => {
        v.defaultPlaybackRate = rate();
        v.playbackRate = rate();
      });
    }
    tsel.addEventListener("change", () => {
      fillEps();
      showTrial();
    });
    esel.addEventListener("change", showTrial);
    ssel.addEventListener("change", badges);
    $("#trial-both").addEventListener("click", () => {
      endedAt = 0;
      $$("video", pairs).forEach((v) => {
        v.currentTime = 0;
        v.playbackRate = rate();
        v.play().catch(() => {});
      });
    });
    ["pointerdown", "keydown", "input"].forEach((ev) =>
      pairs.addEventListener(
        ev,
        () => {
          touched = performance.now();
          endedAt = 0;
        },
        true,
      ),
    );
    fillEps();
    setInterval(() => {
      if (pairsVisible) clock();
    }, 100);
    new IntersectionObserver(
      (es, o) =>
        es.forEach((e) => {
          if (e.isIntersecting) {
            showTrial();
            o.disconnect();
          }
        }),
      { rootMargin: "300px" },
    ).observe(pairs);
    new IntersectionObserver(
      (es) =>
        es.forEach((e) => {
          pairsVisible = e.isIntersecting;
          $$("video", pairs).forEach((v) => {
            if (!pairsVisible) v.pause();
            else if (!stillOn() && v.readyState >= 1 && !v.ended)
              v.play().catch(() => {});
          });
        }),
      { threshold: 0.3 },
    ).observe(pairs);
  })();

  /* ---------- real-world tasks: what the robot must do and what it must remember ---------- */
  const RW_TASK = {
    cover: {
      name: "Cover Blocks",
      goal: "Cover the three blocks with cups, then uncover them in the order red, green, blue.",
      mem: "Once the cups are down, the colors are hidden, so the robot must remember which cup covers which block.",
    },
    restore: {
      name: "Restore Layout",
      goal: "During the episode, a person rearranges the three blocks. The robot must put them back in their original order.",
      mem: "After the rearrangement the original order is no longer in view, so the robot must remember it.",
    },
  };
  const BLOCK = { red: "#d33a2f", green: "#4f9a2b", blue: "#2a93c7" };
  const sq = (cs) =>
    '<span class="g-sq">' +
    cs.map((c) => '<i style="background:' + BLOCK[c] + '" title="' + c + '"></i>').join("") +
    "</span>";
  const taskHead = (k) =>
    '<div class="g-task"><h4>' + RW_TASK[k].name + "</h4><p>" + RW_TASK[k].goal +
    '</p><p class="g-mem"><b>Memory</b>' + RW_TASK[k].mem + "</p></div>";
  (function () {
    const g = $("#trial-goal"),
      sel = $("#trial-task");
    if (!g || !sel) return;
    const set = () => {
      g.innerHTML = taskHead(sel.value === "Cover Blocks" ? "cover" : "restore");
    };
    sel.addEventListener("change", set);
    set();
  })();
  /* ---------- Project showcase: one rollout, four synchronised cameras ---------- */
  (function () {
    const box = $("#sc");
    if (!box) return;
    const ROLL = [
      ["cover_blocks_1", "Cover Blocks · Rollout 1"],
      ["cover_blocks_2", "Cover Blocks · Rollout 2"],
      ["restore_layout_1", "Restore Layout · Rollout 1"],
      ["restore_layout_2", "Restore Layout · Rollout 2"],
    ];
    // event times in seconds of the clips (the same rollouts and times as the overview video, at 1x)
    const STEPS = {
      cover_blocks_1: { task: "cover", layout: ["red", "blue", "green"], cov: [10.45, 20.23, 32.08], unc0: 34.08, unc: [44.1, 57.48, 70.97] },
      cover_blocks_2: { task: "cover", layout: ["blue", "red", "green"], cov: [10.94, 20.73, 30.84], unc0: 32.84, unc: [39.75, 54.38, 67.66] },
      restore_layout_1: { task: "restore", goal: ["blue", "green", "red"], shuffled: ["green", "blue", "red"], shuffle: 2.0, restore: 14.62, done: 55.49 },
      restore_layout_2: { task: "restore", goal: ["blue", "green", "red"], shuffled: ["green", "red", "blue"], shuffle: 2.04, restore: 16.49, done: 84.87 },
    };
    const guide = $("#sc-guide");
    let gKey = "";
    function drawGuide(id) {
      const s = STEPS[id];
      gKey = id;
      if (!guide || !s) return;
      let steps;
      if (s.task === "cover")
        steps =
          '<li><span class="g-no">1</span><div><b>Cover the blocks</b><span class="g-d">Layout, left to right ' + sq(s.layout) +
          '<span>· <span class="g-n">0</span>/3 covered</span></span></div></li>' +
          '<li><span class="g-no">2</span><div><b>Uncover in the order</b><span class="g-d g-chips">' +
          ["red", "green", "blue"].map((c) => '<em style="--b:' + BLOCK[c] + '">' + c + "</em>").join("") + "</span></div></li>";
      else
        steps =
          '<li><span class="g-no">1</span><div><b>Original layout</b><span class="g-d">Left to right ' + sq(s.goal) + "</span></div></li>" +
          '<li><span class="g-no">2</span><div><b>A person rearranges the blocks</b><span class="g-d">Now ' + sq(s.shuffled) + "</span></div></li>" +
          '<li><span class="g-no">3</span><div><b>Restore the original layout</b><span class="g-d">Target ' + sq(s.goal) +
          '<span class="g-ok">✓ Restored</span></span></div></li>';
      guide.innerHTML = taskHead(s.task) + '<ol class="g-steps">' + steps + "</ol>";
      updGuide(0);
    }
    function updGuide(t) {
      const s = STEPS[gKey];
      if (!guide || !s) return;
      const li = $$(".g-steps li", guide);
      let cur, done;
      if (s.task === "cover") {
        cur = t < s.unc0 ? 0 : 1;
        $(".g-n", guide).textContent = s.cov.filter((x) => t >= x).length;
        $$(".g-chips em", guide).forEach((e, k) => e.classList.toggle("on", t >= s.unc[k]));
        done = [t >= s.unc0, t >= s.unc[2]];
      } else {
        cur = t < s.shuffle ? 0 : t < s.restore ? 1 : 2;
        done = [t >= s.shuffle, t >= s.restore, t >= s.done];
        guide.classList.toggle("restored", t >= s.done);
      }
      li.forEach((l, k) => {
        l.classList.toggle("active", k === cur && !done[k]);
        l.classList.toggle("done", !!done[k]);
      });
    }
    const tabs = $("#sc-tabs"),
      V = {
        third: $("#sc-third"),
        head: $("#sc-head"),
        left: $("#sc-left"),
        right: $("#sc-right"),
      },
      all = Object.values(V),
      M = V.third;
    const playB = $("#sc-play"),
      seek = $("#sc-seek"),
      tm = $("#sc-time"),
      spd = $("#sc-speed");
    let cur = -1,
      playing = false,
      visible = false,
      userPaused = false,
      dragging = false,
      started = false;
    const still = () => document.documentElement.classList.contains("still");
    const fmt = (s) =>
      Math.floor(s / 60) + ":" + ("0" + Math.floor(s % 60)).slice(-2);
    ROLL.forEach(([id, name], i) => {
      const b = document.createElement("button");
      b.className = "task-btn";
      b.type = "button";
      b.setAttribute("role", "tab");
      b.innerHTML = "<b>" + name + "</b>";
      b.addEventListener("click", () => {
        userPaused = false;
        load(i);
      });
      tabs.appendChild(b);
    });
    const ready = (v) =>
      new Promise((res) => {
        if (v.readyState >= 3) res();
        else v.addEventListener("canplay", res, { once: true });
      });
    function ui() {
      const d = M.duration || 0;
      if (!dragging && d) seek.value = Math.round((M.currentTime / d) * 1000);
      tm.textContent = fmt(M.currentTime) + " / " + fmt(d);
      updGuide(M.currentTime);
      playB.textContent = playing ? "❚❚" : "▶";
      playB.setAttribute("aria-label", playing ? "Pause" : "Play");
    }
    function tick() {
      if (!playing) return;
      const t = M.currentTime;
      all.forEach((v) => {
        if (v === M) return;
        if (t < v.duration - 0.05) {
          if (v.paused) v.play().catch(() => {});
          if (Math.abs(v.currentTime - t) > 0.35) v.currentTime = t;
        } else if (!v.paused) v.pause();
      });
      ui();
      requestAnimationFrame(tick);
    }
    function play() {
      if (playing || cur < 0) return;
      playing = true;
      all.forEach((v) => {
        v.playbackRate = Number(spd.value);
        v.play().catch(() => {});
      });
      requestAnimationFrame(tick);
      ui();
    }
    function pause() {
      playing = false;
      all.forEach((v) => v.pause());
      ui();
    }
    function restart() {
      all.forEach((v) => {
        v.currentTime = 0;
      });
      if (playing) all.forEach((v) => v.play().catch(() => {}));
    }
    function load(i) {
      cur = i;
      const id = ROLL[i][0];
      playing = false;
      all.forEach((v) => v.pause());
      $$(".task-btn", tabs).forEach((b, k) =>
        b.setAttribute("aria-selected", String(k === i)),
      );
      M.poster = "media/real/showcase/" + id + "/third.jpg";
      drawGuide(id);
      Promise.all(
        Object.keys(V).map((k) =>
          setSrc(V[k], "media/real/showcase/" + id + "/" + k + ".mp4"),
        ),
      )
        .then(() => Promise.all(all.map(ready)))
        .then(() => {
          if (cur !== i) return;
          all.forEach((v) => {
            v.currentTime = 0;
          });
          ui();
          if (visible && !userPaused && !still()) play();
        });
    }
    M.addEventListener("ended", restart);
    playB.addEventListener("click", () => {
      if (playing) {
        userPaused = true;
        pause();
      } else {
        userPaused = false;
        play();
      }
    });
    box.addEventListener("click", () => {
      if (playing) {
        userPaused = true;
        pause();
      } else {
        userPaused = false;
        play();
      }
    });
    spd.addEventListener("change", () =>
      all.forEach((v) => {
        v.playbackRate = Number(spd.value);
      }),
    );
    seek.addEventListener("input", () => {
      dragging = true;
      const t = (seek.value / 1000) * (M.duration || 0);
      all.forEach((v) => {
        v.currentTime = Math.min(t, (v.duration || t) - 0.04);
      });
      tm.textContent = fmt(t) + " / " + fmt(M.duration || 0);
      updGuide(t);
    });
    seek.addEventListener("change", () => {
      dragging = false;
    });
    new IntersectionObserver(
      (es, o) =>
        es.forEach((e) => {
          if (e.isIntersecting) {
            load(0);
            o.disconnect();
          }
        }),
      { rootMargin: "500px" },
    ).observe(box);
    new IntersectionObserver(
      (es) =>
        es.forEach((e) => {
          visible = e.isIntersecting;
          if (visible) {
            if (!userPaused && !still() && cur >= 0 && M.readyState >= 3)
              play();
          } else if (playing) pause();
        }),
      { threshold: 0.4 },
    ).observe(box);
  })();
  /* ---------- real-world module: switch between the comparison and the showcase (the panels keep their own controls) ---------- */
  (function () {
    const sw = $(".rw-switch");
    if (!sw) return;
    const btns = $$("button", sw);
    btns.forEach((b) =>
      b.addEventListener("click", () => {
        btns.forEach((x) => {
          const on = x === b;
          x.setAttribute("aria-pressed", String(on));
          $("#rw-" + x.dataset.p).hidden = !on;
        });
      }),
    );
  })();
})();
