import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";
import { useWSConnectionState } from "@/hooks/useWebSocket";
import {
  Landmark,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronDown,
  Compass,
} from "lucide-react";
import { useMemo, useState, useEffect } from "react";
import { clsx } from "clsx";
import type { LucideIcon } from "lucide-react";
import { PAGE_ACCESS, getAccessiblePages } from "@/config/roles";
import { getTourSteps } from "@/config/tourSteps";
import { useTourStore } from "@/store/tourStore";
import GuidedTour from "@/components/tour/GuidedTour";

interface NavItem {
  to: string;
  icon: LucideIcon;
  label: string;
}

const connectionStyle: Record<
  string,
  { dot: string; label: string }
> = {
  LIVE: { dot: "bg-status-live", label: "LIVE" },
  CONNECTING: { dot: "bg-status-medium animate-pulse", label: "CONNECTING" },
  RECONNECTING: {
    dot: "bg-status-medium animate-pulse",
    label: "RECONNECTING",
  },
  DISCONNECTED: { dot: "bg-status-critical", label: "DISCONNECTED" },
};

export default function MainLayout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [navOpen, setNavOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const wsState = useWSConnectionState();

  const navGroups = useMemo(() => {
    const pages = getAccessiblePages(user?.role ?? "VIEWER");
    const groups: Record<string, NavItem[]> = {
      Operations: [],
      Analysis: [],
      Strategy: [],
      System: [],
    };
    for (const page of PAGE_ACCESS) {
      if (page.group && pages.some((p) => p.path === page.path)) {
        groups[page.group].push({
          to: page.path,
          icon: page.icon,
          label: page.label,
        });
      }
    }
    return Object.entries(groups)
      .filter(([, items]) => items.length > 0)
      .map(([label, items]) => ({ label, items }));
  }, [user?.role]);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const startTour = () => {
    useTourStore.getState().start(getTourSteps(user?.role ?? "VIEWER"));
  };

  useEffect(() => {
    let dismissed = false;
    try {
      dismissed = localStorage.getItem("scro-tour-dismissed") === "yes";
    } catch {}
    if (!dismissed && user?.role) {
      startTour();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.role]);

  const conn = connectionStyle[wsState] ?? connectionStyle.DISCONNECTED;

  return (
    <div className="flex min-h-screen flex-col bg-bg-app">
      {/* Masthead */}
      <header className="relative z-30 bg-bg-masthead text-white">
        <div className="flex h-[64px] items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <button
              className="lg:hidden"
              onClick={() => setNavOpen(!navOpen)}
              aria-label="Toggle navigation"
            >
              {navOpen ? (
                <X className="h-5 w-5 text-white/80" />
              ) : (
                <Menu className="h-5 w-5 text-white/80" />
              )}
            </button>

            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/[0.08]">
              <Landmark className="h-4 w-4 text-white" strokeWidth={1.75} />
            </div>

            <div className="min-w-0 leading-tight">
              <p className="truncate text-[14px] font-semibold tracking-wide">
                Sovereign Cyber-Risk Observatory
              </p>
              <p className="mt-0.5 text-[9px] font-medium uppercase tracking-[0.22em] text-white/55">
                CyberRisk Twin · India · Finance Sector
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="hidden items-center gap-2 rounded-full border border-white/15 bg-white/[0.06] px-3 py-1.5 sm:flex">
              <span className={clsx("h-2 w-2 rounded-full", conn.dot)} />
              <span className="text-[10px] font-semibold tracking-[0.14em] text-white/85">
                {conn.label}
              </span>
            </div>

            <button
              onClick={startTour}
              className="flex items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.06] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/85 transition-colors hover:bg-white/[0.12]"
            >
              <Compass className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Guide</span>
            </button>

            <div className="relative">
              <button
                onClick={() => setProfileOpen(!profileOpen)}
                className="flex items-center gap-2 rounded-lg px-1.5 py-1.5 transition-colors hover:bg-white/[0.08]"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/[0.12] text-xs font-bold text-white">
                  {user?.full_name?.charAt(0) ?? "U"}
                </div>
                <span className="hidden max-w-[140px] truncate text-sm font-medium text-white/90 md:block">
                  {user?.full_name ?? "User"}
                </span>
                <ChevronDown className="h-4 w-4 text-white/60" />
              </button>

              {profileOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setProfileOpen(false)}
                  />
                  <div className="absolute right-0 top-full z-50 mt-2 w-56 rounded-lg border border-border-default bg-bg-elevated py-1 text-text-primary shadow-modal">
                    <div className="border-b border-border-subtle px-4 py-3">
                      <p className="text-sm font-medium text-text-primary">
                        {user?.full_name}
                      </p>
                      <p className="text-xs text-text-tertiary">{user?.email}</p>
                    </div>
                    <button
                      onClick={() => {
                        navigate("/settings");
                        setProfileOpen(false);
                      }}
                      className="flex w-full items-center gap-2 px-4 py-2 text-sm text-text-secondary hover:bg-bg-hover hover:text-text-primary"
                    >
                      <Settings className="h-4 w-4" />
                      Settings
                    </button>
                    <button
                      onClick={handleLogout}
                      className="flex w-full items-center gap-2 px-4 py-2 text-sm text-status-critical hover:bg-bg-hover"
                    >
                      <LogOut className="h-4 w-4" />
                      Sign Out
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Mobile nav panel */}
        {navOpen && (
          <nav className="border-t border-white/10 px-4 pb-3 pt-2 lg:hidden">
            {navGroups.map((group) => (
              <div key={group.label}>
                <p className="px-2 pb-1 pt-3 text-[9px] font-semibold uppercase tracking-[0.18em] text-white/45">
                  {group.label}
                </p>
                {group.items.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.to === "/"}
                    onClick={() => setNavOpen(false)}
                    className={({ isActive }) =>
                      clsx(
                        "relative flex h-[38px] items-center gap-3 rounded-md px-2 text-[13px] font-medium transition-colors",
                        isActive
                          ? "bg-white/[0.1] font-semibold text-white"
                          : "text-white/70 hover:bg-white/[0.06] hover:text-white",
                      )
                    }
                  >
                    <item.icon className="h-4 w-4 flex-shrink-0" strokeWidth={1.75} />
                    {item.label}
                  </NavLink>
                ))}
              </div>
            ))}
          </nav>
        )}
      </header>

      {/* Top navigation strip */}
      <nav className="relative z-20 hidden border-b border-border-subtle bg-bg-surface lg:block">
        <div className="flex items-center overflow-x-auto px-4 xl:px-6">
          {navGroups.map((group, gi) => (
            <div key={group.label} className="flex items-center">
              {gi > 0 && (
                <span className="mx-3 h-4 w-px flex-shrink-0 bg-border-default" />
              )}
              <span className="mr-1 flex-shrink-0 text-[9px] font-semibold uppercase tracking-[0.16em] text-text-tertiary">
                {group.label}
              </span>
              {group.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === "/"}
                  className={({ isActive }) =>
                    clsx(
                      "relative flex h-[46px] items-center gap-2 px-3 text-[13px] font-medium transition-colors",
                      isActive
                        ? "font-semibold text-accent-primary"
                        : "text-text-secondary hover:bg-bg-hover hover:text-text-primary",
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      {isActive && (
                        <span className="absolute inset-x-2 bottom-0 h-[2px] rounded-full bg-accent-primary" />
                      )}
                      <item.icon
                        className="h-4 w-4 flex-shrink-0"
                        strokeWidth={1.75}
                      />
                      {item.label}
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          ))}
        </div>
      </nav>

      <main className="flex-1 overflow-y-auto p-4 md:p-6">
        <Outlet />
      </main>

      <GuidedTour />
    </div>
  );
}