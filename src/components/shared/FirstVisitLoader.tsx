import { memo } from "react";
import { Hourglass } from "lucide-react";

const FirstVisitLoader = memo(() => {
  return (
    <div className="min-h-[55vh] flex flex-col items-center justify-center px-6 text-center gap-6">
      <Hourglass className="w-14 h-14 text-primary animate-pulse" />
      <p className="text-foreground text-lg leading-relaxed max-w-sm">
        Fetching information, during first time use!
      </p>
    </div>
  );
});

FirstVisitLoader.displayName = "FirstVisitLoader";

export default FirstVisitLoader;
