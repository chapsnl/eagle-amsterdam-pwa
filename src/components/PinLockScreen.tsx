import { useState, useEffect } from "react";
import { Shield } from "lucide-react";
import eagleLogo from "@/assets/eagle-logo-white.webp";

interface PinLockScreenProps {
  onUnlock: () => void;
}

const PinLockScreen = ({ onUnlock }: PinLockScreenProps) => {
  const [digits, setDigits] = useState<string[]>(["", "", "", ""]);
  const [error, setError] = useState(false);

  const handleChange = (index: number, value: string) => {
    const digit = value.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[index] = digit;
    setDigits(next);

    if (digit && index < 3) {
      document.getElementById(`pin-lock-${index + 1}`)?.focus();
    }

    // Auto-verify when all 4 digits entered
    if (digit && index === 3) {
      const code = [...next.slice(0, 3), digit].join("");
      verifyPin(code);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      document.getElementById(`pin-lock-${index - 1}`)?.focus();
    }
  };

  const verifyPin = (code: string) => {
    const savedPin = localStorage.getItem("app_pin_code");
    if (code === savedPin) {
      onUnlock();
    } else {
      setError(true);
      setDigits(["", "", "", ""]);
      setTimeout(() => {
        setError(false);
        document.getElementById("pin-lock-0")?.focus();
      }, 600);
    }
  };

  useEffect(() => {
    document.getElementById("pin-lock-0")?.focus();
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background px-6">
      <img src={eagleLogo} alt="Eagle Amsterdam" className="w-32 mb-8" />
      <Shield className="w-12 h-12 text-primary mb-4" />
      <h1 className="text-2xl font-display tracking-wider text-foreground mb-2">APP LOCKED</h1>
      <p className="text-muted-foreground text-sm mb-8">Enter your PIN to continue</p>

      <div className={`flex gap-3 ${error ? "animate-shake" : ""}`}>
        {digits.map((d, i) => (
          <input
            key={i}
            id={`pin-lock-${i}`}
            type="password"
            inputMode="numeric"
            maxLength={1}
            value={d}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            className={`w-14 h-16 text-center text-3xl font-bold bg-secondary border-2 text-foreground rounded-xl focus:outline-none transition-colors ${
              error ? "border-destructive" : "border-border focus:border-primary"
            }`}
          />
        ))}
      </div>

      {error && (
        <p className="text-destructive text-sm mt-4">Incorrect PIN, try again</p>
      )}
    </div>
  );
};

export default PinLockScreen;
