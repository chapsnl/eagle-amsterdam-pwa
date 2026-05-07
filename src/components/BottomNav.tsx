import { useLocation, useNavigate } from "react-router-dom";
import { Home, Calendar, Newspaper, Ticket, Crown, Mail } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useDirectMessages } from "@/hooks/useDirectMessages";
import { useMemberVouchers } from "@/hooks/useMemberVouchers";

const BottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { data: dm } = useDirectMessages();
  const { data: vouchers } = useMemberVouchers();
  const unread = dm?.unread || 0;
  const activeVouchers = (vouchers || []).filter((v) => !v.redeemed).length;
  const vipBadge = unread + activeVouchers;

  // Hide bottom nav on admin subdomain
  if (window.location.hostname === "admin.eagleamsterdam.com") return null;

  const navItems = [
    { path: "/", label: t("nav.home"), icon: Home, badge: 0 },
    { path: "/agenda", label: t("nav.agenda"), icon: Calendar, badge: 0 },
    { path: "/vip", label: t("nav.vip"), icon: Crown, badge: unread },
    { path: "/events", label: t("nav.tickets"), icon: Ticket, badge: 0 },
    { path: "/news", label: t("nav.news"), icon: Newspaper, badge: 0 },
    { path: "/contact", label: t("nav.contact"), icon: Mail, badge: 0 },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-eagle-dark/95 backdrop-blur-md pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-center justify-around h-14 max-w-lg mx-auto px-4">
        {navItems.map(({ path, label, icon: Icon, badge }) => {
          const active = location.pathname === path || (path === "/vip" && location.pathname.startsWith("/vip"));
          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              className={`relative flex flex-col items-center gap-1 px-3 py-2 transition-colors duration-200 ${
                active
                  ? "text-primary"
                  : "text-muted-foreground hover:text-primary"
              }`}
            >
              {badge > 0 && (
                <span className="absolute top-0 right-1 bg-primary text-primary-foreground text-[10px] font-bold rounded-full min-w-[18px] h-[18px] px-1 flex items-center justify-center">
                  {badge}
                </span>
              )}
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
