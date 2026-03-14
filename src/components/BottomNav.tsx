import { useLocation, useNavigate } from "react-router-dom";
import { Home, Calendar, Newspaper, Ticket, Star, Mail } from "lucide-react";

const navItems = [
  { path: "/", label: "Home", icon: Home },
  { path: "/agenda", label: "Agenda", icon: Calendar },
  { path: "/loyalty", label: "Loyalty", icon: Star },
  { path: "/events", label: "Tickets", icon: Ticket },
  { path: "/news", label: "News", icon: Newspaper },
  { path: "/contact", label: "Contact", icon: Mail },
];

const BottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-eagle-dark/95 backdrop-blur-md safe-area-pb">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
        {navItems.map(({ path, label, icon: Icon }) => {
          const active = location.pathname === path;
          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              className={`flex flex-col items-center gap-1 px-2 py-2 transition-colors duration-200 ${
                active
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-medium tracking-wide uppercase">
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
