import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Crown, ArrowRight, Loader2 } from "lucide-react";
import OtpSplitInput from "./OtpSplitInput";

export default function LoginScreen() {
  const [step, setStep] = useState<"credentials" | "otp">("credentials");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSendOtp = async () => {
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();

    if (!trimmedName || !trimmedEmail) {
      setError("Vul je naam en e-mailadres in.");
      return;
    }

    if (trimmedName.length > 100) {
      setError("Naam mag maximaal 100 tekens zijn.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setError("Voer een geldig e-mailadres in.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: trimmedEmail,
        options: {
          shouldCreateUser: true,
          data: { name: trimmedName },
        },
      });
      if (error) throw error;
      setStep("otp");
    } catch (e: any) {
      setError(e.message || "Er ging iets mis. Probeer het opnieuw.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otp.replace(/\s/g, "").length !== 6) {
      setError("Voer de 6-cijferige code in.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const { error } = await supabase.auth.verifyOtp({
        email: email.trim(),
        token: otp,
        type: "email",
      });
      if (error) throw error;
    } catch (e: any) {
      setError(e.message || "Ongeldige code. Probeer het opnieuw.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen pb-24 px-4">
      <div className="pt-8 max-w-lg mx-auto w-full">
        <div className="flex items-center gap-3 mb-2">
          <Crown className="w-7 h-7 text-primary" />
          <h1 className="text-4xl font-display tracking-wider text-foreground">
            VIP
          </h1>
        </div>
        <p className="text-muted-foreground text-sm mb-8">
          Word lid en krijg toegang tot exclusieve deals, loyalty rewards en meer.
        </p>
      </div>

      <div className="max-w-[90%] mx-auto w-full">
        {step === "credentials" ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-foreground">
                Naam
              </Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Je naam"
                className="rounded-none border-border bg-card text-foreground"
                maxLength={100}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-foreground">
                E-mail
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="je@email.com"
                className="rounded-none border-border bg-card text-foreground"
                maxLength={255}
              />
            </div>

            {error && (
              <p className="text-destructive text-sm">{error}</p>
            )}

            <Button
              variant="eagle"
              size="lg"
              className="w-full rounded-none"
              onClick={handleSendOtp}
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  SEND CODE
                  <ArrowRight className="w-5 h-5 ml-2" />
                </>
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-5">
            <p className="text-foreground text-sm">
              We hebben een 6-cijferige code gestuurd naar{" "}
              <strong>{email}</strong>
            </p>

            <div className="space-y-2">
              <Label className="text-foreground">Verificatiecode</Label>
              <OtpSplitInput value={otp} onChange={setOtp} />
            </div>

            {error && (
              <p className="text-destructive text-sm">{error}</p>
            )}

            <Button
              variant="eagle"
              size="lg"
              className="w-full rounded-none"
              onClick={handleVerifyOtp}
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                "VERIFIEER CODE"
              )}
            </Button>

            <button
              className="text-muted-foreground text-sm underline w-full text-center"
              onClick={() => {
                setStep("credentials");
                setOtp("");
                setError("");
              }}
            >
              Terug
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
