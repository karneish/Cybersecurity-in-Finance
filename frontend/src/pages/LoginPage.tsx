import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";
import { getDefaultRoute } from "@/config/roles";
import { Eye, EyeOff, Landmark, Shield } from "lucide-react";
import LoadingSpinner from "@/components/common/LoadingSpinner";

const inputClass =
  "h-10 w-full rounded-[6px] border border-border-default bg-bg-input px-3 text-sm text-text-primary placeholder:text-text-tertiary transition-colors duration-150 focus:border-accent-primary focus:outline-none focus:ring-1 focus:ring-accent-primary";

const DEMO_PASSWORD = "admin123";

const DEMO_ACCOUNTS = [
  { username: "admin", role: "System Admin", badge: "A", accent: "text-accent-primary", bg: "bg-accent-primary/15" },
  { username: "ciso", role: "Chief InfoSec Officer", badge: "C", accent: "text-status-high", bg: "bg-status-high/15" },
  { username: "analyst", role: "Security Analyst", badge: "A", accent: "text-status-low", bg: "bg-status-low/15" },
];

const NAVY_PANEL = {
  tile: [
    { value: "₹4.6L Cr", label: "Modelled Exposure" },
    { value: "8", label: "Critical Sectors" },
    { value: "1,240", label: "Events / Month" },
  ],
};

const animationCss = `
@keyframes crtFadeSlideUp {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes crtFadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
@keyframes orbDriftA {
  0%   { transform: translate3d(0, 0, 0) scale(1); }
  50%  { transform: translate3d(6vw, -5vh, 0) scale(1.15); }
  100% { transform: translate3d(-4vw, 4vh, 0) scale(0.92); }
}
@keyframes orbDriftB {
  0%   { transform: translate3d(0, 0, 0) scale(1.05); }
  50%  { transform: translate3d(-5vw, 4vh, 0) scale(0.9); }
  100% { transform: translate3d(5vw, -4vh, 0) scale(1.12); }
}
.crt-fade-up { animation: crtFadeSlideUp 0.22s ease both; }
.crt-fade-in { animation: crtFadeIn 0.2s ease both; }
.orb-a { animation: orbDriftA 44s ease-in-out infinite; }
.orb-b { animation: orbDriftB 58s ease-in-out infinite; }
@media (prefers-reduced-motion: reduce) {
  .orb-a, .orb-b { animation: none; }
}
`;

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  hue: string;
};

function ParticleField() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let width = 0;
    let height = 0;
    let particles: Particle[] = [];
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const LINK_DIST = 110;
    const LINK_DIST_SQ = LINK_DIST * LINK_DIST;

    const setupParticles = () => {
      const target = Math.min(90, Math.floor((width * height) / 16000));
      particles = Array.from({ length: target }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.28,
        vy: (Math.random() - 0.5) * 0.28,
        r: Math.random() * 1.3 + 0.6,
        hue: Math.random() < 0.75 ? "#38BDF8" : "#F0C766",
      }));
    };

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      setupParticles();
    };

    const step = () => {
      ctx.clearRect(0, 0, width, height);
      const n = particles.length;

      for (let i = 0; i < n; i++) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < -10) p.x = width + 10;
        else if (p.x > width + 10) p.x = -10;
        if (p.y < -10) p.y = height + 10;
        else if (p.y > height + 10) p.y = -10;
      }

      ctx.lineWidth = 1;
      for (let i = 0; i < n; i++) {
        const a = particles[i];
        for (let j = i + 1; j < n; j++) {
          const b = particles[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < LINK_DIST_SQ) {
            const t = 1 - Math.sqrt(d2) / LINK_DIST;
            ctx.strokeStyle = `rgba(240, 199, 102, ${(t * 0.12).toFixed(3)})`;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }

      for (let i = 0; i < n; i++) {
        const p = particles[i];
        ctx.globalAlpha = 0.5;
        ctx.fillStyle = p.hue;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      raf = requestAnimationFrame(step);
    };

    const onVisibility = () => {
      if (document.hidden) cancelAnimationFrame(raf);
      else {
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(step);
      }
    };

    resize();
    raf = requestAnimationFrame(step);
    window.addEventListener("resize", resize);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 h-full w-full"
      aria-hidden="true"
    />
  );
}

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, loading, error, isAuthenticated } = useAuthStore();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      const { user } = useAuthStore.getState();
      navigate(getDefaultRoute(user?.role), { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login(username, password);
      const { user } = useAuthStore.getState();
      navigate(getDefaultRoute(user?.role), { replace: true });
    } catch {}
  };

  const handleDemoLogin = async (
    acc: (typeof DEMO_ACCOUNTS)[number],
  ) => {
    if (loading) return;
    setUsername(acc.username);
    setPassword(DEMO_PASSWORD);
    try {
      await login(acc.username, DEMO_PASSWORD);
      const { user } = useAuthStore.getState();
      navigate(getDefaultRoute(user?.role), { replace: true });
    } catch {}
  };

  const isActive = (u: string) =>
    username === u && password === DEMO_PASSWORD;

  return (
    <div className="relative flex min-h-screen overflow-hidden bg-bg-app">
      <style>{animationCss}</style>

      {/* Sovereign navy panel */}
      <div className="relative hidden w-[46%] overflow-hidden text-white lg:block">
        <div className="absolute inset-0 bg-gradient-to-br from-[#060F22] via-[#0A1B38] to-[#10294E]" />
        <div className="sovereign-grid absolute inset-0 opacity-40" />
        <div className="pointer-events-none absolute -left-24 top-[-14%] h-[460px] w-[460px] rounded-full bg-[#F0C766]/10 blur-[100px] orb-a" />
        <div className="pointer-events-none absolute bottom-[-16%] right-[-10%] h-[420px] w-[420px] rounded-full bg-[#2F8DFF]/20 blur-[110px] orb-b" />
        <ParticleField />

        <div className="relative z-10 flex h-full flex-col justify-between p-12 xl:p-16">
          <div className="crt-fade-up">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#F0C766]/40 bg-white/5">
                <Landmark className="h-5 w-5 text-[#F0C766]" strokeWidth={1.75} />
              </div>
              <div className="leading-tight">
                <p className="text-sm font-semibold tracking-wide">
                  Sovereign Cyber-Risk Observatory
                </p>
                <p className="mt-0.5 text-[10px] font-medium uppercase tracking-[0.22em] text-[#F0C766]">
                  National Financial-Security Programme
                </p>
              </div>
            </div>
            <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-[#F0C766]/25 bg-white/[0.04] px-3 py-1">
              <span className="h-1.5 w-1.5 rounded-full bg-[#34D399] shadow-[0_0_8px_rgba(52,211,153,0.9)]" />
              <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#F0C766]">
                Classified · Government Use
              </span>
            </div>
          </div>

          <div className="crt-fade-in max-w-xl">
            <h1 className="text-[34px] font-semibold leading-tight tracking-tight">
              Command the cyber risk of your{" "}
              <span className="text-gradient-gold">nation's critical finance.</span>
            </h1>
            <p className="mt-4 max-w-md text-[15px] leading-relaxed text-white/60">
              One sovereign observatory for modelling exposure, forecasting
              impact, and steering investment — from boardroom to command
              room.
            </p>

            <div className="mt-10 grid max-w-md grid-cols-3 gap-3">
              {NAVY_PANEL.tile.map((t) => (
                <div
                  key={t.label}
                  className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 backdrop-blur-sm"
                >
                  <p className="text-lg font-semibold text-[#F0C766]">
                    {t.value}
                  </p>
                  <p className="mt-0.5 text-[10px] uppercase tracking-[0.12em] text-white/50">
                    {t.label}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="crt-fade-up flex items-center gap-2 text-[10px] uppercase tracking-[0.16em] text-white/40">
            <Shield className="h-3.5 w-3.5 text-[#F0C766]/70" />
            Standards-aligned · CERT-In · RBI · NCIIPC
          </div>
        </div>
      </div>

      {/* Auth pane */}
      <div className="relative z-10 flex flex-1 items-center justify-center px-4 py-10 sm:px-6">
        <div className="w-full max-w-[400px]">
          <div className="crt-fade-up mb-8 text-center lg:hidden">
            <img
              src="/logo.png"
              alt="CyberRisk Twin"
              className="mx-auto h-auto w-[170px]"
            />
            <h1 className="mt-3 text-base font-semibold tracking-tight text-text-primary">
              Sovereign Cyber-Risk Observatory
            </h1>
            <p className="mx-auto mt-1 max-w-[260px] text-[12px] leading-snug text-text-secondary">
              Model exposure. Forecast impact. Make better investment decisions.
            </p>
          </div>

          <div className="crt-fade-in rounded-[14px] border border-border-default bg-bg-surface p-8 shadow-modal">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-gold" />
              <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gold">
                Secure Access · Govt Credentials
              </span>
            </div>

            <div className="mt-6">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-text-tertiary">
                One-Click Demo Access
              </p>
              <div className="mt-3 space-y-2">
                {DEMO_ACCOUNTS.map((acc) => {
                  const active = isActive(acc.username);
                  return (
                    <button
                      key={acc.username}
                      type="button"
                      disabled={loading}
                      onClick={() => handleDemoLogin(acc)}
                      className={`flex w-full cursor-pointer items-center gap-3 rounded-[8px] border px-3 py-2.5 text-left transition-all duration-150 ${
                        active
                          ? "border-gold/60 bg-gold/10"
                          : "border-border-default bg-bg-surface hover:border-gold/40 hover:bg-bg-hover"
                      } disabled:cursor-not-allowed disabled:opacity-60`}
                    >
                      <span
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-[13px] font-bold ${acc.bg} ${acc.accent}`}
                      >
                        {loading && active ? (
                          <LoadingSpinner
                            size="sm"
                            className="border-current border-t-transparent"
                          />
                        ) : (
                          acc.badge
                        )}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-[13px] font-semibold text-text-primary">
                          {acc.username}
                        </span>
                        <span className="block truncate text-[11px] text-text-tertiary">
                          {acc.role}
                        </span>
                      </span>
                      <span className="ml-auto flex shrink-0 flex-col items-end">
                        <span className="font-mono text-[12px] text-text-secondary">
                          {DEMO_PASSWORD}
                        </span>
                        <span className="text-[9px] uppercase tracking-[0.1em] text-text-tertiary">
                          password
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-6 flex items-center gap-3">
              <span className="h-px flex-1 bg-border-default" />
              <span className="text-[9px] font-medium uppercase tracking-[0.14em] text-text-tertiary">
                or sign in manually
              </span>
              <span className="h-px flex-1 bg-border-default" />
            </div>

            <form onSubmit={handleSubmit} className="mt-5 space-y-5">
              <div>
                <label
                  htmlFor="username"
                  className="block text-[13px] font-medium text-text-secondary"
                >
                  Username
                </label>
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  autoComplete="username"
                  className={`${inputClass} mt-2`}
                  placeholder="Enter your username"
                />
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="block text-[13px] font-medium text-text-secondary"
                >
                  Password
                </label>
                <div className="relative mt-2">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    className={`${inputClass} pr-10`}
                    placeholder="Enter your password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary transition-colors hover:text-text-secondary"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              {error && (
                <div className="rounded-lg border border-status-critical/30 bg-status-critical/10 p-3 text-sm text-status-critical">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="flex h-10 w-full items-center justify-center gap-2 rounded-[6px] bg-gold text-[13px] font-semibold text-[#071226] shadow-gold transition-all duration-150 hover:brightness-105 active:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? (
                  <LoadingSpinner
                    size="sm"
                    className="border-[#071226] border-t-transparent"
                  />
                ) : null}
                Access Dashboard →
              </button>
            </form>

            <div className="mt-8 flex items-center justify-center gap-1.5 border-t border-border-subtle pt-5">
              <span className="h-1.5 w-1.5 rounded-full bg-status-live shadow-[0_0_6px_rgba(4,150,106,0.9)]" />
              <span className="text-[10px] font-medium uppercase tracking-[0.12em] text-text-tertiary">
                System Operational
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}