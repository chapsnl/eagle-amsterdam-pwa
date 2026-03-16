import { ArrowLeft, Settings as SettingsIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Settings = () => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col min-h-screen pb-20 pt-8 px-4 max-w-lg mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate(-1)}
          className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center hover:bg-secondary/80 transition-colors"
          aria-label="Go back"
        >
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <h1 className="text-4xl font-display tracking-wider text-foreground flex items-center gap-3">
          <SettingsIcon className="w-7 h-7 text-primary" />
          SETTINGS
        </h1>
      </div>

      <div className="border border-border rounded-lg p-6 bg-card neon-border">
        <p className="text-muted-foreground text-sm">
          Settings options will appear here.
        </p>
      </div>
    </div>
  );
};

export default Settings;
