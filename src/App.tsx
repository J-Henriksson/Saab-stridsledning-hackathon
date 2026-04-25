import { Suspense, lazy } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
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
import DronePage from "./pages/DronePage.tsx";
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
              <Route path="/drone/:droneId" element={<DronePage />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </GameProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
