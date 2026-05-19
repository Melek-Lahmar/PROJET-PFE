import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getSessionMessages, listSessions } from "../api/chatbotApi";

function fmt(d: string) {
  try { return new Date(d).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }); } catch { return d; }
}

function timeAgo(d: string) {
  const ms = Date.now() - new Date(d).getTime();
  const min = Math.floor(ms / 60000);
  if (min < 1) return "à l'instant";
  if (min < 60) return `il y a ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `il y a ${h} h`;
  const j = Math.floor(h / 24);
  return `il y a ${j} j`;
}

const LANG_BADGE: Record<string, string> = {
  fr: "🇫🇷",
  en: "🇬🇧",
  ar: "🇹🇳",
};

export function ChatbotConversationsPage() {
  const [filter, setFilter] = useState("");
  const sessionsQuery = useQuery({ queryKey: ["chatbot-sessions"], queryFn: () => listSessions(80), refetchInterval: 30_000 });
  const [selected, setSelected] = useState<string | null>(null);
  const messagesQuery = useQuery({
    queryKey: ["chatbot-session-msgs", selected],
    queryFn: () => getSessionMessages(selected!),
    enabled: !!selected,
  });

  const filteredSessions = useMemo(() => {
    const all = sessionsQuery.data ?? [];
    if (!filter.trim()) return all;
    const f = filter.toLowerCase();
    return all.filter((s) => s.id.toLowerCase().includes(f) || s.userId?.toLowerCase().includes(f));
  }, [sessionsQuery.data, filter]);

  const selectedSession = filteredSessions.find((s) => s.id === selected);

  return (
    <div className="container-app space-y-5 py-6">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-blue-500/10 via-card to-card p-6 shadow-sm">
        <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-blue-500/15 blur-3xl" />
        <div className="relative">
          <div className="text-xs font-bold uppercase tracking-[0.2em] text-blue-600">Chatbot admin</div>
          <h1 className="mt-1 text-3xl font-black tracking-tight">Conversations</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Sessions et messages échangés avec le chatbot. Lecture seule. Refresh chaque 30 s.
          </p>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        {/* Liste sessions */}
        <aside className="flex h-[70vh] flex-col rounded-3xl border border-border bg-card shadow-sm">
          <div className="border-b border-border p-3">
            <input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="🔍 Filtrer par ID..."
              className="h-10 w-full rounded-2xl border border-border bg-card px-3 text-sm outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
            />
            <div className="mt-2 text-[11px] text-muted-foreground">
              {filteredSessions.length} / {sessionsQuery.data?.length ?? 0} sessions
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {sessionsQuery.isPending ? (
              <div className="space-y-2 p-2">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-14 animate-pulse rounded-xl bg-muted/40" />
                ))}
              </div>
            ) : filteredSessions.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">Aucune session.</div>
            ) : (
              <ul className="space-y-1">
                {filteredSessions.map((s) => {
                  const isSelected = selected === s.id;
                  return (
                    <li key={s.id}>
                      <button
                        type="button"
                        onClick={() => setSelected(s.id)}
                        className={[
                          "w-full rounded-xl border px-3 py-2.5 text-left transition",
                          isSelected
                            ? "border-blue-300 bg-blue-50 shadow-sm"
                            : "border-transparent hover:border-border hover:bg-muted/40",
                        ].join(" ")}
                      >
                        <div className="flex items-center justify-between">
                          <strong className="truncate text-xs">{s.id.slice(0, 8)}</strong>
                          <span className="text-[10px] text-muted-foreground">{LANG_BADGE[s.language] ?? s.language}</span>
                        </div>
                        <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground">
                          <span>{timeAgo(s.lastActivityAt)}</span>
                          <span className="rounded-full bg-blue-100 px-2 text-[10px] font-bold text-blue-700">{s.messageCount} msg</span>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </aside>

        {/* Thread */}
        <main className="flex h-[70vh] flex-col rounded-3xl border border-border bg-card shadow-sm">
          <header className="border-b border-border px-5 py-3">
            {selectedSession ? (
              <div className="flex items-center justify-between">
                <div>
                  <strong className="text-sm">Session {selectedSession.id.slice(0, 12)}</strong>
                  <div className="text-[11px] text-muted-foreground">
                    Démarrée {fmt(selectedSession.startedAt)} · {selectedSession.messageCount} messages
                  </div>
                </div>
                <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
                  {LANG_BADGE[selectedSession.language] ?? selectedSession.language} {selectedSession.language?.toUpperCase()}
                </span>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">← Sélectionnez une session pour voir les messages.</div>
            )}
          </header>
          <div className="flex-1 space-y-3 overflow-y-auto p-5">
            {selected && messagesQuery.isPending && (
              <div className="text-sm text-muted-foreground">Chargement des messages...</div>
            )}
            {(messagesQuery.data ?? []).map((m) => (
              <div
                key={m.id}
                className={[
                  "flex gap-2",
                  m.role === "user" ? "justify-end" : "justify-start",
                ].join(" ")}
              >
                {m.role !== "user" && (
                  <span className={[
                    "mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white shadow",
                    m.role === "system" ? "bg-slate-500" : "bg-gradient-to-br from-violet-500 to-indigo-500",
                  ].join(" ")}>
                    {m.role === "system" ? "S" : "B"}
                  </span>
                )}
                <div
                  className={[
                    "max-w-[75%] rounded-3xl px-4 py-2.5 shadow-sm",
                    m.role === "user"
                      ? "rounded-br-md bg-primary text-primary-foreground"
                      : m.role === "system"
                        ? "border border-dashed border-border bg-card italic text-muted-foreground"
                        : "rounded-bl-md border border-border bg-card text-card-foreground",
                  ].join(" ")}
                >
                  <div className="mb-1 flex items-center gap-2 text-[10px] font-bold uppercase opacity-70">
                    <span>{m.role}</span>
                    {m.action && <span className="rounded-full bg-white/30 px-1.5 py-0.5">· {m.action}</span>}
                    {m.feedback && <span>· {m.feedback === "up" ? "👍" : "👎"}</span>}
                  </div>
                  <div className="whitespace-pre-wrap break-words text-sm">{m.content}</div>
                  <div className="mt-1 text-[10px] opacity-60">{fmt(m.createdAt)}</div>
                </div>
              </div>
            ))}
            {selected && messagesQuery.data && messagesQuery.data.length === 0 && (
              <div className="rounded-2xl border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
                Cette session ne contient pas de messages.
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
