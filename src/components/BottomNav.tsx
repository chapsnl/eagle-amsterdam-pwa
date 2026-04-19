import { useLocation, useNavigate } from "react-router-dom";
import { Home, Calendar, Newspaper, Ticket, Crown, Mail } from "lucide-react";
import { useTranslation } from "react-i18next";

const BottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();

  // Hide bottom nav on admin subdomain
  if (window.location.hostname === "admin.eagleamsterdam.com") return null;

  const navItems = [
    { path: "/", label: t("nav.home"), icon: Home },
    { path: "/agenda", label: t("nav.agenda"), icon: Calendar },
    { path: "/vip", label: t("nav.vip"), icon: Crown },
    { path: "/events", label: t("nav.tickets"), icon: Ticket },
    { path: "/news", label: t("nav.news"), icon: Newspaper },
    { path: "/contact", label: t("nav.contact"), icon: Mail },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-eagle-dark/95 backdrop-blur-md pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-center justify-around h-14 max-w-lg mx-auto px-4">
        {navItems.map(({ path, label, icon: Icon }) => {
          const active = location.pathname === path || (path === "/vip" && location.pathname.startsWith("/vip"));
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
              <Icon className="w-8 h-8" />
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
