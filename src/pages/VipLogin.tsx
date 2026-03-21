import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Crown, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { isDevMode } from "@/lib/devMode";

const DEV = isDevMode();

const VipLogin = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState(() => localStorage.getItem("remembered_email") || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const redirectTarget = useMemo(() => {
    const r = searchParams.get("redirect") || "";
    return r.startsWith("/") ? r : "/vip";
  }, [searchParams]);

  useEffect(() => {
    import("@/lib/onesignal").then(({ initOneSignalSilently }) => {
      initOneSignalSilently().catch(() => {});
    });
  }, []);

  const handleSendCode = async () => {
    setError("");
    const trimmed = email.trim().toLowerCase();

    if (!trimmed) { setError("Please enter your email address."); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) { setError("Please enter a valid email address."); return; }

    setLoading(true);
    if (DEV) console.log("[VipLogin] Sending OTP to:", trimmed);

    try {
      localStorage.setItem("remembered_email", trimmed);

      const { data, error: fnError } = await supabase.functions.invoke("send-otp", {
        body: { email: trimmed },
      });

      if (DEV) console.log("[VipLogin] Response:", { data, fnError });

      if (fnError) { setError("Could not send code. Please try again."); return; }
      if (!data?.success) { setError(data?.error || "Failed to send code."); return; }
      if (data.smtp_error) { setError(`Code generated but email failed: ${data.smtp_error}`); return; }

      sessionStorage.setItem("vip_otp_email", trimmed);
      sessionStorage.setItem("vip_redirect_after_verify", redirectTarget);
      localStorage.setItem("vip_otp_pending", JSON.stringify({ email: trimmed, redirect: redirectTarget }));

      navigate("/vip/verify");
    } catch (err: any) {
      if (DEV) console.error("[VipLogin] Error:", err);
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen pb-24">
      <div className="flex-1 flex flex-col items-center justify-center px-4">
        <div className="w-full max-w-lg mx-auto space-y-6">
          <div className="text-center space-y-2">
            <Crown className="w-10 h-10 text-primary mx-auto" />
            <h1 className="text-2xl text-foreground">VIP MEMBERS</h1>
            <p className="text-muted-foreground text-xs">
              Enter your email to receive a verification code via email.
            </p>
          </div>

          <div className="space-y-3">
            <div className="relative">
              <Input
                id="email"
                type="email"
                placeholder=" "
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  localStorage.setItem("remembered_email", e.target.value.trim().toLowerCase());
                }}
                className="bg-secondary border-2 border-border text-foreground rounded-xl h-14 pt-5 pb-2 px-4 peer"
                maxLength={255}
              />
              <Label
                htmlFor="email"
                className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground text-sm transition-all duration-200 pointer-events-none peer-focus:top-3 peer-focus:text-xs peer-focus:text-primary peer-[:not(:placeholder-shown)]:top-3 peer-[:not(:placeholder-shown)]:text-xs"
              >
                Email
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
              onClick={handleSendCode}
              disabled={loading}
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin mr-2" />
                  SENDING CODE...
                </>
              ) : (
                <>
                  SEND CODE
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

export default VipLogin;
