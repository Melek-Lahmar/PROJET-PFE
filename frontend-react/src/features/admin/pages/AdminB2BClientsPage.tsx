import { useMemo, useState, type ReactNode, type SVGProps } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  listB2BClients,
  listClientDiscountHistory,
  setClientDiscount,
  type B2BClient,
} from "../api/b2bApi";
import { Button } from "../../../shared/components/Button";
import { Input } from "../../../shared/components/Input";
import { Modal } from "../../../shared/components/Modal";
import { useToast } from "../../../shared/components/premium/Toast";
import { EmptyView } from "../../../shared/components/premium";
import { getApiErrorMessage } from "../../../core/http/getApiErrorMessage";

const avatarPalettes = [
  "bg-[#2563eb] text-white",
  "bg-[#16a34a] text-white",
  "bg-[#7c3aed] text-white",
  "bg-[#f97316] text-white",
  "bg-[#dc2626] text-white",
  "bg-[#0891b2] text-white",
  "bg-[#0ea5e9] text-white",
  "bg-[#22c55e] text-white",
  "bg-[#8b5cf6] text-white",
  "bg-[#fb923c] text-white",
];

const pageSizeOptions = [10, 25, 50];

function money(v: number) {
  return `${Number(v ?? 0).toFixed(3)} TND`;
}

function formatPct(v: number | null | undefined) {
  if (v === null || v === undefined) return "-";
  return `${Number(v).toFixed(2)} %`;
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "-" : d.toLocaleDateString("fr-FR");
}

function displayName(client: B2BClient) {
  return client.nomSociete || client.nomComplet || client.telephone || "-";
}

function normalize(value: string | null | undefined) {
  return String(value ?? "")
    .toLocaleLowerCase("fr-FR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function getInitial(client: B2BClient) {
  const value = displayName(client).trim();
  return value && value !== "-" ? value.charAt(0).toLocaleUpperCase("fr-FR") : "?";
}

function SvgIcon({ children, className = "", ...props }: SVGProps<SVGSVGElement> & { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.9}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}

function BuildingIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <SvgIcon {...props}>
      <path d="M3 21h18" />
      <path d="M5 21V7l7-4 7 4v14" />
      <path d="M9 9h1M14 9h1M9 13h1M14 13h1M9 17h1M14 17h1" />
    </SvgIcon>
  );
}

function UsersIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <SvgIcon {...props}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" />
      <circle cx="9.5" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </SvgIcon>
  );
}

function ChartIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <SvgIcon {...props}>
      <path d="M3 3v18h18" />
      <path d="M7 16V9M12 16V6M17 16v-4" />
    </SvgIcon>
  );
}

function PercentIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <SvgIcon {...props}>
      <line x1="19" x2="5" y1="5" y2="19" />
      <circle cx="7" cy="7" r="2" />
      <circle cx="17" cy="17" r="2" />
    </SvgIcon>
  );
}

function GiftIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <SvgIcon {...props}>
      <rect x="3" y="8" width="18" height="4" rx="1" />
      <path d="M12 8v13" />
      <path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7" />
      <path d="M7.5 8a2.5 2.5 0 1 1 4.5-1.5V8" />
      <path d="M16.5 8A2.5 2.5 0 1 0 12 6.5V8" />
    </SvgIcon>
  );
}

function StarIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <SvgIcon {...props}>
      <path d="m12 2 2.9 6 6.6.9-4.8 4.7 1.1 6.6L12 17.1l-5.8 3.1 1.1-6.6-4.8-4.7 6.6-.9L12 2z" />
    </SvgIcon>
  );
}

function SearchIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <SvgIcon {...props}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </SvgIcon>
  );
}

function FilterIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <SvgIcon {...props}>
      <path d="M4 5h16" />
      <path d="M7 12h10" />
      <path d="M10 19h4" />
    </SvgIcon>
  );
}

function EditIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <SvgIcon {...props}>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </SvgIcon>
  );
}

function SparkleIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <SvgIcon {...props}>
      <path d="M12 3l1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6L12 3z" />
      <path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15z" />
    </SvgIcon>
  );
}

function HistoryIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <SvgIcon {...props}>
      <path d="M3 12a9 9 0 1 0 3-6.7" />
      <path d="M3 4v5h5" />
      <path d="M12 7v5l3 2" />
    </SvgIcon>
  );
}

function MoreVerticalIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <SvgIcon {...props}>
      <circle cx="12" cy="5" r="1" />
      <circle cx="12" cy="12" r="1" />
      <circle cx="12" cy="19" r="1" />
    </SvgIcon>
  );
}

function ChevronLeftIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <SvgIcon {...props}>
      <path d="m15 18-6-6 6-6" />
    </SvgIcon>
  );
}

function ChevronRightIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <SvgIcon {...props}>
      <path d="m9 18 6-6-6-6" />
    </SvgIcon>
  );
}

function KpiCard({
  label,
  value,
  hint,
  icon,
  tone,
}: {
  label: string;
  value: string;
  hint: string;
  icon: ReactNode;
  tone: "blue" | "indigo" | "purple" | "green" | "orange";
}) {
  const tones = {
    blue: "bg-[#e8f1ff] text-[#2563eb]",
    indigo: "bg-[#e9efff] text-[#3152d4]",
    purple: "bg-[#f0e8ff] text-[#7c3aed]",
    green: "bg-[#dcfce7] text-[#16a34a]",
    orange: "bg-[#fff1db] text-[#f97316]",
  };

  const valueTones = {
    blue: "text-[#175cd3]",
    indigo: "text-[#175cd3]",
    purple: "text-[#6d28d9]",
    green: "text-[#15803d]",
    orange: "text-[#f97316]",
  };

  return (
    <div className="min-h-[112px] rounded-[12px] border border-[#dbe4f0] bg-white px-5 py-4 shadow-[0_16px_36px_-30px_rgba(15,23,42,0.42)] transition hover:-translate-y-0.5 hover:shadow-[0_22px_42px_-30px_rgba(15,23,42,0.48)] dark:border-border/70 dark:bg-card">
      <div className="flex items-start gap-4">
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${tones[tone]}`}>
          {icon}
        </div>
        <div className="min-w-0">
          <div className="text-[10px] font-black uppercase text-[#344767] dark:text-muted-foreground">{label}</div>
          <div className={`mt-2 break-words text-[20px] font-black leading-tight ${valueTones[tone]}`}>{value}</div>
          <div className="mt-2 text-[11px] font-semibold leading-snug text-[#53657d] dark:text-muted-foreground">{hint}</div>
        </div>
      </div>
    </div>
  );
}

function levelPillClass(label: string) {
  const normalized = normalize(label);
  if (normalized.includes("gold") || normalized.includes("or")) {
    return "border-[#fde68a] bg-[#fffbeb] text-[#b45309]";
  }
  if (normalized.includes("silver") || normalized.includes("argent")) {
    return "border-[#dbe4ef] bg-[#f8fafc] text-[#64748b]";
  }
  if (normalized.includes("bronze")) {
    return "border-[#fed7aa] bg-[#fff7ed] text-[#c2410c]";
  }
  return "border-[#bfdbfe] bg-[#eff6ff] text-[#1d4ed8]";
}

function visiblePageNumbers(currentPage: number, totalPages: number) {
  const count = Math.min(totalPages, 3);
  const start = Math.min(Math.max(1, currentPage - 1), Math.max(1, totalPages - count + 1));
  return Array.from({ length: count }, (_, index) => start + index);
}

function TableActionButton({
  children,
  icon,
  onClick,
}: {
  children: ReactNode;
  icon: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-6 items-center gap-1 rounded-md border border-[#d6e2f1] bg-[#f8fbff] px-1.5 text-[10px] font-black text-[#1d64d8] transition hover:border-[#b8cef0] hover:bg-[#eef5ff] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563eb]/20"
    >
      {icon}
      {children}
    </button>
  );
}

function PaginationButton({
  children,
  active = false,
  disabled = false,
  onClick,
  label,
}: {
  children: ReactNode;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex h-9 min-w-9 items-center justify-center rounded-md border px-3 text-xs font-black transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563eb]/20 ${
        active
          ? "border-[#165bbd] bg-[#165bbd] text-white shadow-sm"
          : "border-[#dbe4f0] bg-white text-[#344767] hover:border-[#bad0ee] hover:bg-[#f8fbff] disabled:cursor-not-allowed disabled:opacity-45 dark:bg-card dark:text-card-foreground"
      }`}
    >
      {children}
    </button>
  );
}

export function AdminB2BClientsPage() {
  const toast = useToast();
  const qc = useQueryClient();
  const { data: clients = [], isPending, isError, error } = useQuery({
    queryKey: ["admin-b2b-clients"],
    queryFn: listB2BClients,
  });

  const [editing, setEditing] = useState<B2BClient | null>(null);
  const [historyFor, setHistoryFor] = useState<B2BClient | null>(null);
  const [value, setValue] = useState<string>("");
  const [reason, setReason] = useState<string>("");
  const [query, setQuery] = useState("");
  const [levelFilter, setLevelFilter] = useState("all");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const metrics = useMemo(() => {
    const revenue = clients.reduce((sum, client) => sum + Number(client.totalRevenue ?? 0), 0);
    const withDiscount = clients.filter((c) => Number(c.discountPercent ?? c.legacyRemise ?? 0) > 0);
    const withoutDiscount = clients.length - withDiscount.length;
    const avgDiscount = withDiscount.length
      ? withDiscount.reduce((sum, c) => sum + Number(c.discountPercent ?? c.legacyRemise ?? 0), 0) / withDiscount.length
      : 0;
    const top = [...clients].sort((a, b) => Number(b.totalRevenue ?? 0) - Number(a.totalRevenue ?? 0))[0];
    return { revenue, withoutDiscount, avgDiscount, top };
  }, [clients]);

  const levelOptions = useMemo(() => {
    const labels = new Set(clients.map((client) => client.discountLevelLabel).filter(Boolean));
    return Array.from(labels).sort((a, b) => a.localeCompare(b, "fr-FR"));
  }, [clients]);

  const filteredClients = useMemo(() => {
    const needle = normalize(query);
    return clients.filter((client) => {
      const matchesQuery = !needle || [
        client.nomSociete,
        client.nomComplet,
        client.telephone,
        client.gouvernorat,
        client.discountLevelLabel,
      ].some((field) => normalize(field).includes(needle));
      const matchesLevel = levelFilter === "all" || client.discountLevelLabel === levelFilter;
      return matchesQuery && matchesLevel;
    });
  }, [clients, levelFilter, query]);

  const totalPages = Math.max(1, Math.ceil(filteredClients.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const startIndex = (currentPage - 1) * pageSize;
  const visibleClients = filteredClients.slice(startIndex, startIndex + pageSize);
  const resultFrom = filteredClients.length === 0 ? 0 : startIndex + 1;
  const resultTo = Math.min(startIndex + pageSize, filteredClients.length);

  const updateMut = useMutation({
    mutationFn: async ({ id, val, reason }: { id: string; val: number | null; reason: string }) =>
      setClientDiscount(id, val, reason),
    onSuccess: async () => {
      toast.success("Remise mise à jour");
      await qc.invalidateQueries({ queryKey: ["admin-b2b-clients"] });
      if (editing?.userId) await qc.invalidateQueries({ queryKey: ["admin-b2b-history", editing.userId] });
      setEditing(null);
    },
    onError: (err) => toast.error("Mise à jour impossible", getApiErrorMessage(err)),
  });

  const historyQuery = useQuery({
    queryKey: ["admin-b2b-history", historyFor?.userId],
    queryFn: () => listClientDiscountHistory(String(historyFor!.userId)),
    enabled: !!historyFor?.userId,
  });

  const openEdit = (client: B2BClient, suggested = false) => {
    setEditing(client);
    setValue(String(suggested ? client.suggestedDiscountPercent : (client.discountPercent ?? "")));
    setReason(suggested ? `Application remise suggérée ${client.discountLevelLabel}` : "");
  };

  const submitDiscount = () => {
    if (!editing?.userId) return;
    const val = value.trim() === "" ? null : Number(value);
    if (val !== null && (!Number.isFinite(val) || val < 0 || val > 100)) {
      toast.error("Valeur invalide", "Doit être entre 0 et 100.");
      return;
    }
    if (!reason.trim()) {
      toast.error("Motif obligatoire", "Expliquez la décision commerciale.");
      return;
    }
    updateMut.mutate({ id: String(editing.userId), val, reason: reason.trim() });
  };

  return (
    <div className="w-full pb-10">
      <section className="overflow-hidden rounded-[14px] border border-[#d7e0ec] bg-[#f8fbff] shadow-[0_22px_58px_-44px_rgba(15,23,42,0.45)] dark:border-border/70 dark:bg-background">
        <header className="px-4 pb-4 pt-3 sm:px-6 sm:pb-5 sm:pt-4">
          <nav className="flex flex-wrap items-center gap-1.5 text-[11px] font-black text-[#64748b]" aria-label="Fil d'Ariane">
            <Link to="/" className="text-[#2563eb] hover:underline">Accueil</Link>
            <ChevronRightIcon className="h-3 w-3 text-[#94a3b8]" />
            <Link to="/admin" className="text-[#2563eb] hover:underline">Administration</Link>
            <ChevronRightIcon className="h-3 w-3 text-[#94a3b8]" />
            <span className="text-[#334155] dark:text-card-foreground">Gestion commerciale B2B</span>
          </nav>

          <div className="mt-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex min-w-0 items-start gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[18px] bg-[#e8f1ff] text-[#2563eb] shadow-[0_16px_30px_-24px_rgba(37,99,235,0.9)]">
                <BuildingIcon className="h-8 w-8" />
              </div>
              <div className="min-w-0">
                <h1 className="text-[30px] font-black leading-tight text-[#10203f] dark:text-card-foreground">Gestion commerciale B2B</h1>
                <p className="mt-2 max-w-[690px] text-sm font-semibold leading-6 text-[#53657d] dark:text-muted-foreground">
                  Pilotez les remises personnalisées selon le chiffre d'affaires, l'historique d'achat et la relation commerciale des clients professionnels.
                </p>
              </div>
            </div>

            <Link
              to="/admin/b2b/quotes"
              className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-[10px] bg-[#165bbd] px-5 text-sm font-black text-white shadow-[0_18px_34px_-24px_rgba(22,91,189,0.85)] transition hover:-translate-y-0.5 hover:bg-[#0f4fa8] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#2563eb]/20"
            >
              <UsersIcon className="h-4 w-4" />
              Devis B2B
            </Link>
          </div>
        </header>

        <div className="grid gap-4 px-4 pb-5 sm:grid-cols-2 sm:px-6 xl:grid-cols-5">
          <KpiCard label="Clients B2B" value={String(clients.length)} hint="Comptes professionnels" tone="blue" icon={<UsersIcon className="h-5 w-5" />} />
          <KpiCard label="CA B2B" value={money(metrics.revenue)} hint="Base BL : factures BC + avoirs BL" tone="indigo" icon={<ChartIcon className="h-5 w-5" />} />
          <KpiCard label="Remise moyenne" value={formatPct(metrics.avgDiscount)} hint="Clients avec remise" tone="purple" icon={<PercentIcon className="h-5 w-5" />} />
          <KpiCard label="Sans remise" value={String(metrics.withoutDiscount)} hint="À qualifier commercialement" tone="green" icon={<GiftIcon className="h-5 w-5" />} />
          <KpiCard label="Top client" value={metrics.top ? displayName(metrics.top) : "-"} hint={money(metrics.top?.totalRevenue ?? 0)} tone="orange" icon={<StarIcon className="h-5 w-5" />} />
        </div>

        <div className="border-t border-[#dbe4f0] bg-white p-4 dark:border-border/70 dark:bg-card/95">
          <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center">
            <div className="relative min-w-0 flex-1">
              <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#64748b]" />
              <input
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setPage(1);
                }}
                placeholder="Rechercher un client, société, téléphone..."
                className="h-11 w-full rounded-[8px] border border-[#dbe4f0] bg-white pl-10 pr-3 text-xs font-semibold text-[#10203f] outline-none transition placeholder:text-[#64748b] focus:border-[#2563eb] focus:ring-4 focus:ring-[#2563eb]/10 dark:bg-background dark:text-card-foreground"
              />
            </div>

            <div className="relative">
              <button
                type="button"
                onClick={() => setFiltersOpen((open) => !open)}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-[8px] border border-[#93b5ed] bg-white px-4 text-xs font-black text-[#165bbd] transition hover:bg-[#f8fbff] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#2563eb]/10 dark:bg-background"
              >
                <FilterIcon className="h-4 w-4" />
                Filtres
                {levelFilter !== "all" ? <span className="h-2 w-2 rounded-full bg-[#16a34a]" /> : null}
              </button>

              {filtersOpen ? (
                <div className="absolute right-0 z-20 mt-2 w-56 rounded-[10px] border border-[#dbe4f0] bg-white p-2 shadow-[0_24px_52px_-34px_rgba(15,23,42,0.55)] dark:bg-card">
                  <button
                    type="button"
                    onClick={() => {
                      setLevelFilter("all");
                      setFiltersOpen(false);
                      setPage(1);
                    }}
                    className={`w-full rounded-md px-3 py-2 text-left text-xs font-black transition hover:bg-[#f8fbff] dark:hover:bg-muted/30 ${levelFilter === "all" ? "text-[#165bbd]" : "text-[#344767]"}`}
                  >
                    Tous les niveaux
                  </button>
                  {levelOptions.map((label) => (
                    <button
                      key={label}
                      type="button"
                      onClick={() => {
                        setLevelFilter(label);
                        setFiltersOpen(false);
                        setPage(1);
                      }}
                      className={`mt-1 w-full rounded-md px-3 py-2 text-left text-xs font-black transition hover:bg-[#f8fbff] dark:hover:bg-muted/30 ${levelFilter === label ? "text-[#165bbd]" : "text-[#344767] dark:text-card-foreground"}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          </div>

          {isPending ? (
            <div className="rounded-[10px] border border-[#dbe4f0] bg-[#f8fbff] p-6 text-sm font-semibold text-[#53657d]">Chargement...</div>
          ) : isError ? (
            <div className="rounded-[10px] border border-danger/20 bg-danger/5 p-4 text-sm text-rose-700">{getApiErrorMessage(error)}</div>
          ) : clients.length === 0 ? (
            <EmptyView
              title="Aucun client B2B"
              description="Marquez un client comme B2B depuis sa fiche pour qu'il apparaisse ici."
              iconPath="M8 12h8 M5 21V7a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v14"
            />
          ) : (
            <div className="overflow-hidden rounded-[10px] border border-[#dbe4f0] bg-white dark:bg-card">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1000px] text-left text-[11px]">
                  <thead className="border-b border-[#dbe4f0] bg-[#f8fbff] text-[10px] font-black uppercase text-[#344767]">
                    <tr>
                      <th className="px-3 py-3">Société</th>
                      <th className="px-3 py-3">Contact</th>
                      <th className="px-3 py-3">Téléphone</th>
                      <th className="px-3 py-3">Gouvernorat</th>
                      <th className="px-3 py-3 text-right">Chiffre d'affaires</th>
                      <th className="px-3 py-3 text-right">Commandes</th>
                      <th className="px-3 py-3 text-right">Panier moyen</th>
                      <th className="px-3 py-3">Dernière commande</th>
                      <th className="px-3 py-3 text-right">Remise actuelle</th>
                      <th className="px-3 py-3 text-right">Remise suggérée</th>
                      <th className="px-3 py-3">Niveau</th>
                      <th className="sticky right-0 z-10 bg-[#f8fbff] px-3 py-3 text-right shadow-[-14px_0_22px_-22px_rgba(15,23,42,0.48)]">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#edf2f7]">
                    {visibleClients.length === 0 ? (
                      <tr>
                        <td colSpan={12} className="px-3 py-8 text-center text-sm font-semibold text-[#64748b]">
                          Aucun résultat ne correspond à la recherche.
                        </td>
                      </tr>
                    ) : visibleClients.map((client, rowIndex) => {
                      const currentDiscount = Number(client.discountPercent ?? client.legacyRemise ?? 0);
                      const clientKey = client.userId ?? `${displayName(client)}-${startIndex + rowIndex}`;
                      return (
                        <tr key={clientKey} className="text-[#10203f] transition hover:bg-[#f8fbff] dark:text-card-foreground dark:hover:bg-muted/20">
                          <td className="px-3 py-3">
                            <div className="flex items-center gap-2.5">
                              <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-black ${avatarPalettes[(startIndex + rowIndex) % avatarPalettes.length]}`}>
                                {getInitial(client)}
                              </span>
                              <span className="max-w-[150px] truncate font-black">{client.nomSociete ?? "-"}</span>
                            </div>
                          </td>
                          <td className="px-3 py-3">
                            <span className="font-semibold text-[#334155] dark:text-muted-foreground">{client.nomComplet ?? "-"}</span>
                          </td>
                          <td className="px-3 py-3 font-semibold">{client.telephone ?? "-"}</td>
                          <td className="px-3 py-3 font-semibold">{client.gouvernorat ?? "-"}</td>
                          <td className="px-3 py-3 text-right font-black">{money(client.totalRevenue)}</td>
                          <td className="px-3 py-3 text-right font-black">{client.ordersCount}</td>
                          <td className="px-3 py-3 text-right font-semibold">{money(client.averageOrderAmount)}</td>
                          <td className="px-3 py-3 font-semibold">{formatDate(client.lastOrderDate)}</td>
                          <td className={`px-3 py-3 text-right font-black ${currentDiscount > 0 ? "text-[#15803d]" : "text-[#64748b]"}`}>
                            {formatPct(client.discountPercent ?? client.legacyRemise)}
                          </td>
                          <td className="px-3 py-3 text-right font-black text-[#175cd3]">{formatPct(client.suggestedDiscountPercent)}</td>
                          <td className="px-3 py-3">
                            <span className={`inline-flex h-6 items-center rounded-full border px-2.5 text-[10px] font-black ${levelPillClass(client.discountLevelLabel)}`}>
                              {client.discountLevelLabel}
                            </span>
                          </td>
                          <td className="sticky right-0 bg-white px-3 py-3 shadow-[-14px_0_22px_-22px_rgba(15,23,42,0.48)] dark:bg-card">
                            <div className="flex justify-end gap-1">
                              <TableActionButton icon={<EditIcon className="h-2.5 w-2.5" />} onClick={() => openEdit(client)}>Modifier</TableActionButton>
                              <TableActionButton icon={<SparkleIcon className="h-2.5 w-2.5" />} onClick={() => openEdit(client, true)}>Suggérée</TableActionButton>
                              <TableActionButton icon={<HistoryIcon className="h-2.5 w-2.5" />} onClick={() => setHistoryFor(client)}>Historique</TableActionButton>
                              <Link
                                to="/admin/b2b/quotes"
                                title="Créer devis"
                                aria-label={`Créer devis pour ${displayName(client)}`}
                                className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-[#d6e2f1] bg-white text-[#344767] transition hover:border-[#b8cef0] hover:bg-[#f8fbff] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563eb]/20 dark:bg-card dark:text-card-foreground"
                              >
                                <MoreVerticalIcon className="h-3 w-3" />
                              </Link>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-col gap-3 border-t border-[#dbe4f0] px-4 py-3 text-xs font-semibold text-[#53657d] sm:flex-row sm:items-center sm:justify-between">
                <div>Affichage de {resultFrom} à {resultTo} sur {filteredClients.length} résultats</div>
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={pageSize}
                    onChange={(event) => {
                      setPageSize(Number(event.target.value));
                      setPage(1);
                    }}
                    className="h-9 rounded-md border border-[#dbe4f0] bg-white px-3 text-xs font-black text-[#344767] outline-none focus:border-[#2563eb] focus:ring-2 focus:ring-[#2563eb]/10 dark:bg-card dark:text-card-foreground"
                    aria-label="Nombre de résultats par page"
                  >
                    {pageSizeOptions.map((option) => (
                      <option key={option} value={option}>{option} / page</option>
                    ))}
                  </select>
                  <PaginationButton label="Page précédente" disabled={currentPage === 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>
                    <ChevronLeftIcon className="h-4 w-4" />
                  </PaginationButton>
                  {visiblePageNumbers(currentPage, totalPages).map((pageNumber) => (
                    <PaginationButton key={pageNumber} label={`Page ${pageNumber}`} active={pageNumber === currentPage} onClick={() => setPage(pageNumber)}>
                      {pageNumber}
                    </PaginationButton>
                  ))}
                  <PaginationButton label="Page suivante" disabled={currentPage === totalPages} onClick={() => setPage((value) => Math.min(totalPages, value + 1))}>
                    <ChevronRightIcon className="h-4 w-4" />
                  </PaginationButton>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {editing ? (
        <Modal open title={`Modifier remise - ${displayName(editing)}`} onClose={() => setEditing(null)}>
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-border bg-muted/25 p-4">
                <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Ancienne remise</div>
                <div className="mt-2 text-2xl font-black">{formatPct(editing.discountPercent ?? editing.legacyRemise)}</div>
              </div>
              <div className="rounded-2xl border border-primary/15 bg-primary/5 p-4">
                <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Remise suggérée</div>
                <div className="mt-2 text-2xl font-black text-primary">{formatPct(editing.suggestedDiscountPercent)}</div>
              </div>
            </div>

            <div className="grid gap-2">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Nouvelle remise (%)</label>
              <Input type="number" min={0} max={100} step={0.01} value={value} onChange={(e) => setValue(e.target.value)} placeholder="Vide = supprimer la remise personnalisée" />
            </div>
            <div className="grid gap-2">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Motif obligatoire</label>
              <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Ex: CA annuel, accord commercial, fidélisation..." />
            </div>

            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 text-sm text-emerald-800 dark:border-emerald-500/25 dark:bg-emerald-500/10 dark:text-emerald-200">
              {(() => {
                const rate = value.trim() === "" ? 0 : Number(value);
                const discount = Number.isFinite(rate) ? Number((1000 * rate / 100).toFixed(3)) : 0;
                return (
                  <div className="space-y-1">
                    <div className="font-bold">Simulation panier 1000 TND</div>
                    <div className="flex justify-between"><span>Montant remise</span><span>-{money(discount)}</span></div>
                    <div className="flex justify-between font-black"><span>Net après remise</span><span>{money(1000 - discount)}</span></div>
                  </div>
                );
              })()}
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setEditing(null)}>Annuler</Button>
              <Button type="button" variant="primary" isLoading={updateMut.isPending} onClick={submitDiscount}>Enregistrer</Button>
            </div>
          </div>
        </Modal>
      ) : null}

      {historyFor ? (
        <Modal open title={`Historique remise - ${displayName(historyFor)}`} onClose={() => setHistoryFor(null)}>
          {historyQuery.isPending ? (
            <div className="text-sm text-muted-foreground">Chargement...</div>
          ) : (historyQuery.data ?? []).length === 0 ? (
            <div className="text-sm text-muted-foreground">Aucun changement enregistré.</div>
          ) : (
            <div className="space-y-2">
              {(historyQuery.data ?? []).map((h) => (
                <div key={h.id} className="rounded-2xl border border-border p-3 text-sm">
                  <div className="flex items-center justify-between gap-4">
                    <span className="font-bold">{formatPct(h.oldValue)}{" -> "}{formatPct(h.newValue)}</span>
                    <span className="text-xs text-muted-foreground">{new Date(h.changedAt).toLocaleString("fr-FR")}</span>
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">Admin : {h.changedByAdminId}</div>
                  {h.reason ? <div className="mt-1 text-xs italic text-muted-foreground">"{h.reason}"</div> : null}
                </div>
              ))}
            </div>
          )}
        </Modal>
      ) : null}
    </div>
  );
}
