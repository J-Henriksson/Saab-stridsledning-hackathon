import { useState } from "react";
import { useGame } from "@/context/GameContext";
import { TopBar } from "@/components/game/TopBar";
import { ATOEditor } from "@/components/game/ATOEditor";
import { ATOOrder, Aircraft, BaseType, MissionType } from "@/types/game";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  Shield,
  Target,
  Eye,
  Radio,
  Zap,
  Plane,
  CheckCircle2,
  Clock,
  Send,
  AlertTriangle,
  ChevronRight,
  MapPin,
  Package,
  Users,
} from "lucide-react";

const missionIcons: Partial<Record<MissionType, React.ReactNode>> = {
  DCA: <Shield className="h-4 w-4" />,
  QRA: <Target className="h-4 w-4" />,
  RECCE: <Eye className="h-4 w-4" />,
  AEW: <Radio className="h-4 w-4" />,
  AI_DT: <Zap className="h-4 w-4" />,
  AI_ST: <Zap className="h-4 w-4" />,
  ESCORT: <Shield className="h-4 w-4" />,
  TRANSPORT: <Plane className="h-4 w-4" />,
};

const priorityColor = {
  high: "text-status-red border-status-red/40 bg-status-red/10",
  medium: "text-status-yellow border-status-yellow/40 bg-status-yellow/10",
  low: "text-muted-foreground border-border bg-muted/20",
};

const priorityLabel = { high: "HÖG", medium: "MEDEL", low: "LÅG" };

const statusColor = {
  pending: "bg-primary/10 border-primary/30 text-primary",
  assigned: "bg-status-yellow/10 border-status-yellow/30 text-status-yellow",
  dispatched: "bg-status-green/10 border-status-green/30 text-status-green",
  completed: "bg-muted border-border text-muted-foreground",
};

const statusLabel = {
  pending: "VÄNTANDE",
  assigned: "TILLDELAD",
  dispatched: "SKICKAD",
  completed: "GENOMFÖRD",
};

function formatHour(h: number) {
  return `${String(h).padStart(2, "0")}:00`;
}

export default function ATO() {
  const { state, advanceTurn, resetGame, assignAircraftToOrder, dispatchOrder, createATOOrder, editATOOrder, deleteATOOrder } = useGame();
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [selectedAircraft, setSelectedAircraft] = useState<string[]>([]);
  const [filterStatus, setFilterStatus] = useState<"all" | "pending" | "dispatched" | "completed">("all");
  const [showEditor, setShowEditor] = useState(false);
  const [editingOrder, setEditingOrder] = useState<ATOOrder | undefined>(undefined);

  const selectedOrder = state.atoOrders.find((o) => o.id === selectedOrderId) ?? null;
  const selectedBase = selectedOrder
    ? state.bases.find((b) => b.id === selectedOrder.launchBase)
    : null;

  const availableAircraft: Aircraft[] = selectedBase
    ? selectedBase.aircraft.filter(
        (ac) =>
          ac.status === "ready" &&
          (!selectedOrder?.aircraftType || ac.type === selectedOrder.aircraftType)
      )
    : [];

  const filteredOrders = state.atoOrders.filter(
    (o) => filterStatus === "all" || o.status === filterStatus
  );

  const pendingCount = state.atoOrders.filter((o) => o.status === "pending").length;
  const dispatchedCount = state.atoOrders.filter((o) => o.status === "dispatched").length;

  function handleSelectOrder(order: ATOOrder) {
    setSelectedOrderId(order.id);
    setSelectedAircraft(order.assignedAircraft.length > 0 ? order.assignedAircraft : []);
  }

  function toggleAircraft(id: string) {
    setSelectedAircraft((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function handleAssign() {
    if (!selectedOrder) return;
    assignAircraftToOrder(selectedOrder.id, selectedAircraft);
    toast.success(`Tilldelat ${selectedAircraft.length} flygplan till ${selectedOrder.missionType}`);
  }

  function handleDispatch() {
    if (!selectedOrder) return;
    if (selectedAircraft.length === 0) {
      toast.error("Inga flygplan tilldelade. Tilldela flygplan först.");
      return;
    }
    // Assign first if not already
    assignAircraftToOrder(selectedOrder.id, selectedAircraft);
    dispatchOrder(selectedOrder.id);
    toast.success(
      `${selectedAircraft.length} fpl skickade på ${selectedOrder.missionType}-uppdrag från ${selectedOrder.launchBase}`
    );
    setSelectedOrderId(null);
    setSelectedAircraft([]);
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      <TopBar state={state} onAdvanceTurn={advanceTurn} onReset={resetGame} />

      {/* Sub-header */}
      <div className="border-b border-border bg-card px-6 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Send className="h-4 w-4 text-primary" />
          <h2 className="font-sans font-bold text-sm text-foreground tracking-wider">
            ATO — UPPDRAGSORDERN
          </h2>
          <span className="text-[10px] font-mono text-muted-foreground">
            Dag {state.day} · Fas: {state.phase}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {pendingCount > 0 && (
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-primary/20 text-primary border border-primary/30 flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              {pendingCount} VÄNTANDE ORDER
            </span>
          )}
          {dispatchedCount > 0 && (
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-status-green/10 text-status-green border border-status-green/30">
              {dispatchedCount} AKTIVA UPPDRAG
            </span>
          )}
          <button
            onClick={() => { setEditingOrder(undefined); setShowEditor(true); }}
            className="flex items-center gap-1 text-[10px] font-mono font-bold px-3 py-1.5 rounded-lg transition-all hover:opacity-90"
            style={{ background: "hsl(220 63% 18%)", color: "hsl(42 64% 62%)", border: "1px solid hsl(42 64% 53% / 0.3)" }}
          >
            + NY ORDER
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-[400px_1fr] gap-0">

        {/* LEFT: ATO order list */}
        <div className="border-r border-border flex flex-col overflow-hidden">
          {/* Filter tabs */}
          <div className="px-4 py-2 border-b border-border flex gap-1">
            {(["all", "pending", "dispatched", "completed"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilterStatus(f)}
                className={`px-3 py-1 text-[10px] font-mono rounded transition-colors ${
                  filterStatus === f
                    ? "bg-primary/20 text-primary border border-primary/30"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {f === "all" ? "ALLA" : f === "pending" ? "VÄNTANDE" : f === "dispatched" ? "SKICKADE" : "KLARA"}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {filteredOrders.length === 0 && (
              <div className="text-center text-muted-foreground text-xs py-8">
                Inga order
              </div>
            )}
            {filteredOrders.map((order) => {
              const isSelected = order.id === selectedOrderId;
              const base = state.bases.find((b) => b.id === order.launchBase);
              const mcAtBase = base?.aircraft.filter(
                (ac) =>
                  ac.status === "ready" &&
                  (!order.aircraftType || ac.type === order.aircraftType)
              ).length ?? 0;

              return (
                <motion.div
                  key={order.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  onClick={() => handleSelectOrder(order)}
                  className={`p-3 rounded-lg border cursor-pointer transition-all ${
                    isSelected
                      ? "border-primary/60 bg-primary/10"
                      : "border-border bg-card hover:border-border hover:bg-muted/30"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`p-1 rounded border ${priorityColor[order.priority]}`}
                      >
                        {missionIcons[order.missionType] ?? <Plane className="h-4 w-4" />}
                      </span>
                      <div>
                        <div className="text-xs font-bold text-foreground">
                          {order.missionType} — {order.label}
                        </div>
                        <div className="text-[10px] font-mono text-muted-foreground mt-0.5">
                          {formatHour(order.startHour)}–{formatHour(order.endHour)} · {order.requiredCount} fpl
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span
                        className={`text-[9px] font-mono px-1.5 py-0.5 rounded border ${statusColor[order.status]}`}
                      >
                        {statusLabel[order.status]}
                      </span>
                      <span
                        className={`text-[9px] font-mono px-1.5 py-0.5 rounded border ${priorityColor[order.priority]}`}
                      >
                        {priorityLabel[order.priority]}
                      </span>
                    </div>
                  </div>

                  <div className="mt-2 flex items-center gap-3 text-[10px] text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {order.launchBase}
                    </span>
                    {order.payload && (
                      <span className="flex items-center gap-1">
                        <Package className="h-3 w-3" />
                        {order.payload}
                      </span>
                    )}
                    <span className="flex items-center gap-1 ml-auto">
                      <Plane className="h-3 w-3" />
                      <span className={mcAtBase < order.requiredCount ? "text-status-red" : "text-status-green"}>
                        {mcAtBase} MC
                      </span>
                      /{order.requiredCount} krävda
                    </span>
                  </div>

                  {order.assignedAircraft.length > 0 && (
                    <div className="mt-1.5 text-[9px] font-mono text-status-yellow">
                      Tilldelade: {order.assignedAircraft.join(", ")}
                    </div>
                  )}

                  {isSelected && (
                    <div className="mt-1 flex items-center gap-1 text-[9px] text-primary font-mono">
                      <ChevronRight className="h-3 w-3" />
                      Välj flygplan →
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* RIGHT: Assignment panel */}
        <div className="overflow-y-auto">
          <AnimatePresence mode="wait">
            {selectedOrder ? (
              <motion.div
                key={selectedOrder.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                className="p-6 space-y-6"
              >
                {/* Order header */}
                <div className="bg-card border border-border rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <span className={`p-2 rounded-lg border ${priorityColor[selectedOrder.priority]}`}>
                      {missionIcons[selectedOrder.missionType] ?? <Plane className="h-5 w-5" />}
                    </span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-foreground">
                          {selectedOrder.missionType} — {selectedOrder.label}
                        </h3>
                        <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded border ${statusColor[selectedOrder.status]}`}>
                          {statusLabel[selectedOrder.status]}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
                        <div className="text-[10px]">
                          <div className="text-muted-foreground mb-0.5">Tid</div>
                          <div className="font-mono text-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatHour(selectedOrder.startHour)}–{formatHour(selectedOrder.endHour)}
                          </div>
                        </div>
                        <div className="text-[10px]">
                          <div className="text-muted-foreground mb-0.5">Flygplan krävda</div>
                          <div className="font-mono text-foreground flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {selectedOrder.requiredCount} × {selectedOrder.aircraftType ?? "valfri typ"}
                          </div>
                        </div>
                        <div className="text-[10px]">
                          <div className="text-muted-foreground mb-0.5">Startbas</div>
                          <div className="font-mono text-foreground flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {selectedOrder.launchBase}
                          </div>
                        </div>
                        {selectedOrder.payload && (
                          <div className="text-[10px]">
                            <div className="text-muted-foreground mb-0.5">Lastning</div>
                            <div className="font-mono text-foreground flex items-center gap-1">
                              <Package className="h-3 w-3" />
                              {selectedOrder.payload}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Aircraft selection */}
                {selectedOrder.status !== "dispatched" && selectedOrder.status !== "completed" ? (
                  <>
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h4 className="text-sm font-bold text-foreground">Välj flygplan</h4>
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            Tillgängliga Mission Capable vid {selectedOrder.launchBase}
                            {selectedOrder.aircraftType ? ` · Typ: ${selectedOrder.aircraftType}` : ""}
                          </p>
                        </div>
                        <div className={`text-sm font-mono font-bold ${
                          selectedAircraft.length >= selectedOrder.requiredCount
                            ? "text-status-green"
                            : "text-status-red"
                        }`}>
                          {selectedAircraft.length} / {selectedOrder.requiredCount}
                        </div>
                      </div>

                      {availableAircraft.length === 0 ? (
                        <div className="bg-status-red/10 border border-status-red/30 rounded-lg p-4 text-center">
                          <AlertTriangle className="h-5 w-5 text-status-red mx-auto mb-2" />
                          <p className="text-xs text-status-red font-bold">Inga tillgängliga flygplan</p>
                          <p className="text-[10px] text-muted-foreground mt-1">
                            Inga MC-flygplan av typ {selectedOrder.aircraftType ?? "valfri"} vid {selectedOrder.launchBase}
                          </p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
                          {availableAircraft.map((ac) => {
                            const selected = selectedAircraft.includes(ac.id);
                            const overCount =
                              !selected && selectedAircraft.length >= selectedOrder.requiredCount;
                            return (
                              <button
                                key={ac.id}
                                onClick={() => !overCount && toggleAircraft(ac.id)}
                                disabled={overCount}
                                className={`p-3 rounded-lg border text-left transition-all ${
                                  selected
                                    ? "bg-primary/15 border-primary/50 text-foreground"
                                    : overCount
                                    ? "opacity-40 cursor-not-allowed border-border bg-card"
                                    : "border-border bg-card hover:border-primary/40 hover:bg-muted/30"
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  <div
                                    className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                                      selected
                                        ? "bg-primary border-primary"
                                        : "border-muted-foreground"
                                    }`}
                                  >
                                    {selected && <CheckCircle2 className="h-3 w-3 text-primary-foreground" />}
                                  </div>
                                  <div className="min-w-0">
                                    <div className="text-xs font-bold font-mono">{ac.tailNumber}</div>
                                    <div className="text-[10px] text-muted-foreground">{ac.type}</div>
                                  </div>
                                  <div className="ml-auto text-right">
                                    <div className="text-[9px] font-mono text-muted-foreground">{ac.flightHours}h</div>
                                    <div className="text-[9px] font-mono text-status-green">MC</div>
                                  </div>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-3 pt-2">
                      <button
                        onClick={handleAssign}
                        disabled={selectedAircraft.length === 0}
                        className="px-4 py-2 text-sm font-mono rounded border border-primary/40 text-primary bg-primary/10 hover:bg-primary/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        SPARA TILLDELNING
                      </button>
                      <button
                        onClick={handleDispatch}
                        disabled={selectedAircraft.length === 0 || availableAircraft.length === 0}
                        className="flex items-center gap-2 px-6 py-2 text-sm font-mono font-bold rounded bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <Send className="h-4 w-4" />
                        SKICKA UPPDRAG
                      </button>
                      {selectedAircraft.length < selectedOrder.requiredCount && selectedAircraft.length > 0 && (
                        <span className="text-[10px] text-status-yellow font-mono">
                          ⚠ {selectedOrder.requiredCount - selectedAircraft.length} fpl saknas
                        </span>
                      )}
                    </div>
                  </>
                ) : (
                  <div className={`rounded-lg border p-6 text-center ${
                    selectedOrder.status === "dispatched"
                      ? "bg-status-green/10 border-status-green/30"
                      : "bg-muted border-border"
                  }`}>
                    <CheckCircle2 className={`h-8 w-8 mx-auto mb-2 ${
                      selectedOrder.status === "dispatched" ? "text-status-green" : "text-muted-foreground"
                    }`} />
                    <p className="font-bold text-sm">
                      {selectedOrder.status === "dispatched" ? "Uppdrag skickat" : "Uppdrag genomfört"}
                    </p>
                    {selectedOrder.assignedAircraft.length > 0 && (
                      <p className="text-[10px] text-muted-foreground mt-2 font-mono">
                        Flygplan: {selectedOrder.assignedAircraft.join(", ")}
                      </p>
                    )}
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center h-full text-muted-foreground gap-3 p-8"
              >
                <Send className="h-12 w-12 opacity-20" />
                <p className="text-sm font-mono">Välj en ATO-order för att tilldela flygplan</p>
                <p className="text-[10px] text-center max-w-xs">
                  Välj ett uppdrag i listan till vänster, tilldela tillgängliga MC-flygplan och skicka uppdraget.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ATO Editor Modal */}
      {showEditor && (
        <ATOEditor
          order={editingOrder}
          onSave={(order) => {
            if (editingOrder) {
              editATOOrder(editingOrder.id, order);
              toast.success("Order uppdaterad");
            } else {
              createATOOrder(order);
              toast.success("Ny ATO-order skapad");
            }
            setShowEditor(false);
            setEditingOrder(undefined);
          }}
          onCancel={() => { setShowEditor(false); setEditingOrder(undefined); }}
        />
      )}
    </div>
  );
}
