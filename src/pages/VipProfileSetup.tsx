import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Star, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

const VipProfileSetup = () => {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSave = async () => {
    if (!name.trim()) {
      setError("Please enter your name.");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const sessionRaw = localStorage.getItem("vip_session");
      if (!sessionRaw) {
        navigate("/vip/login");
        return;
      }

      const session = JSON.parse(sessionRaw);

      // Update profile in database
      await supabase
        .from("profiles")
        .update({ name: name.trim() })
        .eq("id", session.userId);

      // Grant 1 free loyalty stamp for signing up
      const { data: existing } = await supabase
        .from("loyalty_stamps")
        .select("id")
        .eq("user_id", session.userId)
        .maybeSingle();

      if (!existing) {
        await supabase.from("loyalty_stamps").insert({
          user_id: session.userId,
          stamps: 1,
          redeemed: false,
        });
      }

      // Update local loyalty storage to reflect the free stamp
      localStorage.setItem(
        "eagle-loyalty-stamps",
        JSON.stringify({ stamps: 1, redeemed: false })
      );

      // Update local session
      session.name = name.trim();
      localStorage.setItem("vip_session", JSON.stringify(session));

      navigate("/vip/dashboard");
    } catch (err: any) {
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen pb-24">
      <div className="flex-1 flex flex-col items-center justify-center px-4">
        <div className="w-full max-w-[90%] mx-auto space-y-6">
          {/* Free stamp banner */}
          <div className="bg-primary/10 border border-primary rounded-none p-5 text-center space-y-2">
            <Star className="w-10 h-10 text-primary mx-auto" fill="currentColor" />
            <p className="text-foreground text-sm font-bold leading-snug">
              Congratulations, you got 1 loyalty stamp for free for signing up!
            </p>
          </div>

          <div className="text-center space-y-2">
            <h1 className="text-2xl text-foreground">ONE LAST STEP</h1>
            <p className="text-muted-foreground text-xs">
              Tell us your name to complete your profile.
            </p>
          </div>

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
                autoFocus
              />
            </div>

            {error && (
              <div className="bg-destructive/20 border border-destructive text-destructive-foreground text-sm p-3 rounded-none">
                {error}
              </div>
            )}

            <Button
              variant="eagle"
              size="lg"
              className="w-full h-12 text-lg rounded-none"
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
