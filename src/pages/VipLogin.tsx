import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Crown, ArrowRight, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

const VipLogin = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [pushEnabled, setPushEnabled] = useState(
    () => localStorage.getItem("eagle-onesignal-initialized") === "true"
  );

  const handleEnablePush = async () => {
    try {
      const { requestPushPermission } = await import("@/lib/onesignal");
      await requestPushPermission();
      setPushEnabled(true);
    } catch {
      // OneSignal may not be available
    }
  };

  const handleSendCode = async () => {
    setError("");

    if (!email.trim()) {
      setError("Please enter your email address.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("Please enter a valid email address.");
      return;
    }

    setLoading(true);

    try {
      const targetEmail = email.trim().toLowerCase();
      let subscriptionId: string | null = null;

      // Step 1: Force login to sync OneSignal identity
      try {
        const { setOneSignalExternalId } = await import("@/lib/onesignal");
        console.log("[VIP Login] Step 1 — OneSignal.login() with:", targetEmail);
        await setOneSignalExternalId(targetEmail);

        // Step 2: Capture hardware subscription ID
        await new Promise<void>((resolve) => {
          window.OneSignalDeferred = window.OneSignalDeferred || [];
          window.OneSignalDeferred.push(async (OneSignal: any) => {
            const pushId = OneSignal.User?.PushSubscription?.id;
            if (pushId) {
              subscriptionId = pushId;
              console.log("[VIP Login] Step 2 — Captured subscription ID:", pushId);
            } else {
              console.warn("[VIP Login] Step 2 — No subscription ID available");
            }
            resolve();
          });
        });

        // Step 3: Mandatory 2-second delay for OneSignal DB sync
        console.log("[VIP Login] Step 3 — Waiting 2s for OneSignal DB sync...");
        await new Promise((resolve) => setTimeout(resolve, 2000));
        console.log("[VIP Login] Step 3 — Sync complete. subscriptionId:", subscriptionId);
      } catch (e) {
        console.warn("[VIP Login] OneSignal not available, skipping push sync:", e);
      }

      // Step 4: Dispatch OTP with subscription ID for dual-targeting
      const { data, error: fnError } = await supabase.functions.invoke("send-otp", {
        body: { name: "", email: targetEmail, subscriptionId },
      });

      if (fnError) {
        setError(fnError.message || "Failed to send code. Please try again.");
        setLoading(false);
        return;
      }

      if (!data?.success) {
        setError(data?.error || "Failed to send code. Please try again.");
        setLoading(false);
        return;
      }

      if (data.smtp_error) {
        setError(`Code generated but email failed: ${data.smtp_error}`);
        setLoading(false);
        return;
      }

      // Store email for verify page
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
          {/* Header */}
          <div className="text-center space-y-2">
            <Crown className="w-10 h-10 text-primary mx-auto" />
            <h1 className="text-2xl text-foreground">VIP MEMBERS</h1>
            <p className="text-muted-foreground text-xs">
              Enter your email to receive a verification code.
            </p>
          </div>

          {/* Form — email only */}
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-foreground text-sm">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-secondary border-border text-foreground rounded-none h-11"
                maxLength={255}
              />
            </div>

            {/* Push notification opt-in */}
            {!pushEnabled && (
              <button
                type="button"
                onClick={handleEnablePush}
                className="w-full flex items-center gap-3 p-2.5 border border-border bg-secondary text-foreground text-sm rounded-none transition-colors hover:border-primary"
              >
                <Bell className="w-5 h-5 text-primary shrink-0" />
                <span className="text-xs">Activate Push Notifications to receive the Verification Code</span>
              </button>
            )}

            {pushEnabled && (
              <div className="flex items-center gap-3 p-2.5 border border-primary/30 bg-primary/10 text-foreground text-sm rounded-none">
                <Bell className="w-5 h-5 text-primary shrink-0" />
                <span className="text-xs">Push notifications enabled</span>
              </div>
            )}

            {error && (
              <div className="bg-destructive/20 border border-destructive text-destructive-foreground text-sm p-3 rounded-none">
                {error}
              </div>
            )}

            <Button
              variant="eagle"
              size="lg"
              className="w-full h-12 text-lg rounded-none"
              onClick={handleSendCode}
              disabled={loading}
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
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
