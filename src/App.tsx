import { lazy, Suspense, useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

import BottomNav from "@/components/BottomNav";
import DevModeIndicator from "@/components/DevModeIndicator";
import PwaGate from "@/components/PwaGate";
import ErrorBoundary from "@/components/shared/ErrorBoundary";
import OfflineNotice from "@/components/shared/OfflineNotice";

import { useActivityHeartbeat } from "@/hooks/useActivityHeartbeat";

// Lazy-loaded pages
const Index = lazy(() => import("./pages/Index"));
const Agenda = lazy(() => import("./pages/Agenda"));
const News = lazy(() => import("./pages/News"));
const Events = lazy(() => import("./pages/Events"));
const Contact = lazy(() => import("./pages/Contact"));
const Loyalty = lazy(() => import("./pages/Loyalty"));
const Vip = lazy(() => import("./pages/Vip"));
const VipLogin = lazy(() => import("./pages/VipLogin"));
const VipVerify = lazy(() => import("./pages/VipVerify"));
const VipDashboard = lazy(() => import("./pages/VipDashboard"));
const VipMemberPass = lazy(() => import("./pages/VipMemberPass"));
const VipProfileSetup = lazy(() => import("./pages/VipProfileSetup"));
const VipInfo = lazy(() => import("./pages/VipInfo"));
const VipMemberDeals = lazy(() => import("./pages/VipMemberDeals"));
const Settings = lazy(() => import("./pages/Settings"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const AdminLogin = lazy(() => import("./pages/AdminLogin"));
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
  useEffect(() => {
    import("@/lib/onesignal")
      .then(async ({ initOneSignalSilently, setOneSignalExternalId }) => {
        await initOneSignalSilently();
        // Auto-relink external_id on every app start if push is granted
        if ("Notification" in window && Notification.permission === "granted") {
          const stored = localStorage.getItem("vip_session");
          if (stored) {
            try {
              const { email } = JSON.parse(stored);
              if (email) setOneSignalExternalId(email).catch(() => {});
            } catch {}
          }
        }
      })
      .catch(() => {/* OneSignal unavailable */});
  }, []);

  useActivityHeartbeat();


  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <DevModeIndicator />
        <BrowserRouter>
          <PwaGate>
            <Suspense fallback={<PageLoader />}>
              <Routes>
            <Route path="/" element={
                  window.location.hostname === "admin.eagleamsterdam.com"
                    ? <AdminLogin />
                    : <Index />
                } />
                <Route path="/agenda" element={<Agenda />} />
                <Route path="/news" element={<News />} />
                <Route path="/events" element={<Events />} />
                <Route path="/contact" element={<Contact />} />
                <Route path="/loyalty" element={<Loyalty />} />
                <Route path="/vip" element={<Vip />} />
                <Route path="/vip/login" element={<VipLogin />} />
                <Route path="/vip/verify" element={<VipVerify />} />
                <Route path="/vip/dashboard" element={<VipDashboard />} />
                <Route path="/vip/loyalty" element={<Loyalty />} />
                <Route path="/vip/member-pass" element={<VipMemberPass />} />
                <Route path="/vip/profile-setup" element={<VipProfileSetup />} />
                <Route path="/vip/info" element={<VipInfo />} />
                <Route path="/vip/member-deals" element={<VipMemberDeals />} />
                <Route path="/eagle-admin-dashboard" element={<AdminDashboard />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
            <BottomNav />
          </PwaGate>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
