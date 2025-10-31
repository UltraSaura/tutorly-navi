import React, { useState } from "react";

/** Hard-coded tokens so Cursor/Lovable can't freestyle */
const TOKENS = {
  card: "bg-white rounded-3xl border border-slate-100 shadow-[0_6px_24px_rgba(20,20,43,0.08)]",
  container: "w-full max-w-[430px]",
  bg: "bg-[#F4F6FB]",
  gradient: "bg-gradient-to-r from-[#3B82F6] via-[#6366F1] to-[#7C3AED]",
};

export default function ExercisePage() {
  const [msg, setMsg] = useState("");

  return (
    <div className={`min-h-screen w-full ${TOKENS.bg} flex justify-center`}>
      <div className={`relative ${TOKENS.container}`}>
        {/* Scrollable content */}
        <div className="px-4 pt-6 pb-[180px]">
          <div className={`relative ${TOKENS.card} px-5 pt-6 pb-8`}>
            {/* XP pill top-right */}
            <div className="absolute right-5 top-5">
              <XPBadge value={245} />
            </div>

            {/* Level/Streak pill */}
            <div className="mt-8">
              <LevelStreakBadge level={2} streakDays={7} />
            </div>

            {/* Overall grade */}
            <div className="mt-6 flex items-center">
              <GradCap className="w-5 h-5 text-slate-700 mr-2" />
              <span className="text-[18px] font-medium text-slate-900 mr-2">Overall grade:</span>
              <span className="text-[18px] font-extrabold text-[#FF3B30]">0%</span>
              <span className="text-[#FF3B30] ml-1">(—)</span>
            </div>

            {/* Hero block */}
            <div className="mt-6 relative">
              {/* left chips + A+ */}
              <div className="absolute -left-2 top-8 flex flex-col items-start gap-3">
                <div className="w-8 h-10 rounded-xl bg-[#F35252]" />
                <div className="w-8 h-10 rounded-xl bg-[#3B82F6]" />
                <div className="w-8 h-10 rounded-xl bg-[#22C55E]" />
                <div className="mt-2 text-slate-600 font-bold text-2xl">A+</div>
              </div>

              {/* math doodle */}
              <div className="absolute right-8 top-8 rotate-[25deg] text-slate-400 text-[14px] select-none">
                x² + y² = z²
              </div>

              {/* concentric circle */}
              <div className="mx-auto w-[220px] h-[220px] rounded-full bg-[#F97316]/90 grid place-items-center">
                <div className="w-[160px] h-[160px] rounded-full bg-[#FB923C] grid place-items-center">
                  <span className="text-[52px]">👩‍💻</span>
                </div>
              </div>
            </div>

            {/* Title */}
            <h1 className="mt-8 text-center text-[28px] leading-[34px] font-extrabold tracking-tight text-slate-900">
              Let's Start Learning !
            </h1>

            {/* Small emoji */}
            <div className="mt-6 flex justify-center text-[42px]"></div>
          </div>
        </div>

        {/* Fixed ChatBar */}
        <div className="fixed bottom-16 left-1/2 -translate-x-1/2 w-full max-w-[430px] px-4 z-30">
          <div className="bg-white rounded-3xl border border-slate-100 shadow-[0_6px_24px_rgba(20,20,43,0.08)] p-2">
            <div className="flex items-center gap-2">
              <button className="w-11 h-11 grid place-items-center border border-slate-200 rounded-2xl active:scale-95" aria-label="Add">
                <Plus className="w-5 h-5 text-slate-700" />
              </button>
              <input
                value={msg}
                onChange={(e) => setMsg(e.target.value)}
                placeholder="Type your exercise or question..."
                className="flex-1 h-12 rounded-2xl border border-slate-200 px-4 outline-none focus:ring-2 focus:ring-indigo-200"
              />
              <button className="w-12 h-12 grid place-items-center rounded-2xl bg-[#6366F1] text-white active:scale-95" aria-label="Send">
                <Plane className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Fixed Bottom Tabs */}
        <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-white border-t border-slate-200 z-20">
          <nav className="grid grid-cols-4">
            {[
              { k: "Tutor", icon: <Chat className="w-5 h-5" /> },
              { k: "Dashboard", icon: <Grid className="w-5 h-5" /> },
              { k: "Account", icon: <User className="w-5 h-5" /> },
              { k: "Tools", icon: <Wrench className="w-5 h-5" /> },
            ].map((it, i) => (
              <button key={i} className={`py-2 flex flex-col items-center ${i === 0 ? "text-indigo-600" : "text-slate-500"}`}>
                {it.icon}
                <span className="text-[12px] mt-1">{it.k}</span>
              </button>
            ))}
          </nav>
        </div>
      </div>
    </div>
  );
}

/* --- Sub-components --- */
function LevelStreakBadge({ level, streakDays }: { level: number; streakDays: number }) {
  return (
    <div className={`inline-flex items-center h-[52px] px-4 rounded-3xl text-white ${TOKENS.gradient}`}>
      <span className="text-[16px] font-bold mr-3">L-{level}</span>
      <span className="opacity-60 mx-2">|</span>
      <span className="text-[16px] font-semibold">🔥 {streakDays} day streak</span>
    </div>
  );
}
function XPBadge({ value }: { value: number }) {
  return (
    <div className="inline-flex items-center h-[42px] px-4 rounded-2xl bg-[#FFEFD6] text-[#B45309] font-bold">
      <span className="mr-2">⭐</span> {value} XP
    </div>
  );
}

/* --- inline SVG icons (no external libs) --- */
function GradCap(props: React.SVGProps<SVGSVGElement>) {
  return (<svg viewBox="0 0 24 24" fill="currentColor" {...props}><path d="M12 3 1 8l11 5 9-4.1V17h2V8L12 3z"/><path d="M6 12v4c0 1.7 2.7 3 6 3s6-1.3 6-3v-4l-6 2.7L6 12z"/></svg>);
}
function Plus(props: React.SVGProps<SVGSVGElement>) {
  return (<svg viewBox="0 0 24 24" fill="currentColor" {...props}><path d="M11 11V4h2v7h7v2h-7v7h-2v-7H4v-2h7z"/></svg>);
}
function Plane(props: React.SVGProps<SVGSVGElement>) {
  return (<svg viewBox="0 0 24 24" fill="currentColor" {...props}><path d="m2 21 20-9L2 3v7l14 2-14 2v7z"/></svg>);
}
function Chat(props: React.SVGProps<SVGSVGElement>) {
  return (<svg viewBox="0 0 24 24" fill="currentColor" {...props}><path d="M4 3h16v12H7l-3 3V3z"/></svg>);
}
function Grid(props: React.SVGProps<SVGSVGElement>) {
  return (<svg viewBox="0 0 24 24" fill="currentColor" {...props}><path d="M3 3h8v8H3zM13 3h8v8h-8zM3 13h8v8H3zM13 13h8v8h-8z"/></svg>);
}
function User(props: React.SVGProps<SVGSVGElement>) {
  return (<svg viewBox="0 0 24 24" fill="currentColor" {...props}><path d="M12 12a5 5 0 1 0-5-5 5 5 0 0 0 5 5zm0 2c-5 0-9 2.5-9 5.5V22h18v-2.5C21 16.5 17 14 12 14z"/></svg>);
}
function Wrench(props: React.SVGProps<SVGSVGElement>) {
  return (<svg viewBox="0 0 24 24" fill="currentColor" {...props}><path d="M22 6a6 6 0 0 1-8.8 5.3L5 19.5 2.5 17l8.2-8.2A6 6 0 0 1 22 6z"/></svg>);
} 