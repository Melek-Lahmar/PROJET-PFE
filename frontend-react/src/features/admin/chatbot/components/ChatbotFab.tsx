import { useEffect, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { sandboxAsk, type SandboxResponse } from "../api/chatbotApi";
import { useAuthStore } from "../../../auth/store/authStore";

type Msg = { role: "user" | "bot"; content: string; meta?: SandboxResponse };

const ACTION_BADGE: Record<string, string> = {
  query:    "bg-info/10 text-info",
  analyze:  "bg-purple/10 text-purple",
  predict:  "bg-indigo/10 text-indigo",
  kb:       "bg-info/10 text-info",
  chitchat: "bg-warning/10 text-warning",
  action:   "bg-success/10 text-success",
  error:    "bg-danger/10 text-danger",
};

/**
 * Widget chatbot flottant pour les admins (bas-droite, rôle ADMIN uniquement).
 * Consomme /api/admin/chatbot/sandbox — sans persistance.
 */
export function ChatbotFab() {
  const isAdmin = useAuthStore((s) => Array.isArray(s.roles) && s.roles.includes("ADMIN"));
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Msg[]>([]);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const ask = useMutation({
    mutationFn: (message: string) => sandboxAsk(message, "fr"),
    onSuccess: (resp, message) => {
      setMessages((m) => [
        ...m,
        { role: "user", content: message },
        { role: "bot", content: resp.message ?? "(réponse vide)", meta: resp },
      ]);
      setInput("");
    },
    onError: (e: any) => {
      setMessages((m) => [
        ...m,
        { role: "bot", content: `Erreur : ${e?.message ?? "appel échoué"}` },
      ]);
    },
  });

  useEffect(() => {
    if (open && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [open, messages.length]);

  if (!isAdmin) return null;

  const handleSend = () => {
    const v = input.trim();
    if (!v) return;
    ask.mutate(v);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Fermer le chatbot" : "Ouvrir le chatbot admin"}
        className={[
          "fixed bottom-5 right-5 z-[60] inline-flex h-14 w-14 items-center justify-center rounded-full",
          "bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-2xl shadow-violet-500/40",
          "transition hover:-translate-y-0.5 hover:shadow-violet-500/60 active:scale-95",
        ].join(" ")}
      >
        {open ? (
          <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 6 6 18 M6 6l12 12" />
          </svg>
        ) : (
          <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="4" y="8" width="16" height="12" rx="3" />
            <circle cx="9" cy="14" r="1" fill="currentColor" />
            <circle cx="15" cy="14" r="1" fill="currentColor" />
            <path d="M12 8V4" />
            <circle cx="12" cy="3" r="1" fill="currentColor" />
            <path d="M9 17.5c1 .8 5 .8 6 0" />
          </svg>
        )}
      </button>

      {open && (
        <div className="fixed bottom-24 right-5 z-[60] flex h-[520px] w-[360px] max-w-[calc(100vw-1.5rem)] flex-col overflow-hidden rounded-3xl border border-border bg-card shadow-2xl">
          <header className="flex items-center justify-between border-b border-border bg-gradient-to-br from-violet-600 to-indigo-600 px-4 py-3 text-white">
            <div>
              <strong className="text-sm">Chatbot admin</strong>
              <div className="text-[11px] opacity-80">Sandbox — sans persistance</div>
            </div>
            <a
              href="/admin/chatbot"
              className="rounded-full bg-white/20 px-2.5 py-1 text-[11px] font-bold hover:bg-white/30"
              title="Ouvrir la console complète"
            >
              Console →
            </a>
          </header>

          <div ref={scrollRef} className="flex-1 space-y-2 overflow-y-auto px-3 py-3 text-sm">
            {messages.length === 0 && (
              <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border p-4 text-center">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-muted/40 text-muted-foreground">
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                    <circle cx="9" cy="11" r="0.5" fill="currentColor" />
                    <circle cx="12" cy="11" r="0.5" fill="currentColor" />
                    <circle cx="15" cy="11" r="0.5" fill="currentColor" />
                  </svg>
                </span>
                <p className="text-xs text-muted-foreground">Posez une question ("combien de commandes hier ?", "top 3 produits", ...).</p>
              </div>
            )}
            {messages.map((m, i) => (
              <div
                key={i}
                className={[
                  "max-w-[85%] rounded-2xl px-3 py-2",
                  m.role === "user"
                    ? "ml-auto bg-primary text-primary-foreground"
                    : "bg-muted text-card-foreground",
                ].join(" ")}
              >
                {m.role === "bot" && m.meta?.action && (
                  <span className={`mb-1 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${ACTION_BADGE[m.meta.action] ?? "bg-muted/50 text-muted-foreground"}`}>
                    {m.meta.action}
                  </span>
                )}
                <div className="whitespace-pre-wrap break-words">{m.content}</div>
              </div>
            ))}
            {ask.isPending && (
              <div className="rounded-2xl border border-border bg-card px-3 py-2.5">
                <span className="inline-flex gap-1">
                  <span className="h-2 w-2 animate-bounce rounded-full bg-purple/60 [animation-delay:0ms]" />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-purple/60 [animation-delay:150ms]" />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-purple/60 [animation-delay:300ms]" />
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 border-t border-border bg-card px-3 py-2.5">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), handleSend())}
              placeholder="Posez votre question..."
              className="h-10 flex-1 rounded-2xl border border-border bg-card px-3 text-sm outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/20"
            />
            <button
              type="button"
              disabled={ask.isPending || !input.trim()}
              onClick={handleSend}
              className="inline-flex h-10 items-center justify-center rounded-2xl bg-primary px-4 text-sm font-bold text-primary-foreground transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {ask.isPending ? "..." : "Envoyer"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
