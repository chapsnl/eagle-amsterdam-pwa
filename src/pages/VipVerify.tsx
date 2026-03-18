import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { setOneSignalExternalId } from "@/lib/onesignal";

const CODE_LENGTH = 4;

const VipVerify = () => {
  const navigate = useNavigate();
  const [digits, setDigits] = useState<string[]>(Array(CODE_LENGTH).fill(""));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const getLoginState = () => {
    const sEmail = sessionStorage.getItem("vip_otp_email");
    const sRedirect = sessionStorage.getItem("vip_redirect_after_verify") || "/vip";
    if (sEmail) return { email: sEmail, redirect: sRedirect };
    try {
      const pending = JSON.parse(localStorage.getItem("vip_otp_pending") || "{}");
      if (pending.email) {
        sessionStorage.setItem("vip_otp_email", pending.email);
        sessionStorage.setItem("vip_redirect_after_verify", pending.redirect || "/vip");
        return { email: pending.email, redirect: pending.redirect || "/vip" };
      }
    } catch {}
    return { email: "", redirect: "/vip" };
  };
  const { email, redirect } = getLoginState();

  useEffect(() => { if (!email) navigate("/vip"); }, [email, navigate]);
  useEffect(() => { inputRefs.current[0]?.focus(); }, []);

  const handleChange = useCallback((index: number, value: string) => {
    const digit = value.replace(/\D/g, "").slice(-1);
    setDigits((prev) => { const next = [...prev]; next[index] = digit; return next; });
    if (digit && index < CODE_LENGTH - 1) inputRefs.current[index + 1]?.focus();
  }, []);

  const handleKeyDown = useCallback((index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !digits[index] && index > 0) inputRefs.current[index - 1]?.focus();
  }, [digits]);

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, CODE_LENGTH);
    if (!pasted) return;
    const newDigits = Array(CODE_LENGTH).fill("");
    for (let i = 0; i < pasted.length; i++) newDigits[i] = pasted[i];
    setDigits(newDigits);
    inputRefs.current[Math.min(pasted.length, CODE_LENGTH - 1)]?.focus();
  }, []);

  const handleVerify = async () => {
    const code = digits.join("");
    if (code.length !== CODE_LENGTH) { setError("Please enter the full 4-digit code."); return; }
    setError("");
    setLoading(true);

    try {
      const { data, error: fnError } = await supabase.functions.invoke("verify-otp", { body: { email, code } });
      if (fnError) { setError("You entered an invalid code, try again!"); setLoading(false); return; }
      if (!data?.success) { setError(data?.error || "Invalid or expired code."); setLoading(false); return; }

      if (data.verification_url) {
        const { error: authError } = await supabase.auth.verifyOtp({ email, token_hash: data.hashed_token, type: "magiclink" });
        if (authError) {
          localStorage.setItem("vip_session", JSON.stringify({
            userId: data.userId, email: data.email, name: data.name || "", member_number: data.member_number || "", created_at: data.created_at || "", verified: true, timestamp: Date.now(),
          }));
        }
      } else {
        localStorage.setItem("vip_session", JSON.stringify({
          userId: data.userId, email: data.email, name: data.name || "", member_number: data.member_number || "", created_at: data.created_at || "", verified: true, timestamp: Date.now(),
        }));
      }

      await migrateLoyaltyStamps(data.userId, data.email);
      sessionStorage.removeItem("vip_otp_email");
      localStorage.removeItem("vip_otp_pending");

      // Send email to OneSignal
      try { await setOneSignalExternalId(data.email); } catch {}

      if (!data.name) navigate("/vip/profile-setup");
      else navigate("/vip");
    } catch (err: any) {
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen pb-24">
      <div className="flex-1 flex flex-col items-center justify-center px-4">
        <div className="w-full max-w-[90%] mx-auto space-y-8">
          <div className="text-center space-y-3">
            <ShieldCheck className="w-12 h-12 text-primary mx-auto" />
            <h1 className="text-3xl text-foreground">VERIFY CODE</h1>
            <p className="text-muted-foreground text-sm">
              We sent a code to <strong className="text-foreground">{email}</strong>. Check your inbox (and spam folder).
            </p>
          </div>

          <div className="flex justify-center gap-4" onPaste={handlePaste}>
            {digits.map((digit, i) => (
              <input
                key={i}
                ref={(el) => { inputRefs.current[i] = el; }}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                className="w-14 h-16 text-center text-3xl font-bold bg-secondary border-2 border-border text-foreground rounded-xl focus:border-primary focus:outline-none transition-colors"
                autoComplete="one-time-code"
              />
            ))}
          </div>

          {error && (
            <div className="bg-destructive/20 border border-destructive text-destructive-foreground text-sm p-3 rounded-xl text-center">
              {error}
            </div>
          )}

          <Button
            variant="eagle"
            size="lg"
            className="w-full h-14 text-lg rounded-xl"
            onClick={handleVerify}
            disabled={loading || digits.join("").length !== CODE_LENGTH}
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <ShieldCheck className="w-5 h-5 mr-2" />
                VERIFY CODE
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

async function migrateLoyaltyStamps(userId: string, email: string) {
  try {
    const saved = localStorage.getItem("eagle-loyalty-stamps");
    if (!saved) return;
    const { stamps = 0, redeemed = false } = JSON.parse(saved);
    const lastScan = localStorage.getItem("last_loyalty_scan");

    const { data: existing } = await supabase
      .from("loyalty_stamps").select("id, stamps").eq("user_id", userId).maybeSingle();

    if (existing) {
      if (stamps > existing.stamps) {
        await supabase.from("loyalty_stamps")
          .update({ stamps, redeemed, last_scan_at: lastScan ? new Date(parseInt(lastScan)).toISOString() : null })
          .eq("user_id", userId);
      }
    } else {
      await supabase.from("loyalty_stamps").insert({
        user_id: userId, stamps, redeemed,
        last_scan_at: lastScan ? new Date(parseInt(lastScan)).toISOString() : null,
      });
    }
  } catch {
    // Stamp migration failed silently
  }
}

export default VipVerify;
