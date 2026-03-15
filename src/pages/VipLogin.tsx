import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Crown, ArrowRight, Bell, Star, CreditCard, Gift } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

const VipLogin = () => {
  const navigate = useNavigate();
  const [name, setName] = useState("");
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

    if (!name.trim() || !email.trim()) {
      setError("Please enter your name and email.");
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

      // Step 1: Sync OneSignal identity BEFORE sending OTP
      let subscriptionId: string | null = null;
      try {
        const { setOneSignalExternalId } = await import("@/lib/onesignal");
        console.log("[VIP Login] Step 1: Calling OneSignal.login() with email:", targetEmail);
        await setOneSignalExternalId(targetEmail);

        // Step 2: Mandatory 2-second wait for OneSignal to fully register device-to-email link
        console.log("[VIP Login] Step 2: Waiting 2s for OneSignal sync...");
        await new Promise((resolve) => setTimeout(resolve, 2000));

        // Step 3: Capture push subscription ID for dual-targeting
        subscriptionId = await new Promise<string | null>((resolve) => {
          window.OneSignalDeferred = window.OneSignalDeferred || [];
          window.OneSignalDeferred.push(async (OneSignal: any) => {
            const pushId = OneSignal.User?.PushSubscription?.id || null;
            console.log("[VIP Login] PushSubscription.id:", pushId);
            if (!pushId) {
              console.warn("[VIP Login] ⚠️ Push subscription ID is null — push may not be delivered");
            }
            resolve(pushId);
          });
        });

        console.log("[VIP Login] OneSignal sync complete. Subscription ID:", subscriptionId);
      } catch {
        console.warn("[VIP Login] OneSignal not available, skipping push sync");
      }

      // Step 4: Send OTP with both email and subscription_id for dual-targeting
      console.log("[VIP Login] Step 4: Sending OTP to:", targetEmail);

      const { data, error: fnError } = await supabase.functions.invoke("send-otp", {
        body: { name: name.trim(), email: targetEmail, subscription_id: subscriptionId },
      });

      if (fnError) {
        console.error("[VIP Login] Function error:", fnError);
        setError(fnError.message || "Failed to send code. Please try again.");
        setLoading(false);
        return;
      }

      if (!data?.success) {
        console.error("[VIP Login] Send failed:", data?.error);
        setError(data?.error || "Failed to send code. Please try again.");
        setLoading(false);
        return;
      }

      if (data.smtp_error) {
        console.warn("[VIP Login] SMTP warning:", data.smtp_error);
        setError(`Code generated but email failed: ${data.smtp_error}`);
        setLoading(false);
        return;
      }

      console.log("[VIP Login] OTP sent successfully");

      const loginEmail = email.trim().toLowerCase();
      const loginName = name.trim();
      sessionStorage.setItem("vip_otp_email", loginEmail);
      sessionStorage.setItem("vip_otp_name", loginName);
      localStorage.setItem("vip_otp_pending", JSON.stringify({ email: loginEmail, name: loginName }));
      navigate("/vip/verify");
    } catch (err: any) {
      console.error("[VIP Login] Unexpected error:", err);
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const benefits = [
    { icon: Star, title: "Exclusive Member Deals", desc: "Access special offers only available to VIPs." },
    { icon: CreditCard, title: "Digital Member Pass", desc: "Your official entry to the Eagle inner circle." },
    { icon: Gift, title: "Loyalty Card", desc: "Earn rewards and track your stamps digitally." },
  ];

  return (
    <div className="flex flex-col min-h-screen pb-24">
      <div className="flex-1 flex flex-col items-center justify-center px-4">
        <div className="w-full max-w-[90%] mx-auto space-y-8">
          {/* Header */}
          <div className="text-center space-y-3">
            <Crown className="w-12 h-12 text-primary mx-auto" />
            <h1 className="text-3xl text-foreground font-bold tracking-wider">JOIN THE EAGLE VIP CLUB</h1>
            <p className="text-muted-foreground text-sm">
              Enter your details to receive a verification code.
            </p>
          </div>

          {/* Benefits Section */}
          <div className="border border-border/50 bg-secondary/30 p-5 space-y-4">
            {benefits.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="flex items-start gap-3">
                <Icon className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <div>
                  <p className="text-foreground text-sm font-semibold">{title}</p>
                  <p className="text-muted-foreground text-xs">{desc}</p>
                </div>
              </div>
            ))}
            <p className="text-muted-foreground text-[11px] italic pt-1 border-t border-border/30">
              More exclusive features coming soon.
            </p>
          </div>

          {/* Form */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-foreground text-sm">Name</Label>
              <Input
                id="name"
                type="text"
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="bg-secondary border-border text-foreground rounded-none h-12"
                maxLength={100}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-foreground text-sm">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-secondary border-border text-foreground rounded-none h-12"
                maxLength={255}
              />
            </div>

            {/* Push notification opt-in */}
            {!pushEnabled && (
              <button
                type="button"
                onClick={handleEnablePush}
                className="w-full flex items-center gap-3 p-3 border border-border bg-secondary text-foreground text-sm rounded-none transition-colors hover:border-primary"
              >
                <Bell className="w-5 h-5 text-primary shrink-0" />
                <span>Activate here Push Notifications to receive the Verification Code</span>
              </button>
            )}

            {pushEnabled && (
              <div className="flex items-center gap-3 p-3 border border-primary/30 bg-primary/10 text-foreground text-sm rounded-none">
                <Bell className="w-5 h-5 text-primary shrink-0" />
                <span>Push notifications enabled</span>
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
              className="w-full h-14 text-lg rounded-none"
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
