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
        }

        // Always store vip_session — this is what the rest of the app relies on
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
  } catch {}
}

export default VipVerify;
