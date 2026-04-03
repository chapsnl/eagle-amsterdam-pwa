import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { setOneSignalExternalId } from "@/lib/onesignal";
import { isDevMode } from "@/lib/devMode";
import WarningDialog from "@/components/shared/WarningDialog";
import { toast } from "sonner";

const CODE_LENGTH = 4;
const DEV = isDevMode();

const VipVerify = () => {
  const navigate = useNavigate();
  const [digits, setDigits] = useState<string[]>(Array(CODE_LENGTH).fill(""));
  const [loading, setLoading] = useState(false);
  const [warningOpen, setWarningOpen] = useState(false);
  const [warningMsg, setWarningMsg] = useState("");
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const verifyingRef = useRef(false);

  // Recover email from session/local storage
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

  useEffect(() => {
    if (!email) navigate("/vip");
  }, [email, navigate]);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const showWarning = (msg: string) => {
    setWarningMsg(msg);
    setWarningOpen(true);
  };

  // Core verification logic
  const doVerify = useCallback(
    async (code: string) => {
      if (verifyingRef.current) return;
      verifyingRef.current = true;
      setLoading(true);

      if (DEV) console.log(`[VipVerify] Submitting code="${code}" email="${email}"`);

      try {
        const { data, error: fnError } = await supabase.functions.invoke("verify-otp", {
          body: { email, code },
        });

        if (DEV) console.log("[VipVerify] Response:", { data, fnError });

        // Connection / CORS error
        if (fnError) {
          if (DEV) console.error("[VipVerify] fnError:", fnError);
          showWarning("Connection error. Please try again.");
          setDigits(Array(CODE_LENGTH).fill(""));
          setTimeout(() => inputRefs.current[0]?.focus(), 400);
          return;
        }

        // Invalid code
        if (!data?.success) {
          if (DEV) console.log("[VipVerify] Failed:", data?.error);
          showWarning("Invalid or expired code. Please try again.");
          setDigits(Array(CODE_LENGTH).fill(""));
          setTimeout(() => inputRefs.current[0]?.focus(), 400);
          return;
        }

        if (DEV) console.log("[VipVerify] SUCCESS:", data);

        // Authenticate with Supabase Auth
        if (data.verification_url && data.hashed_token) {
          const { error: authError } = await supabase.auth.verifyOtp({
            email,
            token_hash: data.hashed_token,
            type: "magiclink",
          });
          if (DEV) console.log("[VipVerify] Auth result:", { authError });
          if (authError) {
            localStorage.setItem(
              "vip_session",
              JSON.stringify({
                userId: data.userId,
                email: data.email,
                name: data.name || "",
                member_number: data.member_number || "",
                created_at: data.created_at || "",
                verified: true,
                timestamp: Date.now(),
              })
            );
          }
        } else {
          localStorage.setItem(
            "vip_session",
            JSON.stringify({
              userId: data.userId,
              email: data.email,
              name: data.name || "",
              member_number: data.member_number || "",
              created_at: data.created_at || "",
              verified: true,
              timestamp: Date.now(),
            })
          );
        }

        // Post-login
        await migrateLoyaltyStamps(data.userId, data.email);
        sessionStorage.removeItem("vip_otp_email");
        localStorage.removeItem("vip_otp_pending");
        sessionStorage.removeItem("vip_redirect_after_verify");

        try {
          await setOneSignalExternalId(data.email);
        } catch {}

        // Navigate
        if (!data.name || data.name.trim() === "") {
          navigate("/vip/profile-setup");
        } else {
          const next = redirect.startsWith("/") ? redirect : "/vip/dashboard";
          navigate(next === "/vip" ? "/vip/dashboard" : next);
        }
      } catch (err: any) {
        if (DEV) console.error("[VipVerify] Unhandled:", err);
        showWarning("Something went wrong. Please try again.");
        setDigits(Array(CODE_LENGTH).fill(""));
        setTimeout(() => inputRefs.current[0]?.focus(), 400);
      } finally {
        setLoading(false);
        verifyingRef.current = false;
      }
    },
    [email, redirect, navigate]
  );

  // Auto-focus next + auto-submit on 4th digit
  const handleChange = useCallback(
    (index: number, value: string) => {
      const digit = value.replace(/\D/g, "").slice(-1);
      setDigits((prev) => {
        const next = [...prev];
        next[index] = digit;

        if (digit && index === CODE_LENGTH - 1) {
          const full = next.join("");
          if (full.length === CODE_LENGTH) {
            if (DEV) console.log(`[VipVerify] Auto-submit: "${full}"`);
            setTimeout(() => doVerify(full), 80);
          }
        }
        return next;
      });

      if (digit && index < CODE_LENGTH - 1) {
        inputRefs.current[index + 1]?.focus();
      }
    },
    [doVerify]
  );

  const handleKeyDown = useCallback(
    (index: number, e: React.KeyboardEvent) => {
      if (e.key === "Backspace" && !digits[index] && index > 0) {
        inputRefs.current[index - 1]?.focus();
      }
    },
    [digits]
  );

  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      e.preventDefault();
      const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, CODE_LENGTH);
      if (!pasted) return;
      if (DEV) console.log(`[VipVerify] Pasted: "${pasted}"`);

      const newDigits = Array(CODE_LENGTH).fill("");
      for (let i = 0; i < pasted.length; i++) newDigits[i] = pasted[i];
      setDigits(newDigits);
      inputRefs.current[Math.min(pasted.length, CODE_LENGTH - 1)]?.focus();

      if (pasted.length === CODE_LENGTH) {
        setTimeout(() => doVerify(pasted), 80);
      }
    },
    [doVerify]
  );

  const handleManualVerify = () => {
    const code = digits.join("");
    if (code.length !== CODE_LENGTH) {
      showWarning("Please enter the full 4-digit code.");
      return;
    }
    doVerify(code);
  };

  return (
    <div className="flex flex-col min-h-screen pb-24">
      <WarningDialog
        open={warningOpen}
        title="Verification Failed"
        message={warningMsg}
        onClose={() => setWarningOpen(false)}
      />

      <div className="flex-1 flex flex-col items-center justify-center px-4">
        <div className="w-full max-w-lg mx-auto space-y-8">
          <div className="text-center space-y-3">
            <ShieldCheck className="w-12 h-12 text-primary mx-auto" />
            <h1 className="text-3xl text-foreground">VERIFY CODE</h1>
            <p className="text-muted-foreground text-sm">
              We sent a code to <strong className="text-foreground">{email}</strong>. Check your
              inbox (and spam folder).
            </p>
          </div>

          <div className="flex justify-center gap-4" onPaste={handlePaste}>
            {digits.map((digit, i) => (
              <input
                key={i}
                ref={(el) => {
                  inputRefs.current[i] = el;
                }}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                disabled={loading}
                className="w-14 h-16 text-center text-3xl font-bold bg-secondary border-2 border-border text-foreground rounded-xl focus:border-primary focus:outline-none transition-colors"
                autoComplete="one-time-code"
              />
            ))}
          </div>

          <Button
            variant="eagle"
            size="lg"
            className="w-full h-14 text-lg rounded-xl"
            onClick={handleManualVerify}
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

async function migrateLoyaltyStamps(userId: string, _email: string) {
  try {
    const saved = localStorage.getItem("eagle-loyalty-stamps");
    if (!saved) return;
    const { stamps = 0, redeemed = false } = JSON.parse(saved);
    const lastScan = localStorage.getItem("last_loyalty_scan");

    const { data: existing } = await supabase
      .from("loyalty_stamps")
      .select("id, stamps")
      .eq("user_id", userId)
      .maybeSingle();

    if (existing) {
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
  } catch {}
}

export default VipVerify;
