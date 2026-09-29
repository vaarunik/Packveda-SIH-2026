"use client";

// PACKVEDA AI Assistant — floating, context-aware chat widget.
// Real assistant: talks to /api/chat (backend LLM) with the user's current
// PackVeda context. It explains results and terminology; it does NOT invent
// scientific values — the system prompt enforces honest "data unavailable"
// answers, and the UI reminds users of this policy.

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Send, Sparkles, X, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { usePackVeda } from "@/lib/store";
import { INTENSITY_LABEL } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { apiFetch } from "@/lib/api";
import { getMaterial } from "@/lib/data/materials";
import { cn } from "@/lib/utils";

interface ChatMsg {
  role: "user" | "assistant";
  content: string;
}

const GREETING: ChatMsg = {
  role: "assistant",
  content:
    "Hello! I'm the PackVeda AI Assistant. I can explain packaging materials, OTR, WVTR, CO₂ transmission, moisture and oxygen barriers, shelf-life concepts, storage conditions — and help you interpret your analysis results.\n\nAsk me things like \"Why was this material recommended?\" or \"Explain OTR in simple language.\"",
};

const GENERAL_SUGGESTIONS = [
  "Explain OTR in simple language",
  "What is the difference between OTR and WVTR?",
  "Why is moisture barrier important for spices?",
  "What does water activity mean?",
];

function buildContext() {
  const { view, result, compareIds, wizardInput } = usePackVeda.getState();
  const commodity = wizardInput.commodityName || undefined;

  let requirementSummary: string | undefined;
  let topCandidates: string | undefined;
  if (result) {
    requirementSummary = result.requirements
      .map((r) => `• ${r.label}: ${r.level.replace("_", " ")} — ${r.rationale}`)
      .join("\n")
      .slice(0, 1800);
    topCandidates = result.candidates
      .filter((c) => c.status !== "excluded")
      .slice(0, 5)
      .map(
        (c) =>
          `${c.materialName} | score ${c.score} | ${c.status}\n  matches: ${c.matches
            .slice(0, 3)
            .join("; ")}\n  limitations: ${c.gaps.slice(0, 2).join("; ") || "none noted"}`
      )
      .join("\n")
      .slice(0, 2800);
  }

  const selectedId = compareIds[compareIds.length - 1];
  const m = selectedId ? getMaterial(selectedId) : null;
  const selectedMaterial = m
    ? [
        `Name: ${m.name}`,
        `Family/structure: ${m.family} — ${m.structure}`,
        m.otr !== null ? `OTR ≈ ${m.otr} cc/m²/day (indicative)` : "OTR: data not available",
        m.wvtr !== null ? `WVTR ≈ ${m.wvtr} g/m²/day (indicative)` : "WVTR: data not available",
        `Service range: ${m.tempMinC ?? "?"} to ${m.tempMaxC ?? "?"} °C (indicative)`,
        `Typical applications: ${m.typicalApplications.slice(0, 4).join(", ")}`,
        `Limitations: ${m.limitations.slice(0, 3).join("; ")}`,
      ].join("\n")
    : undefined;

  return { view, commodity, requirementSummary, topCandidates, selectedMaterial };
}

export function ChatWidget() {
  const { chatOpen, setChatOpen, view, result, wizardInput, openAuthDialog } = usePackVeda();
  const { status } = useAuth();
  const authed = status === "authenticated";
  const { toast } = useToast();
  const [messages, setMessages] = useState<ChatMsg[]>([GREETING]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [nudge, setNudge] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Context-aware suggestions change with the current screen / result.
  const suggestions = useMemo(() => {
    const base: string[] = [];
    if (result) {
      base.push("Why was this material recommended?");
      base.push("What are the limitations of the top recommendation?");
    }
    if (view === "compare" || view === "matching") {
      base.push("Why might one material only be a partial match?");
    }
    if (view === "marketplace") {
      base.push("What should I check before requesting a sample?");
    }
    base.push("Explain OTR in simple language");
    return base.slice(0, 4);
  }, [view, result]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, chatOpen, sending]);

  useEffect(() => {
    const t = setTimeout(() => setNudge(false), 12000);
    return () => clearTimeout(t);
  }, []);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    const next: ChatMsg[] = [...messages, { role: "user", content: trimmed }];
    setMessages(next);
    setInput("");
    setSending(true);
    try {
      const res = await apiFetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: next
            .filter((m) => m !== GREETING)
            .slice(-10)
            .map((m) => ({ role: m.role, content: m.content })),
          context: buildContext(),
        }),
      });
      const data = (await res.json()) as { reply?: string; error?: string };
      if (!res.ok || !data.reply) {
        throw new Error(data.error || "Assistant unavailable");
      }
      setMessages((prev) => [...prev, { role: "assistant", content: data.reply! }]);
    } catch (err) {
      toast({
        title: "Assistant unavailable",
        description: err instanceof Error ? err.message : "Please try again shortly.",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  }

  const hasResult = Boolean(result);

  // Authenticated AI functionality — logged-out visitors get the auth gate
  // instead of the chat panel.
  function toggleChat() {
    if (!authed) {
      openAuthDialog({
        mode: "signin",
        title: "Sign in to use Ask PackVeda",
        subtitle:
          "PackVeda's AI assistant can help you understand packaging requirements, materials and recommendations once you're signed in.",
      });
      return;
    }
    setChatOpen(!chatOpen);
  }

  return (
    <>
      {/* Floating trigger — bottom right, always accessible */}
      <div className="fixed bottom-5 right-5 z-[70] flex flex-col items-end gap-2">
        <AnimatePresence>
          {!chatOpen && nudge && authed && (
            <motion.span
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6 }}
              className="rounded-full border border-forest-600/25 bg-white px-3.5 py-1.5 text-xs font-medium text-forest-800 shadow-md"
            >
              Questions about your results? Ask PackVeda
            </motion.span>
          )}
        </AnimatePresence>
        <motion.button
          onClick={toggleChat}
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.97 }}
          aria-label={
            authed
              ? chatOpen
                ? "Close PackVeda AI Assistant"
                : "Open PackVeda AI Assistant"
              : "Sign in to use Ask PackVeda"
          }
          aria-expanded={authed ? chatOpen : undefined}
          className={cn(
            "flex items-center gap-2 rounded-full px-4 py-3 text-sm font-semibold text-white shadow-lg transition-colors focus-visible:outline-2 focus-visible:outline-ring",
            chatOpen
              ? "bg-navy-800 hover:bg-navy-700"
              : "bg-forest-700 hover:bg-forest-600"
          )}
        >
          {chatOpen ? (
            <X className="size-5" aria-hidden />
          ) : (
            <Sparkles className="size-5" aria-hidden />
          )}
          <span className="hidden sm:inline">Ask PackVeda</span>
        </motion.button>
      </div>

      {/* Assistant panel */}
      <AnimatePresence>
        {chatOpen && (
          <motion.section
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.97 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            aria-label="PackVeda AI Assistant"
            className="fixed bottom-[4.75rem] right-4 z-[70] flex h-[min(600px,calc(100dvh-7.5rem))] w-[min(400px,calc(100vw-2rem))] flex-col overflow-hidden rounded-xl border border-navy-800/15 bg-white shadow-2xl"
          >
            {/* Header */}
            <header className="flex items-center justify-between gap-2 bg-navy-950 px-4 py-3">
              <div className="flex items-center gap-2.5">
                <span className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white shadow-sm">
                  <Image
                    src="/packveda-icon.png"
                    alt=""
                    width={32}
                    height={32}
                    className="size-full object-contain"
                  />
                </span>
                <div className="leading-tight">
                  <p className="text-[13px] font-bold tracking-wide text-cream-50">
                    PACKVEDA AI ASSISTANT
                  </p>
                  <p className="text-[10.5px] text-cream-100/60">
                    Explains results · uses your current analysis
                  </p>
                </div>
              </div>
              <button
                onClick={() => setMessages([GREETING])}
                aria-label="Reset conversation"
                title="Reset conversation"
                className="rounded-md p-1.5 text-cream-100/60 transition-colors hover:bg-white/10 hover:text-cream-50"
              >
                <RotateCcw className="size-4" aria-hidden />
              </button>
            </header>

            {/* Messages */}
            <div
              ref={scrollRef}
              className="scroll-slim flex-1 space-y-3 overflow-y-auto bg-cream-50 px-4 py-4"
              role="log"
              aria-live="polite"
            >
              {messages.map((m, i) => (
                <div
                  key={i}
                  className={cn(
                    "max-w-[92%] rounded-xl px-3.5 py-2.5 text-[13px] leading-relaxed whitespace-pre-wrap",
                    m.role === "user"
                      ? "ml-auto bg-forest-700 text-white"
                      : "border border-navy-800/10 bg-white text-navy-900"
                  )}
                >
                  {m.content}
                </div>
              ))}
              {sending && (
                <div className="flex items-center gap-2 rounded-xl border border-navy-800/10 bg-white px-3.5 py-2.5 text-[13px] text-navy-600">
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                  Analysing your question…
                </div>
              )}
            </div>

            {/* Suggestions */}
            {messages.length <= 2 && !sending && (
              <div className="flex flex-wrap gap-1.5 border-t border-navy-800/10 bg-white px-3 pt-2.5">
                {suggestions.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="rounded-full border border-forest-600/25 bg-forest-50 px-2.5 py-1 text-[11.5px] font-medium text-forest-800 transition-colors hover:bg-forest-100"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}

            {/* Input */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                send(input);
              }}
              className="border-t border-navy-800/10 bg-white p-3"
            >
              <div className="flex items-end gap-2">
                <Textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      send(input);
                    }
                  }}
                  placeholder={
                    hasResult
                      ? "Ask about this recommendation…"
                      : "Ask about packaging, OTR, WVTR, shelf life…"
                  }
                  aria-label="Message to PackVeda AI Assistant"
                  rows={1}
                  className="min-h-[42px] resize-none text-[13px]"
                />
                <Button
                  type="submit"
                  size="icon"
                  disabled={sending || !input.trim()}
                  aria-label="Send message"
                  className="h-[42px] w-[42px] shrink-0 bg-forest-700 hover:bg-forest-600"
                >
                  {sending ? (
                    <Loader2 className="size-4 animate-spin" aria-hidden />
                  ) : (
                    <Send className="size-4" aria-hidden />
                  )}
                </Button>
              </div>
              <p className="mt-2 text-[10px] leading-snug text-navy-600/80">
                The assistant explains PackVeda data and packaging science. It does not
                invent values — where verified data is unavailable it will say so.
                {!hasResult && wizardInput.commodityName
                  ? ` Current commodity: ${wizardInput.commodityName}.`
                  : ""}
                {hasResult && wizardInput.commodityName
                  ? ` Context: ${wizardInput.commodityName} analysis.`
                  : ""}
              </p>
            </form>
          </motion.section>
        )}
      </AnimatePresence>
    </>
  );
}

export default ChatWidget;
