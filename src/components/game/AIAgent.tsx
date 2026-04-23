import { useState, useRef, useEffect } from "react";
import { Bot, Send, Loader2, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Message {
  role: "user" | "assistant" | "system";
  content: string;
}

interface AIAgentProps {
  getResourceSummary: () => string;
}

export function AIAgent({ getResourceSummary }: AIAgentProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "Jag är din AI-rådgivare för flygbaslogistik. Jag har tillgång till aktuellt resursläge. Fråga mig om:\n\n• Prioritering av underhåll\n• Resursallokering mellan baser\n• Reservdelsoptimering\n• Taktiska rekommendationer\n\nSkriv **\"läge\"** för en fullständig resursrapport.",
    },
  ]);
  const [input, setInput] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const processMessage = async (userMessage: string) => {
    const summary = getResourceSummary();
    if (userMessage.toLowerCase().includes("läge") || userMessage.toLowerCase().includes("status") || userMessage.toLowerCase().includes("rapport")) {
      return `## Aktuellt resursläge\n\n\`\`\`\n${summary}\n\`\`\`\n\nVill du att jag analyserar något specifikt?`;
    }
    if (userMessage.toLowerCase().includes("priorit") || userMessage.toLowerCase().includes("underhåll")) {
      return `## Underhållsprioritering\n\nBaserat på aktuellt läge rekommenderar jag:\n\n1. **Fokusera på NMC-flygplan med kortast reparationstid** - Quick LRU-byten först\n2. **Säkerställ att underhållsplatser inte står tomma**\n3. **Reservdelsläge** - Kontrollera LRU:er innan underhåll påbörjas\n\n> ⚠️ Vid resursbrist: Kannibalering som sista utväg.`;
    }
    if (userMessage.toLowerCase().includes("bränsle") || userMessage.toLowerCase().includes("fuel")) {
      return `## Bränsleanalys\n\nNuvarande förbrukningstakt:\n- **FRED**: ~0.5%/h\n- **KRIS**: ~1.5%/h\n- **KRIG**: ~3%/h\n\n**Rekommendation**: Begär påfyllning av baser under 50%.`;
    }
    if (userMessage.toLowerCase().includes("ombasering") || userMessage.toLowerCase().includes("flytta")) {
      return `## Ombaseringsanalys\n\nVid ombasering beakta:\n\n1. **Konfiguration** - Spaningskapslar tar lång tid\n2. **Mottagande bas resurser** - Personal, bränsle, ammunition\n3. **Strategiskt läge** - Spridning ökar överlevnad\n\nVilka flygplan och bas tänker du på?`;
    }
    return `Jag analyserar ditt meddelande mot aktuellt resursläge.\n\n**Sammanfattning:**\n- Scenariofas och tidsläge påverkar resursbehov\n- Balansera operativ tillgänglighet med underhåll\n- Övervaka konsumtionsvaror kontinuerligt\n\nKan du vara mer specifik?`;
  };

  const handleSend = async () => {
    if (!input.trim() || isThinking) return;
    const userMsg = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMsg }]);
    setIsThinking(true);
    await new Promise((r) => setTimeout(r, 800 + Math.random() * 1200));
    const response = await processMessage(userMsg);
    setMessages((prev) => [...prev, { role: "assistant", content: response }]);
    setIsThinking(false);
  };

  return (
    <div className="flex flex-col h-full overflow-hidden rounded-t-none"
      style={{
        background: "linear-gradient(180deg, hsl(220 63% 18% / 0.03), hsl(0 0% 100%))",
      }}>
      {/* Header */}
      <div className="px-4 py-2.5 flex items-center gap-2.5"
        style={{
          background: "linear-gradient(90deg, hsl(220 63% 18% / 0.06), transparent)",
          borderBottom: "1px solid hsl(215 14% 88%)",
        }}>
        <div className="p-1.5 rounded-lg"
          style={{ background: "hsl(220 63% 18% / 0.08)" }}>
          <Bot className="h-4 w-4" style={{ color: "hsl(220 63% 30%)" }} />
        </div>
        <div>
          <div className="text-[11px] font-bold font-sans" style={{ color: "hsl(220 63% 18%)" }}>
            AI RÅDGIVARE
          </div>
          <div className="text-[8px] font-mono" style={{ color: "hsl(218 15% 55%)" }}>
            SMART AIRBASE INTEL
          </div>
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "hsl(152 60% 42%)" }} />
          <span className="text-[9px] font-mono font-bold" style={{ color: "hsl(152 60% 32%)" }}>ONLINE</span>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-2.5 min-h-0">
        <AnimatePresence>
          {messages.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className={`text-xs ${msg.role === "user" ? "ml-6" : "mr-2"}`}
            >
              {msg.role === "assistant" && (
                <div className="flex items-center gap-1.5 mb-1">
                  <Sparkles className="h-2.5 w-2.5" style={{ color: "hsl(42 64% 53%)" }} />
                  <span className="text-[8px] font-mono font-bold" style={{ color: "hsl(42 64% 48%)" }}>AI</span>
                </div>
              )}
              <div
                className="rounded-xl px-3 py-2.5 leading-relaxed whitespace-pre-wrap break-words"
                style={msg.role === "user" ? {
                  background: "hsl(220 63% 18%)",
                  color: "hsl(200 12% 90%)",
                  borderRadius: "12px 12px 4px 12px",
                } : {
                  background: "hsl(216 18% 96%)",
                  color: "hsl(220 63% 18%)",
                  border: "1px solid hsl(215 14% 88%)",
                  borderRadius: "12px 12px 12px 4px",
                }}
              >
                {msg.content}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        {isThinking && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="flex items-center gap-2 text-xs ml-2"
            style={{ color: "hsl(218 15% 55%)" }}>
            <Loader2 className="h-3 w-3 animate-spin" />
            <span className="text-[10px] font-mono">Analyserar...</span>
            <div className="flex gap-0.5">
              {[0, 1, 2].map((d) => (
                <motion.div key={d}
                  className="w-1 h-1 rounded-full"
                  style={{ background: "hsl(42 64% 53%)" }}
                  animate={{ scale: [1, 1.5, 1] }}
                  transition={{ repeat: Infinity, duration: 0.8, delay: d * 0.2 }}
                />
              ))}
            </div>
          </motion.div>
        )}
      </div>

      {/* Input */}
      <div className="p-3" style={{ borderTop: "1px solid hsl(215 14% 88%)" }}>
        <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Fråga om resurser, prioriteringar..."
            className="flex-1 text-xs rounded-xl px-3 py-2 focus:outline-none transition-all"
            style={{
              background: "hsl(216 18% 96%)",
              border: "1px solid hsl(215 14% 84%)",
              color: "hsl(220 63% 18%)",
            }}
            onFocus={(e) => (e.currentTarget.style.borderColor = "hsl(220 63% 38%)")}
            onBlur={(e) => (e.currentTarget.style.borderColor = "hsl(215 14% 84%)")}
          />
          <button
            type="submit"
            disabled={isThinking || !input.trim()}
            className="p-2 rounded-xl transition-all disabled:opacity-40 active:scale-95"
            style={{
              background: input.trim() ? "hsl(220 63% 18%)" : "hsl(216 18% 90%)",
              color: input.trim() ? "white" : "hsl(218 15% 55%)",
            }}
          >
            <Send className="h-3.5 w-3.5" />
          </button>
        </form>
      </div>
    </div>
  );
}
