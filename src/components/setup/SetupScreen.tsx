import React, { useState } from "react";
import gripenSilhouette from "@/assets/gripen-silhouette.png";
import {
  Crown, Building2, Radio, Shield, Crosshair, Eye,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { initialGameState } from "@/data/initialGameState";
import { deriveDefaultOverrides } from "@/utils/applySetupOverrides";
import type { SetupOverrides, BaseOverride } from "@/types/setup";
import type { Base } from "@/types/game";
import { getAircraft } from "@/core/units/helpers";

interface SetupScreenProps {
  onStartDefault: () => void;
  onStartCustom: (overrides: SetupOverrides) => void;
}

// ── Styles ────────────────────────────────────────────────────────────────

const S = {
  root: {
    minHeight: "100vh",
    background: "#0C234C",
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "monospace",
    color: "#D7DEE1",
  },
  card: {
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(215,222,225,0.12)",
    borderRadius: 8,
    padding: "32px 40px",
    maxWidth: 520,
    width: "90%",
    textAlign: "center" as const,
  },
  label: {
    fontSize: 10,
    letterSpacing: "0.15em",
    textTransform: "uppercase" as const,
    fontWeight: "bold",
    color: "rgba(215,222,225,0.5)",
    marginBottom: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    letterSpacing: "0.08em",
    color: "#D7DEE1",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 12,
    color: "rgba(215,222,225,0.55)",
    marginBottom: 32,
    lineHeight: 1.5,
  },
  btnPrimary: {
    width: "100%",
    padding: "12px 0",
    background: "linear-gradient(90deg,#B8872A,#D7AB3A,#B8872A)",
    border: "none",
    borderRadius: 5,
    color: "#0C234C",
    fontSize: 12,
    fontWeight: "bold",
    letterSpacing: "0.1em",
    cursor: "pointer",
    marginBottom: 12,
    fontFamily: "monospace",
  },
  btnSecondary: {
    width: "100%",
    padding: "12px 0",
    background: "transparent",
    border: "1px solid rgba(215,222,225,0.25)",
    borderRadius: 5,
    color: "rgba(215,222,225,0.7)",
    fontSize: 12,
    fontWeight: "bold",
    letterSpacing: "0.1em",
    cursor: "pointer",
    fontFamily: "monospace",
  },
  sectionHeader: {
    fontSize: 9,
    letterSpacing: "0.15em",
    textTransform: "uppercase" as const,
    fontWeight: "bold",
    color: "rgba(215,222,225,0.4)",
    borderBottom: "1px solid rgba(215,222,225,0.08)",
    paddingBottom: 4,
    marginBottom: 10,
    marginTop: 16,
  },
  row: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
  },
  rowLabel: {
    fontSize: 10,
    color: "#D7DEE1",
    width: 90,
    flexShrink: 0,
    fontFamily: "monospace",
  },
  rowValue: {
    fontSize: 10,
    color: "#D7AB3A",
    width: 36,
    textAlign: "right" as const,
    flexShrink: 0,
    fontFamily: "monospace",
    fontWeight: "bold",
  },
};

// ── Role definitions ──────────────────────────────────────────────────────

export type PlayerRole =
  | "wing_commander"
  | "base_commander"
  | "fob_manager"
  | "ad_controller"
  | "fighter_controller"
  | "intel_officer";

const ROLES: {
  id: PlayerRole;
  title: string;
  sub: string;
  icon: React.ElementType;
  color: string;
}[] = [
  { id: "wing_commander",     title: "Vingchef",              sub: "Wing Commander",          icon: Crown,     color: "#D7AB3A" },
  { id: "base_commander",     title: "Flygbaskommendant",     sub: "Air Base Commander",       icon: Building2, color: "#60a5fa" },
  { id: "fob_manager",        title: "FOB-Chef",              sub: "Fwd. Operating Base Mgr", icon: Radio,     color: "#4ade80" },
  { id: "ad_controller",      title: "Luftvärnscontroller",   sub: "Air Defence Controller",  icon: Shield,    color: "#f87171" },
  { id: "fighter_controller", title: "Stridsledare",          sub: "Fighter Controller",      icon: Crosshair, color: "#c084fc" },
  { id: "intel_officer",      title: "Underrättelseofficer",  sub: "Intel & Recon Officer",   icon: Eye,       color: "#22d3ee" },
];

// ── Hover-aware button ────────────────────────────────────────────────────

function HoverButton({
  base,
  hovered,
  onClick,
  children,
}: {
  base: React.CSSProperties;
  hovered: React.CSSProperties;
  onClick: () => void;
  children: React.ReactNode;
}) {
  const [isHovered, setIsHovered] = useState(false);
  return (
    <button
      style={{ ...base, ...(isHovered ? hovered : {}) }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

// ── Choice view ───────────────────────────────────────────────────────────

function ChoiceView({
  onDefault,
  onCustomize,
}: {
  onDefault: () => void;
  onCustomize: () => void;
}) {
  const [role, setRole] = useState<PlayerRole | null>(
    () => (localStorage.getItem("playerRole") as PlayerRole | null)
  );

  function handleStart(fn: () => void) {
    if (role) localStorage.setItem("playerRole", role);
    else localStorage.removeItem("playerRole");
    fn();
  }

  return (
    <div style={S.root}>
      <div style={{ ...S.card, maxWidth: 620 }}>
        {/* Logo */}
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 20 }}>
          <div style={{
            width: 72, height: 72, borderRadius: 16, overflow: "hidden",
            background: "hsl(42 64% 53% / 0.15)",
            border: "1px solid hsl(42 64% 53% / 0.4)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <img
              src={gripenSilhouette}
              alt="Gripen"
              style={{
                height: 44, width: "auto", objectFit: "contain",
                filter: "brightness(0) invert(1) sepia(1) saturate(2) hue-rotate(3deg) brightness(1.1)",
              }}
            />
          </div>
        </div>

        <div style={S.label}>SMART STRIDSLEDNING — ROAD2AIR</div>
        <div style={S.title}>SIMULERINGSKONFIGURATION</div>
        <div style={S.subtitle}>
          Välj valfritt en roll och hur du vill starta simuleringen.
        </div>

        {/* Role selection */}
        <div style={{
          fontSize: 9, letterSpacing: "0.15em", textTransform: "uppercase",
          color: "rgba(215,222,225,0.45)", marginBottom: 10, fontWeight: "bold",
        }}>
          Välj roll <span style={{ textTransform: "none", letterSpacing: 0, fontWeight: "normal", opacity: 0.6 }}>(valfritt)</span>
        </div>
        <div style={{
          display: "grid", gridTemplateColumns: "1fr 1fr 1fr",
          gap: 8, marginBottom: 28, textAlign: "left",
        }}>
          {ROLES.map((r) => {
            const Icon = r.icon;
            const selected = role === r.id;
            return (
              <button
                key={r.id}
                onClick={() => setRole(r.id)}
                style={{
                  background: selected ? `${r.color}18` : "rgba(255,255,255,0.03)",
                  border: `1px solid ${selected ? r.color : "rgba(215,222,225,0.12)"}`,
                  borderRadius: 6,
                  padding: "10px 10px 8px",
                  cursor: "pointer",
                  fontFamily: "monospace",
                  textAlign: "left",
                  transition: "all 0.15s ease",
                  outline: "none",
                }}
                onMouseEnter={(e) => {
                  if (!selected) (e.currentTarget as HTMLButtonElement).style.borderColor = `${r.color}88`;
                }}
                onMouseLeave={(e) => {
                  if (!selected) (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(215,222,225,0.12)";
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                  <Icon size={13} color={r.color} />
                  <span style={{ fontSize: 10, fontWeight: "bold", color: selected ? r.color : "#D7DEE1", letterSpacing: "0.04em" }}>
                    {r.title}
                  </span>
                </div>
                <div style={{ fontSize: 9, color: "rgba(215,222,225,0.4)", letterSpacing: "0.05em" }}>
                  {r.sub}
                </div>
              </button>
            );
          })}
        </div>

        {/* Start buttons */}
        <HoverButton
          base={S.btnPrimary}
          hovered={{
            background: "linear-gradient(90deg,#D7AB3A,#f0c84a,#D7AB3A)",
            boxShadow: "0 0 16px rgba(215,171,58,0.45)",
            transform: "translateY(-1px)",
          }}
          onClick={() => handleStart(onDefault)}
        >
          STARTA MED STANDARDINSTÄLLNINGAR
        </HoverButton>

        <HoverButton
          base={S.btnSecondary}
          hovered={{
            background: "rgba(215,222,225,0.08)",
            border: "1px solid rgba(215,222,225,0.55)",
            color: "#D7DEE1",
            transform: "translateY(-1px)",
          }}
          onClick={() => handleStart(onCustomize)}
        >
          ANPASSA RESURSER
        </HoverButton>

        {!role && (
          <div style={{ fontSize: 10, color: "rgba(215,222,225,0.25)", marginTop: 10, letterSpacing: "0.05em" }}>
            Du kan starta utan att välja roll
          </div>
        )}
      </div>
    </div>
  );
}

// ── Slider row ────────────────────────────────────────────────────────────

function SliderRow({
  label,
  value,
  min,
  max,
  display,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  display: string;
  onChange: (v: number) => void;
}) {
  return (
    <div style={S.row}>
      <span style={S.rowLabel}>{label}</span>
      <div style={{ flex: 1 }}>
        <Slider
          min={min}
          max={max}
          step={1}
          value={[value]}
          onValueChange={([v]) => onChange(v)}
          className="[&>span:first-child]:bg-[rgba(215,222,225,0.1)] [&_[role=slider]]:bg-[#D7AB3A] [&_[role=slider]]:border-[#D7AB3A] [&_.bg-primary]:bg-[#D7AB3A]"
        />
      </div>
      <span style={S.rowValue}>{display}</span>
    </div>
  );
}

// ── Aircraft count input row ──────────────────────────────────────────────

function AircraftRow({
  value,
  max,
  onChange,
}: {
  value: number;
  max: number;
  onChange: (v: number) => void;
}) {
  return (
    <div style={S.row}>
      <span style={S.rowLabel}>Antal flygplan</span>
      <div style={{ flex: 1 }} />
      <input
        type="number"
        min={1}
        max={max}
        value={value}
        onChange={(e) =>
          onChange(Math.max(1, Math.min(max, parseInt(e.target.value) || 1)))
        }
        style={{
          width: 54,
          background: "rgba(255,255,255,0.07)",
          border: "1px solid rgba(215,222,225,0.2)",
          borderRadius: 4,
          color: "#D7AB3A",
          fontFamily: "monospace",
          fontSize: 13,
          fontWeight: "bold",
          textAlign: "center",
          padding: "3px 0",
        }}
      />
      <span style={{ ...S.rowValue, color: "rgba(215,222,225,0.35)" }}>
        /{max}
      </span>
    </div>
  );
}

// ── Per-base customizer ───────────────────────────────────────────────────

function BaseCustomizer({
  base,
  defaultCount,
  override,
  onChange,
}: {
  base: Base;
  defaultCount: number;
  override: BaseOverride;
  onChange: (updated: BaseOverride) => void;
}) {
  const setFuel = (v: number) => onChange({ ...override, fuel: v });
  const setCount = (v: number) => onChange({ ...override, aircraftCount: v });

  const setAmmo = (type: string, quantity: number) =>
    onChange({
      ...override,
      ammunition: override.ammunition.map((a) =>
        a.type === type ? { ...a, quantity } : a
      ),
    });

  const setPart = (id: string, quantity: number) =>
    onChange({
      ...override,
      spareParts: override.spareParts.map((p) =>
        p.id === id ? { ...p, quantity } : p
      ),
    });

  return (
    <div style={{ padding: "4px 0 8px" }}>
      {/* Fuel */}
      <div style={S.sectionHeader}>Bränsle</div>
      <SliderRow
        label="Bränslenivå"
        value={override.fuel}
        min={0}
        max={base.maxFuel}
        display={`${override.fuel}%`}
        onChange={setFuel}
      />

      {/* Aircraft */}
      <div style={S.sectionHeader}>Flygplan</div>
      <AircraftRow
        value={override.aircraftCount}
        max={defaultCount}
        onChange={setCount}
      />

      {/* Ammo */}
      <div style={S.sectionHeader}>Ammunition</div>
      {base.ammunition.map((ammo) => {
        const current =
          override.ammunition.find((a) => a.type === ammo.type)?.quantity ??
          ammo.quantity;
        return (
          <SliderRow
            key={ammo.type}
            label={ammo.type}
            value={current}
            min={0}
            max={ammo.max}
            display={`${current}/${ammo.max}`}
            onChange={(v) => setAmmo(ammo.type, v)}
          />
        );
      })}

      {/* Spare parts */}
      <div style={S.sectionHeader}>Reservdelar</div>
      {base.spareParts.map((part) => {
        const current =
          override.spareParts.find((p) => p.id === part.id)?.quantity ??
          part.quantity;
        return (
          <SliderRow
            key={part.id}
            label={part.name}
            value={current}
            min={0}
            max={part.maxQuantity}
            display={`${current}/${part.maxQuantity}`}
            onChange={(v) => setPart(part.id, v)}
          />
        );
      })}
    </div>
  );
}

// ── Customizer view ───────────────────────────────────────────────────────

function CustomizerView({
  overrides,
  onChange,
  onConfirm,
  onBack,
}: {
  overrides: SetupOverrides;
  onChange: (o: SetupOverrides) => void;
  onConfirm: () => void;
  onBack: () => void;
}) {
  const defaultCounts = initialGameState.bases.reduce<Record<string, number>>(
    (acc, b) => ({ ...acc, [b.id]: getAircraft(b).length }),
    {}
  );

  const updateBase = (i: number, updated: BaseOverride) =>
    onChange({ bases: overrides.bases.map((b, j) => (j === i ? updated : b)) });

  return (
    <div
      style={{
        ...S.root,
        justifyContent: "flex-start",
        paddingTop: 32,
        paddingBottom: 32,
        overflowY: "auto",
      }}
    >
      <div
        style={{
          ...S.card,
          maxWidth: 680,
          textAlign: "left",
          padding: "24px 32px",
        }}
      >
        <div style={{ ...S.label, marginBottom: 4 }}>ANPASSA RESURSER</div>
        <div style={{ ...S.subtitle, marginBottom: 16 }}>
          Justera startresurser per bas. Standardvärden är förifyllda.
        </div>

        <Tabs defaultValue={initialGameState.bases[0].id}>
          <TabsList
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(215,222,225,0.1)",
              marginBottom: 16,
            }}
          >
            {initialGameState.bases.map((base) => (
              <TabsTrigger
                key={base.id}
                value={base.id}
                style={{ fontFamily: "monospace", fontSize: 11, letterSpacing: "0.05em" }}
              >
                {base.id}
              </TabsTrigger>
            ))}
          </TabsList>

          {initialGameState.bases.map((base, i) => (
            <TabsContent key={base.id} value={base.id}>
              <BaseCustomizer
                base={base}
                defaultCount={defaultCounts[base.id]}
                override={overrides.bases[i]}
                onChange={(updated) => updateBase(i, updated)}
              />
            </TabsContent>
          ))}
        </Tabs>

        <div
          style={{
            borderTop: "1px solid rgba(215,222,225,0.08)",
            paddingTop: 16,
            marginTop: 8,
            display: "flex",
            gap: 12,
          }}
        >
          <button
            style={{ ...S.btnSecondary, width: "auto", padding: "10px 24px" }}
            onClick={onBack}
          >
            TILLBAKA
          </button>
          <button
            style={{ ...S.btnPrimary, width: "auto", flex: 1, marginBottom: 0 }}
            onClick={onConfirm}
          >
            BEKRÄFTA &amp; STARTA
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Root component ────────────────────────────────────────────────────────

export function SetupScreen({ onStartDefault, onStartCustom }: SetupScreenProps) {
  const [phase, setPhase] = useState<"choice" | "customize">("choice");
  const [overrides, setOverrides] = useState<SetupOverrides>(() =>
    deriveDefaultOverrides(initialGameState)
  );

  if (phase === "choice") {
    return (
      <ChoiceView
        onDefault={onStartDefault}
        onCustomize={() => setPhase("customize")}
      />
    );
  }

  return (
    <CustomizerView
      overrides={overrides}
      onChange={setOverrides}
      onConfirm={() => onStartCustom(overrides)}
      onBack={() => setPhase("choice")}
    />
  );
}
