import { useEffect, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { sandboxAsk, type SandboxResponse } from "../api/chatbotApi";
import { useToast } from "../../../../shared/components/premium/Toast";

type Msg = { role: "user" | "bot"; content: string; meta?: SandboxResponse; ts: number };

const SUGGESTIONS = [
  "Combien de commandes aujourd'hui ?",
  "Top 5 produits du mois",
  "Liste des réclamations ouvertes",
  "Stat livraisons par gouvernorat",
  "Prédire le volume de commandes demain",
];

const ACTION_BADGE: Record<string, string> = {
  query:    "bg-info/10 text-info ring-1 ring-info/20",
  analyze:  "bg-purple/10 text-purple ring-1 ring-purple/20",
  predict:  "bg-indigo/10 text-indigo ring-1 ring-indigo/20",
  kb:       "bg-info/10 text-info ring-1 ring-info/20",
  chitchat: "bg-warning/10 text-warning ring-1 ring-warning/20",
  action:   "bg-success/10 text-success ring-1 ring-success/20",
  error:    "bg-danger/10 text-danger ring-1 ring-danger/20",
};

export function ChatbotSandboxPage() {
  const toast = useToast();
  const [language, setLanguage] = useState<"fr" | "en" | "ar">("fr");
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Msg[]>([]);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const ask = useMutation({
    mutationFn: ({ message, language }: { message: string; language: "fr" | "en" | "ar" }) =>
      sandboxAsk(message, language),
    onSuccess: (resp, vars) => {
      setMessages((m) => [
        ...m,
        { role: "user", content: vars.message, ts: Date.now() },
        { role: "bot", content: resp.message ?? "(sans réponse)", meta: resp, ts: Date.now() },
      ]);
      setInput("");
    },
    onError: (e: any) => {
      toast.error("Échec", e?.message ?? "appel chatbot échoué");
    },
  });

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length]);

  const handleSend = (text?: string) => {
    const v = (text ?? input).trim();
    if (!v) return;
    ask.mutate({ message: v, language });
  };

  const lastBot = [...messages].reverse().find((m) => m.role === "bot" && m.meta);

  return (
    <div className="container-app space-y-5 py-6">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-purple/10 via-card to-card p-6 shadow-sm">
        <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-purple/15 blur-3xl" />
        <div className="relative flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="text-xs font-bold uppercase tracking-[0.2em] text-purple">Chatbot admin</div>
            <h1 className="mt-1 text-3xl font-black tracking-tight">Sandbox</h1>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              Posez une question. Aucune persistance — utilisez ce mode pour tester. Le panneau de droite explique l'action retenue (intent, action, données brutes).
            </p>
          </div>
          <select
            className="h-11 rounded-2xl border border-border bg-card px-3 text-sm font-bold shadow-sm"
            value={language}
            onChange={(e) => setLanguage(e.target.value as "fr" | "en" | "ar")}
          >
            <option value="fr">🇫🇷 Français</option>
            <option value="en">🇬🇧 English</option>
            <option value="ar">🇹🇳 العربية</option>
          </select>
        </div>
      </section>

      {/* Suggestions de prompts */}
      {messages.length === 0 && (
        <section className="rounded-2xl border border-dashed border-border bg-card/60 p-4">
          <div className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">Suggestions</div>
          <div className="flex flex-wrap gap-2">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => handleSend(s)}
                className="rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold transition hover:border-purple/30 hover:bg-purple/5"
              >
                {s}
              </button>
            ))}
          </div>
        </section>
      )}

      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        {/* Conversation */}
        <section className="flex h-[68vh] flex-col rounded-3xl border border-border bg-card shadow-sm">
          <header className="flex items-center justify-between border-b border-border px-5 py-3">
            <strong className="text-sm">Conversation</strong>
            <button
              type="button"
              onClick={() => setMessages([])}
              disabled={messages.length === 0}
              className="text-xs font-semibold text-danger hover:underline disabled:opacity-40"
            >
              Effacer
            </button>
          </header>
          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-5">
            {messages.map((m, i) => (
              <div
                key={i}
                className={[
                  "flex gap-2",
                  m.role === "user" ? "justify-end" : "justify-start",
                ].join(" ")}
              >
                {m.role === "bot" && (
                  <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-indigo-500 text-white shadow">
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
                      <rect x="4" y="8" width="16" height="12" rx="3" />
                      <circle cx="9" cy="14" r="1" fill="currentColor" />
                      <circle cx="15" cy="14" r="1" fill="currentColor" />
                    </svg>
                  </span>
                )}
                <div
                  className={[
                    "max-w-[75%] rounded-3xl px-4 py-2.5 shadow-sm",
                    m.role === "user"
                      ? "rounded-br-md bg-primary text-primary-foreground"
                      : "rounded-bl-md border border-border bg-card text-card-foreground",
                  ].join(" ")}
                >
                  {m.role === "bot" && m.meta?.action && (
                    <div className={`mb-1.5 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ring-1 ${ACTION_BADGE[m.meta.action] ?? "bg-muted/50 text-muted-foreground ring-border"}`}>
                      {m.meta.action}
                    </div>
                  )}
                  <div className="whitespace-pre-wrap break-words text-sm">{m.content}</div>
                  <div className="mt-1 text-[10px] opacity-60">{new Date(m.ts).toLocaleTimeString("fr-FR")}</div>
                </div>
              </div>
            ))}
            {ask.isPending && (
              <div className="flex items-center gap-2">
                <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-indigo-500 text-white shadow">
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
                    <rect x="4" y="8" width="16" height="12" rx="3" />
                  </svg>
                </span>
                <div className="rounded-3xl border border-border bg-card px-4 py-2 text-sm">
                  <span className="inline-flex gap-1">
                    <span className="h-2 w-2 animate-bounce rounded-full bg-purple/60 [animation-delay:0ms]" />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-purple/60 [animation-delay:150ms]" />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-purple/60 [animation-delay:300ms]" />
                  </span>
                </div>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 border-t border-border p-3">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), handleSend())}
              placeholder="Posez votre question..."
              className="h-11 flex-1 rounded-2xl border border-border bg-card px-4 text-sm outline-none focus:border-purple/40 focus:ring-2 focus:ring-purple/10"
            />
            <button
              type="button"
              onClick={() => handleSend()}
              disabled={ask.isPending || !input.trim()}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-purple px-4 text-sm font-bold text-white shadow-md transition hover:-translate-y-0.5 hover:bg-purple/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {ask.isPending ? "..." : "Envoyer"} →
            </button>
          </div>
        </section>

        {/* Debug panel */}
        <aside className="flex h-[68vh] flex-col rounded-3xl border border-border bg-card shadow-sm">
          <header className="border-b border-border px-5 py-3">
            <strong className="text-sm">Debug — dernière réponse</strong>
          </header>
          <div className="flex-1 overflow-y-auto p-5 text-sm">
            {!lastBot?.meta ? (
              <div className="text-muted-foreground">Aucun appel encore. Posez une question pour voir le détail.</div>
            ) : (
              <div className="space-y-3">
                <div className="rounded-xl border border-border bg-muted/30 p-3">
                  <div className="text-[11px] font-bold uppercase text-muted-foreground">Action</div>
                  <div className="mt-1 font-bold">{lastBot.meta.action}</div>
                </div>
                <div className="rounded-xl border border-border bg-muted/30 p-3">
                  <div className="text-[11px] font-bold uppercase text-muted-foreground">Statut</div>
                  <div className="mt-1 font-bold">
                    {lastBot.meta.success ? (
                      <span className="text-success">✓ succès</span>
                    ) : (
                      <span className="text-danger">✗ échec</span>
                    )}
                  </div>
                </div>
                {lastBot.meta.intent && (
                  <div className="rounded-xl border border-border bg-muted/30 p-3">
                    <div className="text-[11px] font-bold uppercase text-muted-foreground">Intent</div>
                    <div className="mt-1 font-bold">{lastBot.meta.intent}</div>
                  </div>
                )}
                {typeof lastBot.meta.confidence === "number" && (
                  <div className="rounded-xl border border-border bg-muted/30 p-3">
                    <div className="text-[11px] font-bold uppercase text-muted-foreground">Confidence</div>
                    <div className="mt-1 font-bold">{lastBot.meta.confidence.toFixed(3)}</div>
                  </div>
                )}
                {lastBot.meta.data ? (
                  <div className="rounded-xl border border-border bg-muted/30 p-3">
                    <div className="mb-1 text-[11px] font-bold uppercase text-muted-foreground">Données brutes</div>
                    <pre className="overflow-x-auto rounded-lg bg-slate-900 p-2 text-[10px] text-slate-100">
                      {JSON.stringify(lastBot.meta.data, null, 2)}
                    </pre>
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
