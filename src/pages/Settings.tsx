import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Settings as SettingsIcon, Crown, User, Mail, Hash, Calendar, Star, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

interface ProfileData {
  name: string;
  email: string;
  member_number: string | null;
  created_at: string;
  vip_status: string;
  total_stamps_earned: number;
}

const Settings = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("vip_session");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed.verified && parsed.userId) {
          setIsLoggedIn(true);
          loadProfile(parsed.userId, parsed.name || "");
          return;
        }
      } catch {}
    }
    setIsLoggedIn(false);
    setLoading(false);
  }, []);

  const loadProfile = async (userId: string, sessionName?: string) => {
    try {
      const { data } = await supabase.functions.invoke("get-profile", {
        body: { userId },
      });
      if (data?.success && data.profile) {
        const p = data.profile;
        // Use session name (from signup) as fallback if profile name is empty
        if ((!p.name || p.name.trim() === "") && sessionName) {
          p.name = sessionName;
        }
        setProfile(p);
      }
    } catch {} finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("vip_session");
    sessionStorage.removeItem("vip_otp_email");
    sessionStorage.removeItem("vip_redirect_after_verify");
    localStorage.removeItem("vip_otp_pending");
    setIsLoggedIn(false);
    setProfile(null);
    navigate("/");
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-GB", {
      day: "numeric", month: "short", year: "numeric",
    });
  };

  const infoRows: { icon: React.ReactNode; label: string; value: string }[] = profile
    ? [
        { icon: <User className="w-4 h-4 text-primary" />, label: "Name", value: profile.name || "—" },
        { icon: <Mail className="w-4 h-4 text-primary" />, label: "Email", value: profile.email || "—" },
        { icon: <Hash className="w-4 h-4 text-primary" />, label: "User Number", value: profile.member_number || "—" },
        { icon: <Calendar className="w-4 h-4 text-primary" />, label: "Member Since", value: formatDate(profile.created_at) },
        { icon: <Crown className="w-4 h-4 text-primary" />, label: "Status", value: profile.vip_status },
        { icon: <Star className="w-4 h-4 text-primary" />, label: "Total Loyalty Tokens", value: String(profile.total_stamps_earned) },
      ]
    : [];

  return (
    <div className="flex flex-col min-h-screen pb-20 pt-8 px-4 max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate(-1)}
          className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center hover:bg-secondary/80 transition-colors"
          aria-label="Go back"
        >
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <h1 className="text-4xl font-display tracking-wider text-foreground flex items-center gap-3">
          <SettingsIcon className="w-7 h-7 text-primary" />
          SETTINGS
        </h1>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : !isLoggedIn ? (
        /* Not logged in */
        <div className="border border-border rounded-xl p-6 bg-card neon-border text-center space-y-4">
          <Crown className="w-10 h-10 text-primary mx-auto" />
          <p className="text-muted-foreground text-sm">
            Log in as a VIP member to see your profile information.
          </p>
          <Button variant="eagle" className="rounded-xl" onClick={() => navigate("/vip/login")}>
            VIP LOGIN
          </Button>
        </div>
      ) : (
        /* Logged in — show profile */
        <div className="space-y-4">
          <div className="border border-border rounded-xl bg-card neon-border overflow-hidden">
            {infoRows.map((row, i) => (
              <div
                key={row.label}
                className={`flex items-center justify-between px-5 py-3.5 ${i !== infoRows.length - 1 ? "border-b border-border" : ""}`}
              >
                <div className="flex items-center gap-3">
                  {row.icon}
                  <span className="text-muted-foreground text-sm">{row.label}</span>
                </div>
                <span className="text-foreground text-sm font-semibold">{row.value}</span>
              </div>
            ))}
          </div>

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 bg-destructive/20 hover:bg-destructive/30 text-destructive border border-destructive/30 rounded-xl py-3.5 font-bold text-sm transition-colors"
          >
            <LogOut className="w-4 h-4" />
            LOGOUT AS VIP
          </button>
        </div>
      )}
    </div>
  );
};

export default Settings;
