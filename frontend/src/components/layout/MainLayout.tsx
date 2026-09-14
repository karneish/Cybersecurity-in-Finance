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
} from "lucide-react";
import ThemeToggle from "@/theme/ThemeToggle";
import { useMemo, useState } from "react";
import { clsx } from "clsx";
import type { LucideIcon } from "lucide-react";
import { PAGE_ACCESS, getAccessiblePages } from "@/config/roles";

interface NavItem {
  to: string;
  icon: LucideIcon;
  label: string;
}

const connectionStyle: Record<
  string,
  { dot: string; label: string; text: string }
> = {
  LIVE: { dot: "bg-status-live", label: "LIVE", text: "text-status-live" },
  CONNECTING: {
    dot: "bg-status-medium animate-pulse",
    label: "CONNECTING",
    text: "text-status-medium",
  },
  RECONNECTING: {
    dot: "bg-status-medium animate-pulse",
    label: "RECONNECTING",
    text: "text-status-medium",
  },
  DISCONNECTED: {
    dot: "bg-status-critical",
    label: "DISCONNECTED",
    text: "text-status-critical",
  },
};

export default function MainLayout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
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

  const conn = connectionStyle[wsState] ?? connectionStyle.DISCONNECTED;

  return (
    <div className="flex h-screen overflow-hidden bg-bg-app">
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/60 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={clsx(
          "fixed inset-y-0 left-0 z-40 flex w-[248px] flex-col border-r border-border-subtle bg-bg-sidebar transition-transform lg:static lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="relative overflow-hidden px-8 pb-4 pt-7">
          <span className="pointer-events-none absolute inset-x-4 top-7 h-px bg-gradient-to-r from-transparent via-gold/60 to-transparent" />
          <div className="flex flex-1 items-center justify-center">
            <img
              src="/logo.png"
              alt="CyberRisk Twin"
              className="h-[84px] w-auto object-contain"
            />
          </div>
          <p className="mt-2 text-center text-[9px] font-semibold uppercase tracking-[0.24em] text-gold">
            Sovereign Cyber-Risk Observatory
          </p>
          <button className="absolute right-4 top-6 lg:hidden" onClick={() => setSidebarOpen(false)}>
            <X className="h-5 w-5 text-text-secondary" />
          </button>
        </div>

        <nav className="mt-1 flex-1 space-y-1 overflow-y-auto px-3 pb-3">
          {navGroups.map((group) => (
            <div key={group.label}>
              <p className="px-3 pb-1 pt-4 text-[9px] font-semibold uppercase tracking-[0.18em] text-text-tertiary">
                {group.label}
              </p>
              {group.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === "/"}
                  onClick={() => setSidebarOpen(false)}
                  className={({ isActive }) =>
                    clsx(
                      "relative flex h-[34px] items-center gap-3 rounded-md px-3 text-[13px] font-medium transition-colors duration-150",
                      isActive
                        ? "bg-bg-surface font-semibold text-text-primary"
                        : "text-text-secondary hover:bg-bg-hover hover:text-text-primary",
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      {isActive && (
                        <span className="absolute left-0 top-1/2 h-5 w-[2px] -translate-y-1/2 rounded-r bg-gold" />
                      )}
                      <item.icon
                        className={clsx(
                          "h-4 w-4 flex-shrink-0",
                          isActive && "text-gold",
                        )}
                        strokeWidth={1.75}
                      />
                      {item.label}
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        <div className="border-t border-border-subtle p-3">
          <div className="mb-2 flex items-center gap-1.5 rounded-md bg-bg-hover px-3 py-2">
            <span className={clsx("h-1.5 w-1.5 rounded-full", conn.dot)} />
            <span
              className={clsx(
                "text-[10px] font-semibold tracking-[0.14em]",
                conn.text,
              )}
            >
              {conn.label}
            </span>
            <span className="ml-auto text-[10px] text-text-tertiary">
              WebSocket
            </span>
          </div>
          <button
            onClick={handleLogout}
            className="flex h-[34px] w-full items-center gap-3 rounded-md px-3 text-[13px] font-medium text-text-secondary transition-colors hover:bg-bg-hover hover:text-text-primary"
          >
            <LogOut className="h-4 w-4 flex-shrink-0" strokeWidth={1.75} />
            Sign Out
          </button>
        </div>
      </aside>

      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="relative flex h-[64px] items-center justify-between border-b border-border-subtle bg-bg-sidebar px-5">
          <span className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-gold to-transparent" />

          <div className="flex min-w-0 items-center gap-3">
            <button className="lg:hidden" onClick={() => setSidebarOpen(true)}>
              <Menu className="h-5 w-5 text-text-secondary" />
            </button>

            <div className="hidden items-center gap-3 md:flex">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-gold/40 bg-bg-surface shadow-gold">
                <Landmark className="h-4 w-4 text-gold" strokeWidth={1.75} />
              </div>
              <div className="leading-tight">
                <p className="text-[13px] font-semibold text-text-primary">
                  Sovereign Cyber-Risk Observatory
                </p>
                <p className="mt-0.5 text-[9px] font-semibold uppercase tracking-[0.22em] text-gold">
                  CyberRisk Twin · India
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="mr-1 hidden items-center gap-1.5 rounded-full border border-border-default bg-bg-surface px-2.5 py-1 sm:flex">
              <span className={clsx("h-2 w-2 rounded-full", conn.dot)} />
              <span
                className={clsx(
                  "text-[11px] font-semibold tracking-wide",
                  conn.text,
                )}
              >
                {conn.label}
              </span>
            </div>

            <ThemeToggle />

            <div className="relative">
              <button
                onClick={() => setProfileOpen(!profileOpen)}
                className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-bg-hover"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full border border-gold/30 bg-accent-primary/15 text-xs font-bold text-accent-primary">
                  {user?.full_name?.charAt(0) ?? "U"}
                </div>
                <span className="hidden font-medium text-text-primary md:block">
                  {user?.full_name ?? "User"}
                </span>
                <ChevronDown className="h-4 w-4 text-text-tertiary" />
              </button>

              {profileOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setProfileOpen(false)}
                  />
                  <div className="absolute right-0 top-full z-50 mt-1 w-56 rounded-lg border border-border-default bg-bg-elevated py-1 shadow-modal">
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
        </header>

        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}