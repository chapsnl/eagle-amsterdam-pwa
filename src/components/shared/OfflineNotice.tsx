import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";

const OfflineNotice = () => {
  const [offline, setOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const goOffline = () => setOffline(true);
    const goOnline = () => setOffline(false);

    window.addEventListener("offline", goOffline);
    window.addEventListener("online", goOnline);

    return () => {
      window.removeEventListener("offline", goOffline);
      window.removeEventListener("online", goOnline);
    };
  }, []);

  if (!offline) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] bg-destructive text-destructive-foreground flex items-center justify-center gap-2 py-2 px-4 text-sm font-semibold animate-fade-in">
      <WifiOff className="w-4 h-4" />
      Connection lost. Please try again when online.
    </div>
  );
};

export default OfflineNotice;
