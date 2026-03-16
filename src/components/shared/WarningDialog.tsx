import { AlertTriangle } from "lucide-react";

interface WarningDialogProps {
  open: boolean;
  title: string;
  message: string;
  onClose: () => void;
  buttonText?: string;
}

const WarningDialog = ({ open, title, message, onClose, buttonText = "OK" }: WarningDialogProps) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-6">
      {/* 40% dark overlay */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* Warning card */}
      <div className="relative z-10 w-full max-w-sm bg-primary rounded-xl p-6 text-center space-y-4 shadow-lg">
        <div className="mx-auto w-14 h-14 flex items-center justify-center">
          <div className="relative">
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
        </div>

        <h2 className="text-primary-foreground text-lg font-bold">{title}</h2>
        <p className="text-primary-foreground/90 text-sm font-semibold leading-relaxed">{message}</p>

        <button
          onClick={onClose}
          className="w-full h-11 bg-black/30 hover:bg-black/50 text-primary-foreground font-bold text-sm rounded-lg transition-colors"
        >
          {buttonText}
        </button>
      </div>
    </div>
  );
};

export default WarningDialog;
