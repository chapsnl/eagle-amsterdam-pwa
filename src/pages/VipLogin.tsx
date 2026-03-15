import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Crown, ArrowRight, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

const VipLogin = () => {
  const navigate = useNavigate();
  const interactionTriggered = useRef(false);

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [syncingPush, setSyncingPush] = useState(false);
  const [checkingPush, setCheckingPush] = useState(true);
  const [error, setError] = useState("");
  const [pushEnabled, setPushEnabled] = useState(
    () => localStorage.getItem("eagle-onesignal-initialized") === "true"
  );
  const [subscriptionId, setSubscriptionId] = useState<string | null>(null);

  const refreshPushState = useCallback(async () => {
    try {
      const { getOneSignalPushState } = await import("@/lib/onesignal");
      const state = await getOneSignalPushState();
      setPushEnabled(state.permission === "granted");
      setSubscriptionId(state.subscriptionId);
    } catch {
      // OneSignal may be blocked or unavailable
    } finally {
      setCheckingPush(false);
    }
  }, []);

  useEffect(() => {
    void refreshPushState();
  }, [refreshPushState]);

  const handleFirstInteraction = async () => {
    if (interactionTriggered.current) return;
    interactionTriggered.current = true;

    try {
      const { requestPushPermission, waitForValidSubscriptionId } = await import("@/lib/onesignal");
      const granted = await requestPushPermission();
      setPushEnabled(granted);

      if (!granted) return;

      setSyncingPush(true);
      try {
        const ready = await waitForValidSubscriptionId(10000, 250);
        setSubscriptionId(ready.subscriptionId);
      } catch {
        // Keep graceful fallback for browsers that need one extra interaction
      } finally {
        setSyncingPush(false);
      }
    } catch {
      // OneSignal may not be available
      setSyncingPush(false);
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
    setSyncingPush(true);

    try {
      const targetEmail = email.trim().toLowerCase();
      let syncedSubscriptionId: string | null = subscriptionId;

      const {
        requestPushPermission,
        setOneSignalExternalId,
        waitForValidSubscriptionId,
        getOneSignalPushState,
      } = await import("@/lib/onesignal");

      if (Notification.permission !== "granted") {
        const granted = await requestPushPermission();
        if (!granted) {
          throw new Error("Push permission is required before sending your code.");
        }
      }

      console.log("[VIP Login] Step 1 — OneSignal.login() + addEmail() with:", targetEmail);
      await setOneSignalExternalId(targetEmail);

      console.log("[VIP Login] Step 2 — Waiting for valid subscription ID and optedIn=true");
      const ready = await waitForValidSubscriptionId(12000, 250);
      syncedSubscriptionId = ready.subscriptionId;

      const proof = await getOneSignalPushState();
      if (!proof.optedIn || !proof.subscriptionId) {
        throw new Error("Push subscription is not fully active yet. Please try again.");
      }

      setSubscriptionId(proof.subscriptionId);
      setPushEnabled(true);

      console.log("[VIP Login] Step 3 — Waiting 2s for OneSignal global sync...");
      await new Promise((resolve) => setTimeout(resolve, 2000));
      setSyncingPush(false);

      console.log("[VIP Login] Step 4 — Dispatching OTP. email:", targetEmail, "subscriptionId:", syncedSubscriptionId);
      const { data, error: fnError } = await supabase.functions.invoke("send-otp", {
        body: { email: targetEmail, subscriptionId: syncedSubscriptionId },
      });

      if (fnError) {
        setError(fnError.message || "Failed to send code. Please try again.");
        return;
      }

      if (!data?.success) {
        setError(data?.error || "Failed to send code. Please try again.");
        return;
      }

      if (data.smtp_error) {
        setError(`Code generated but email failed: ${data.smtp_error}`);
        return;
      }

      sessionStorage.setItem("vip_otp_email", targetEmail);
      localStorage.setItem("vip_otp_pending", JSON.stringify({ email: targetEmail }));
      navigate("/vip/verify");
    } catch (err: any) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setSyncingPush(false);
      setLoading(false);
    }
  };

  const pushReady = pushEnabled && !!subscriptionId;

  return (
    <div
      className="flex flex-col min-h-screen pb-24"
      onPointerDownCapture={() => {
        void handleFirstInteraction();
      }}
      onKeyDownCapture={() => {
        void handleFirstInteraction();
      }}
    >
      <div className="flex-1 flex flex-col items-center justify-center px-4">
        <div className="w-full max-w-[90%] mx-auto space-y-6">
          <div className="text-center space-y-2">
            <Crown className="w-10 h-10 text-primary mx-auto" />
            <h1 className="text-2xl text-foreground">VIP MEMBERS</h1>
            <p className="text-muted-foreground text-xs">
              Enter your email to receive a verification code.
            </p>
          </div>

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

            {!pushReady && (
              <div className="flex items-center gap-3 p-2.5 border border-border bg-secondary text-foreground text-sm rounded-none">
                <Bell className="w-5 h-5 text-primary shrink-0" />
                <span className="text-xs">
                  {checkingPush || syncingPush
                    ? "Syncing push subscription..."
                    : "Tap anywhere to enable push notifications and sync your device before sending the code."}
                </span>
              </div>
            )}

            {pushReady && (
              <div className="flex items-center gap-3 p-2.5 border border-primary/30 bg-primary/10 text-foreground text-sm rounded-none">
                <Bell className="w-5 h-5 text-primary shrink-0" />
                <span className="text-xs">Push ready and linked to this device.</span>
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
              disabled={loading || checkingPush || !pushReady}
            >
              {loading || syncingPush || checkingPush || !pushReady ? (
                <>
                  <div className="w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin mr-2" />
                  {loading ? "SENDING CODE..." : "SYNCING PUSH..."}
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
