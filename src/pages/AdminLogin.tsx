import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Crown, ShieldCheck, Lock, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import WarningDialog from "@/components/shared/WarningDialog";

const ADMIN_EMAIL = "michael.roks@icloud.com";
const CODE_LENGTH = 4;

type Step = "loading" | "set-password" | "login" | "otp";

const AdminLogin = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("loading");
  const [email, setEmail] = useState(ADMIN_EMAIL);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [digits, setDigits] = useState<string[]>(Array(CODE_LENGTH).fill(""));
  const [loading, setLoading] = useState(false);
  const [warning, setWarning] = useState({ open: false, title: "", message: "" });
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    // Check if admin already has an active session
    const stored = localStorage.getItem("admin_session");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        const elapsed = Date.now() - (parsed.timestamp || 0);
        if (elapsed < 60 * 60 * 1000 && parsed.authenticated) {
          navigate("/eagle-admin-dashboard", { replace: true });
          return;
        }
        localStorage.removeItem("admin_session");
      } catch {
        localStorage.removeItem("admin_session");
      }
    }

    // Check if password is already set
    checkSetup();
  }, []);

  const checkSetup = async () => {
    try {
      const { data } = await supabase.functions.invoke("admin-auth", {
        body: { action: "check-setup", email: ADMIN_EMAIL },
      });
      if (data?.success) {
        setStep(data.hasPassword ? "login" : "set-password");
      } else {
        setWarning({ open: true, title: "Error", message: "Failed to check admin setup." });
      }
    } catch {
      setWarning({ open: true, title: "Error", message: "Connection failed." });
    }
  };

  const handleSetPassword = async () => {
    if (password.length < 8) {
      setWarning({ open: true, title: "Invalid Password", message: "Password must be at least 8 characters." });
      return;
    }
    if (password !== confirmPassword) {
      setWarning({ open: true, title: "Mismatch", message: "Passwords do not match." });
      return;
    }
    setLoading(true);
    try {
      const { data } = await supabase.functions.invoke("admin-auth", {
        body: { action: "set-password", email: ADMIN_EMAIL, password },
      });
      if (data?.success) {
        setPassword("");
        setConfirmPassword("");
        setStep("login");
      } else {
        setWarning({ open: true, title: "Error", message: data?.error || "Failed to set password." });
      }
    } catch {
      setWarning({ open: true, title: "Error", message: "Something went wrong." });
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    if (!password) {
      setWarning({ open: true, title: "Required", message: "Please enter your password." });
      return;
    }
    setLoading(true);
    try {
      const { data } = await supabase.functions.invoke("admin-auth", {
        body: { action: "verify-password", email: ADMIN_EMAIL, password },
      });
      if (data?.success && data.otpSent) {
        setPassword("");
        setDigits(Array(CODE_LENGTH).fill(""));
        setStep("otp");
        setTimeout(() => inputRefs.current[0]?.focus(), 100);
      } else {
        setWarning({ open: true, title: "Access Denied", message: data?.error || "Incorrect credentials." });
      }
    } catch {
      setWarning({ open: true, title: "Error", message: "Something went wrong." });
    } finally {
      setLoading(false);
    }
  };

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

  const handleVerifyOtp = async () => {
    const code = digits.join("");
    if (code.length !== CODE_LENGTH) {
      setWarning({ open: true, title: "Invalid Code", message: "Please enter the full 4-digit code." });
      return;
    }
    setLoading(true);
    try {
      const { data } = await supabase.functions.invoke("admin-auth", {
        body: { action: "verify-otp", email: ADMIN_EMAIL, code },
      });
      if (data?.success) {
        localStorage.setItem("admin_session", JSON.stringify({
          userId: data.adminUserId,
          email: ADMIN_EMAIL,
          sessionToken: data.sessionToken,
          authenticated: true,
          timestamp: Date.now(),
          lastActivity: Date.now(),
        }));
        navigate("/eagle-admin-dashboard", { replace: true });
      } else {
        setWarning({ open: true, title: "Invalid Code", message: data?.error || "Invalid or expired code." });
      }
    } catch {
      setWarning({ open: true, title: "Error", message: "Verification failed." });
    } finally {
      setLoading(false);
    }
  };

  if (step === "loading") {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <div className="flex-1 flex flex-col items-center justify-center px-4">
        <div className="w-full max-w-md mx-auto space-y-8">
          {/* Header */}
          <div className="text-center space-y-2">
            <Crown className="w-10 h-10 text-primary mx-auto" />
            <h1 className="text-2xl text-foreground font-extrabold tracking-tight">
              {step === "set-password" ? "SET ADMIN PASSWORD" : step === "otp" ? "VERIFY CODE" : "ADMIN LOGIN"}
            </h1>
            <p className="text-muted-foreground text-xs">
              {step === "set-password"
                ? "Create a secure password for admin access."
                : step === "otp"
                ? "Enter the 4-digit code sent to your email."
                : "Enter your credentials to access the dashboard."}
            </p>
          </div>

          {/* Set Password */}
          {step === "set-password" && (
            <div className="space-y-4">
              <div className="relative">
                <Input
                  type="password"
                  placeholder=" "
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-secondary border-2 border-border text-foreground rounded-xl h-14 pt-5 pb-2 px-4 peer"
                />
                <Label className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground text-sm transition-all duration-200 pointer-events-none peer-focus:top-3 peer-focus:text-xs peer-focus:text-primary peer-[:not(:placeholder-shown)]:top-3 peer-[:not(:placeholder-shown)]:text-xs">
                  Password (min 8 characters)
                </Label>
              </div>
              <div className="relative">
                <Input
                  type="password"
                  placeholder=" "
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="bg-secondary border-2 border-border text-foreground rounded-xl h-14 pt-5 pb-2 px-4 peer"
                />
                <Label className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground text-sm transition-all duration-200 pointer-events-none peer-focus:top-3 peer-focus:text-xs peer-focus:text-primary peer-[:not(:placeholder-shown)]:top-3 peer-[:not(:placeholder-shown)]:text-xs">
                  Confirm Password
                </Label>
              </div>
              <Button variant="eagle" className="w-full h-12 rounded-xl text-lg" onClick={handleSetPassword} disabled={loading}>
                {loading ? <div className="w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" /> : (
                  <><Lock className="w-5 h-5 mr-2" />SET PASSWORD</>
                )}
              </Button>
            </div>
          )}

          {/* Login */}
          {step === "login" && (
            <div className="space-y-4">
              <div className="relative">
                <Input
                  type="email"
                  placeholder=" "
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-secondary border-2 border-border text-foreground rounded-xl h-14 pt-5 pb-2 px-4 peer"
                />
                <Label className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground text-sm transition-all duration-200 pointer-events-none peer-focus:top-3 peer-focus:text-xs peer-focus:text-primary peer-[:not(:placeholder-shown)]:top-3 peer-[:not(:placeholder-shown)]:text-xs">
                  Email
                </Label>
              </div>
              <div className="relative">
                <Input
                  type="password"
                  placeholder=" "
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-secondary border-2 border-border text-foreground rounded-xl h-14 pt-5 pb-2 px-4 peer"
                />
                <Label className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground text-sm transition-all duration-200 pointer-events-none peer-focus:top-3 peer-focus:text-xs peer-focus:text-primary peer-[:not(:placeholder-shown)]:top-3 peer-[:not(:placeholder-shown)]:text-xs">
                  Password
                </Label>
              </div>
              <Button variant="eagle" className="w-full h-12 rounded-xl text-lg" onClick={handleLogin} disabled={loading}>
                {loading ? <div className="w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" /> : (
                  <><ArrowRight className="w-5 h-5 mr-2" />LOGIN</>
                )}
              </Button>
            </div>
          )}

          {/* OTP */}
          {step === "otp" && (
            <div className="space-y-6">
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
              <Button
                variant="eagle"
                className="w-full h-12 rounded-xl text-lg"
                onClick={handleVerifyOtp}
                disabled={loading || digits.join("").length !== CODE_LENGTH}
              >
                {loading ? <div className="w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" /> : (
                  <><ShieldCheck className="w-5 h-5 mr-2" />VERIFY CODE</>
                )}
              </Button>
            </div>
          )}
        </div>
      </div>

      <WarningDialog
        open={warning.open}
        title={warning.title}
        message={warning.message}
        onClose={() => setWarning({ open: false, title: "", message: "" })}
      />
    </div>
  );
};

export default AdminLogin;
