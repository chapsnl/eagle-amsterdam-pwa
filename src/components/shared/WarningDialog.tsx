import { useState, useEffect } from "react";

interface WarningDialogProps {
  open: boolean;
  title: string;
  message: string;
  onClose: () => void;
}

const WarningDialog = ({ open, title, message, onClose }: WarningDialogProps) => {
  const [visible, setVisible] = useState(false);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    if (open) {
      setVisible(true);
      setFading(false);
      const timer = setTimeout(() => {
        setFading(true);
        setTimeout(() => {
          setVisible(false);
          onClose();
        }, 300);
      }, 3000);
      return () => clearTimeout(timer);
    } else {
      setVisible(false);
      setFading(false);
    }
  }, [open, onClose]);

  if (!visible) return null;

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center px-6 transition-opacity duration-300 ${fading ? "opacity-0" : "opacity-100"}`}>
      <div className="absolute inset-0 bg-black/40" />

      <div className="relative z-10 w-full max-w-sm bg-primary rounded-xl p-6 text-center space-y-4 shadow-lg">
        <div className="mx-auto w-14 h-14 flex items-center justify-center">
          <svg viewBox="0 0 24 24" className="w-12 h-12" fill="none">
            <path
              d="M12 2L1 21h22L12 2z"
              fill="hsl(0 0% 0%)"
              stroke="hsl(0 0% 0%)"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
            <text x="12" y="18" textAnchor="middle" fill="hsl(0 0% 100%)" fontSize="12" fontWeight="800" fontFamily="Manrope, sans-serif">!</text>
          </svg>
        </div>

        <h2 className="text-primary-foreground text-lg font-bold">{title}</h2>
        <p className="text-primary-foreground/90 text-sm font-semibold leading-relaxed">{message}</p>
      </div>
    </div>
  );
};

export default WarningDialog;
