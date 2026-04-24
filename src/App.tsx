import { Suspense, lazy, Component, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen bg-black text-red-400 font-mono p-8 flex flex-col gap-4">
          <div className="text-lg font-bold">Render Error</div>
          <pre className="text-xs whitespace-pre-wrap bg-zinc-900 p-4 rounded">{String(this.state.error)}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { GameProvider } from "@/context/GameContext";
import Index from "./pages/Index.tsx";
import ATO from "./pages/ATO.tsx";
import AircraftDashboard from "./pages/AircraftDashboard.tsx";
import AARPage from "./pages/AARPage";
import UnitDashboard from "./pages/UnitDashboard.tsx";
import DroneDashboard from "./pages/DroneDashboard.tsx";
import NotFound from "./pages/NotFound.tsx";

const MapPage = lazy(() => import("./pages/Map.tsx"));

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <GameProvider>
        <BrowserRouter basename={import.meta.env.BASE_URL}>
          <ErrorBoundary>
          <Suspense fallback={<div className="min-h-screen bg-background text-foreground flex items-center justify-center font-mono text-sm">Laddar karta...</div>}>
            <Routes>
              <Route path="/" element={<Navigate to="/map" replace />} />
              <Route path="/dashboard" element={<Navigate to="/dashboard/MOB" replace />} />
              <Route path="/dashboard/:baseId" element={<Index />} />
              <Route path="/ato" element={<ATO />} />
              <Route path="/map" element={<MapPage />} />
              <Route path="/aircraft/:tailNumber" element={<AircraftDashboard />} />
              <Route path="/aar" element={<AARPage />} />
              <Route path="/units/:id" element={<UnitDashboard />} />
              <Route path="/drones" element={<DroneDashboard />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
          </ErrorBoundary>
        </BrowserRouter>
      </GameProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
