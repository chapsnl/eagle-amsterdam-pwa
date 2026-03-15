import { memo } from "react";
import { Hourglass } from "lucide-react";

const LOADER_MESSAGE =
  "Fetching latest updates. This only happens on your first visit. From now on, new information will be synced once every 24 hours to ensure the fastest experience.";

const FirstVisitLoader = memo(() => {
  return (
    <div className="min-h-[55vh] flex flex-col items-center justify-center px-6 text-center gap-5 font-['Manrope',sans-serif]">
      <div className="w-14 h-14 border border-primary/40 bg-secondary flex items-center justify-center animate-pulse">
        <Hourglass className="w-7 h-7 text-primary" />
      </div>
      <p className="text-foreground text-sm leading-relaxed max-w-sm">
        {LOADER_MESSAGE}
      </p>
    </div>
  );
});

FirstVisitLoader.displayName = "FirstVisitLoader";

export default FirstVisitLoader;
