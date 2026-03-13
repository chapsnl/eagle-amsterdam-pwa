import { isDevMode } from "@/lib/devMode";

const DevModeIndicator = () => {
  if (!isDevMode()) return null;

  return (
    <div className="fixed top-2 right-2 z-50 bg-primary/90 text-primary-foreground text-[10px] font-body font-semibold px-2 py-1 rounded-sm pointer-events-none select-none">
      Dev Mode: Cache Disabled
    </div>
  );
};

export default DevModeIndicator;
