import { useState, useEffect, useCallback, useMemo } from "react";
import { storage } from "./storage";

// ---------- date helpers ----------
const todayKey = (d = new Date()) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const DITE = ["Diel", "Hene", "Marte", "Merkure", "Enjte", "Premte", "Shtune"];
const DITE_SHKURT = ["Hen", "Mar", "Mer", "Enj", "Pre", "Sht", "Die"];
const MUAJ = ["Janar", "Shkurt", "Mars", "Prill", "Maj", "Qershor", "Korrik", "Gusht", "Shtator", "Tetor", "Nentor", "Dhjetor"];
const MUAJ_SHKURT = ["Jan", "Shk", "Mar", "Pri", "Maj", "Qer", "Kor", "Gus", "Sht", "Tet", "Nen", "Dhj"];

const dayLabelSq = (dateStr) => {
  const d = new Date(dateStr + "T00:00:00");
  return `${DITE[d.getDay()]}, ${d.getDate()} ${MUAJ_SHKURT[d.getMonth()]}`;
};

const uid = () => Math.random().toString(36).slice(2, 10);

function getMonthGrid(year, month) {
  const firstOfMonth = new Date(year, month, 1);
  const startDay = (firstOfMonth.getDay() + 6) % 7; // Monday = 0
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();
  const cells = [];
  for (let i = 0; i < startDay; i++) {
    cells.push({ date: new Date(year, month - 1, daysInPrevMonth - startDay + 1 + i), outside: true });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ date: new Date(year, month, d), outside: false });
  }
  while (cells.length % 7 !== 0) {
    const last = cells[cells.length - 1].date;
    const next = new Date(last);
    next.setDate(next.getDate() + 1);
    cells.push({ date: next, outside: true });
  }
  return cells;
}

function buildGymProgram(startDate) {
  const events = {};
  for (let i = 0; i < 60; i++) {
    const d = new Date(startDate);
    d.setDate(d.getDate() + i);
    const k = todayKey(d);
    let text;
    if (i < 14) text = "Flex Gym: Ecje/Vrapim 1 ore";
    else if (i < 28) text = "Flex Gym: Ecje/Vrapim + ushtrime barku";
    else text = "Flex Gym: Force (muskuj) + Ecje/Vrapim";
    const ev = { id: uid(), area: "gym", text };
    events[k] = events[k] ? [...events[k], ev] : [ev];
  }
  return events;
}

// ---------- areas ----------
const AREAS = [
  { id: "ushqim", label: "Ushqim", color: "#6B8F71" },
  { id: "biznesi", label: "Biznesi", color: "#A63D40" },
  { id: "gym", label: "Gym", color: "#2F6F62" },
  { id: "financa", label: "Financa", color: "#BF9B30" },
  { id: "marredhenie", label: "Partneri", color: "#7A5C61" },
  { id: "familje", label: "Familja", color: "#B98B5E" },
  { id: "shoqeri", label: "Shoqeria", color: "#5C8A99" },
  { id: "rritje", label: "Rritje Personale", color: "#3E6680" },
  { id: "relax", label: "Relax", color: "#6E5B8A" },
];
const areaById = Object.fromEntries(AREAS.map((a) => [a.id, a]));

const NAV_GROUPS = [
  { id: "biznes", label: "Biznes", areas: ["biznesi", "financa"], color: "#A63D40" },
  { id: "health", label: "Health", areas: ["ushqim", "gym"], color: "#6B8F71" },
  { id: "relations", label: "Relations", areas: ["marredhenie", "familje", "shoqeri"], color: "#7A5C61" },
  { id: "star", label: "Star", areas: ["rritje"], color: "#3E6680" },
  { id: "relax_grp", label: "Relax", areas: ["relax"], color: "#6E5B8A" },
];

const DEFAULT_GOALS = {
  ushqim: [],
  biznesi: ["Ndiq analitiken ditore/mujore te Molto Studios", "Rishiko inventarin dhe shitjet e Patron Dantel"],
  gym: [],
  financa: [],
  marredhenie: ["Planifiko nje dalje/date me Blenden", "Planifiko nje udhetim me Blenden"],
  familje: [],
  shoqeri: ["Dil me shoke/shoqeri me shpesh"],
  rritje: ["Meso nje gjuhe te re", "Lexo rregullisht", "Krijo nje OJQ", "Bej rrjetizim (networking)", "Behu profesor ne nje fakultet"],
  relax: [],
};

const DEFAULT_HABITS = [
  { id: uid(), text: "Pa cokollata", area: "ushqim" },
  { id: uid(), text: "Pa yndyrna", area: "ushqim" },
  { id: uid(), text: "Pa pije te gazuara", area: "ushqim" },
  { id: uid(), text: "Pa buke te bardhe", area: "ushqim" },
  { id: uid(), text: "Stervitje e kryer (Flex Gym)", area: "gym" },
  { id: uid(), text: "Relaksim ditor (10 min)", area: "relax" },
];

const RELAX_TIPS = [
  "Frymemarrje 4-7-8: thith 4 sek, mbaj 7 sek, nxjerr 8 sek — perserit 4 here kur ndjen ankth.",
  "Nje shetitje e shkurter jashte, pa telefon, 10-15 min ne dite.",
  "Kufizo kafeinen pas ores 14:00 — ndikon te gjumi dhe niveli i ankthit.",
  "Rutine gjumi fikse: bjerr ne shtrat dhe zgjohu ne te njejten ore.",
  "Shkruaj 3 minuta ditar te lire, pa filtra, para gjumit.",
  "Provo nje aplikacion meditimi (p.sh. Headspace/Calm) 10 min ne mengjes.",
  "Per nje plan trajtimi te pershtatur, bisedo me nje psikolog/terapist te licensuar — keshillat ketu jane vetem ndihmese e pergjithshme.",
];

const RELATIONSHIP_TIPS = [
  "Cakto nje 'date night' fiks ne jave me Blenden, pa telefon gjate saj.",
  "Per udhetime, planifiko 2-3 muaj pare: destinacioni, datat, buxheti, dokumentet.",
  "Nje mesazh i vogel gjate dites ('po mendoj per ty') ben dallim te madh.",
  "Cakto nje dalje me shoke te pakten 1 here ne jave — shoqeria mban baterite e mbushura.",
];

const MOLTO_URL = "https://xkohyiaacogbllhbsehf.supabase.co/rest/v1";
const MOLTO_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhrb2h5aWFhY29nYmxsaGJzZWhmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc1ODg4NDMsImV4cCI6MjEwMzE2NDg0M30.1_2D7CqxJY-cMEXQu56P5BwnqTuTYcCb6P6LpTtvVFA";

const EMPTY_DAY = { priorities: ["", "", ""], done: [false, false, false], habits: {}, energy: null, note: "" };

const APP_PASSWORD = "Goni2027_";
const AUTH_KEY = "jeta-sistemi-auth";

function PasswordGate({ onUnlock }) {
  const [pw, setPw] = useState("");
  const [error, setError] = useState(false);
  const submit = () => {
    if (pw === APP_PASSWORD) {
      try {
        localStorage.setItem(AUTH_KEY, "1");
      } catch {}
      onUnlock();
    } else {
      setError(true);
    }
  };
  return (
    <div style={S.gateWrap}>
      <style>{css}</style>
      <div style={S.gateCard}>
        <div style={S.kicker}>Regjistri Ditor</div>
        <h1 style={{ ...S.title, marginBottom: 18 }}>Hyrje</h1>
        <input
          type="password"
          value={pw}
          onChange={(e) => {
            setPw(e.target.value);
            setError(false);
          }}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="Fjalekalimi"
          style={S.gateInput}
          autoFocus
        />
        {error && <div style={S.gateError}>Fjalekalim i gabuar.</div>}
        <button onClick={submit} style={{ ...S.addBtn, marginTop: 14, width: "100%" }}>
          Hyr
        </button>
      </div>
    </div>
  );
}

export default function JetaSistemi() {
  const [authed, setAuthed] = useState(() => {
    try {
      return localStorage.getItem(AUTH_KEY) === "1";
    } catch {
      return false;
    }
  });
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState("sot");
  const [key, setKey] = useState(todayKey());
  const [day, setDay] = useState(EMPTY_DAY);
  const [habitsList, setHabitsList] = useState(DEFAULT_HABITS);
  const [goals, setGoals] = useState(() => Object.fromEntries(AREAS.map((a) => [a.id, []])));
  const [newHabit, setNewHabit] = useState("");
  const [newHabitArea, setNewHabitArea] = useState(AREAS[0].id);
  const [newGoalText, setNewGoalText] = useState({});
  const [history, setHistory] = useState({});
  const [saveState, setSaveState] = useState("idle");
  const [clock, setClock] = useState(() => {
    const n = new Date();
    return `${String(n.getHours()).padStart(2, "0")}:${String(n.getMinutes()).padStart(2, "0")}`;
  });

  const [events, setEvents] = useState({});
  const [calYear, setCalYear] = useState(new Date().getFullYear());
  const [calMonth, setCalMonth] = useState(new Date().getMonth());
  const [selectedDate, setSelectedDate] = useState(todayKey());
  const [newEventArea, setNewEventArea] = useState(AREAS[0].id);
  const [newEventText, setNewEventText] = useState("");
  const [relTypeOpen, setRelTypeOpen] = useState(null); // "dalje" | "udhetim" | null
  const [relDate, setRelDate] = useState(todayKey());
  const [relNote, setRelNote] = useState("");

  const [quickLog, setQuickLog] = useState([]);
  const [quickText, setQuickText] = useState("");

  const [moltoState, setMoltoState] = useState({ status: "idle" });

  const fetchMoltoStats = useCallback(async () => {
    setMoltoState({ status: "loading" });
    try {
      const headers = { apikey: MOLTO_KEY, Authorization: `Bearer ${MOLTO_KEY}` };
      const now = new Date();
      const today = todayKey(now);
      const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
      const sum = (arr, key) => arr.reduce((s, x) => s + (Number(x[key]) || 0), 0);

      const [bToday, bMonth, msMonth, exMonth] = await Promise.all([
        fetch(`${MOLTO_URL}/bookings?select=price&date=eq.${today}`, { headers }).then((r) => r.json()),
        fetch(`${MOLTO_URL}/bookings?select=price&date=gte.${monthStart}&date=lte.${today}`, { headers }).then((r) => r.json()),
        fetch(`${MOLTO_URL}/minisales?select=total&date=gte.${monthStart}&date=lte.${today}`, { headers }).then((r) => r.json()),
        fetch(`${MOLTO_URL}/expenses?select=amount&date=gte.${monthStart}&date=lte.${today}`, { headers }).then((r) => r.json()),
      ]);

      const todayCount = Array.isArray(bToday) ? bToday.length : 0;
      const todayTotal = Array.isArray(bToday) ? sum(bToday, "price") : 0;
      const monthCount = Array.isArray(bMonth) ? bMonth.length : 0;
      const monthBookings = Array.isArray(bMonth) ? sum(bMonth, "price") : 0;
      const monthMinibar = Array.isArray(msMonth) ? sum(msMonth, "total") : 0;
      const monthExpenses = Array.isArray(exMonth) ? sum(exMonth, "amount") : 0;
      const monthRevenue = monthBookings + monthMinibar;

      setMoltoState({
        status: "ready",
        todayCount,
        todayTotal,
        monthCount,
        monthRevenue,
        monthExpenses,
        monthProfit: monthRevenue - monthExpenses,
        updatedAt: `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`,
      });
    } catch (e) {
      setMoltoState({ status: "error" });
    }
  }, []);

  useEffect(() => {
    if (tab === "biznes" && moltoState.status === "idle") {
      fetchMoltoStats();
    }
  }, [tab, moltoState.status, fetchMoltoStats]);

  // ---------- load ----------
  useEffect(() => {
    (async () => {
      let loadedGoals = null;
      try {
        const [habitsRes, goalsRes, eventsRes] = await Promise.allSettled([
          storage.get("habits-list"),
          storage.get("areas-goals"),
          storage.get("calendar-events"),
        ]);
        if (habitsRes.status === "fulfilled" && habitsRes.value) {
          const parsed = JSON.parse(habitsRes.value.value);
          if (Array.isArray(parsed) && parsed.length) setHabitsList(parsed);
        }
        if (goalsRes.status === "fulfilled" && goalsRes.value) {
          loadedGoals = JSON.parse(goalsRes.value.value);
        }
        if (eventsRes.status === "fulfilled" && eventsRes.value) {
          setEvents(JSON.parse(eventsRes.value.value));
        }
      } catch (e) {
        /* first run */
      }

      // migrate + seed goals
      let g = loadedGoals ? { ...loadedGoals } : {};
      if (g.pune) {
        g.biznesi = [...(g.biznesi || []), ...g.pune];
        delete g.pune;
      }
      if (g.shendet) {
        g.gym = [...(g.gym || []), ...g.shendet];
        delete g.shendet;
      }
      let seededFlag = null;
      try {
        seededFlag = await storage.get("areas-seeded-v2");
      } catch {}
      if (!seededFlag) {
        AREAS.forEach((a) => {
          if (!g[a.id] || g[a.id].length === 0) {
            g[a.id] = (DEFAULT_GOALS[a.id] || []).map((t) => ({ id: uid(), text: t, done: false }));
          }
        });
        try {
          await storage.set("areas-seeded-v2", "1");
        } catch {}
      } else {
        AREAS.forEach((a) => {
          if (!g[a.id]) g[a.id] = [];
        });
      }
      setGoals(g);
      try {
        await storage.set("areas-goals", JSON.stringify(g));
      } catch {}

      // seed gym program once
      let gymFlag = null;
      try {
        gymFlag = await storage.get("gym-program-seeded");
      } catch {}
      if (!gymFlag) {
        const program = buildGymProgram(new Date());
        let currentEvents = {};
        try {
          const er = await storage.get("calendar-events");
          if (er) currentEvents = JSON.parse(er.value);
        } catch {}
        const merged = { ...currentEvents };
        Object.entries(program).forEach(([k, evs]) => {
          merged[k] = merged[k] ? [...merged[k], ...evs] : evs;
        });
        setEvents(merged);
        try {
          await storage.set("calendar-events", JSON.stringify(merged));
          await storage.set("gym-program-seeded", "1");
          await storage.set("gym-program-start", todayKey());
        } catch {}
      }

      await loadDay(todayKey());
      await loadHistorySummary();
      setReady(true);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      const n = new Date();
      setClock(`${String(n.getHours()).padStart(2, "0")}:${String(n.getMinutes()).padStart(2, "0")}`);
    }, 15000);
    return () => clearInterval(id);
  }, []);

  const loadDay = async (k) => {
    try {
      const res = await storage.get(`daily:${k}`);
      setDay(res ? JSON.parse(res.value) : { ...EMPTY_DAY, habits: {} });
    } catch {
      setDay({ ...EMPTY_DAY, habits: {} });
    }
    try {
      const qres = await storage.get(`quicklog:${k}`);
      setQuickLog(qres ? JSON.parse(qres.value) : []);
    } catch {
      setQuickLog([]);
    }
    setKey(k);
  };

  const persistQuickLog = async (next) => {
    setQuickLog(next);
    try {
      await storage.set(`quicklog:${todayKey()}`, JSON.stringify(next));
    } catch {}
  };

  const addQuickEntry = () => {
    const text = quickText.trim();
    if (!text) return;
    const now = new Date();
    const time = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    const entry = { id: uid(), time, text };
    persistQuickLog([entry, ...quickLog]);
    setQuickText("");
  };

  const removeQuickEntry = (id) => {
    persistQuickLog(quickLog.filter((e) => e.id !== id));
  };

  const loadHistorySummary = async () => {
    try {
      const list = await storage.list("daily:");
      if (!list || !list.keys) return;
      const last14 = list.keys.sort().slice(-14);
      const entries = {};
      for (const k of last14) {
        try {
          const r = await storage.get(k);
          entries[k.replace("daily:", "")] = JSON.parse(r.value);
        } catch {}
      }
      setHistory(entries);
    } catch {}
  };

  // ---------- persistence ----------
  const persistDay = useCallback(async (nextDay) => {
    setSaveState("saving");
    try {
      await storage.set(`daily:${todayKey()}`, JSON.stringify(nextDay));
      setSaveState("saved");
      setTimeout(() => setSaveState("idle"), 900);
    } catch {
      setSaveState("error");
    }
  }, []);

  const persistHabits = async (list) => {
    setHabitsList(list);
    try {
      await storage.set("habits-list", JSON.stringify(list));
    } catch {}
  };

  const persistGoals = async (next) => {
    setGoals(next);
    try {
      await storage.set("areas-goals", JSON.stringify(next));
    } catch {}
  };

  const persistEvents = async (next) => {
    setEvents(next);
    try {
      await storage.set("calendar-events", JSON.stringify(next));
    } catch {}
  };

  const updateDay = (patch) => {
    const next = { ...day, ...patch };
    setDay(next);
    persistDay(next);
  };

  // ---------- streak ----------
  const streak = useMemo(() => {
    let n = 0;
    let d = new Date();
    while (true) {
      const k = todayKey(d);
      const entry = k === key ? day : history[k];
      const touched =
        entry &&
        (entry.done?.some(Boolean) ||
          Object.values(entry.habits || {}).some(Boolean) ||
          entry.energy !== null ||
          (entry.note && entry.note.trim()));
      if (!touched) break;
      n += 1;
      d.setDate(d.getDate() - 1);
      if (n > 60) break;
    }
    return n;
  }, [day, history, key]);

  const completedCount = day.done.filter(Boolean).length;
  const habitsCompleted = habitsList.filter((h) => day.habits[h.id]).length;

  // ---------- day actions ----------
  const setPriority = (i, val) => {
    const priorities = [...day.priorities];
    priorities[i] = val;
    updateDay({ priorities });
  };
  const toggleDone = (i) => {
    const done = [...day.done];
    done[i] = !done[i];
    updateDay({ done });
  };
  const toggleHabit = (id) => updateDay({ habits: { ...day.habits, [id]: !day.habits[id] } });
  const addHabit = () => {
    if (!newHabit.trim()) return;
    persistHabits([...habitsList, { id: uid(), text: newHabit.trim(), area: newHabitArea }]);
    setNewHabit("");
  };
  const removeHabit = (id) => {
    persistHabits(habitsList.filter((h) => h.id !== id));
    const habits = { ...day.habits };
    delete habits[id];
    updateDay({ habits });
  };
  const setEnergy = (v) => updateDay({ energy: v });

  // ---------- goal actions ----------
  const addGoal = (areaId) => {
    const text = (newGoalText[areaId] || "").trim();
    if (!text) return;
    const next = { ...goals, [areaId]: [...(goals[areaId] || []), { id: uid(), text, done: false }] };
    persistGoals(next);
    setNewGoalText({ ...newGoalText, [areaId]: "" });
  };
  const toggleGoal = (areaId, id) => {
    const next = { ...goals, [areaId]: goals[areaId].map((g) => (g.id === id ? { ...g, done: !g.done } : g)) };
    persistGoals(next);
  };
  const removeGoal = (areaId, id) => {
    persistGoals({ ...goals, [areaId]: goals[areaId].filter((g) => g.id !== id) });
  };

  // ---------- calendar actions ----------
  const addEvent = (dateKey, areaId, text) => {
    if (!text.trim()) return;
    const ev = { id: uid(), area: areaId, text: text.trim() };
    const next = { ...events, [dateKey]: events[dateKey] ? [...events[dateKey], ev] : [ev] };
    persistEvents(next);
  };
  const removeEvent = (dateKey, id) => {
    const next = { ...events, [dateKey]: (events[dateKey] || []).filter((e) => e.id !== id) };
    persistEvents(next);
  };

  const grid = useMemo(() => getMonthGrid(calYear, calMonth), [calYear, calMonth]);
  const goPrevMonth = () => {
    const m = calMonth === 0 ? 11 : calMonth - 1;
    const y = calMonth === 0 ? calYear - 1 : calYear;
    setCalMonth(m);
    setCalYear(y);
  };
  const goNextMonth = () => {
    const m = calMonth === 11 ? 0 : calMonth + 1;
    const y = calMonth === 11 ? calYear + 1 : calYear;
    setCalMonth(m);
    setCalYear(y);
  };
  const goToday = () => {
    const now = new Date();
    setCalYear(now.getFullYear());
    setCalMonth(now.getMonth());
    setSelectedDate(todayKey());
  };

  const submitRelEvent = () => {
    if (relTypeOpen === "dalje") addEvent(relDate, "marredhenie", `Dalje me Blenden${relNote ? ": " + relNote : ""}`);
    if (relTypeOpen === "udhetim") addEvent(relDate, "marredhenie", `Udhetim me Blenden${relNote ? ": " + relNote : ""}`);
    setRelTypeOpen(null);
    setRelNote("");
  };

  if (!authed) {
    return <PasswordGate onUnlock={() => setAuthed(true)} />;
  }

  if (!ready) {
    return (
      <div style={S.loadingWrap}>
        <style>{css}</style>
        <div style={S.loadingText}>Duke hapur regjistrin...</div>
      </div>
    );
  }

  return (
    <div style={S.page}>
      <style>{css}</style>

      <header style={S.header}>
        <div>
          <div style={S.kicker}>Regjistri Ditor</div>
          <h1 style={S.title}>{dayLabelSq(key)}</h1>
          <span style={{ ...S.saveIndicator, opacity: saveState === "saving" || saveState === "saved" ? 1 : 0 }}>
            {saveState === "saving" ? "duke ruajtur..." : saveState === "saved" ? "ruajtur \u2713" : ""}
          </span>
        </div>
        <div style={S.headerRight}>
          <div style={S.quickIconRow}>
            <button onClick={() => setTab("sot")} style={{ ...S.quickIconBtn, ...(tab === "sot" ? S.quickIconBtnActive : {}) }} aria-label="Sot" title="Sot">✍️</button>
            <button onClick={() => setTab("kalendari")} style={{ ...S.quickIconBtn, ...(tab === "kalendari" ? S.quickIconBtnActive : {}) }} aria-label="Kalendari" title="Kalendari">📅</button>
            <button onClick={() => setTab("historia")} style={{ ...S.quickIconBtn, ...(tab === "historia" ? S.quickIconBtnActive : {}) }} aria-label="Historia" title="Historia">📊</button>
          </div>
          <div style={S.streakBox}>
            <div style={S.streakNum}>{streak}</div>
            <div style={S.streakLabel}>dite rresht</div>
            <div style={S.clockLabel}>{clock}</div>
          </div>
        </div>
      </header>

      {tab === "sot" && (
        <main style={S.main}>
          <section style={S.entry}>
            <div style={S.quickLogRow}>
              <input
                value={quickText}
                onChange={(e) => setQuickText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addQuickEntry()}
                placeholder="Sapo... (p.sh. hengra chicken fingers, mbarova kursin e anglishtes)"
                style={S.quickLogInput}
              />
              <button onClick={addQuickEntry} style={S.quickLogBtn} aria-label="shto">+</button>
            </div>
            {quickLog.length > 0 && (
              <div style={S.quickLogList}>
                {quickLog.map((e) => (
                  <div key={e.id} style={S.quickLogItem}>
                    <span style={S.quickLogTime}>{e.time}</span>
                    <span style={S.quickLogText}>{e.text}</span>
                    <button onClick={() => removeQuickEntry(e.id)} style={S.habitRemove} aria-label="fshi">×</button>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section style={S.entry}>
            <div style={S.entryHead}>
              <span style={S.entryLabel}>Tri prioritetet</span>
              <span style={S.entryMeta}>{completedCount}/3</span>
            </div>
            {day.priorities.map((p, i) => (
              <div key={i} style={S.priorityRow}>
                <button onClick={() => toggleDone(i)} style={{ ...S.checkbox, ...(day.done[i] ? S.checkboxDone : {}) }}>
                  {day.done[i] ? "\u2713" : ""}
                </button>
                <input
                  value={p}
                  onChange={(e) => setPriority(i, e.target.value)}
                  placeholder={`Prioriteti ${i + 1}`}
                  style={{ ...S.priorityInput, ...(day.done[i] ? S.priorityInputDone : {}) }}
                />
              </div>
            ))}
          </section>

          <section style={S.entry}>
            <div style={S.entryHead}>
              <span style={S.entryLabel}>Zakone</span>
              <span style={S.entryMeta}>{habitsCompleted}/{habitsList.length}</span>
            </div>
            <div style={S.habitGrid}>
              {habitsList.map((h) => {
                const ac = areaById[h.area]?.color || "#A9A092";
                return (
                  <div key={h.id} style={S.habitChipWrap}>
                    <button
                      onClick={() => toggleHabit(h.id)}
                      style={{
                        ...S.habitChip,
                        borderColor: ac,
                        ...(day.habits[h.id] ? { background: ac, color: "#F6F1E8" } : { color: "#22303C" }),
                      }}
                    >
                      {h.text}
                    </button>
                    <button onClick={() => removeHabit(h.id)} style={S.habitRemove} aria-label="fshi zakonin">×</button>
                  </div>
                );
              })}
            </div>
            <div style={S.addRow}>
              <select value={newHabitArea} onChange={(e) => setNewHabitArea(e.target.value)} style={S.addSelect}>
                {AREAS.map((a) => (
                  <option key={a.id} value={a.id}>{a.label}</option>
                ))}
              </select>
              <input
                value={newHabit}
                onChange={(e) => setNewHabit(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addHabit()}
                placeholder="Shto zakon te ri..."
                style={S.addInput}
              />
              <button onClick={addHabit} style={S.addBtn}>Shto</button>
            </div>
          </section>

          <section style={S.entry}>
            <div style={S.entryHead}><span style={S.entryLabel}>Energjia</span></div>
            <div style={S.energyRow}>
              {[1, 2, 3, 4, 5].map((v) => (
                <button key={v} onClick={() => setEnergy(v)} style={{ ...S.energyDot, ...(day.energy === v ? S.energyDotActive : {}) }}>
                  {v}
                </button>
              ))}
            </div>
          </section>

          <section style={S.entry}>
            <div style={S.entryHead}><span style={S.entryLabel}>Shenim i shpejte</span></div>
            <textarea
              value={day.note}
              onChange={(e) => updateDay({ note: e.target.value })}
              placeholder="Dicka per ta mbajtur mend nga sot..."
              style={S.noteArea}
            />
          </section>
        </main>
      )}

      {NAV_GROUPS.some((g) => g.id === tab) && (
        <main style={S.main}>
          {NAV_GROUPS.find((g) => g.id === tab).areas.map((areaId) => areaById[areaId]).map((a) => {
            const list = goals[a.id] || [];
            const doneCount = list.filter((g) => g.done).length;
            const pct = list.length ? Math.round((doneCount / list.length) * 100) : 0;
            return (
              <section key={a.id} style={S.entry}>
                <div style={S.entryHead}>
                  <span style={{ ...S.entryLabel, color: a.color }}>{a.label}</span>
                  <span style={S.entryMeta}>{doneCount}/{list.length}</span>
                </div>

                {a.id === "ushqim" && (
                  <div style={{ ...S.callout, borderColor: a.color }}>
                    Rregulli: ushqim healthy — pa cokollata, pa yndyrna, pa pije te gazuara, pa buke te bardhe.
                    Zakonet perkatese jane ne skeden "Sot".
                  </div>
                )}

                {a.id === "biznesi" && (
                  <div style={S.bizCards}>
                    <div style={S.bizCard}>
                      <div style={S.bizCardTitle}>Molto Studios</div>
                      <div style={S.bizCardText}>Analiza direkt nga paneli i Molto Studios.</div>

                      {moltoState.status === "loading" && <div style={S.emptyHint}>Duke marre te dhenat...</div>}
                      {moltoState.status === "error" && <div style={S.emptyHint}>S'u lidh dot me Molto Studios. Provo perseri.</div>}
                      {moltoState.status === "ready" && (
                        <div style={S.moltoStats}>
                          <div style={S.moltoStatRow}>
                            <span style={S.moltoStatLabel}>Sot</span>
                            <span style={S.moltoStatValue}>{moltoState.todayCount} rezervime &middot; {moltoState.todayTotal.toFixed(0)}&euro;</span>
                          </div>
                          <div style={S.moltoStatRow}>
                            <span style={S.moltoStatLabel}>Ky muaj</span>
                            <span style={S.moltoStatValue}>{moltoState.monthCount} rezervime &middot; te ardhura {moltoState.monthRevenue.toFixed(0)}&euro;</span>
                          </div>
                          <div style={S.moltoStatRow}>
                            <span style={S.moltoStatLabel}>Shpenzime (muaj)</span>
                            <span style={S.moltoStatValue}>{moltoState.monthExpenses.toFixed(0)}&euro;</span>
                          </div>
                          <div style={S.moltoStatRow}>
                            <span style={S.moltoStatLabel}>Fitimi (muaj)</span>
                            <span style={{ ...S.moltoStatValue, fontWeight: 700, color: a.color }}>{moltoState.monthProfit.toFixed(0)}&euro;</span>
                          </div>
                          <div style={S.moltoUpdated}>
                            perditesuar ne {moltoState.updatedAt}
                            <button onClick={fetchMoltoStats} style={S.moltoRefreshBtn} aria-label="rifresko">&#8635;</button>
                          </div>
                        </div>
                      )}

                      <a href="https://molto-studios.vercel.app" target="_blank" rel="noreferrer" style={{ ...S.bizCardBtn, background: a.color }}>
                        Hap Molto Studios
                      </a>
                    </div>
                    <div style={S.bizCard}>
                      <div style={S.bizCardTitle}>Patron Dantel</div>
                      <div style={S.bizCardText}>Inventari, shitjet dhe klientet e Patron Dantel.</div>
                      <a href="https://patron-dantel-yqhq.vercel.app" target="_blank" rel="noreferrer" style={{ ...S.bizCardBtn, background: a.color }}>
                        Hap Patron Dantel
                      </a>
                    </div>
                  </div>
                )}

                {a.id === "gym" && (
                  <div style={{ ...S.callout, borderColor: a.color }}>
                    Programi: 2 jave ecje/vrapim 1 ore &rarr; 2 jave ecje/vrapim + barku &rarr; pas 1 muaji, force per muskuj.
                    Shiko oraret dite-pas-dite ne skeden "Kalendari".
                  </div>
                )}

                {a.id === "marredhenie" && (
                  <>
                    <div style={S.quickRow}>
                      <button style={{ ...S.addBtn, background: a.color }} onClick={() => setRelTypeOpen("dalje")}>+ Dalje me Blenden</button>
                      <button style={{ ...S.addBtn, background: a.color }} onClick={() => setRelTypeOpen("udhetim")}>+ Udhetim me Blenden</button>
                    </div>
                    {relTypeOpen && (
                      <div style={S.addRow}>
                        <input type="date" value={relDate} onChange={(e) => setRelDate(e.target.value)} style={S.addInput} />
                        <input
                          value={relNote}
                          onChange={(e) => setRelNote(e.target.value)}
                          placeholder="Shenim (opsionale)"
                          style={S.addInput}
                        />
                        <button onClick={submitRelEvent} style={{ ...S.addBtn, background: a.color }}>Ruaj ne kalendar</button>
                      </div>
                    )}
                    <div style={S.tipsBox}>
                      {RELATIONSHIP_TIPS.map((t, i) => (
                        <div key={i} style={S.tipRow}>• {t}</div>
                      ))}
                    </div>
                  </>
                )}

                {a.id === "relax" && (
                  <div style={S.tipsBox}>
                    {RELAX_TIPS.map((t, i) => (
                      <div key={i} style={S.tipRow}>• {t}</div>
                    ))}
                  </div>
                )}

                <div style={S.progressTrack}>
                  <div style={{ ...S.progressFill, width: `${pct}%`, background: a.color }} />
                </div>
                <div style={{ marginTop: 14 }}>
                  {list.map((g) => (
                    <div key={g.id} style={S.goalRow}>
                      <button
                        onClick={() => toggleGoal(a.id, g.id)}
                        style={{ ...S.checkbox, ...(g.done ? { background: a.color, borderColor: a.color, color: "#F6F1E8" } : {}) }}
                      >
                        {g.done ? "\u2713" : ""}
                      </button>
                      <span style={{ ...S.goalText, ...(g.done ? S.goalTextDone : {}) }}>{g.text}</span>
                      <button onClick={() => removeGoal(a.id, g.id)} style={S.habitRemove} aria-label="fshi">×</button>
                    </div>
                  ))}
                  {!list.length && <div style={S.emptyHint}>Ende s'ke shenuar synime ketu.</div>}
                </div>
                <div style={S.addRow}>
                  <input
                    value={newGoalText[a.id] || ""}
                    onChange={(e) => setNewGoalText({ ...newGoalText, [a.id]: e.target.value })}
                    onKeyDown={(e) => e.key === "Enter" && addGoal(a.id)}
                    placeholder="Shto nje synim..."
                    style={S.addInput}
                  />
                  <button onClick={() => addGoal(a.id)} style={{ ...S.addBtn, background: a.color }}>Shto</button>
                </div>
              </section>
            );
          })}
        </main>
      )}

      {tab === "kalendari" && (
        <main style={S.main}>
          <section style={S.entry}>
            <div style={S.calHeader}>
              <button onClick={goPrevMonth} style={S.calNavBtn}>‹</button>
              <div style={S.calTitle}>{MUAJ[calMonth]} {calYear}</div>
              <button onClick={goNextMonth} style={S.calNavBtn}>›</button>
              <button onClick={goToday} style={S.calTodayBtn}>Sot</button>
            </div>
            <div style={S.calWeekRow}>
              {DITE_SHKURT.map((d) => (
                <div key={d} style={S.calWeekDay}>{d}</div>
              ))}
            </div>
            <div style={S.calGrid}>
              {grid.map(({ date, outside }) => {
                const k = todayKey(date);
                const evs = events[k] || [];
                const isToday = k === todayKey();
                const isSelected = k === selectedDate;
                return (
                  <button
                    key={k}
                    onClick={() => setSelectedDate(k)}
                    style={{
                      ...S.calCell,
                      ...(outside ? S.calCellOutside : {}),
                      ...(isToday ? S.calCellToday : {}),
                      ...(isSelected ? S.calCellSelected : {}),
                    }}
                  >
                    <span style={S.calDayNum}>{date.getDate()}</span>
                    <span style={S.calDots}>
                      {evs.slice(0, 4).map((e) => (
                        <span key={e.id} style={{ ...S.calDot, background: areaById[e.area]?.color || "#999" }} />
                      ))}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          <section style={S.entry}>
            <div style={S.entryHead}>
              <span style={S.entryLabel}>{dayLabelSq(selectedDate)}</span>
            </div>
            <div>
              {(events[selectedDate] || []).map((e) => (
                <div key={e.id} style={S.goalRow}>
                  <span style={{ ...S.calDot, background: areaById[e.area]?.color || "#999", marginRight: 4 }} />
                  <span style={S.goalText}>{e.text}</span>
                  <button onClick={() => removeEvent(selectedDate, e.id)} style={S.habitRemove} aria-label="fshi">×</button>
                </div>
              ))}
              {!(events[selectedDate] || []).length && <div style={S.emptyHint}>Asnje ngjarje per kete dite.</div>}
            </div>
            <div style={S.addRow}>
              <select value={newEventArea} onChange={(e) => setNewEventArea(e.target.value)} style={S.addSelect}>
                {AREAS.map((a) => (
                  <option key={a.id} value={a.id}>{a.label}</option>
                ))}
              </select>
              <input
                value={newEventText}
                onChange={(e) => setNewEventText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    addEvent(selectedDate, newEventArea, newEventText);
                    setNewEventText("");
                  }
                }}
                placeholder="Shto ngjarje..."
                style={S.addInput}
              />
              <button
                onClick={() => {
                  addEvent(selectedDate, newEventArea, newEventText);
                  setNewEventText("");
                }}
                style={S.addBtn}
              >
                Shto
              </button>
            </div>
          </section>
        </main>
      )}

      {tab === "historia" && (
        <main style={S.main}>
          <section style={S.entry}>
            <div style={S.entryHead}><span style={S.entryLabel}>14 ditet e fundit</span></div>
            <div style={S.historyList}>
              {Object.entries({ ...history, [key]: day })
                .sort((a, b) => (a[0] < b[0] ? 1 : -1))
                .map(([k, entry]) => {
                  const doneP = entry.done?.filter(Boolean).length || 0;
                  const doneH = Object.values(entry.habits || {}).filter(Boolean).length;
                  return (
                    <div key={k} style={S.historyRow}>
                      <span style={S.historyDate}>{dayLabelSq(k)}</span>
                      <span style={S.historyMeta}>
                        {doneP}/3 prioritete · {doneH} zakone{entry.energy ? ` · energji ${entry.energy}` : ""}
                      </span>
                    </div>
                  );
                })}
            </div>
          </section>
        </main>
      )}

      <footer style={S.footer}>e ruajtur vetem per ty, ne kete pajisje</footer>

      <nav style={S.bottomNav}>
        {NAV_GROUPS.map((grp) => (
          <button
            key={grp.id}
            onClick={() => setTab(grp.id)}
            style={{
              ...S.bottomNavBtn,
              ...(tab === grp.id ? { ...S.bottomNavBtnActive, color: grp.color } : {}),
            }}
          >
            <span style={{ ...S.bottomNavDot, background: grp.color, opacity: tab === grp.id ? 1 : 0.35 }} />
            <span>{grp.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}

const css = `
  * { box-sizing: border-box; }
  html, body, #root { width: 100%; }
  input, textarea, button, select { font-family: inherit; }
  input:focus, textarea:focus, button:focus-visible, select:focus { outline: 2px solid #BF9B30; outline-offset: 2px; }
  ::placeholder { color: #9C9184; }
`;

const S = {
  page: { fontFamily: "'Iowan Old Style','Palatino Linotype',Georgia,serif", background: "#EFEAE1", color: "#22303C", minHeight: "100%", width: "100%", padding: "32px clamp(20px, 5vw, 64px) calc(88px + env(safe-area-inset-bottom))", maxWidth: 1080, margin: "0 auto", boxSizing: "border-box" },
  loadingWrap: { minHeight: 200, display: "flex", alignItems: "center", justifyContent: "center", background: "#EFEAE1" },
  loadingText: { fontFamily: "Georgia,serif", color: "#6B6255" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-end", borderBottom: "2px solid #22303C", paddingBottom: 14, marginBottom: 6 },
  kicker: { fontSize: 12, letterSpacing: "0.04em", color: "#A63D40", marginBottom: 4 },
  title: { fontSize: 26, margin: 0, fontWeight: 600, color: "#22303C" },
  headerRight: { display: "flex", alignItems: "center", gap: 14 },
  quickIconRow: { display: "flex", gap: 6 },
  quickIconBtn: { fontSize: 16, width: 32, height: 32, borderRadius: 8, border: "1px solid #D8CFC0", background: "#F7F3EC", cursor: "pointer" },
  quickIconBtnActive: { borderColor: "#22303C", background: "#22303C" },
  streakBox: { textAlign: "center", minWidth: 64 },
  streakNum: { fontSize: 28, fontWeight: 700, color: "#BF9B30", lineHeight: 1 },
  streakLabel: { fontSize: 11, color: "#6B6255", marginTop: 2 },
  clockLabel: { fontSize: 11, color: "#9C9184", marginTop: 2, fontFamily: "system-ui,sans-serif" },
  bottomNav: {
    position: "fixed",
    bottom: 0,
    left: 0,
    right: 0,
    display: "flex",
    justifyContent: "space-around",
    alignItems: "center",
    background: "#F7F3EC",
    borderTop: "1px solid #D8CFC0",
    padding: "8px 4px calc(8px + env(safe-area-inset-bottom))",
    maxWidth: 1080,
    margin: "0 auto",
    zIndex: 50,
  },
  bottomNavBtn: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 2,
    flex: 1,
    fontFamily: "system-ui,sans-serif",
    fontSize: 11,
    color: "#9C9184",
    background: "none",
    border: "none",
    cursor: "pointer",
    padding: "4px 2px",
  },
  bottomNavBtnActive: { color: "#22303C", fontWeight: 700 },
  bottomNavIcon: { fontSize: 20, lineHeight: 1 },
  bottomNavDot: { width: 8, height: 8, borderRadius: "50%" },
  saveIndicator: { display: "block", marginTop: 4, fontSize: 11, color: "#6B8F71", fontFamily: "system-ui,sans-serif", transition: "opacity .3s" },
  main: { display: "flex", flexDirection: "column", gap: 22 },
  entry: { borderBottom: "1px solid #D8CFC0", paddingBottom: 20 },
  entryHead: { display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12 },
  entryLabel: { fontSize: 15, fontWeight: 600, color: "#22303C" },
  entryMeta: { fontFamily: "system-ui,sans-serif", fontSize: 12, color: "#6B6255" },
  priorityRow: { display: "flex", alignItems: "center", gap: 10, marginBottom: 8 },
  checkbox: { width: 22, height: 22, borderRadius: 4, border: "1.5px solid #A9A092", background: "transparent", color: "#F6F1E8", fontSize: 13, lineHeight: 1, cursor: "pointer", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" },
  checkboxDone: { background: "#22303C", borderColor: "#22303C" },
  priorityInput: { flex: 1, fontFamily: "system-ui,sans-serif", fontSize: 15, padding: "8px 2px", border: "none", borderBottom: "1px solid #D8CFC0", background: "transparent", color: "#22303C" },
  priorityInputDone: { color: "#9C9184", textDecoration: "line-through" },
  habitGrid: { display: "flex", flexWrap: "wrap", gap: 8 },
  habitChipWrap: { position: "relative", display: "inline-flex" },
  habitChip: { fontFamily: "system-ui,sans-serif", fontSize: 13, padding: "8px 26px 8px 14px", borderRadius: 20, border: "1.5px solid", background: "transparent", cursor: "pointer" },
  habitRemove: { position: "absolute", right: 4, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "inherit", opacity: 0.6, cursor: "pointer", fontSize: 15, padding: 4 },
  addRow: { display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" },
  addSelect: { fontFamily: "system-ui,sans-serif", fontSize: 13, padding: "8px 8px", borderRadius: 8, border: "1px solid #D8CFC0", background: "#F7F3EC", color: "#22303C" },
  addInput: { flex: 1, minWidth: 120, fontFamily: "system-ui,sans-serif", fontSize: 13, padding: "8px 10px", borderRadius: 8, border: "1px solid #D8CFC0", background: "#F7F3EC", color: "#22303C" },
  addBtn: { fontFamily: "system-ui,sans-serif", fontSize: 13, padding: "8px 16px", borderRadius: 8, border: "none", background: "#22303C", color: "#F6F1E8", cursor: "pointer" },
  energyRow: { display: "flex", gap: 10 },
  energyDot: { width: 38, height: 38, borderRadius: "50%", border: "1.5px solid #A9A092", background: "transparent", color: "#22303C", fontFamily: "system-ui,sans-serif", fontSize: 14, cursor: "pointer" },
  energyDotActive: { background: "#BF9B30", borderColor: "#BF9B30", color: "#22303C", fontWeight: 700 },
  noteArea: { width: "100%", minHeight: 64, fontFamily: "system-ui,sans-serif", fontSize: 14, padding: 10, borderRadius: 8, border: "1px solid #D8CFC0", background: "#F7F3EC", color: "#22303C", resize: "vertical" },
  areaPills: { display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 20 },
  areaPill: { fontFamily: "system-ui,sans-serif", fontSize: 13, padding: "8px 14px", borderRadius: 20, border: "1.5px solid", background: "transparent", cursor: "pointer" },
  progressTrack: { height: 6, background: "#E1D9CA", borderRadius: 4, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 4, transition: "width .3s" },
  goalRow: { display: "flex", alignItems: "center", gap: 10, marginBottom: 8, position: "relative" },
  goalText: { flex: 1, fontFamily: "system-ui,sans-serif", fontSize: 14 },
  goalTextDone: { color: "#9C9184", textDecoration: "line-through" },
  emptyHint: { fontFamily: "system-ui,sans-serif", fontSize: 13, color: "#9C9184", fontStyle: "italic" },
  historyList: { display: "flex", flexDirection: "column", gap: 10 },
  historyRow: { display: "flex", justifyContent: "space-between", fontFamily: "system-ui,sans-serif", fontSize: 13 },
  historyDate: { color: "#22303C", fontWeight: 600 },
  historyMeta: { color: "#6B6255" },
  footer: { textAlign: "center", fontFamily: "system-ui,sans-serif", fontSize: 11, color: "#9C9184", marginTop: 30 },
  callout: { fontFamily: "system-ui,sans-serif", fontSize: 13, padding: "10px 12px", borderLeft: "3px solid", background: "#F7F3EC", marginBottom: 14, lineHeight: 1.5 },
  bizCards: { display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 },
  bizCard: { border: "1px solid #D8CFC0", borderRadius: 10, padding: 14, background: "#F7F3EC" },
  bizCardTitle: { fontSize: 15, fontWeight: 700, marginBottom: 4 },
  bizCardText: { fontFamily: "system-ui,sans-serif", fontSize: 13, color: "#6B6255", marginBottom: 10 },
  bizCardBtn: { display: "inline-block", fontFamily: "system-ui,sans-serif", fontSize: 13, padding: "8px 14px", borderRadius: 8, color: "#F6F1E8", textDecoration: "none" },
  moltoStats: { fontFamily: "system-ui,sans-serif", display: "flex", flexDirection: "column", gap: 6, background: "#FFFFFF", border: "1px solid #D8CFC0", borderRadius: 8, padding: "10px 12px", marginBottom: 10 },
  moltoStatRow: { display: "flex", justifyContent: "space-between", fontSize: 13 },
  moltoStatLabel: { color: "#6B6255" },
  moltoStatValue: { color: "#22303C" },
  moltoUpdated: { display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 8, fontSize: 11, color: "#9C9184", marginTop: 2 },
  moltoRefreshBtn: { background: "none", border: "none", cursor: "pointer", fontSize: 13, color: "#6B6255", padding: 0 },
  quickRow: { display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" },
  tipsBox: { fontFamily: "system-ui,sans-serif", fontSize: 13, color: "#4A4238", lineHeight: 1.6, marginBottom: 16, display: "flex", flexDirection: "column", gap: 4 },
  tipRow: {},
  calHeader: { display: "flex", alignItems: "center", gap: 10, marginBottom: 14 },
  calNavBtn: { fontFamily: "system-ui,sans-serif", fontSize: 18, width: 32, height: 32, borderRadius: 8, border: "1px solid #D8CFC0", background: "#F7F3EC", cursor: "pointer" },
  calTitle: { fontSize: 17, fontWeight: 600, flex: 1, textAlign: "center" },
  calTodayBtn: { fontFamily: "system-ui,sans-serif", fontSize: 12, padding: "6px 10px", borderRadius: 8, border: "1px solid #D8CFC0", background: "#F7F3EC", cursor: "pointer" },
  calWeekRow: { display: "grid", gridTemplateColumns: "repeat(7,1fr)", marginBottom: 4 },
  calWeekDay: { fontFamily: "system-ui,sans-serif", fontSize: 11, textAlign: "center", color: "#9C9184" },
  calGrid: { display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 4 },
  calCell: { display: "flex", flexDirection: "column", alignItems: "center", gap: 4, padding: "8px 2px", borderRadius: 8, border: "1px solid transparent", background: "transparent", cursor: "pointer", minHeight: 46 },
  calCellOutside: { opacity: 0.35 },
  calCellToday: { border: "1px solid #BF9B30" },
  calCellSelected: { background: "#22303C", color: "#F6F1E8" },
  calDayNum: { fontFamily: "system-ui,sans-serif", fontSize: 13 },
  calDots: { display: "flex", gap: 2, minHeight: 6 },
  calDot: { width: 5, height: 5, borderRadius: "50%" },
  gateWrap: { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#EFEAE1", fontFamily: "'Iowan Old Style','Palatino Linotype',Georgia,serif", padding: 20 },
  gateCard: { width: "100%", maxWidth: 320, background: "#F7F3EC", border: "1px solid #D8CFC0", borderRadius: 12, padding: "28px 24px", textAlign: "center" },
  gateInput: { width: "100%", fontFamily: "system-ui,sans-serif", fontSize: 15, padding: "10px 12px", borderRadius: 8, border: "1px solid #D8CFC0", background: "#FFFFFF", color: "#22303C" },
  gateError: { fontFamily: "system-ui,sans-serif", fontSize: 12, color: "#A63D40", marginTop: 8 },
  quickLogRow: { display: "flex", gap: 8 },
  quickLogInput: { flex: 1, fontFamily: "system-ui,sans-serif", fontSize: 16, padding: "14px 16px", borderRadius: 12, border: "1.5px solid #22303C", background: "#FFFFFF", color: "#22303C" },
  quickLogBtn: { fontFamily: "system-ui,sans-serif", fontSize: 22, width: 50, height: 50, borderRadius: 12, border: "none", background: "#22303C", color: "#F6F1E8", cursor: "pointer", flexShrink: 0 },
  quickLogList: { display: "flex", flexDirection: "column", gap: 6, marginTop: 14 },
  quickLogItem: { display: "flex", alignItems: "center", gap: 10, position: "relative" },
  quickLogTime: { fontFamily: "system-ui,sans-serif", fontSize: 12, color: "#9C9184", minWidth: 40 },
  quickLogText: { flex: 1, fontFamily: "system-ui,sans-serif", fontSize: 14, color: "#22303C" },
};
