import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Crown, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/sonner";

const CODE_LENGTH = 6;

const VipVerify = () => {
  const navigate = useNavigate();
  const [digits, setDigits] = useState<string[]>(Array(CODE_LENGTH).fill(""));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Restore from sessionStorage first, fallback to localStorage (survives notification clicks)
  const getLoginState = () => {
    const sEmail = sessionStorage.getItem("vip_otp_email");
    const sName = sessionStorage.getItem("vip_otp_name");
    if (sEmail) return { email: sEmail, name: sName || "" };
    try {
      const pending = JSON.parse(localStorage.getItem("vip_otp_pending") || "{}");
      if (pending.email) {
        // Re-hydrate sessionStorage
        sessionStorage.setItem("vip_otp_email", pending.email);
        sessionStorage.setItem("vip_otp_name", pending.name || "");
        return { email: pending.email, name: pending.name || "" };
      }
    } catch {}
    return { email: "", name: "" };
  };
  const { email, name } = getLoginState();

  // Redirect if no email stored
  useEffect(() => {
    if (!email) navigate("/vip");
  }, [email, navigate]);

  // Auto-focus first input
  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  // Hidden input catches OS auto-fill suggestions, then distributes digits
  const hiddenRef = useRef<HTMLInputElement | null>(null);

  const distributeCode = useCallback((code: string) => {
    const cleaned = code.replace(/\D/g, "").slice(0, CODE_LENGTH);
    if (!cleaned) return;
    const newDigits = Array(CODE_LENGTH).fill("");
    for (let i = 0; i < cleaned.length; i++) {
      newDigits[i] = cleaned[i];
    }
    setDigits(newDigits);
    const focusIndex = Math.min(cleaned.length, CODE_LENGTH - 1);
    inputRefs.current[focusIndex]?.focus();
  }, []);

  const handleHiddenChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val.length >= CODE_LENGTH) {
      distributeCode(val);
      // Clear hidden input after distributing
      if (hiddenRef.current) hiddenRef.current.value = "";
    }
  }, [distributeCode]);

  const handleChange = useCallback((index: number, value: string) => {
    // If pasted/autofilled multi-digit value, distribute across boxes
    const cleaned = value.replace(/\D/g, "");
    if (cleaned.length > 1) {
      distributeCode(cleaned);
      return;
    }

    const digit = cleaned.slice(-1);
    setDigits((prev) => {
      const next = [...prev];
      next[index] = digit;
      return next;
    });

    if (digit && index < CODE_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  }, [distributeCode]);

  const handleKeyDown = useCallback((index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  }, [digits]);

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    e.preventDefault();
    distributeCode(e.clipboardData.getData("text"));
  }, [distributeCode]);

  const handleVerify = async () => {
    const code = digits.join("");
    if (code.length !== CODE_LENGTH) {
      setError("Please enter the full 6-digit code.");
      return;
    }

    setError("");
    setLoading(true);

    try {
      console.log("[VIP Verify] Verifying code for:", email);

      const { data, error: fnError } = await supabase.functions.invoke("verify-otp", {
        body: { email, code },
      });

      if (fnError) {
        console.error("[VIP Verify] Function error:", fnError);
        setError("You entered an invalid code, try again!");
        setLoading(false);
        return;
      }

      if (!data?.success) {
        console.error("[VIP Verify] Failed:", data?.error);
        setError(data?.error || "Invalid or expired code.");
        setLoading(false);
        return;
      }

      console.log("[VIP Verify] Code verified, exchanging for session...");

      // Use the verification URL to sign in
      if (data.verification_url) {
        // Extract token from the action link
        const url = new URL(data.verification_url);
        const token_hash = url.searchParams.get("token") || url.hash?.replace("#", "");

        // Try to verify OTP via Supabase Auth
        const { error: authError } = await supabase.auth.verifyOtp({
          email,
          token: data.hashed_token,
          type: "magiclink",
        });

        if (authError) {
          console.warn("[VIP Verify] Magic link verify failed, trying direct sign in...", authError);

          // Fallback: sign in with password (for newly created users)
          // Store VIP session manually
          localStorage.setItem("vip_session", JSON.stringify({
            userId: data.userId,
            email: data.email,
            name: data.name,
            verified: true,
            timestamp: Date.now(),
          }));
        }
      } else {
        // Store VIP session
        localStorage.setItem("vip_session", JSON.stringify({
          userId: data.userId,
          email: data.email,
          name: data.name,
          verified: true,
          timestamp: Date.now(),
        }));
      }

      // Migrate loyalty stamps from localStorage to Supabase
      await migrateLoyaltyStamps(data.userId, data.email);

      // Clean up session & local storage
      sessionStorage.removeItem("vip_otp_email");
      sessionStorage.removeItem("vip_otp_name");
      localStorage.removeItem("vip_otp_pending");

      navigate("/vip");
    } catch (err: any) {
      console.error("[VIP Verify] Unexpected error:", err);
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen pb-24">
      <div className="flex-1 flex flex-col items-center justify-center px-4">
        <div className="w-full max-w-[90%] mx-auto space-y-8">
          {/* Header */}
          <div className="text-center space-y-3">
            <ShieldCheck className="w-12 h-12 text-primary mx-auto" />
            <h1 className="text-3xl text-foreground">VERIFY CODE</h1>
            <p className="text-muted-foreground text-sm">
              Enter the code sent to <strong className="text-foreground">{email}</strong>
            </p>
          </div>

          {/* 6-digit split input */}
          <div className="flex justify-center gap-3" onPaste={handlePaste}>
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
                className="w-12 h-14 text-center text-2xl font-bold bg-secondary border-2 border-border text-foreground rounded-none focus:border-primary focus:outline-none transition-colors"
                autoComplete="one-time-code"
              />
            ))}
          </div>

          {error && (
            <div className="bg-destructive/20 border border-destructive text-destructive-foreground text-sm p-3 rounded-none text-center">
              {error}
            </div>
          )}

          <Button
            variant="eagle"
            size="lg"
            className="w-full h-14 text-lg rounded-none"
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

    // Check if user already has stamps in DB
    const { data: existing } = await supabase
      .from("loyalty_stamps")
      .select("id, stamps")
      .eq("user_id", userId)
      .maybeSingle();

    if (existing) {
      // Only update if local has more stamps
      if (stamps > existing.stamps) {
        await supabase
          .from("loyalty_stamps")
          .update({
            stamps,
            redeemed,
            last_scan_at: lastScan ? new Date(parseInt(lastScan)).toISOString() : null,
          })
          .eq("user_id", userId);
      }
    } else {
      await supabase.from("loyalty_stamps").insert({
        user_id: userId,
        stamps,
        redeemed,
        last_scan_at: lastScan ? new Date(parseInt(lastScan)).toISOString() : null,
      });
    }

    console.log("[VIP] Loyalty stamps migrated to database");
  } catch (err) {
    console.error("[VIP] Stamp migration error:", err);
  }
}

export default VipVerify;
