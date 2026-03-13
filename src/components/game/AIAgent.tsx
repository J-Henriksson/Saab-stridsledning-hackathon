import { useState, useRef, useEffect } from "react";
import { Bot, Send, Loader2 } from "lucide-react";
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

    // Simple local AI logic (can be replaced with real AI backend)
    if (userMessage.toLowerCase().includes("läge") || userMessage.toLowerCase().includes("status") || userMessage.toLowerCase().includes("rapport")) {
      return `## Aktuellt resursläge\n\n\`\`\`\n${summary}\n\`\`\`\n\nVill du att jag analyserar något specifikt?`;
    }

    if (userMessage.toLowerCase().includes("priorit") || userMessage.toLowerCase().includes("underhåll")) {
      return `## Underhållsprioritering\n\nBaserat på aktuellt läge rekommenderar jag:\n\n1. **Fokusera på NMC-flygplan med kortast reparationstid** - Quick LRU-byten först för snabbast turnaround\n2. **Säkerställ att underhållsplatser inte står tomma** - Alla bays bör ha pågående jobb\n3. **Reservdelsläge** - Kontrollera att det finns LRU:er i lager innan underhåll påbörjas\n\n> ⚠️ Vid resursbrist: Överväg kannibalering ("plundring") som sista utväg, men det skapar kaskadeffekter.`;
    }

    if (userMessage.toLowerCase().includes("bränsle") || userMessage.toLowerCase().includes("fuel")) {
      return `## Bränsleanalys\n\nNuvarande förbrukningstakt:\n- **FRED**: ~0.5%/h\n- **KRIS**: ~1.5%/h  \n- **KRIG**: ~3%/h\n\n**Rekommendation**: Begär påfyllning av baser under 50%. Under KRIG-fas förbrukas bränsle 6x snabbare.`;
    }

    if (userMessage.toLowerCase().includes("ombasering") || userMessage.toLowerCase().includes("flytta")) {
      return `## Ombaseringsanalys\n\nVid ombasering beakta:\n\n1. **Konfiguration** - Spaningskapslar tar lång tid att montera av/på\n2. **Mottagande bas resurser** - Finns personal, bränsle, ammunition?\n3. **Strategiskt läge** - Spridning ökar överlevnad men försvårar logistik\n\nVilka flygplan och vilken bas tänker du på?`;
    }

    return `Jag analyserar ditt meddelande mot aktuellt resursläge.\n\n**Sammanfattning av läget:**\n- Scenariofas och tidsläge påverkar resursbehov\n- Balansera mellan operativ tillgänglighet och underhållsplanering\n- Övervaka konsumtionsvaror (bränsle, ammunition) kontinuerligt\n\nKan du vara mer specifik? T.ex.:\n- "Vilka flygplan bör prioriteras för underhåll?"\n- "Hur länge räcker bränslet?"\n- "Bör vi ombasera?"`;
  };

  const handleSend = async () => {
    if (!input.trim() || isThinking) return;
    const userMsg = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMsg }]);
    setIsThinking(true);

    // Simulate thinking delay
    await new Promise((r) => setTimeout(r, 800 + Math.random() * 1200));
    const response = await processMessage(userMsg);
    setMessages((prev) => [...prev, { role: "assistant", content: response }]);
    setIsThinking(false);
  };

  return (
    <div className="bg-card border border-primary/30 rounded-lg overflow-hidden flex flex-col h-full">
      <div className="px-4 py-2 border-b border-border flex items-center gap-2 bg-primary/5">
        <Bot className="h-4 w-4 text-primary" />
        <h3 className="font-sans font-bold text-sm text-foreground">AI RÅDGIVARE</h3>
        <span className="text-[10px] text-primary ml-auto font-mono">ONLINE</span>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
        <AnimatePresence>
          {messages.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className={`text-xs ${msg.role === "user" ? "ml-8" : "mr-4"}`}
            >
              <div
                className={`rounded-lg p-3 ${
                  msg.role === "user"
                    ? "bg-primary/10 border border-primary/20 text-foreground"
                    : "bg-muted border border-border text-foreground"
                }`}
              >
                <div className="whitespace-pre-wrap break-words prose-sm">{msg.content}</div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        {isThinking && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" />
            Analyserar...
          </motion.div>
        )}
      </div>

      <div className="p-3 border-t border-border">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex gap-2"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Fråga om resurser, prioriteringar..."
            className="flex-1 bg-muted border border-border rounded px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
          />
          <button
            type="submit"
            disabled={isThinking || !input.trim()}
            className="p-1.5 bg-primary text-primary-foreground rounded hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            <Send className="h-3.5 w-3.5" />
          </button>
        </form>
      </div>
    </div>
  );
}
