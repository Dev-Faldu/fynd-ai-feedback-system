import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { MessageSquareText, LayoutDashboard } from "lucide-react";

export function Header() {
  const location = useLocation();

  const navItems = [
    { path: "/", label: "Submit Feedback", icon: MessageSquareText },
    { path: "/admin", label: "Admin Dashboard", icon: LayoutDashboard },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
      <div className="container flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="flex items-center justify-center w-9 h-9 rounded-lg gradient-hero">
            <MessageSquareText className="w-5 h-5 text-white" />
          </div>
          <span className="font-semibold text-lg tracking-tight">
            Fynd AI Feedback
          </span>
        </Link>

        <nav className="flex items-center gap-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                  isActive 
                    ? "bg-primary text-primary-foreground" 
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
