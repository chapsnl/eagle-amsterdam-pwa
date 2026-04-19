import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Settings as SettingsIcon, Crown, User, Mail, Hash, Calendar, Star, LogOut, Bell, BellOff, RefreshCw, Languages } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";
import { SUPPORTED_LANGUAGES } from "@/i18n";

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
  const { t, i18n } = useTranslation();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // Push notification state
  const [pushStatus, setPushStatus] = useState<"loading" | "granted" | "denied" | "default">("loading");
  const [pushRequesting, setPushRequesting] = useState(false);

  const currentLang = (i18n.resolvedLanguage || i18n.language || "en").slice(0, 2);

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

  // Check push notification status
  useEffect(() => {
    if (!isLoggedIn) return;
    if ("Notification" in window) {
      setPushStatus(Notification.permission as "granted" | "denied" | "default");
    } else {
      setPushStatus("denied");
    }
  }, [isLoggedIn]);

  const handleEnablePush = async () => {
    setPushRequesting(true);
    try {
      const { requestPushPermission, setOneSignalExternalId } = await import("@/lib/onesignal");
      const granted = await requestPushPermission();
      setPushStatus(granted ? "granted" : "denied");

      if (granted && profile?.email) {
        await setOneSignalExternalId(profile.email);
      }
    } catch {
      setPushStatus("denied");
    } finally {
      setPushRequesting(false);
    }
  };

  const loadProfile = async (userId: string, sessionName?: string) => {
    try {
      const { data } = await supabase.functions.invoke("get-profile", {
        body: { userId },
      });
      if (data?.success && data.profile) {
        const p = data.profile;
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

  const handleLanguageChange = (lng: string) => {
    i18n.changeLanguage(lng);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-GB", {
      day: "numeric", month: "short", year: "numeric",
    });
  };

  const infoRows: { icon: React.ReactNode; label: string; value: string }[] = profile
    ? [
        { icon: <User className="w-4 h-4 text-primary" />, label: t("settings.name"), value: profile.name || "—" },
        { icon: <Mail className="w-4 h-4 text-primary" />, label: t("settings.email"), value: profile.email || "—" },
        { icon: <Hash className="w-4 h-4 text-primary" />, label: t("settings.userNumber"), value: profile.member_number || "—" },
        { icon: <Calendar className="w-4 h-4 text-primary" />, label: t("settings.memberSince"), value: formatDate(profile.created_at) },
        { icon: <Crown className="w-4 h-4 text-primary" />, label: t("settings.status"), value: profile.vip_status },
        { icon: <Star className="w-4 h-4 text-primary" />, label: t("settings.totalTokens"), value: String(profile.total_stamps_earned) },
      ]
    : [];

  // Language picker section (always visible, also for non-logged-in users)
  const languageCard = (
    <div className="border border-border rounded-xl bg-card neon-border p-5 space-y-3">
      <div className="flex items-center gap-3">
        <Languages className="w-5 h-5 text-primary" />
        <div>
          <p className="text-foreground text-sm font-semibold">{t("settings.language")}</p>
          <p className="text-muted-foreground text-xs">{t("settings.languageDesc")}</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {SUPPORTED_LANGUAGES.map((lng) => {
          const active = currentLang === lng.code;
          return (
            <button
              key={lng.code}
              onClick={() => handleLanguageChange(lng.code)}
              className={`rounded-xl py-2.5 text-sm font-semibold border transition-colors ${
                active
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-secondary text-foreground border-border hover:bg-secondary/80"
              }`}
            >
              {lng.label}
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="flex flex-col min-h-screen pb-20 pt-8 px-4 max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate(-1)}
          className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center hover:bg-secondary/80 transition-colors"
          aria-label={t("settings.back")}
        >
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <h1 className="text-4xl font-display tracking-wider text-foreground flex items-center gap-3">
          <SettingsIcon className="w-7 h-7 text-primary" />
          {t("settings.title")}
        </h1>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : !isLoggedIn ? (
        <div className="space-y-4">
          <div className="border border-border rounded-xl p-6 bg-card neon-border text-center space-y-4">
            <Crown className="w-10 h-10 text-primary mx-auto" />
            <p className="text-muted-foreground text-sm">
              {t("settings.loginPrompt")}
            </p>
            <Button variant="eagle" className="rounded-xl" onClick={() => navigate("/vip/login")}>
              {t("settings.vipLogin")}
            </Button>
          </div>
          {languageCard}
        </div>
      ) : (
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

          {/* Language */}
          {languageCard}

          {/* Push Notifications */}
          <div className="border border-border rounded-xl bg-card neon-border p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {pushStatus === "granted" ? (
                  <Bell className="w-5 h-5 text-primary" />
                ) : (
                  <BellOff className="w-5 h-5 text-muted-foreground" />
                )}
                <div>
                  <p className="text-foreground text-sm font-semibold">{t("settings.pushNotifications")}</p>
                  <p className="text-muted-foreground text-xs">
                    {pushStatus === "loading"
                      ? t("settings.pushChecking")
                      : pushStatus === "granted"
                        ? t("settings.pushEnabled")
                        : pushStatus === "denied"
                          ? t("settings.pushBlocked")
                          : t("settings.pushDefault")}
                  </p>
                </div>
              </div>

              {pushStatus === "granted" ? (
                <span className="px-3 py-1 rounded-full bg-primary/20 text-primary text-xs font-bold">
                  {t("settings.active")}
                </span>
              ) : pushStatus === "denied" ? (
                <span className="px-3 py-1 rounded-full bg-destructive/20 text-destructive text-xs font-bold">
                  {t("settings.blocked")}
                </span>
              ) : null}
            </div>

            {pushStatus === "default" && (
              <button
                onClick={handleEnablePush}
                disabled={pushRequesting}
                className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl py-3 font-bold text-sm transition-colors disabled:opacity-60"
              >
                {pushRequesting ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Bell className="w-4 h-4" />
                )}
                {pushRequesting ? t("settings.requesting") : t("settings.enablePush")}
              </button>
            )}

            {pushStatus === "denied" && (
              <p className="text-muted-foreground text-xs text-center">
                {t("settings.blockedHelp")}
              </p>
            )}
          </div>

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 bg-destructive/20 hover:bg-destructive/30 text-destructive border border-destructive/30 rounded-xl py-3.5 font-bold text-sm transition-colors"
          >
            <LogOut className="w-4 h-4" />
            {t("settings.logout")}
          </button>
        </div>
      )}
    </div>
  );
};

export default Settings;
