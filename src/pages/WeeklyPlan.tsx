import { useEffect, useMemo, useState } from "react";

type Phase = "BASE" | "BUILD" | "PEAK" | "TAPER";

const SHIP_DATE_STORAGE_KEY = "buds-prep-ship-date";
const DEFAULT_SHIP_DATE = "2026-08-11";

/**
 * Maps weeks remaining until ship date to a training phase.
 * Edit here to retune the program's periodization.
 */
function getPhase(weeksRemaining: number): Phase {
    if (weeksRemaining <= 0) return "TAPER";
    if (weeksRemaining === 1) return "PEAK";
    if (weeksRemaining <= 4) return "BUILD";
    return "BASE";
}

function getWeeksRemaining(shipDate: Date, today: Date): number {
    const msPerDay = 86400000;
    const dayOnly = (d: Date) =>
        new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    const diffDays = Math.round(
        (dayOnly(shipDate) - dayOnly(today)) / msPerDay,
    );
    return Math.ceil(diffDays / 7);
}

interface Exercise {
    name: string;
    reps: string;
    note: string;
}

interface Block {
    name: string;
    type: string;
    exercises: Exercise[];
}

interface KBWorkout {
    id: string;
    title: string;
    focus: string;
    color: string;
    warmup: string[];
    blocks: Block[];
    finisher: string;
}

interface RunSession {
    type: string;
    duration: string;
    pace: string;
    hr: string;
    note: string;
    color: string;
}

type DaySlot =
    | { day: string; kind: "KB"; workout: KBWorkout }
    | { day: string; kind: "RUN"; session: RunSession }
    | { day: string; kind: "REST" };

const KB_A: KBWorkout = {
    id: "A",
    title: "POWER + PUSH",
    focus: "Hip explosiveness, pushing endurance, grip",
    color: "#4ade80",
    warmup: [
        "2 min jump rope or high knees",
        "10 hip circles each direction",
        "10 KB deadlifts (light — just hinge practice)",
        "10 arm circles each direction",
    ],
    blocks: [
        {
            name: "BLOCK 1 — KB POWER",
            type: "3 rounds, 90s rest between rounds",
            exercises: [
                {
                    name: "KB Swing (2-hand)",
                    reps: "15 reps",
                    note: "Drive hips, not arms — this is a hip hinge",
                },
                {
                    name: "KB Goblet Squat",
                    reps: "12 reps",
                    note: "Heels down, chest up, pause at bottom",
                },
                {
                    name: "KB Single-Leg RDL",
                    reps: "10 reps each leg",
                    note: "Slow and controlled — knee rehab bonus",
                },
            ],
        },
        {
            name: "BLOCK 2 — PUSH SUPERSET",
            type: "4 rounds, 60s rest between rounds",
            exercises: [
                {
                    name: "Pushups",
                    reps: "20 reps",
                    note: "Full range, chest to deck",
                },
                {
                    name: "KB Floor Press",
                    reps: "12 reps",
                    note: "Lie on back, press KB up — unilateral stability",
                },
                {
                    name: "KB Tricep Overhead Extension",
                    reps: "12 reps",
                    note: "Lockout at top, elbows tight",
                },
            ],
        },
        {
            name: "BLOCK 3 — GRIP + CORE",
            type: "3 rounds, 60s rest",
            exercises: [
                {
                    name: "KB Farmer Carry",
                    reps: "40 yards (one hand)",
                    note: "Switch hands each round — brutal grip endurance",
                },
                {
                    name: "Flutter Kicks",
                    reps: "4-count x 20",
                    note: "Hands flat, lower back pressed down",
                },
                {
                    name: "KB Overhead Hold",
                    reps: "45 seconds",
                    note: "One arm locked out — mimics log PT overhead position",
                },
            ],
        },
    ],
    finisher:
        "100 pushups — any sets/reps, 60s max rest between sets. Track total time.",
};

const KB_B: KBWorkout = {
    id: "B",
    title: "PULL + HINGE",
    focus: "Pulling strength, posterior chain, core",
    color: "#facc15",
    warmup: [
        "10 KB halos each direction",
        "10 band pull-aparts or arm circles",
        "5 slow pullups (dead hang to chin, 3s down)",
        "10 cat-cow spinal mobility",
    ],
    blocks: [
        {
            name: "BLOCK 1 — PULL VOLUME",
            type: "Pyramid — rest = reps in seconds",
            exercises: [
                {
                    name: "Pullups",
                    reps: "1-2-3-4-5-4-3-2-1",
                    note: "Dead hang each rep, full extension at bottom",
                },
                {
                    name: "KB Bent-Over Row",
                    reps: "10 reps each arm per set",
                    note: "Hinge 45°, row to hip, squeeze at top",
                },
            ],
        },
        {
            name: "BLOCK 2 — HINGE COMPLEX",
            type: "4 rounds, 90s rest",
            exercises: [
                {
                    name: "KB Swing",
                    reps: "20 reps",
                    note: "Explosive hip snap — power, not cardio",
                },
                {
                    name: "KB Sumo Deadlift",
                    reps: "10 reps",
                    note: "Wide stance, KB between feet, chest tall",
                },
                {
                    name: "KB Good Morning",
                    reps: "12 reps",
                    note: "KB at chest, hinge until hamstring tension, drive hips forward",
                },
            ],
        },
        {
            name: "BLOCK 3 — CORE + CARRY",
            type: "3 rounds, 60s rest",
            exercises: [
                {
                    name: "KB Suitcase Carry",
                    reps: "40 yards each hand",
                    note: "Stay tall, don't lean — anti-lateral flexion",
                },
                {
                    name: "Hollow Body Hold",
                    reps: "30 seconds",
                    note: "Lower back glued to floor",
                },
                {
                    name: "KB Weighted Situp",
                    reps: "15 reps",
                    note: "KB held at chest — adds load to your PST movement",
                },
            ],
        },
    ],
    finisher:
        "Max pullups in 10 minutes — every time you drop, do 10 KB swings before getting back on the bar. Track total pullups.",
};

const KB_C_ROUNDS: Record<Phase, number> = {
    BASE: 6,
    BUILD: 7,
    PEAK: 8,
    TAPER: 4,
};

function buildKbC(phase: Phase): KBWorkout {
    const rounds = KB_C_ROUNDS[phase];
    return {
        id: "C",
        title: "GRINDER CIRCUIT",
        focus: "Sustained output under fatigue — closest BUD/S simulation",
        color: "#f97316",
        warmup: [
            "400m easy jog",
            "10 KB deadlifts",
            "10 pushups",
            "5 pullups",
            "Hip flexor stretch 30s each side",
        ],
        blocks: [
            {
                name: "THE CIRCUIT",
                type: `${rounds} rounds continuous — note your total time`,
                exercises: [
                    {
                        name: "KB Swing",
                        reps: "10 reps",
                        note: "Every round — reset mechanics each set",
                    },
                    {
                        name: "Pushups",
                        reps: "15 reps",
                        note: "Every round — no snaking",
                    },
                    {
                        name: "KB Goblet Squat",
                        reps: "10 reps",
                        note: "Every round — heels down",
                    },
                    { name: "Situps", reps: "15 reps", note: "Every round" },
                    {
                        name: "KB Overhead Hold",
                        reps: "30 seconds",
                        note: "Every round — one or two arms",
                    },
                    {
                        name: "Pullups",
                        reps: "5 reps",
                        note: "Every round — sub ring rows if pinky needs it",
                    },
                ],
            },
            {
                name: "BURNOUT",
                type: `Immediately after round ${rounds}, no rest`,
                exercises: [
                    {
                        name: "KB Farmer Carry",
                        reps: "100 yards continuous",
                        note: "Switch hands at 50 yards",
                    },
                    {
                        name: "Max Pushups",
                        reps: "One set to failure",
                        note: "Log this number — fatigued max is useful data",
                    },
                    {
                        name: "Flutter Kicks",
                        reps: "4-count x 25",
                        note: "Finish strong",
                    },
                ],
            },
        ],
        finisher:
            "1.5-mile run immediately after — note your time. Fatigued run pace is very important.",
    };
}

const TEMPO_BY_PHASE: Record<
    Phase,
    { duration: string; pace: string; note: string }
> = {
    BASE: {
        duration: "4 miles total",
        pace: "6:20–6:30/mi (tempo miles)",
        note: "1 mi easy warmup → 2×1 mi at 6:20–6:30 w/ 90s standing rest → 1 mi easy cooldown. Log both tempo mile times.",
    },
    BUILD: {
        duration: "4.5 miles total",
        pace: "6:10–6:20/mi (tempo miles)",
        note: "1 mi easy warmup → 2×1.25 mi at 6:10–6:20 w/ 90s standing rest → 1 mi easy cooldown. Log both tempo mile times.",
    },
    PEAK: {
        duration: "5 miles total",
        pace: "6:05–6:15/mi (tempo miles)",
        note: "1 mi easy warmup → 2×1.5 mi at 6:05–6:15 w/ 90s standing rest → 1 mi easy cooldown. This is your hardest tempo of the program.",
    },
    TAPER: {
        duration: "2 miles total",
        pace: "6:30/mi (sharpener)",
        note: "1 mi easy → 1 mi at 6:30 pace → done. Just a reminder to your legs that they know how to move fast.",
    },
};

const ZONE2_BY_PHASE: Record<Phase, { duration: string }> = {
    BASE: { duration: "4–5 miles" },
    BUILD: { duration: "5–6 miles" },
    PEAK: { duration: "4–5 miles" },
    TAPER: { duration: "2–3 miles" },
};

const LONG_BY_PHASE: Record<Phase, { duration: string }> = {
    BASE: { duration: "6–7 miles" },
    BUILD: { duration: "7–9 miles" },
    PEAK: { duration: "6–7 miles" },
    TAPER: { duration: "3–4 miles" },
};

function buildRunTempo(phase: Phase): RunSession {
    const cfg = TEMPO_BY_PHASE[phase];
    return {
        type: "TEMPO",
        duration: cfg.duration,
        pace: cfg.pace,
        hr: "160–170 bpm",
        color: "#facc15",
        note: cfg.note,
    };
}

function buildRunZone2(phase: Phase): RunSession {
    return {
        type: "ZONE 2",
        duration: ZONE2_BY_PHASE[phase].duration,
        pace: "11:30–12:30/mi",
        hr: "< 140 bpm",
        color: "#4ade80",
        note: "Nasal breathing only. If you can't hold a conversation, slow down. No exceptions.",
    };
}

function buildRunLong(phase: Phase): RunSession {
    return {
        type: "LONG EASY",
        duration: LONG_BY_PHASE[phase].duration,
        pace: "12:00–13:00/mi",
        hr: "< 140 bpm",
        color: "#818cf8",
        note: "Pure aerobic base. Don't let it creep into tempo territory. This builds the engine everything else runs on.",
    };
}

function buildWeek(phase: Phase): DaySlot[] {
    return [
        { day: "MONDAY", kind: "KB", workout: KB_A },
        { day: "TUESDAY", kind: "RUN", session: buildRunTempo(phase) },
        { day: "WEDNESDAY", kind: "KB", workout: KB_B },
        { day: "THURSDAY", kind: "RUN", session: buildRunZone2(phase) },
        { day: "FRIDAY", kind: "KB", workout: buildKbC(phase) },
        { day: "SATURDAY", kind: "RUN", session: buildRunLong(phase) },
        { day: "SUNDAY", kind: "REST" },
    ];
}

const NOTES = [
    "45lb is a real stimulus — don't rush the swings. Hinge mechanics matter more than speed or reps.",
    "KB overhead holds are your most BUD/S-specific exercise. Build duration week over week.",
    "The 90s rest between tempo intervals is not optional — it's what lets you hit goal pace on both reps.",
    "Never increase weekly mileage more than 10% week over week.",
];

const KNEE_TIPS = [
    "Stop running immediately if pain is above 2/10 — don't push through knee pain.",
    "Clamshells 3×20 daily — weak glutes are usually the root cause of knee issues.",
    "VMO wall sits and terminal knee extensions 3×15 build the stability that protects the joint.",
    "Ice after every run if the knee feels warm — 15 min on, never direct contact.",
    "If pain flares: swap a run day for a swim or ruck — maintain aerobic load, protect the joint.",
];

const INTRO = [
    "I made this before joining the Navy to help me personally prepare. I am not a trainer or a professional in any way. I am just some random dude with no credentials what so ever — use at at your own discretion.",
    "There is no swimming built into this plan because I personally don't need it. If it's a weakness for you, add swim sessions on Zone 2 days.",
    "The plan auto adjusts based on weeks remaining to ship date. Check the header to change it to your own ship date.",
    "All you need: one 45lb kettlebell, a pullup bar, and consistency.",
];

function todayIndex(): number {
    const jsDay = new Date().getDay();
    return jsDay === 0 ? 6 : jsDay - 1;
}

export default function WeeklyPlan() {
    const [active, setActive] = useState(todayIndex());
    const [expanded, setExpanded] = useState<Record<string, boolean>>({});
    const [showKnee, setShowKnee] = useState(false);
    const [shipDateStr, setShipDateStr] = useState<string>(
        () => localStorage.getItem(SHIP_DATE_STORAGE_KEY) || DEFAULT_SHIP_DATE,
    );

    useEffect(() => {
        localStorage.setItem(SHIP_DATE_STORAGE_KEY, shipDateStr);
    }, [shipDateStr]);

    const weeksRemaining = useMemo(() => {
        const shipDate = new Date(`${shipDateStr}T00:00:00`);
        return getWeeksRemaining(shipDate, new Date());
    }, [shipDateStr]);

    const phase = getPhase(weeksRemaining);
    const week = useMemo(() => buildWeek(phase), [phase]);

    const slot = week[active];
    const toggle = (key: string) =>
        setExpanded((e) => ({ ...e, [key]: !e[key] }));

    const accent =
        slot.kind === "KB"
            ? slot.workout.color
            : slot.kind === "RUN"
              ? slot.session.color
              : "#475569";

    return (
        <div
            style={{
                minHeight: "100vh",
                background: "#09090f",
                color: "#e2e8f0",
                fontFamily: "'Courier New', monospace",
            }}
        >
            {/* Header */}
            <div
                style={{
                    background: "linear-gradient(135deg, #0d1117, #0a1628)",
                    borderBottom: "1px solid #1e293b",
                    padding: "28px 20px 20px",
                }}
            >
                <div style={{ maxWidth: 780, margin: "0 auto" }}>
                    <div
                        style={{
                            fontSize: 12,
                            letterSpacing: "0.25em",
                            color: "#4ade80",
                            marginBottom: 6,
                            textTransform: "uppercase",
                        }}
                    >
                        ▸ PST/NSW PREP
                    </div>
                    <div
                        style={{
                            fontSize: "clamp(20px,5vw,30px)",
                            fontWeight: 900,
                            color: "#fff",
                            letterSpacing: "0.05em",
                        }}
                    >
                        WEEKLY TRAINING PLAN
                    </div>
                    <div
                        style={{ fontSize: 12, color: "#64748b", marginTop: 6 }}
                    >
                        KB + CALISTHENICS ALTERNATING WITH RUN DAYS
                    </div>
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                            marginTop: 10,
                            flexWrap: "wrap",
                        }}
                    >
                        <span
                            style={{
                                fontSize: 12,
                                color: accent,
                                letterSpacing: "0.1em",
                            }}
                        >
                            PHASE: {phase} ·{" "}
                            {weeksRemaining > 0
                                ? `${weeksRemaining} WEEK${weeksRemaining === 1 ? "" : "S"} REMAINING`
                                : "SHIP WEEK"}
                        </span>
                        <span style={{ fontSize: 10, color: "#475569" }}>
                            ·
                        </span>
                        <label
                            style={{
                                fontSize: 12,
                                color: "#475569",
                                display: "flex",
                                alignItems: "center",
                                gap: 6,
                            }}
                        >
                            SHIP DATE
                            <input
                                type="date"
                                value={shipDateStr}
                                onChange={(e) => setShipDateStr(e.target.value)}
                                style={{
                                    background: "#0d1117",
                                    border: "1px solid #1e293b",
                                    borderRadius: 4,
                                    color: "#e2e8f0",
                                    fontFamily: "'Courier New', monospace",
                                    fontSize: 11,
                                    padding: "3px 6px",
                                }}
                            />
                        </label>
                    </div>
                </div>
            </div>
            <div style={{ borderTop: "1px solid #1e293b", paddingTop: 20 }}>
                <div
                    style={{
                        fontSize: 14,
                        letterSpacing: "0.2em",
                        color: "#e70000",
                        marginBottom: 12,
                        textTransform: "uppercase",
                    }}
                >
                    INTRO - READ THIS FIRST
                </div>
                {INTRO.map((note, i) => (
                    <div
                        key={i}
                        style={{
                            display: "flex",
                            gap: 14,
                            fontSize: 14,
                            color: "#64748b",
                            marginBottom: 10,
                            lineHeight: 1.6,
                            alignItems: "flex-start",
                            paddingLeft: 20,
                            paddingRight: 20,
                            textAlign: "left",
                        }}
                    >
                        <span style={{ color: "#334155", flexShrink: 0 }}>
                            ▸
                        </span>
                        <span>{note}</span>
                    </div>
                ))}
            </div>

            {/* Day selector */}
            <div
                style={{
                    borderBottom: "1px solid #1e293b",
                    background: "#0d1117",
                }}
            >
                <div
                    style={{
                        maxWidth: 780,
                        margin: "0 auto",
                        display: "flex",
                        overflowX: "auto",
                    }}
                >
                    {week.map((d, i) => {
                        const dColor =
                            d.kind === "KB"
                                ? d.workout.color
                                : d.kind === "RUN"
                                  ? d.session.color
                                  : "#334155";
                        return (
                            <button
                                key={d.day}
                                onClick={() => {
                                    setActive(i);
                                    setExpanded({});
                                }}
                                style={{
                                    flex: "1 0 90px",
                                    padding: "12px 6px",
                                    background: "transparent",
                                    border: "none",
                                    borderBottom:
                                        active === i
                                            ? `2px solid ${dColor}`
                                            : "2px solid transparent",
                                    cursor: "pointer",
                                    textAlign: "center",
                                }}
                            >
                                <div
                                    style={{
                                        fontSize: 9,
                                        letterSpacing: "0.15em",
                                        color:
                                            active === i ? dColor : "#475569",
                                        textTransform: "uppercase",
                                        marginBottom: 3,
                                    }}
                                >
                                    {d.day.slice(0, 3)}
                                </div>
                                <div
                                    style={{
                                        fontSize: 10,
                                        fontWeight: 700,
                                        color:
                                            active === i ? dColor : "#64748b",
                                    }}
                                >
                                    {d.kind === "KB"
                                        ? "KB"
                                        : d.kind === "RUN"
                                          ? "RUN"
                                          : "REST"}
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>

            <div
                style={{
                    maxWidth: 780,
                    margin: "0 auto",
                    padding: "20px 16px 60px",
                }}
            >
                {/* Day header */}
                <div
                    style={{
                        background: `linear-gradient(135deg, ${accent}12, transparent)`,
                        border: `1px solid ${accent}40`,
                        borderRadius: 8,
                        padding: "18px 20px",
                        marginBottom: 20,
                    }}
                >
                    <div
                        style={{
                            fontSize: 10,
                            letterSpacing: "0.2em",
                            color: accent,
                            marginBottom: 4,
                            textTransform: "uppercase",
                        }}
                    >
                        {slot.day}
                    </div>
                    {slot.kind === "KB" && (
                        <>
                            <div
                                style={{
                                    fontSize: 16,
                                    fontWeight: 900,
                                    color: "#fff",
                                    marginBottom: 4,
                                }}
                            >
                                WKT {slot.workout.id} · {slot.workout.title}
                            </div>
                            <div style={{ fontSize: 12, color: "#94a3b8" }}>
                                Focus: {slot.workout.focus}
                            </div>
                        </>
                    )}
                    {slot.kind === "RUN" && (
                        <>
                            <div
                                style={{
                                    fontSize: 16,
                                    fontWeight: 900,
                                    color: "#fff",
                                    marginBottom: 4,
                                }}
                            >
                                {slot.session.type} · {slot.session.duration}
                            </div>
                            <div style={{ fontSize: 12, color: "#94a3b8" }}>
                                Pace: {slot.session.pace} · HR:{" "}
                                {slot.session.hr}
                            </div>
                        </>
                    )}
                    {slot.kind === "REST" && (
                        <div
                            style={{
                                fontSize: 16,
                                fontWeight: 900,
                                color: "#fff",
                            }}
                        >
                            REST DAY
                        </div>
                    )}
                </div>

                {/* KB content */}
                {slot.kind === "KB" && (
                    <>
                        <div style={{ marginBottom: 10 }}>
                            <button
                                onClick={() => toggle("wu")}
                                style={{
                                    width: "100%",
                                    background: "#0d1117",
                                    border: "1px solid #1e293b",
                                    borderRadius: expanded.wu
                                        ? "6px 6px 0 0"
                                        : 6,
                                    padding: "13px 16px",
                                    cursor: "pointer",
                                    display: "flex",
                                    justifyContent: "space-between",
                                }}
                            >
                                <span
                                    style={{
                                        fontSize: 11,
                                        fontWeight: 700,
                                        color: "#64748b",
                                        letterSpacing: "0.15em",
                                    }}
                                >
                                    WARMUP
                                </span>
                                <span style={{ color: "#475569" }}>
                                    {expanded.wu ? "▲" : "▼"}
                                </span>
                            </button>
                            {expanded.wu && (
                                <div
                                    style={{
                                        background: "#0a0a0f",
                                        border: "1px solid #1e293b",
                                        borderTop: "none",
                                        borderRadius: "0 0 6px 6px",
                                        padding: "12px 16px",
                                    }}
                                >
                                    {slot.workout.warmup.map((w, i) => (
                                        <div
                                            key={i}
                                            style={{
                                                fontSize: 12,
                                                color: "#94a3b8",
                                                padding: "4px 0",
                                                display: "flex",
                                                gap: 10,
                                            }}
                                        >
                                            <span style={{ color: "#334155" }}>
                                                —
                                            </span>
                                            {w}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {slot.workout.blocks.map((block, bi) => (
                            <div key={bi} style={{ marginBottom: 10 }}>
                                <button
                                    onClick={() => toggle(`b${bi}`)}
                                    style={{
                                        width: "100%",
                                        background: "#0d1117",
                                        border: `1px solid ${expanded[`b${bi}`] ? slot.workout.color + "50" : "#1e293b"}`,
                                        borderRadius: expanded[`b${bi}`]
                                            ? "6px 6px 0 0"
                                            : 6,
                                        padding: "14px 16px",
                                        cursor: "pointer",
                                        display: "flex",
                                        justifyContent: "space-between",
                                        alignItems: "flex-start",
                                    }}
                                >
                                    <div style={{ textAlign: "left" }}>
                                        <div
                                            style={{
                                                fontSize: 11,
                                                fontWeight: 900,
                                                color: slot.workout.color,
                                                letterSpacing: "0.1em",
                                                marginBottom: 3,
                                            }}
                                        >
                                            {block.name}
                                        </div>
                                        <div
                                            style={{
                                                fontSize: 11,
                                                color: "#475569",
                                            }}
                                        >
                                            {block.type}
                                        </div>
                                    </div>
                                    <span
                                        style={{
                                            color: "#475569",
                                            flexShrink: 0,
                                            marginLeft: 8,
                                        }}
                                    >
                                        {expanded[`b${bi}`] ? "▲" : "▼"}
                                    </span>
                                </button>
                                {expanded[`b${bi}`] && (
                                    <div
                                        style={{
                                            background: "#0a0a0f",
                                            border: `1px solid ${slot.workout.color}30`,
                                            borderTop: "none",
                                            borderRadius: "0 0 6px 6px",
                                        }}
                                    >
                                        {block.exercises.map((ex, ei) => (
                                            <div
                                                key={ei}
                                                style={{
                                                    padding: "13px 16px",
                                                    borderBottom:
                                                        ei <
                                                        block.exercises.length -
                                                            1
                                                            ? "1px solid #0f172a"
                                                            : "none",
                                                }}
                                            >
                                                <div
                                                    style={{
                                                        display: "flex",
                                                        justifyContent:
                                                            "space-between",
                                                        marginBottom: 4,
                                                    }}
                                                >
                                                    <div
                                                        style={{
                                                            fontSize: 13,
                                                            fontWeight: 700,
                                                            color: "#e2e8f0",
                                                        }}
                                                    >
                                                        {ex.name}
                                                    </div>
                                                    <div
                                                        style={{
                                                            fontSize: 12,
                                                            color: slot.workout
                                                                .color,
                                                            fontWeight: 700,
                                                            flexShrink: 0,
                                                            marginLeft: 12,
                                                        }}
                                                    >
                                                        {ex.reps}
                                                    </div>
                                                </div>
                                                <div
                                                    style={{
                                                        fontSize: 11,
                                                        color: "#64748b",
                                                        lineHeight: 1.5,
                                                    }}
                                                >
                                                    {ex.note}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}

                        <div
                            style={{
                                background: `${slot.workout.color}10`,
                                border: `1px solid ${slot.workout.color}50`,
                                borderRadius: 8,
                                padding: "16px 18px",
                                marginBottom: 24,
                            }}
                        >
                            <div
                                style={{
                                    fontSize: 10,
                                    letterSpacing: "0.2em",
                                    color: slot.workout.color,
                                    marginBottom: 8,
                                    textTransform: "uppercase",
                                }}
                            >
                                ▸ FINISHER
                            </div>
                            <div
                                style={{
                                    fontSize: 13,
                                    color: "#cbd5e1",
                                    lineHeight: 1.6,
                                }}
                            >
                                {slot.workout.finisher}
                            </div>
                        </div>
                    </>
                )}

                {/* RUN content */}
                {slot.kind === "RUN" && (
                    <div
                        style={{
                            border: `1px solid ${slot.session.color}50`,
                            borderRadius: 8,
                            background: `${slot.session.color}08`,
                            padding: "18px 20px",
                            marginBottom: 24,
                        }}
                    >
                        <div
                            style={{
                                display: "grid",
                                gridTemplateColumns: "1fr 1fr",
                                gap: 16,
                                marginBottom: 16,
                            }}
                        >
                            <div>
                                <div
                                    style={{
                                        fontSize: 9,
                                        letterSpacing: "0.2em",
                                        color: "#475569",
                                        marginBottom: 4,
                                        textTransform: "uppercase",
                                    }}
                                >
                                    TARGET PACE
                                </div>
                                <div
                                    style={{
                                        fontSize: 15,
                                        fontWeight: 700,
                                        color: slot.session.color,
                                    }}
                                >
                                    {slot.session.pace}
                                </div>
                            </div>
                            <div>
                                <div
                                    style={{
                                        fontSize: 9,
                                        letterSpacing: "0.2em",
                                        color: "#475569",
                                        marginBottom: 4,
                                        textTransform: "uppercase",
                                    }}
                                >
                                    HEART RATE
                                </div>
                                <div
                                    style={{
                                        fontSize: 15,
                                        fontWeight: 700,
                                        color: slot.session.color,
                                    }}
                                >
                                    {slot.session.hr}
                                </div>
                            </div>
                        </div>
                        <div
                            style={{
                                fontSize: 13,
                                color: "#cbd5e1",
                                lineHeight: 1.7,
                                borderTop: "1px solid #0f172a",
                                paddingTop: 14,
                            }}
                        >
                            {slot.session.note}
                        </div>
                    </div>
                )}

                {/* REST content */}
                {slot.kind === "REST" && (
                    <div
                        style={{
                            border: "1px solid #1e293b",
                            borderRadius: 8,
                            background: "#0d1117",
                            padding: "18px 20px",
                            marginBottom: 24,
                        }}
                    >
                        <div
                            style={{
                                fontSize: 13,
                                color: "#94a3b8",
                                lineHeight: 1.7,
                            }}
                        >
                            Full rest or light mobility only. Adaptation happens
                            here, not during training — don't skip it.
                        </div>
                    </div>
                )}
                <div
                    style={{
                        paddingTop: "10px",
                        marginTop: "40px",
                        borderTop: "1px solid #1e293b",
                    }}
                >
                    <span
                        style={{
                            fontSize: 11,
                            fontWeight: 700,
                            color: "#f91616",
                            letterSpacing: "0.15em",
                            textTransform: "uppercase",
                        }}
                    >
                        IF YOU ARE EXPERIENCEING KNEE PAIN HERE IS WHAT I DO. I
                        AM NOT A DOCTOR SO KEEP THAT IN MIND.
                    </span>
                </div>

                {/* Knee protocol (collapsible, always available) */}
                <div style={{ marginBottom: 20 }}>
                    <button
                        onClick={() => setShowKnee(!showKnee)}
                        style={{
                            width: "100%",
                            background: "#0d1117",
                            border: `1px solid ${showKnee ? "#f9731650" : "#1e293b"}`,
                            borderRadius: showKnee ? "6px 6px 0 0" : 6,
                            padding: "13px 16px",
                            cursor: "pointer",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                        }}
                    >
                        <span
                            style={{
                                fontSize: 11,
                                fontWeight: 700,
                                color: "#f97316",
                                letterSpacing: "0.15em",
                                textTransform: "uppercase",
                            }}
                        >
                            ▸ KNEE PROTOCOL
                        </span>
                        <span style={{ color: "#475569" }}>
                            {showKnee ? "▲" : "▼"}
                        </span>
                    </button>

                    {showKnee && (
                        <div
                            style={{
                                background: "#0a0a0f",
                                border: "1px solid #f9731630",
                                borderTop: "none",
                                borderRadius: "0 0 6px 6px",
                                padding: "16px",
                            }}
                        >
                            {KNEE_TIPS.map((tip, i) => (
                                <div
                                    key={i}
                                    style={{
                                        display: "flex",
                                        gap: 10,
                                        fontSize: 12,
                                        color: "#94a3b8",
                                        marginBottom:
                                            i < KNEE_TIPS.length - 1 ? 10 : 0,
                                        lineHeight: 1.6,
                                    }}
                                >
                                    <span
                                        style={{
                                            color: "#f97316",
                                            flexShrink: 0,
                                        }}
                                    >
                                        ▸
                                    </span>
                                    <span>{tip}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Notes */}
                <div style={{ borderTop: "1px solid #1e293b", paddingTop: 20 }}>
                    <div
                        style={{
                            fontSize: 10,
                            letterSpacing: "0.2em",
                            color: "#475569",
                            marginBottom: 12,
                            textTransform: "uppercase",
                        }}
                    >
                        PROGRAM NOTES
                    </div>
                    {NOTES.map((note, i) => (
                        <div
                            key={i}
                            style={{
                                display: "flex",
                                gap: 12,
                                fontSize: 12,
                                color: "#64748b",
                                marginBottom: 10,
                                lineHeight: 1.6,
                                alignItems: "flex-start",
                            }}
                        >
                            <span style={{ color: "#334155", flexShrink: 0 }}>
                                ▸
                            </span>
                            <span>{note}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
