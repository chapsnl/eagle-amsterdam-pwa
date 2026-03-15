import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";

import BottomNav from "@/components/BottomNav";
import DevModeIndicator from "@/components/DevModeIndicator";
import SmartInstallBanner from "@/components/SmartInstallBanner";
import PushNotificationModal from "@/components/PushNotificationModal";

// Lazy-loaded pages
const Index = lazy(() => import("./pages/Index"));
const Agenda = lazy(() => import("./pages/Agenda"));
const News = lazy(() => import("./pages/News"));
const Events = lazy(() => import("./pages/Events"));
const Contact = lazy(() => import("./pages/Contact"));
const VIP = lazy(() => import("./pages/VIP"));
const Loyalty = lazy(() => import("./pages/Loyalty"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    },
  },
});

const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen bg-background">
    <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
  </div>
);

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <DevModeIndicator />
        <AuthProvider>
          <BrowserRouter>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/agenda" element={<Agenda />} />
                <Route path="/news" element={<News />} />
                <Route path="/events" element={<Events />} />
                <Route path="/contact" element={<Contact />} />
                <Route path="/vip" element={<VIP />} />
                <Route path="/loyalty" element={<Loyalty />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
            <SmartInstallBanner />
            <PushNotificationModal />
            <BottomNav />
          </BrowserRouter>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
