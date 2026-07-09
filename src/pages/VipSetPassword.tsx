import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { KeyRound, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";

const VipSetPassword = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const continueAfterPassword = () => {
    const redirect = sessionStorage.getItem("vip_post_password_redirect") || "/vip/dashboard";
    const name = sessionStorage.getItem("vip_post_password_name") || "";
    sessionStorage.removeItem("vip_post_password_redirect");
    sessionStorage.removeItem("vip_post_password_name");

    if (!name || name.trim() === "") {
      navigate("/vip/profile-setup");
    } else {
      const next = redirect.startsWith("/") ? redirect : "/vip/dashboard";
      navigate(next === "/vip" ? "/vip/dashboard" : next);
    }
  };

  const handleSave = async () => {
    setError("");

    if (password.length < 8) {
      setError(t("vipSetPassword.errorTooShort"));
      return;
    }
    if (password !== confirmPassword) {
      setError(t("vipSetPassword.errorMismatch"));
      return;
    }

    setLoading(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password,
        data: { needs_password_reset: false },
      });

      if (updateError) {
        setError(updateError.message || t("vipSetPassword.errorGeneric"));
        return;
      }

      continueAfterPassword();
    } catch {
      setError(t("vipSetPassword.errorGeneric"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen pb-24">
      <div className="flex-1 flex flex-col items-center justify-center px-4">
        <div className="w-full max-w-lg mx-auto space-y-8">
          <div className="text-center space-y-3">
            <KeyRound className="w-12 h-12 text-primary mx-auto" />
            <h1 className="text-2xl text-foreground">{t("vipSetPassword.title")}</h1>
            <p className="text-muted-foreground text-sm leading-relaxed">
              {t("vipSetPassword.message")}
            </p>
          </div>

          <div className="space-y-3">
            <div className="relative">
              <Input
                id="password"
                type="password"
                placeholder=" "
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-secondary border-2 border-border text-foreground rounded-xl h-14 pt-5 pb-2 px-4 peer"
                autoComplete="new-password"
                autoFocus
              />
              <Label
                htmlFor="password"
                className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground text-sm transition-all duration-200 pointer-events-none peer-focus:top-3 peer-focus:text-xs peer-focus:text-primary peer-[:not(:placeholder-shown)]:top-3 peer-[:not(:placeholder-shown)]:text-xs"
              >
                {t("vipSetPassword.passwordLabel")}
              </Label>
            </div>

            <div className="relative">
              <Input
                id="confirmPassword"
                type="password"
                placeholder=" "
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="bg-secondary border-2 border-border text-foreground rounded-xl h-14 pt-5 pb-2 px-4 peer"
                autoComplete="new-password"
                onKeyDown={(e) => e.key === "Enter" && handleSave()}
              />
              <Label
                htmlFor="confirmPassword"
                className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground text-sm transition-all duration-200 pointer-events-none peer-focus:top-3 peer-focus:text-xs peer-focus:text-primary peer-[:not(:placeholder-shown)]:top-3 peer-[:not(:placeholder-shown)]:text-xs"
              >
                {t("vipSetPassword.confirmPasswordLabel")}
              </Label>
            </div>

            {error && (
              <div className="bg-destructive/20 border border-destructive text-destructive-foreground text-sm p-3 rounded-xl">
                {error}
              </div>
            )}

            <Button
              variant="eagle"
              size="lg"
              className="w-full h-12 text-lg rounded-xl"
              onClick={handleSave}
              disabled={loading}
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  {t("vipSetPassword.submit")}
                  <ArrowRight className="w-5 h-5 ml-2" />
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VipSetPassword;
