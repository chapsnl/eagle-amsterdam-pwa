import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";
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
    if (!name.trim()) { setError("Please enter your name."); return; }
    setError("");
    setLoading(true);

    try {
      const sessionRaw = localStorage.getItem("vip_session");
      if (!sessionRaw) { navigate("/vip/login"); return; }
      const session = JSON.parse(sessionRaw);

      await supabase.from("profiles").update({ name: name.trim() }).eq("id", session.userId);

      // Grant a free welcome voucher + loyalty token
      await supabase.functions.invoke("grant-welcome-voucher", {});

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

          <div className="text-center space-y-2">
            <h1 className="text-2xl text-foreground">ONE LAST STEP</h1>
            <p className="text-muted-foreground text-xs">
              Tell us your name to complete your profile.
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
                className="bg-secondary border-border text-foreground rounded-xl h-14 pt-5 pb-2 px-4 peer"
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
