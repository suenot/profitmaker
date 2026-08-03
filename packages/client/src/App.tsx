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
import WidgetSettingsManager from './components/WidgetSettingsManager';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';

const queryClient = new QueryClient();

const App = () => {
  // Load installed module frontends once, after the host runtime is in place
  // (main.tsx ran initRuntime()). A missing/unreachable server is a no-op.
  useEffect(() => {
    void loadModules();
  }, []);

  return (
  // App-level backstop: without it, a throw in any widget unmounts the whole
  // tree and leaves a blank page. Per-widget boundaries (finer-grained, keep a
  // single broken widget from taking down its neighbours) belong in the widget
  // shell; this one only catches what those let through.
  <ErrorBoundary fallbackTitle="The terminal hit an unexpected error" showDetails>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<BackendGate><Index /></BackendGate>} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
          <BottomLeftInfo />
          <RightClickInfo />
          <CookieNotification />
          <WidgetSettingsManager />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </ErrorBoundary>
  );
};

export default App;
