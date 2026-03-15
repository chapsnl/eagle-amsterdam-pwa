import { memo } from "react";
import { Hourglass } from "lucide-react";

const FirstVisitLoader = memo(() => (
  <div className="flex flex-col items-center justify-center py-20 px-6 text-center gap-5">
    <Hourglass className="w-10 h-10 text-primary animate-pulse" />
    <p className="text-foreground text-sm leading-relaxed max-w-xs">
      Fetching latest updates. This only happens on your first visit. From now on, new information will be synced once every 24 hours to ensure the fastest experience.
    </p>
  </div>
));

FirstVisitLoader.displayName = "FirstVisitLoader";

export default FirstVisitLoader;
