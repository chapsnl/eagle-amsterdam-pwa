import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Star, Tag, Newspaper, LogOut, Crown } from "lucide-react";

const menuItems = [
  { label: "Loyalty Card", icon: Star, path: "/loyalty" },
  { label: "Member Deals", icon: Tag, path: null },
  { label: "Private News", icon: Newspaper, path: null },
  { label: "Logout", icon: LogOut, path: null, isLogout: true },
];

const MemberHome = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  return (
    <div className="flex flex-col min-h-screen pb-24 px-4">
      <div className="pt-8 max-w-lg mx-auto w-full">
        <div className="flex items-center gap-3 mb-1">
          <Crown className="w-7 h-7 text-primary" />
          <h1 className="text-4xl font-display tracking-wider text-foreground">
            VIP
          </h1>
        </div>
        <p className="text-muted-foreground text-sm mb-8">
          Welkom, {user?.user_metadata?.name || "Member"}
        </p>
      </div>

      <div className="max-w-[90%] mx-auto w-full grid grid-cols-2 gap-3">
        {menuItems.map(({ label, icon: Icon, path, isLogout }) => (
          <button
            key={label}
            onClick={() => {
              if (isLogout) {
                signOut();
              } else if (path) {
                navigate(path);
              }
            }}
            className="flex flex-col items-center justify-center gap-3 p-6 bg-card border border-border rounded-none transition-colors hover:border-primary aspect-square"
          >
            <Icon className={`w-8 h-8 ${isLogout ? "text-muted-foreground" : "text-primary"}`} />
            <span className="text-foreground text-sm font-medium tracking-tight">
              {label}
            </span>
            {!path && !isLogout && (
              <span className="text-muted-foreground text-[11px]">Coming soon</span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
};

export default MemberHome;
