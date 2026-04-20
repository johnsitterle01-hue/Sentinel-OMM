import { Link, useLocation } from "wouter";
import {
  Activity,
  Bot,
  CalendarClock,
  LayoutDashboard,
  Newspaper,
  PieChart,
  Sparkles,
  Moon,
  Sun,
  BellRing,
  Send,
} from "lucide-react";
import { Logo } from "./Logo";
import { useTheme } from "./ThemeProvider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const nav = [
  { path: "/", label: "Übersicht", icon: LayoutDashboard },
  { path: "/markets", label: "Märkte", icon: Activity },
  { path: "/analysis", label: "Analyse", icon: Sparkles },
  { path: "/ideas", label: "KI-Ideen", icon: Bot },
  { path: "/news", label: "News", icon: Newspaper },
  { path: "/calendar", label: "Kalender", icon: CalendarClock },
  { path: "/portfolio", label: "Portfolio", icon: PieChart },
  { path: "/telegram", label: "Telegram-Alerts", icon: Send },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { theme, toggle } = useTheme();

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      {/* Sidebar */}
      <aside className="hidden md:flex w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar">
        <div className="flex h-16 items-center px-5 border-b border-sidebar-border">
          <Logo className="h-6 w-auto text-foreground" />
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {nav.map((item) => {
            const active = location === item.path;
            const Icon = item.icon;
            return (
              <Link key={item.path} href={item.path} data-testid={`nav-${item.label.toLowerCase().replace(/\s/g, "-")}`}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    active
                      ? "bg-primary/10 text-foreground"
                      : "text-muted-foreground hover-elevate",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                  {active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary" />}
                </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-sidebar-border">
          <div className="flex items-center justify-between text-xs text-muted-foreground px-2 py-1.5">
            <div className="flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
              </span>
              Live verbunden
            </div>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Topbar */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-background/80 backdrop-blur px-4 md:px-8">
          <div className="flex items-center gap-3 md:hidden">
            <Logo className="h-5 w-auto text-foreground" />
          </div>
          <div className="hidden md:block">
            <h1 className="text-lg font-semibold tracking-tight" data-testid="text-page-title">
              {nav.find((n) => n.path === location)?.label ?? "Dashboard"}
            </h1>
            <p className="text-xs text-muted-foreground">
              {new Date().toLocaleDateString("de-DE", {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/alerts">
              <Button variant="ghost" size="icon" data-testid="button-alerts">
                <BellRing className="h-4 w-4" />
              </Button>
            </Link>
            <Button
              variant="ghost"
              size="icon"
              onClick={toggle}
              data-testid="button-theme-toggle"
              aria-label="Theme umschalten"
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
          </div>
        </header>

        {/* Bottom nav on mobile */}
        <nav className="md:hidden flex items-center justify-around border-b border-border bg-background px-2 py-1 overflow-x-auto">
          {nav.map((item) => {
            const active = location === item.path;
            const Icon = item.icon;
            return (
              <Link key={item.path} href={item.path} className={cn(
                    "flex flex-col items-center gap-0.5 px-2 py-1.5 text-[10px] font-medium whitespace-nowrap",
                    active ? "text-primary" : "text-muted-foreground",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
            );
          })}
        </nav>

        <main className="flex-1 p-4 md:p-8 overflow-x-hidden">{children}</main>
      </div>
    </div>
  );
}
