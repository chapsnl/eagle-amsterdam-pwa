import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Settings as SettingsIcon, Crown, User, Mail, Hash, Calendar, Star, Shield, ShieldOff, LogOut } from "lucide-react";
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

  // PIN lock state
  const [pinEnabled, setPinEnabled] = useState(() => localStorage.getItem("app_pin_enabled") === "true");
  const [showPinSetup, setShowPinSetup] = useState(false);
  const [pinDigits, setPinDigits] = useState<string[]>(["", "", "", "", "", ""]);

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

  const handlePinToggle = () => {
    if (pinEnabled) {
      // Disable PIN
      localStorage.removeItem("app_pin_enabled");
      localStorage.removeItem("app_pin_code");
      setPinEnabled(false);
      setShowPinSetup(false);
    } else {
      // Show PIN setup
      setPinDigits(["", "", "", "", "", ""]);
      setShowPinSetup(true);
    }
  };

  const handlePinDigitChange = (index: number, value: string) => {
    const digit = value.replace(/\D/g, "").slice(-1);
    const next = [...pinDigits];
    next[index] = digit;
    setPinDigits(next);
    if (digit && index < 5) {
      const nextInput = document.getElementById(`pin-setup-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handlePinKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !pinDigits[index] && index > 0) {
      const prevInput = document.getElementById(`pin-setup-${index - 1}`);
      prevInput?.focus();
    }
  };

  const savePin = () => {
    const code = pinDigits.join("");
    if (code.length !== 6) return;
    localStorage.setItem("app_pin_code", code);
    localStorage.setItem("app_pin_enabled", "true");
    setPinEnabled(true);
    setShowPinSetup(false);
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

          {/* PIN Lock */}
          <div className="border border-border rounded-xl bg-card neon-border p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {pinEnabled ? (
                  <Shield className="w-5 h-5 text-primary" />
                ) : (
                  <ShieldOff className="w-5 h-5 text-muted-foreground" />
                )}
                <div>
                  <p className="text-foreground text-sm font-semibold">App Lock</p>
                  <p className="text-muted-foreground text-xs">Require a 6-digit PIN to open the app</p>
                </div>
              </div>
              <button
                onClick={handlePinToggle}
                className={`relative w-12 h-7 rounded-full transition-colors ${pinEnabled ? "bg-primary" : "bg-secondary"}`}
              >
                <span
                  className={`absolute top-0.5 w-6 h-6 rounded-full bg-foreground transition-transform ${pinEnabled ? "left-[22px]" : "left-0.5"}`}
                />
              </button>
            </div>

            {showPinSetup && (
              <div className="space-y-3 pt-2">
                <p className="text-muted-foreground text-xs text-center">Enter a 6-digit PIN</p>
                <div className="flex justify-center gap-3">
                  {pinDigits.map((d, i) => (
                    <input
                      key={i}
                      id={`pin-setup-${i}`}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={d}
                      onChange={(e) => handlePinDigitChange(i, e.target.value)}
                      onKeyDown={(e) => handlePinKeyDown(i, e)}
                      className="w-10 h-14 text-center text-2xl font-bold bg-secondary border-2 border-border text-foreground rounded-xl focus:border-primary focus:outline-none transition-colors"
                    />
                  ))}
                </div>
                <Button
                  variant="eagle"
                  className="w-full rounded-xl"
                  disabled={pinDigits.join("").length !== 6}
                  onClick={savePin}
                >
                  SET PIN
                </Button>
              </div>
            )}
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
