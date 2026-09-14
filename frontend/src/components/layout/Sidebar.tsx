import { NavLink } from "react-router-dom";
import {
  Shield,
  LayoutDashboard,
  ShieldAlert,
  BarChart3,
  Server,
  Bug,
  FlaskConical,
  TrendingUp,
  Bot,
  Settings,
} from "lucide-react";
import { clsx } from "clsx";

const navItems = [
  { label: "Executive Dashboard", icon: LayoutDashboard, to: "/" },
  { label: "Command Center", icon: ShieldAlert, to: "/security" },
  { label: "Risk Analysis", icon: BarChart3, to: "/risk" },
  { label: "Assets", icon: Server, to: "/assets" },
  { label: "Vulnerabilities", icon: Bug, to: "/vulnerabilities" },
  { label: "Scenario Simulator", icon: FlaskConical, to: "/simulator" },
  { label: "Investment Optimizer", icon: TrendingUp, to: "/investment" },
  { label: "AI Assistant", icon: Bot, to: "/ai" },
  { label: "Settings", icon: Settings, to: "/settings" },
];

export default function Sidebar() {
  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-64 flex-col bg-brand-950">
      <div className="flex h-16 items-center gap-3 px-6">
        <Shield className="h-8 w-8 text-brand-400" />
        <span className="text-xl font-bold text-white">CyberRisk</span>
      </div>

      <nav className="mt-4 flex-1 space-y-1 px-3">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            className={({ isActive }) =>
              clsx(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-brand-600 text-white"
                  : "text-brand-200 hover:bg-brand-800 hover:text-white",
              )
            }
          >
            <item.icon className="h-5 w-5 flex-shrink-0" />
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-brand-800 px-6 py-4">
        <p className="text-xs text-brand-400">CyberRisk Platform v1.0</p>
      </div>
    </aside>
  );
}
