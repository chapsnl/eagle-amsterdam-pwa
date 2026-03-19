import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

const VipProfileSetup = () => {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPushPrompt, setShowPushPrompt] = useState(false);
  const [pushRequesting, setPushRequesting] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) { setError("Please enter your name."); return; }
    setError("");
    setLoading(true);

    try {
      const sessionRaw = localStorage.getItem("vip_session");
      if (!sessionRaw) { navigate("/vip/login"); return; }
      const session = JSON.parse(sessionRaw);

      const { data, error: fnError } = await supabase.functions.invoke("update-profile-name", {
        body: { userId: session.userId, name: name.trim() },
      });
      if (fnError || !data?.success) throw new Error("Failed to save name");

      // Grant a free welcome voucher
      await supabase.functions.invoke("grant-welcome-voucher", {
        body: { userId: session.userId },
      });

      // Initialize loyalty card in localStorage with 1 free token
      localStorage.setItem("eagle-loyalty-stamps", JSON.stringify({ stamps: 1, redeemed: false }));
      localStorage.setItem("eagle-lifetime-stamps", "1");

      // Preserve created_at in session
      session.name = name.trim();
      localStorage.setItem("vip_session", JSON.stringify(session));

      // Check if push notifications already granted or previously asked
      const alreadyAsked = localStorage.getItem("eagle-push-asked");
      const pushGranted = "Notification" in window && Notification.permission === "granted";

      if (pushGranted || alreadyAsked || !("Notification" in window) || Notification.permission === "denied") {
        navigate("/vip/dashboard");
      } else {
        setShowPushPrompt(true);
      }
    } catch (err: any) {
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const handleEnablePush = async () => {
    setPushRequesting(true);
    try {
      const { requestPushPermission } = await import("@/lib/onesignal");
      await requestPushPermission();
    } catch {
      // silently fail
    } finally {
      localStorage.setItem("eagle-push-asked", "true");
      setPushRequesting(false);
      navigate("/vip/dashboard");
    }
  };

  const handleSkipPush = () => {
    localStorage.setItem("eagle-push-asked", "true");
    navigate("/vip/dashboard");
  };

  if (showPushPrompt) {
    return (
      <div className="flex flex-col min-h-screen pb-24">
        <div className="flex-1 flex flex-col items-center justify-center px-4">
          <div className="w-full max-w-[90%] mx-auto space-y-6">
            <div className="text-center space-y-3">
              <Bell className="w-12 h-12 text-primary mx-auto" />
              <h1 className="text-2xl text-foreground">STAY IN THE LOOP</h1>
              <p className="text-muted-foreground text-xs leading-relaxed">
                Enable push notifications so you'll know instantly when you receive a free voucher — like free drinks, free entry, or coat check!
              </p>
            </div>

            <div className="space-y-3">
              <Button
                variant="eagle"
                size="lg"
                className="w-full h-12 text-lg rounded-xl"
                onClick={handleEnablePush}
                disabled={pushRequesting}
              >
                {pushRequesting ? (
                  <div className="w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Bell className="w-5 h-5 mr-2" />
                    Enable Notifications
                  </>
                )}
              </Button>

              <button
                onClick={handleSkipPush}
                className="w-full text-muted-foreground text-sm py-2 hover:text-foreground transition-colors"
              >
                Maybe later
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen pb-24">
      <div className="flex-1 flex flex-col items-center justify-center px-4">
        <div className="w-full max-w-[90%] mx-auto space-y-6">

          <div className="text-center space-y-2">
            <h1 className="text-2xl text-foreground">ONE LAST STEP</h1>
            <p className="text-muted-foreground text-xs">
              One last thing: What's your name or nickname?
            </p>
          </div>

          <div className="space-y-3">
            <div className="relative">
              <Input
                id="name"
                type="text"
                placeholder=" "
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="bg-secondary border-2 border-border text-foreground rounded-xl h-14 pt-5 pb-2 px-4 peer"
                maxLength={100}
                autoFocus
              />
              <Label
                htmlFor="name"
                className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground text-sm transition-all duration-200 pointer-events-none peer-focus:top-3 peer-focus:text-xs peer-focus:text-primary peer-[:not(:placeholder-shown)]:top-3 peer-[:not(:placeholder-shown)]:text-xs"
              >
                Name
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
                  CONTINUE
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

export default VipProfileSetup;
