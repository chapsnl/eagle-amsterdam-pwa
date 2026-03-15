import { useRef, useEffect, type KeyboardEvent, type ClipboardEvent } from "react";

interface OtpSplitInputProps {
  value: string;
  onChange: (value: string) => void;
  length?: number;
}

export default function OtpSplitInput({ value, onChange, length = 6 }: OtpSplitInputProps) {
  const inputs = useRef<(HTMLInputElement | null)[]>([]);
  const digits = value.padEnd(length, "").split("").slice(0, length);

  useEffect(() => {
    inputs.current[0]?.focus();
  }, []);

  const focusIndex = (i: number) => {
    if (i >= 0 && i < length) inputs.current[i]?.focus();
  };

  const handleChange = (i: number, char: string) => {
    const d = char.replace(/\D/g, "").slice(0, 1);
    if (!d) return;
    const arr = [...digits];
    arr[i] = d;
    onChange(arr.join(""));
    focusIndex(i + 1);
  };

  const handleKeyDown = (i: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      e.preventDefault();
      const arr = [...digits];
      if (arr[i]) {
        arr[i] = "";
        onChange(arr.join(""));
      } else if (i > 0) {
        arr[i - 1] = "";
        onChange(arr.join(""));
        focusIndex(i - 1);
      }
    } else if (e.key === "ArrowLeft") {
      focusIndex(i - 1);
    } else if (e.key === "ArrowRight") {
      focusIndex(i + 1);
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
    if (pasted) {
      onChange(pasted);
      focusIndex(Math.min(pasted.length, length - 1));
    }
  };

  return (
    <div className="flex gap-2 justify-center">
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => { inputs.current[i] = el; }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={d || ""}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={i === 0 ? handlePaste : undefined}
          onFocus={(e) => e.target.select()}
          className="w-12 h-14 text-center text-2xl font-mono bg-card text-foreground border-2 border-border rounded-none outline-none transition-colors focus:border-primary"
          aria-label={`Digit ${i + 1}`}
        />
      ))}
    </div>
  );
}
