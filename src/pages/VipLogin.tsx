import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Crown, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

const VipLogin = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    import("@/lib/onesignal").then(({ initOneSignalSilently }) => {
      initOneSignalSilently().catch(() => {});
    });
  }, []);

  const handleSendCode = async () => {
    setError("");
    if (!email.trim()) { setError("Please enter your email address."); return; }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) { setError("Please enter a valid email address."); return; }

    setLoading(true);
    try {
      const targetEmail = email.trim().toLowerCase();
      const { data, error: fnError } = await supabase.functions.invoke("send-otp", {
        body: { email: targetEmail },
      });

      if (fnError) { setError(fnError.message || "Failed to send code. Please try again."); return; }
      if (!data?.success) { setError(data?.error || "Failed to send code. Please try again."); return; }
      if (data.smtp_error) { setError(`Code generated but email failed: ${data.smtp_error}`); return; }

      sessionStorage.setItem("vip_otp_email", targetEmail);
      localStorage.setItem("vip_otp_pending", JSON.stringify({ email: targetEmail }));
      navigate("/vip/verify");
    } catch (err: any) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen pb-24">
      <div className="flex-1 flex flex-col items-center justify-center px-4">
        <div className="w-full max-w-[90%] mx-auto space-y-6">
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
                onChange={(e) => setEmail(e.target.value)}
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
