import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Crown, ArrowRight, Bell, CreditCard, Tag, IdCard, Sparkles } from "lucide-react";
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
      let pushReady = false;
      try {
        const { setOneSignalExternalId } = await import("@/lib/onesignal");
        console.log("[VIP Login] Step 1: Calling OneSignal.login() with email:", targetEmail);
        await setOneSignalExternalId(targetEmail);

        // Step 2: Mandatory 2-second wait for OneSignal to fully register device-to-email link
        console.log("[VIP Login] Step 2: Waiting 2s for OneSignal sync...");
        await new Promise((resolve) => setTimeout(resolve, 2000));

        // Step 3: Verify push subscription is active
        await new Promise<void>((resolve) => {
          window.OneSignalDeferred = window.OneSignalDeferred || [];
          window.OneSignalDeferred.push(async (OneSignal: any) => {
            const pushId = OneSignal.User?.PushSubscription?.id;
            console.log("[VIP Login] PushSubscription.id:", pushId);
            if (!pushId) {
              console.warn("[VIP Login] ⚠️ Push subscription ID is null — push may not be delivered");
            } else {
              pushReady = true;
            }
            resolve();
          });
        });

        console.log("[VIP Login] OneSignal sync complete. Push ready:", pushReady);
      } catch {
        console.warn("[VIP Login] OneSignal not available, skipping push sync");
      }

      // Step 3: Only NOW send the OTP
      console.log("[VIP Login] Step 3: Sending OTP to:", targetEmail);

      const { data, error: fnError } = await supabase.functions.invoke("send-otp", {
        body: { name: name.trim(), email: targetEmail },
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

      // Persist login state in localStorage to survive notification clicks / app reloads
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
    { icon: CreditCard, title: "Loyalty Card", desc: "Earn stamps & get rewarded" },
    { icon: Tag, title: "Exclusive Deals", desc: "Members-only offers" },
    { icon: IdCard, title: "Member Pass", desc: "Your digital VIP pass" },
    { icon: Sparkles, title: "More Coming Soon", desc: "New perks added regularly" },
  ];

  return (
    <div className="flex flex-col min-h-screen pb-24">
      <div className="flex-1 flex flex-col items-center justify-center px-4">
        <div className="w-full max-w-[90%] mx-auto space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <Crown className="w-10 h-10 text-primary mx-auto" />
            <h1 className="text-2xl text-foreground">VIP MEMBERS</h1>
            <p className="text-muted-foreground text-xs">
              Enter your details to receive a verification code.
            </p>
          </div>

          {/* Form */}
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-foreground text-sm">Name</Label>
              <Input
                id="name"
                type="text"
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="bg-secondary border-border text-foreground rounded-none h-11"
                maxLength={100}
              />
            </div>

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

          {/* VIP Benefits */}
          <div className="border-t border-border pt-4">
            <p className="text-muted-foreground text-[10px] uppercase tracking-widest text-center mb-3">
              Member Benefits
            </p>
            <div className="grid grid-cols-2 gap-2">
              {benefits.map(({ icon: Icon, title, desc }) => (
                <div
                  key={title}
                  className="flex items-start gap-2.5 p-2.5 bg-secondary/50 border border-border"
                >
                  <Icon className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-foreground text-xs font-semibold leading-tight">{title}</p>
                    <p className="text-muted-foreground text-[10px] leading-tight mt-0.5">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VipLogin;
