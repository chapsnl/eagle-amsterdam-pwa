import { useLocation, useNavigate } from "react-router-dom";
import { Home, Calendar, Newspaper, Ticket, Crown, Mail } from "lucide-react";

const navItems = [
  { path: "/", label: "Home", icon: Home },
  { path: "/agenda", label: "Agenda", icon: Calendar },
  { path: "/vip", label: "VIP", icon: Crown },
  { path: "/events", label: "Tickets", icon: Ticket },
  { path: "/news", label: "News", icon: Newspaper },
  { path: "/contact", label: "Contact", icon: Mail },
];

const BottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-eagle-dark/95 backdrop-blur-md pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-center justify-around h-14 max-w-lg mx-auto px-4">
        {navItems.map(({ path, label, icon: Icon }) => {
          const active = location.pathname === path || (path === "/vip" && location.pathname.startsWith("/vip"));
          const isVip = path === "/vip";
          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              className={`flex flex-col items-center gap-1 px-3 py-2 transition-colors duration-200 ${
                active
                  ? "text-primary"
                  : "text-muted-foreground hover:text-primary"
              }`}
            >
              <Icon className={`${isVip ? 'w-8 h-8' : 'w-7 h-7'}`} />
              <span className="text-[11px] font-medium" style={{ letterSpacing: '-0.02em' }}>
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
