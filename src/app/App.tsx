import { useState, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "motion/react"
import { ChevronLeft, Volume2, VolumeX } from "lucide-react"

type Page = "home" | "modules" | "module7" | "lesson"

const moduleGradients = [
  "from-sky-300/60 to-blue-200/40",
  "from-emerald-300/60 to-green-200/40",
  "from-yellow-300/60 to-amber-200/40",
  "from-violet-300/60 to-purple-200/40",
  "from-rose-300/60 to-pink-200/40",
  "from-cyan-300/60 to-teal-200/40",
  "from-lime-300/60 to-green-200/40",
  "from-orange-300/60 to-amber-200/40",
  "from-blue-300/60 to-indigo-200/40",
  "from-teal-300/60 to-emerald-200/40",
]

const lessons = [
  { name: "On The Street",        gradient: "from-sky-400/70 to-blue-300/50" },
  { name: "Uncle Sam's Farm",     gradient: "from-emerald-400/70 to-green-300/50" },
  { name: "Rules Rules Rules!!!", gradient: "from-yellow-400/70 to-amber-300/50" },
  { name: "About Time",           gradient: "from-violet-400/70 to-purple-300/50" },
  { name: "Grammar Revision",     gradient: "from-rose-400/70 to-pink-300/50" },
]

const pageVariants = {
  initial: { opacity: 0, filter: "blur(8px)", scale: 0.985 },
  animate: { opacity: 1, filter: "blur(0px)", scale: 1 },
  exit:    { opacity: 0, filter: "blur(8px)", scale: 1.015 },
}
const pageTransition = { duration: 0.9, ease: [0.32, 0.72, 0, 1] as const }

const floatHover  = { y: -7, scale: 1.05 }
const floatTap    = { y: -2, scale: 1.02 }
const floatSpring = { type: "spring" as const, stiffness: 380, damping: 22 }

/* ── Tiny procedural UI sound effects (Web Audio API — no extra files) ───── */
let sfxCtx: AudioContext | null = null
function getSfxCtx() {
  if (!sfxCtx) {
    const Ctor = window.AudioContext || (window as any).webkitAudioContext
    sfxCtx = new Ctor()
  }
  // AudioContexts start (or get auto-suspended) until a user gesture too —
  // resuming here piggybacks on the same gesture that triggers a sound.
  if (sfxCtx.state === "suspended") sfxCtx.resume().catch(() => {})
  return sfxCtx
}

// A very soft, quiet "tick" for any general tap (backgrounds, the
// tap-anywhere splash screen, non-interactive taps, etc.)
function playTapSound() {
  try {
    const ctx = getSfxCtx()
    const t = ctx.currentTime
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = "sine"
    osc.frequency.setValueAtTime(680, t)
    osc.frequency.exponentialRampToValueAtTime(420, t + 0.07)
    gain.gain.setValueAtTime(0.045, t)
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.09)
    osc.connect(gain).connect(ctx.destination)
    osc.start(t)
    osc.stop(t + 0.1)
  } catch {}
}

// A slightly brighter, more defined "pop" for real buttons — distinct
// from the generic tap so actionable taps feel different from ambient ones.
function playButtonSound() {
  try {
    const ctx = getSfxCtx()
    const t = ctx.currentTime
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = "triangle"
    osc.frequency.setValueAtTime(920, t)
    osc.frequency.exponentialRampToValueAtTime(460, t + 0.1)
    gain.gain.setValueAtTime(0.09, t)
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.14)
    osc.connect(gain).connect(ctx.destination)
    osc.start(t)
    osc.stop(t + 0.15)

    // tiny high sparkle layered on top for a fuller "click" character
    const sparkle = ctx.createOscillator()
    const sparkleGain = ctx.createGain()
    sparkle.type = "sine"
    sparkle.frequency.setValueAtTime(1850, t)
    sparkleGain.gain.setValueAtTime(0.03, t)
    sparkleGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.05)
    sparkle.connect(sparkleGain).connect(ctx.destination)
    sparkle.start(t)
    sparkle.stop(t + 0.06)
  } catch {}
}

// Attempts to (re)start the background music. Safe to call repeatedly —
// it's a no-op once playback has actually started.
function unlockBgm(el: HTMLAudioElement | null) {
  getSfxCtx()
  if (el && el.paused) {
    el.play().catch(() => {})
  }
}

/* ── Ambient drifting blobs ──────────────────────────────────────────────── */
function AmbientBackground() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
      <div className="absolute inset-0 bg-gradient-to-br from-sky-100 via-white to-emerald-50" />
      <motion.div className="absolute -top-40 -left-40 w-[520px] h-[520px] rounded-full bg-yellow-200/70 blur-[80px]"
        animate={{ x: [0,50,0], y: [0,35,0] }} transition={{ duration:14, repeat:Infinity, ease:"easeInOut" }} />
      <motion.div className="absolute top-1/4 -right-32 w-[440px] h-[440px] rounded-full bg-sky-300/60 blur-[80px]"
        animate={{ x: [0,-40,0], y: [0,60,0] }} transition={{ duration:17, repeat:Infinity, ease:"easeInOut", delay:2 }} />
      <motion.div className="absolute -bottom-32 left-1/4 w-[480px] h-[480px] rounded-full bg-emerald-200/70 blur-[80px]"
        animate={{ x: [0,60,0], y: [0,-40,0] }} transition={{ duration:20, repeat:Infinity, ease:"easeInOut", delay:1 }} />
      <motion.div className="absolute bottom-1/3 right-1/3 w-[300px] h-[300px] rounded-full bg-blue-200/50 blur-[60px]"
        animate={{ x: [0,-50,0], y: [0,-50,0] }} transition={{ duration:16, repeat:Infinity, ease:"easeInOut", delay:3.5 }} />
    </div>
  )
}

/* ── Shared glass primitives ─────────────────────────────────────────────── */
function GlassPanel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`backdrop-blur-2xl bg-white/25 border border-white/50 shadow-[0_8px_32px_rgba(14,90,160,0.12),inset_0_1px_0_rgba(255,255,255,0.6)] ${className}`}>
      {children}
    </div>
  )
}

function GlassButton({
  children, onClick, gradient = "", className = "", contentClassName = "", disabled = false, squircle = false,
}: {
  children: React.ReactNode; onClick?: () => void; gradient?: string
  className?: string; contentClassName?: string; disabled?: boolean; squircle?: boolean
}) {
  return (
    <motion.button
      onClick={onClick}
      whileHover={!disabled ? floatHover : undefined}
      whileTap={!disabled  ? floatTap   : undefined}
      transition={floatSpring}
      disabled={disabled}
      className={`
        relative overflow-hidden cursor-pointer w-full
        backdrop-blur-2xl bg-white/30 border border-white/55
        shadow-[0_4px_20px_rgba(14,90,160,0.10),inset_0_1px_0_rgba(255,255,255,0.7)]
        transition-shadow duration-300
        hover:shadow-[0_16px_48px_rgba(14,90,160,0.18),inset_0_1px_0_rgba(255,255,255,0.8)]
        disabled:cursor-default disabled:opacity-50
        ${squircle ? "rounded-[28%]" : "rounded-[20px]"}
        ${className}
      `}
    >
      {gradient && <div className={`absolute inset-0 bg-gradient-to-br ${gradient}`} />}
      <div className={`relative z-10 flex items-center justify-center ${contentClassName}`}>{children}</div>
    </motion.button>
  )
}

/* Back button — fixed to bottom-left of each page */
function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ x: -4, scale: 1.07 }}
      whileTap={{ scale: 0.95 }}
      transition={floatSpring}
      className="fixed bottom-6 left-6 z-50 flex items-center gap-1 px-4 py-2 rounded-full
        backdrop-blur-2xl bg-white/40 border border-white/55
        shadow-[0_2px_12px_rgba(14,90,160,0.10),inset_0_1px_0_rgba(255,255,255,0.6)]
        text-slate-600 font-bold text-sm tracking-wide
        hover:bg-white/55 transition-colors duration-200 cursor-pointer"
    >
      <ChevronLeft size={15} strokeWidth={3} />
      Back
    </motion.button>
  )
}

/* ── Subtle mute / unmute toggle — present on every page ─────────────────── */
function MuteToggle({ muted, onToggle }: { muted: boolean; onToggle: () => void }) {
  return (
    <motion.button
      onClick={onToggle}
      whileHover={{ scale: 1.08, opacity: 1 }}
      whileTap={{ scale: 0.92 }}
      transition={floatSpring}
      aria-label={muted ? "Unmute background music" : "Mute background music"}
      className="fixed bottom-6 right-6 z-50 w-9 h-9 flex items-center justify-center rounded-full
        backdrop-blur-xl bg-white/25 border border-white/40
        shadow-[0_2px_10px_rgba(14,90,160,0.08)]
        text-slate-500/70 opacity-60 hover:opacity-100
        transition-opacity duration-200 cursor-pointer"
    >
      {muted ? <VolumeX size={14} strokeWidth={2.5} /> : <Volume2 size={14} strokeWidth={2.5} />}
    </motion.button>
  )
}

/* ── Home page ───────────────────────────────────────────────────────────── */
function HomePage({ onContinue }: { onContinue: () => void }) {
  return (
    <div
      className="absolute inset-0 flex flex-col items-center justify-center gap-10 cursor-pointer select-none"
      onClick={onContinue}
    >
      <motion.div
        initial={{ y: 24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.85, ease: [0.32, 0.72, 0, 1] }}
        className="flex flex-col items-center gap-10"
      >
        <GlassPanel className="rounded-[36px] px-20 py-14 text-center">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.7 }}
          >
            <p className="text-sky-400 font-black tracking-[0.25em] uppercase text-sm mb-3">
              Welcome to
            </p>
            <h1 className="text-[5rem] font-black text-slate-800 leading-none tracking-tight">
              English
            </h1>
            <div className="flex items-baseline justify-center gap-3 mt-2">
              <span className="text-4xl font-black text-sky-400">Year</span>
              <span className="text-[4.5rem] font-black text-sky-400 leading-none">3</span>
            </div>
            <div className="flex justify-center gap-3 mt-7">
              {["bg-yellow-300", "bg-sky-300", "bg-emerald-300"].map((c, i) => (
                <motion.div key={i} className={`w-2.5 h-2.5 rounded-full ${c} opacity-80`}
                  animate={{ scale: [1, 1.4, 1] }}
                  transition={{ duration: 1.8, repeat: Infinity, delay: i * 0.3, ease: "easeInOut" }} />
              ))}
            </div>
          </motion.div>
        </GlassPanel>

        <motion.p
          animate={{ opacity: [0.35, 0.95, 0.35] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
          className="text-slate-500 text-sm italic tracking-wide"
        >
          Tap anywhere to continue
        </motion.p>
      </motion.div>
    </div>
  )
}

/* ── Modules selection page ──────────────────────────────────────────────── */
function ModulesPage({ onBack, onModule7, onLesson }: { onBack: () => void; onModule7: () => void; onLesson: (name: string) => void }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 px-8 py-20">
      <BackButton onClick={onBack} />

      <motion.div
        initial={{ y: -12, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6 }}
        className="text-center"
      >
        <h1 className="text-3xl font-black text-slate-800 mb-1">Hello, class!</h1>
        <p className="text-sky-400 font-black tracking-[0.2em] uppercase text-xs italic opacity-70">What are we learning today?</p>
      </motion.div>

      {/* 5 × 2 squircle grid */}
      <div className="grid grid-cols-5 gap-3 w-full max-w-[560px]">
        {Array.from({ length: 10 }, (_, i) => {
          const isModule7 = i === 6
          return (
            <motion.div key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 + 0.15, duration: 0.4 }}
            >
              <GlassButton
                gradient={moduleGradients[i]}
                onClick={isModule7 ? onModule7 : undefined}
                disabled={!isModule7}
                squircle
                className={`aspect-square ${isModule7 ? "ring-2 ring-white/70" : ""}`}
                contentClassName="flex-col gap-0.5"
              >
                <span className={`text-xl font-black leading-none ${isModule7 ? "text-slate-800" : "text-slate-600"}`}>
                  {i + 1}
                </span>
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Mod</span>
                {isModule7 && (
                  <span className="text-[8px] font-black text-sky-600 uppercase tracking-wider">Active</span>
                )}
              </GlassButton>
            </motion.div>
          )
        })}
      </div>

      {/* CLIL */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.4 }}
        className="w-full max-w-[560px]"
      >
        <GlassButton gradient="from-violet-400/65 to-indigo-300/50" className="py-4">
          <div className="flex items-center gap-3">
            <span className="text-base font-black text-slate-700 tracking-[0.18em] uppercase">CLIL</span>
            <span className="text-xs font-bold text-slate-500">Content & Language Integrated Learning</span>
          </div>
        </GlassButton>
      </motion.div>

      {/* Grammar Revision — moved here from Module 7 */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7, duration: 0.4 }}
        className="w-full max-w-[560px]"
      >
        <GlassButton
          gradient="from-rose-400/70 to-pink-300/50"
          onClick={() => onLesson("Grammar Revision")}
          className="py-4"
        >
          <span className="text-base font-black text-slate-700 tracking-[0.05em]">Grammar Revision</span>
        </GlassButton>
      </motion.div>
    </div>
  )
}

/* ── Module 7 unit selection page ────────────────────────────────────────── */
function Module7Page({ onBack, onLesson }: { onBack: () => void; onLesson: (name: string) => void }) {
  const module7Lessons = lessons.filter((l) => l.name !== "Grammar Revision")
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center px-8 py-20">
      <BackButton onClick={onBack} />

      {/* Title – top-centre */}
      <motion.div
        initial={{ y: -14, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6 }}
        className="text-center mb-8"
      >
        <p className="text-sky-400 font-black tracking-[0.22em] uppercase text-xs mb-2">Module 7</p>
        <h1 className="text-[2.75rem] font-black text-slate-800 leading-tight tracking-tight">
          Out and About
        </h1>
        <div className="flex justify-center gap-2 mt-2.5">
          <div className="w-7 h-1 rounded-full bg-sky-300/70" />
          <div className="w-2.5 h-1 rounded-full bg-emerald-300/70" />
          <div className="w-2.5 h-1 rounded-full bg-yellow-300/70" />
        </div>
      </motion.div>

      {/* Lesson buttons with generous spacing */}
      <div className="flex flex-col gap-5 w-full max-w-md">
        {module7Lessons.map((lesson, i) => (
          <motion.div
            key={lesson.name}
            initial={{ opacity: 0, x: -24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.08 + 0.28, duration: 0.45 }}
          >
            <GlassButton
              gradient={lesson.gradient}
              onClick={() => onLesson(lesson.name)}
              className="py-4 px-8"
            >
              <span className="text-lg font-black text-slate-700">{lesson.name}</span>
            </GlassButton>
          </motion.div>
        ))}
      </div>
    </div>
  )
}

/* ── Lesson placeholder page ─────────────────────────────────────────────── */
function LessonPage({ name, onBack }: { name: string; onBack: () => void }) {
  const lesson = lessons.find((l) => l.name === name) ?? lessons[0]

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center p-8">
      <BackButton onClick={onBack} />

      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.1, type: "spring", stiffness: 260, damping: 22 }}
      >
        <GlassPanel className="rounded-[28px] px-14 py-12 text-center max-w-md relative overflow-hidden">
          <div className={`absolute inset-0 bg-gradient-to-br ${lesson.gradient} opacity-60`} />
          <div className="relative z-10">
            <p className="text-slate-500 text-xs font-black tracking-[0.22em] uppercase mb-3">
              {name === "Grammar Revision" ? "English Year 3" : "Module 7 — Out and About"}
            </p>
            <h1 className="text-3xl font-black text-slate-800 leading-snug mb-6">
              {name}
            </h1>
            <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-white/40 border border-white/60">
              <div className="w-2 h-2 rounded-full bg-sky-400 animate-pulse" />
              <span className="text-sm font-bold text-slate-600">Coming soon</span>
            </div>
          </div>
        </GlassPanel>
      </motion.div>
    </div>
  )
}

/* ── Root ────────────────────────────────────────────────────────────────── */
export default function App() {
  const [page, setPage] = useState<Page>("home")
  const [lessonName, setLessonName] = useState("")
  const [lessonOrigin, setLessonOrigin] = useState<Page>("modules")
  const [muted, setMuted] = useState(false)

  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = 1
  }, [])

  // Robust autoplay unlock. Browsers block unmuted autoplay until a real
  // user gesture — pointerdown fires earlier than click (and covers touch),
  // so we listen on that, in the capture phase, and keep trying on every
  // gesture (not just the first) until playback genuinely starts. Calling
  // .play() on an element that's already playing is a harmless no-op, so
  // this is safe to leave running; it self-removes once audio confirms
  // it's actually playing.
  useEffect(() => {
    const el = audioRef.current
    if (!el) return

    const tryUnlock = () => unlockBgm(el)
    const stopListening = () => {
      window.removeEventListener("pointerdown", tryUnlock, true)
      window.removeEventListener("keydown", tryUnlock, true)
      window.removeEventListener("touchstart", tryUnlock, true)
    }

    el.addEventListener("playing", stopListening)
    window.addEventListener("pointerdown", tryUnlock, true)
    window.addEventListener("keydown", tryUnlock, true)
    window.addEventListener("touchstart", tryUnlock, true)

    return () => {
      stopListening()
      el.removeEventListener("playing", stopListening)
    }
  }, [])

  // Subtle sound effects: any registered tap gets a soft generic tick;
  // tapping an actual <button> (GlassButton / BackButton / MuteToggle, all
  // of which render real <button> elements) gets a distinct, brighter click
  // instead — never both at once for the same tap.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (target.closest("button")) playButtonSound()
      else playTapSound()
    }
    // Capture phase: runs before React's own click handling, so a button
    // that re-renders itself (e.g. the mute icon swapping) on click can't
    // detach the event target from the DOM before we've checked it.
    document.addEventListener("click", onClick, true)
    return () => document.removeEventListener("click", onClick, true)
  }, [])

  return (
    <div className="relative min-h-screen">
      <audio ref={audioRef} src="audio/bgm.mp3" loop autoPlay muted={muted} />
      <AmbientBackground />
      <MuteToggle
        muted={muted}
        onToggle={() =>
          setMuted((m) => {
            const next = !m
            if (!next) unlockBgm(audioRef.current) // unmuting also (re)starts playback if it never began
            return next
          })
        }
      />

      <AnimatePresence mode="wait">
        {page === "home" && (
          <motion.div key="home" className="fixed inset-0" variants={pageVariants} initial="initial" animate="animate" exit="exit" transition={pageTransition}>
            <HomePage onContinue={() => { unlockBgm(audioRef.current); setPage("modules") }} />
          </motion.div>
        )}
        {page === "modules" && (
          <motion.div key="modules" className="fixed inset-0" variants={pageVariants} initial="initial" animate="animate" exit="exit" transition={pageTransition}>
            <ModulesPage
              onBack={() => setPage("home")}
              onModule7={() => setPage("module7")}
              onLesson={(n) => { setLessonName(n); setLessonOrigin("modules"); setPage("lesson") }}
            />
          </motion.div>
        )}
        {page === "module7" && (
          <motion.div key="module7" className="fixed inset-0" variants={pageVariants} initial="initial" animate="animate" exit="exit" transition={pageTransition}>
            <Module7Page
              onBack={() => setPage("modules")}
              onLesson={(n) => { setLessonName(n); setLessonOrigin("module7"); setPage("lesson") }}
            />
          </motion.div>
        )}
        {page === "lesson" && (
          <motion.div key="lesson" className="fixed inset-0" variants={pageVariants} initial="initial" animate="animate" exit="exit" transition={pageTransition}>
            <LessonPage name={lessonName} onBack={() => setPage(lessonOrigin)} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
