import { useState, useEffect } from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CookieNotification } from "@/components/ui/cookie-notification";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/hooks/useTheme";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import BottomLeftInfo from './components/BottomLeftInfo';
import RightClickInfo from './components/RightClickInfo';
import TestProviderIntegration from './components/TestProviderIntegration';
import TestTimeframes from './components/TestTimeframes';
import { TestChartWidget } from './components/TestChartWidget';
import TestCCXTServerProvider from './components/TestCCXTServerProvider';
import TestDebugWidgetCCXTServer from './components/TestDebugWidgetCCXTServer';
import WidgetSettingsManager from './components/WidgetSettingsManager';
import { MasterPasswordDialog } from './components/MasterPasswordDialog';
import { BackendSettingsDialog } from './components/BackendSettingsDialog';

const queryClient = new QueryClient();

const App = () => {
  const [backendSettingsOpen, setBackendSettingsOpen] = useState(false);

  // Listen for Electron menu event to open backend settings
  useEffect(() => {
    if (window.electronAPI) {
      const cleanup = window.electronAPI.onOpenBackendSettings(() => {
        setBackendSettingsOpen(true);
      });
      return cleanup;
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/test-providers" element={<TestProviderIntegration />} />
              <Route path="/test-timeframes" element={<TestTimeframes />} />
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
          <BackendSettingsDialog
            open={backendSettingsOpen}
            onOpenChange={setBackendSettingsOpen}
          />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;
