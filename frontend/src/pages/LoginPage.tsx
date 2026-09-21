import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";
import { getDefaultRoute } from "@/config/roles";
import { Eye, EyeOff, Landmark, Shield, LineChart, Target, BadgeCheck } from "lucide-react";
import LoadingSpinner from "@/components/common/LoadingSpinner";

const inputClass =
  "h-10 w-full rounded-[6px] border border-border-default bg-bg-input px-3 text-sm text-text-primary placeholder:text-text-tertiary transition-colors duration-150 focus:border-accent-primary focus:outline-none focus:ring-1 focus:ring-accent-primary";

const DEMO_PASSWORD = "Scro@2026!";

const DEMO_ACCOUNTS = [
  { username: "scro_regulator", role: "Regulatory Oversight · National CISO", badge: "R", accent: "text-accent-primary", bg: "bg-accent-primary/15" },
  { username: "scro_banker", role: "Sector Operations · Banking Officer", badge: "B", accent: "text-status-high", bg: "bg-status-high/15" },
  { username: "scro_auditor", role: "National Audit & Assurance", badge: "A", accent: "text-status-low", bg: "bg-status-low/15" },
];

const FEATURES = [
  {
    icon: LineChart,
    title: "National Exposure Modelling",
    detail: "Continuous loss-distribution scanning across 8 critical financial sectors.",
  },
  {
    icon: Target,
    title: "Loss Forecasting & Attribution",
    detail: "Scenario simulation and attack-path analysis for informed defence.",
  },
  {
    icon: BadgeCheck,
    title: "Audited Investment Steering",
    detail: "Budget optimisation with a tamper-evident audit chain for every decision.",
  },
];

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
    <div className="flex min-h-screen bg-bg-app">
      {/* Sovereign navy panel */}
      <div className="relative hidden w-[42%] overflow-hidden bg-bg-masthead text-white lg:block">
        <div className="flex h-full flex-col justify-between px-10 py-10 xl:px-14">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/15 bg-white/[0.07]">
                <Landmark className="h-5 w-5 text-white/90" strokeWidth={1.75} />
              </div>
              <div className="leading-tight">
                <p className="text-sm font-semibold tracking-wide">
                  Sovereign Cyber-Risk Observatory
                </p>
                <p className="mt-0.5 text-[9px] font-medium uppercase tracking-[0.22em] text-white/50">
                  National Financial-Security Programme
                </p>
              </div>
            </div>

            <div className="mt-8 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.04] px-3 py-1">
              <span className="h-1.5 w-1.5 rounded-full bg-status-live" />
              <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/60">
                Authorised Government Use
              </span>
            </div>
          </div>

          <div className="max-w-md">
            <h1 className="text-[30px] font-semibold leading-tight tracking-tight">
              A single observatory for the nation&apos;s financial cyber risk.
            </h1>
            <p className="mt-4 text-[14px] leading-relaxed text-white/55">
              Model exposure, forecast impact, and steer investment —
              from the boardroom to the command room.
            </p>

            <div className="mt-10 space-y-5">
              {FEATURES.map((f) => (
                <div key={f.title} className="flex gap-3.5">
                  <div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md border border-white/10 bg-white/[0.05]">
                    <f.icon className="h-4 w-4 text-white/80" strokeWidth={1.75} />
                  </div>
                  <div>
                    <p className="text-[13px] font-semibold text-white/90">{f.title}</p>
                    <p className="mt-1 text-[12px] leading-relaxed text-white/50">{f.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.16em] text-white/40">
            <Shield className="h-3.5 w-3.5 text-white/50" />
            Standards-aligned · CERT-In · RBI · NCIIPC
          </div>
        </div>
      </div>

      {/* Auth pane */}
      <div className="flex flex-1 items-center justify-center px-4 py-10 sm:px-6">
        <div className="w-full max-w-[400px]">
          <div className="mb-8 text-center lg:hidden">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-bg-masthead text-white">
              <Landmark className="h-6 w-6" strokeWidth={1.75} />
            </div>
            <h1 className="mt-3 text-base font-semibold tracking-tight text-text-primary">
              Sovereign Cyber-Risk Observatory
            </h1>
            <p className="mx-auto mt-1 max-w-[260px] text-[12px] leading-snug text-text-secondary">
              Model exposure. Forecast impact. Make better investment decisions.
            </p>
          </div>

          <div className="rounded-[14px] border border-border-default bg-bg-surface p-8 shadow-modal">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-accent-primary" />
              <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-accent-primary">
                Secure Access · Approved Credentials
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
                          ? "border-accent-primary bg-accent-primary/10"
                          : "border-border-default bg-bg-surface hover:border-accent-primary/50 hover:bg-bg-hover"
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
                className="flex h-10 w-full items-center justify-center gap-2 rounded-[6px] bg-accent-primary text-[13px] font-semibold text-white transition-all duration-150 hover:brightness-110 active:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? (
                  <LoadingSpinner
                    size="sm"
                    className="border-white border-t-transparent"
                  />
                ) : null}
                Access Dashboard →
              </button>
            </form>

            <div className="mt-8 flex items-center justify-center gap-1.5 border-t border-border-subtle pt-5">
              <span className="h-1.5 w-1.5 rounded-full bg-status-live" />
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