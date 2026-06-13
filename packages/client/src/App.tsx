import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CookieNotification } from "@/components/ui/cookie-notification";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/hooks/useTheme";
import { loadModules } from "./modules/loader";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import BackendGate from './components/BackendGate';
import BottomLeftInfo from './components/BottomLeftInfo';
import RightClickInfo from './components/RightClickInfo';
import { TestChartWidget } from './components/TestChartWidget';
import TestCCXTServerProvider from './components/TestCCXTServerProvider';
import TestDebugWidgetCCXTServer from './components/TestDebugWidgetCCXTServer';
import WidgetSettingsManager from './components/WidgetSettingsManager';
import { MasterPasswordDialog } from './components/MasterPasswordDialog';

const queryClient = new QueryClient();

const App = () => {
  // Load installed module frontends once, after the host runtime is in place
  // (main.tsx ran initRuntime()). A missing/unreachable server is a no-op.
  useEffect(() => {
    void loadModules();
  }, []);

  return (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<BackendGate><Index /></BackendGate>} />
            <Route path="/test-chart" element={<TestChartWidget />} />
            <Route path="/test-ccxt-server" element={<TestCCXTServerProvider />} />
            <Route path="/test-debug-ccxt-server" element={<TestDebugWidgetCCXTServer />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
        <BottomLeftInfo />
        <RightClickInfo />
        <CookieNotification />
        <WidgetSettingsManager />
        <MasterPasswordDialog />
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
  );
};

export default App;
