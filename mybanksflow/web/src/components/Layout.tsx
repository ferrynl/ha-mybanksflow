import { ReactNode, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  LayoutDashboard,
  ArrowLeftRight,
  PiggyBank,
  Upload,
  CalendarClock,
  Settings,
  LogOut,
  Users,
  FileText,
  Shield,
  BarChart3,
  Lightbulb,
  Menu,
  X,
  ScrollText,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetTrigger, SheetClose, SheetTitle } from "@/components/ui/sheet";

const navItems = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/transactions", icon: ArrowLeftRight, label: "Transacties" },
  { to: "/planned", icon: CalendarClock, label: "Gepland" },
  { to: "/contracts", icon: ScrollText, label: "Contracten" },
  { to: "/contacts", icon: Users, label: "Contacten" },
  { to: "/budget", icon: PiggyBank, label: "Budget" },
  { to: "/reports", icon: BarChart3, label: "Rapporten" },
  { to: "/import", icon: Upload, label: "Importeren" },
  { to: "/changelog", icon: FileText, label: "Versies" },
  { to: "/feedback", icon: Lightbulb, label: "Wensen & Bugs" },
  { to: "/settings", icon: Settings, label: "Instellingen" },
];

const adminItems = [
  { to: "/admin", icon: Shield, label: "Admin" },
];

function NavContent({ pathname, allNavItems, user, signOut, onNavigate }: {
  pathname: string;
  allNavItems: typeof navItems;
  user: any;
  signOut: () => void;
  onNavigate?: () => void;
}) {
  return (
    <>
      <div className="flex h-16 items-center gap-3 px-6">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg gradient-primary">
          <PiggyBank className="h-5 w-5 text-primary-foreground" />
        </div>
        <span className="text-lg font-bold text-foreground tracking-tight">MyBanksFlow</span>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {allNavItems.map(({ to, icon: Icon, label }) => {
          const active = pathname === to;
          return (
            <Link
              key={to}
              to={to}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                active
                  ? "bg-sidebar-accent text-sidebar-primary"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                to === "/planned" && "ml-4 text-xs"
              )}
            >
              <Icon className="h-4.5 w-4.5" />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-sidebar-border p-4 space-y-2">
        {user && (
          <div className="flex items-center justify-between px-2">
            <span className="text-xs text-muted-foreground truncate max-w-[140px]">
              {user.email}
            </span>
            <button
              onClick={signOut}
              className="rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-sidebar-accent transition-colors"
              title="Uitloggen"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        )}
        <p className="text-[10px] text-muted-foreground/50 text-center">v1.16</p>
      </div>
    </>
  );
}

export default function Layout({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const { user, signOut } = useAuth();
  const { isAdmin } = useIsAdmin();
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const allNavItems = isAdmin ? [...navItems, ...adminItems] : navItems;

  if (isMobile) {
    return (
      <div className="flex min-h-screen flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border/50 bg-sidebar px-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg gradient-primary">
              <PiggyBank className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="text-base font-bold text-foreground tracking-tight">MyBanksFlow</span>
          </div>
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <button className="rounded-md p-2 text-muted-foreground hover:text-foreground hover:bg-sidebar-accent transition-colors">
                <Menu className="h-5 w-5" />
              </button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-0 bg-sidebar border-border/50">
              <SheetTitle className="sr-only">Navigatie</SheetTitle>
              <NavContent
                pathname={pathname}
                allNavItems={allNavItems}
                user={user}
                signOut={signOut}
                onNavigate={() => setOpen(false)}
              />
            </SheetContent>
          </Sheet>
        </header>

        <main className="flex-1">
          <div className="mx-auto max-w-6xl px-4 py-4">{children}</div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <aside className="fixed inset-y-0 left-0 z-30 flex w-64 flex-col border-r border-border/50 bg-sidebar">
        <NavContent
          pathname={pathname}
          allNavItems={allNavItems}
          user={user}
          signOut={signOut}
        />
      </aside>

      <main className="flex-1 pl-64">
        <div className="mx-auto max-w-6xl px-6 py-8">{children}</div>
      </main>
    </div>
  );
}
