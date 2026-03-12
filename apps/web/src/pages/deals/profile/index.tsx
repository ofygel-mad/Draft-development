import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft,
  Edit3,
  User,
  Calendar,
  TrendingUp,
  Clock,
  MessageSquare,
  CheckSquare,
  Plus,
  Phone,
  Mail,
  Building2,
  ArrowRight,
  Target,
  AlertCircle,
  Download,
} from "lucide-react";
import { api } from "../../../shared/api/client";
import { Button } from "../../../shared/ui/Button";
import { PageLoader } from "../../../shared/ui/PageLoader";
import { EmptyState } from "../../../shared/ui/EmptyState";
import { Drawer } from "../../../shared/ui/Drawer";
import { Badge } from "../../../shared/ui/Badge";
import { currencySymbol } from "../../../shared/utils/format";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { format, formatDistanceToNow, differenceInDays } from "date-fns";
import { getDateLocale } from '../../../shared/utils/locale';
import { useAuthStore } from "../../../shared/stores/auth";
import { useConvert } from "../../../shared/hooks/useExchangeRates";
import { useDocumentTitle } from '../../../shared/hooks/useDocumentTitle';

interface Stage {
  id: string;
  name: string;
  position: number;
  type: string;
  color?: string;
}
interface DealDetail {
  id: string;
  title: string;
  amount: number | null;
  currency: string;
  status: string;
  created_at: string;
  expected_close_date: string | null;
  next_step?: string;
  customer: {
    id: string;
    full_name: string;
    company_name: string;
    phone: string;
    email: string;
  } | null;
  owner: { id: string; full_name: string } | null;
  stage: Stage;
  pipeline: { id: string; name: string; stages: Stage[] };
}
interface Activity {
  id: string;
  type: string;
  payload: Record<string, unknown>;
  actor: { full_name: string } | null;
  created_at: string;
}
interface Task {
  id: string;
  title: string;
  is_done: boolean;
  due_date: string | null;
  priority: string;
  assignee: { full_name: string } | null;
}

const fmt = (n: number) =>
  new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 }).format(n);

const ACTIVITY_CONFIG: Record<
  string,
  { icon: typeof Clock; color: string; label: string }
> = {
  "deal_created":       { icon: TrendingUp,    color: "#10B981", label: "Сделка создана" },
  "stage_change":       { icon: ArrowRight,    color: "#F59E0B", label: "Смена этапа" },
  "note":               { icon: MessageSquare, color: "#3B82F6", label: "Заметка" },
  "task_created":       { icon: CheckSquare,   color: "#8B5CF6", label: "Задача создана" },
  "task_done":          { icon: CheckSquare,   color: "#10B981", label: "Задача выполнена" },
  "status_change":      { icon: Edit3,         color: "#6B7280", label: "Смена статуса" },
  "customer_created":   { icon: TrendingUp,    color: "#10B981", label: "Клиент добавлен" },
  "call":               { icon: Phone,         color: "#3B82F6", label: "Звонок" },
  "email_sent":         { icon: Mail,          color: "#6366F1", label: "Email отправлен" },
  "email_in":           { icon: Mail,          color: "#8B5CF6", label: "Email получен" },
  "whatsapp":           { icon: MessageSquare, color: "#25D366", label: "WhatsApp" },
  "deal.created":       { icon: TrendingUp,    color: "#10B981", label: "Сделка создана" },
  "deal.stage_changed": { icon: ArrowRight,    color: "#F59E0B", label: "Смена этапа" },
  "note.created":       { icon: MessageSquare, color: "#3B82F6", label: "Заметка" },
  "task.created":       { icon: CheckSquare,   color: "#8B5CF6", label: "Задача" },
  "deal.updated":       { icon: Edit3,         color: "#6B7280", label: "Обновление" },
};

function InlineAmount({
  value,
  currency,
  onSave,
  orgCurrency,
  convert,
}: {
  value: number | null;
  currency: string;
  onSave: (v: number) => void;
  orgCurrency: string;
  convert: (amount: number, from: string, to?: string) => number;
}) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(String(value ?? ""));
  const symbol = currencySymbol(currency);

  if (editing) {
    return (
      <input
        autoFocus
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onBlur={() => {
          onSave(Number(val));
          setEditing(false);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            onSave(Number(val));
            setEditing(false);
          }
          if (e.key === "Escape") setEditing(false);
        }}
        style={{
          fontSize: 26,
          fontWeight: 800,
          color: "var(--color-amber)",
          fontFamily: "var(--font-display)",
          background: "transparent",
          border: "none",
          borderBottom: "2px solid var(--color-amber)",
          outline: "none",
          width: 180,
          padding: "2px 0",
        }}
      />
    );
  }
  return (
    <motion.div
      onClick={() => setEditing(true)}
      whileHover={{ scale: 1.01 }}
      title="Нажмите чтобы изменить"
      style={{
        cursor: "text",
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
      }}
    >
      <span
        style={{
          fontSize: 26,
          fontWeight: 800,
          color: "var(--color-amber)",
          fontFamily: "var(--font-display)",
        }}
      >
        {value ? (
          `${fmt(value)} ${symbol}`
        ) : (
          <span
            style={{
              color: "var(--color-text-muted)",
              fontWeight: 400,
              fontSize: 15,
            }}
          >
            Сумма не указана
          </span>
        )}
      </span>
      {value && currency !== orgCurrency && (
        <span style={{ fontSize: 13, color: "var(--color-text-muted)", marginLeft: 6 }}>
          ≈ {new Intl.NumberFormat("ru-KZ", { maximumFractionDigits: 0 }).format(
            convert(Number(value), currency, orgCurrency),
          )} {currencySymbol(orgCurrency)}
        </span>
      )}
      <Edit3
        size={13}
        style={{ color: "var(--color-text-muted)", opacity: 0.4 }}
      />
    </motion.div>
  );
}

function StageBar({
  stages,
  currentId,
  onSelect,
  loading,
}: {
  stages: Stage[];
  currentId: string;
  onSelect: (id: string) => void;
  loading: boolean;
}) {
  const sorted = [...stages].sort((a, b) => a.position - b.position);
  const currentIdx = sorted.findIndex((s) => s.id === currentId);
  return (
    <div>
      <div style={{ display: "flex", gap: 3 }}>
        {sorted.map((s, i) => {
          const isActive = s.id === currentId;
          const isPast = i < currentIdx;
          const color =
            s.type === "won"
              ? "var(--color-success)"
              : s.type === "lost"
                ? "var(--color-danger)"
                : "var(--color-amber)";
          return (
            <motion.button
              key={s.id}
              onClick={() => !loading && onSelect(s.id)}
              whileHover={{ scaleY: 1.6 }}
              title={s.name}
              style={{
                flex: 1,
                height: 5,
                borderRadius: "var(--radius-full)",
                border: "none",
                cursor: loading ? "wait" : "pointer",
                background: isActive
                  ? color
                  : isPast
                    ? `${color}55`
                    : "var(--color-border)",
                transition: "background var(--transition-fast)",
              }}
            />
          );
        })}
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginTop: 6,
        }}
      >
        <span
          style={{ fontSize: 12, color: "var(--color-amber)", fontWeight: 600 }}
        >
          {sorted.find((s) => s.id === currentId)?.name}
        </span>
        <span style={{ fontSize: 11, color: "var(--color-text-muted)" }}>
          {currentIdx + 1} / {sorted.length}
        </span>
      </div>
    </div>
  );
}

function QuickNote({ dealId }: { dealId: string }) {
  const [body, setBody] = useState("");
  const [focused, setFocused] = useState(false);
  const qc = useQueryClient();
  const add = useMutation({
    mutationFn: (body: string) => api.post(`/deals/${dealId}/notes/`, { body }),
    onSuccess: () => {
      setBody("");
      setFocused(false);
      qc.invalidateQueries({ queryKey: ["deal-activities", dealId] });
      toast.success("Заметка добавлена");
    },
  });
  return (
    <div style={{ marginBottom: 12 }}>
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        onFocus={() => setFocused(true)}
        placeholder="Добавить заметку..."
        className="crm-input"
        style={{
          width: "100%",
          resize: "none",
          minHeight: focused ? 88 : 40,
          transition: "min-height var(--transition-base)",
          boxSizing: "border-box",
        }}
      />
      <AnimatePresence>
        {focused && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: 8,
              marginTop: 8,
            }}
          >
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setFocused(false);
                setBody("");
              }}
            >
              Отмена
            </Button>
            <Button
              size="sm"
              loading={add.isPending}
              onClick={() => body.trim() && add.mutate(body)}
            >
              Сохранить
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ActivityTimeline({ activities }: { activities: Activity[] }) {
  if (!activities.length) {
    return (
      <EmptyState
        icon={<Clock size={20} />}
        title="Нет активностей"
        subtitle="История изменений появится здесь"
      />
    );
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
      {activities.map((act, idx) => {
        const cfg = ACTIVITY_CONFIG[act.type] ?? {
          icon: Clock,
          color: "#6B7280",
          label: act.type,
        };
        const Icon = cfg.icon;
        const payload = act.payload as any;
        const text =
          (payload?.body ?? payload?.old_stage?.name)
            ? `${payload?.old_stage?.name} → ${payload?.new_stage?.name}`
            : cfg.label;
        return (
          <motion.div
            key={act.id}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.03 }}
            style={{
              display: "flex",
              gap: 10,
              padding: "10px 0",
              position: "relative",
            }}
          >
            {idx < activities.length - 1 && (
              <div
                style={{
                  position: "absolute",
                  left: 13,
                  top: 36,
                  bottom: 0,
                  width: 1,
                  background: "var(--color-border)",
                }}
              />
            )}
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: "var(--radius-md)",
                flexShrink: 0,
                background: `${cfg.color}18`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Icon size={13} style={{ color: cfg.color }} />
            </div>
            <div style={{ paddingTop: 3 }}>
              <div
                style={{
                  fontSize: 12,
                  color: "var(--color-text-primary)",
                  lineHeight: 1.4,
                }}
              >
                {text}
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: "var(--color-text-muted)",
                  marginTop: 2,
                }}
              >
                {act.actor && (
                  <b style={{ color: "var(--color-text-secondary)" }}>
                    {act.actor.full_name}
                  </b>
                )}
                {act.actor && " · "}
                {formatDistanceToNow(new Date(act.created_at), {
                  addSuffix: true,
                  locale: getDateLocale(),
                })}
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

function CustomerCard({
  customer,
  onClick,
}: {
  customer: DealDetail["customer"];
  onClick: () => void;
}) {
  if (!customer) {
    return (
      <div
        style={{
          border: "1px dashed var(--color-border)",
          borderRadius: "var(--radius-lg)",
          padding: 16,
          textAlign: "center",
        }}
      >
        <User
          size={18}
          style={{ color: "var(--color-text-muted)", marginBottom: 6 }}
        />
        <p
          style={{ fontSize: 12, color: "var(--color-text-muted)", margin: 0 }}
        >
          Клиент не привязан
        </p>
      </div>
    );
  }
  return (
    <motion.div
      onClick={onClick}
      whileHover={{ y: -1, boxShadow: "var(--shadow-md)" }}
      style={{
        background: "var(--color-bg-elevated)",
        border: "1px solid var(--color-border)",
        borderRadius: "var(--radius-lg)",
        padding: 14,
        cursor: "pointer",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginBottom: 10,
        }}
      >
        <div
          style={{
            width: 34,
            height: 34,
            borderRadius: "var(--radius-md)",
            background: "var(--color-amber-light)",
            color: "var(--color-amber)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 700,
            fontSize: 14,
            fontFamily: "var(--font-display)",
          }}
        >
          {customer.full_name[0]?.toUpperCase()}
        </div>
        <div>
          <div
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: "var(--color-text-primary)",
            }}
          >
            {customer.full_name}
          </div>
          {customer.company_name && (
            <div
              style={{
                fontSize: 11,
                color: "var(--color-text-muted)",
                display: "flex",
                alignItems: "center",
                gap: 3,
              }}
            >
              <Building2 size={10} />
              {customer.company_name}
            </div>
          )}
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {customer.phone && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontSize: 12,
              color: "var(--color-text-secondary)",
            }}
          >
            <Phone size={11} />
            {customer.phone}
          </div>
        )}
        {customer.email && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontSize: 12,
              color: "var(--color-text-secondary)",
            }}
          >
            <Mail size={11} />
            {customer.email}
          </div>
        )}
      </div>
    </motion.div>
  );
}

const TABS = ["activity", "notes", "tasks"] as const;
type Tab = (typeof TABS)[number];
const TAB_LABELS: Record<Tab, string> = {
  activity: "Активность",
  notes: "Заметки",
  tasks: "Задачи",
};

export default function DealProfilePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const token = useAuthStore((state) => state.token);
  const orgCurrency = useAuthStore((s) => s.org?.currency ?? "KZT");
  const convert = useConvert();
  const [tab, setTab] = useState<Tab>("activity");
  const [editDrawer, setEditDrawer] = useState(false);
  const [newTask, setNewTask] = useState(false);

  const { data: deal, isLoading } = useQuery<DealDetail>({
    queryKey: ["deal", id],
    queryFn: () => api.get(`/deals/${id}/`),
  });
  useDocumentTitle(deal?.title);
  const { data: activities } = useQuery<{ results: Activity[] }>({
    queryKey: ["deal-activities", id],
    queryFn: () => api.get(`/deals/${id}/activities/`),
    enabled: !!id,
  });
  const { data: tasks } = useQuery<{ results: Task[] }>({
    queryKey: ["deal-tasks", id],
    queryFn: () => api.get(`/tasks/?deal_id=${id}`),
    enabled: !!id,
  });

  const changeStage = useMutation({
    mutationFn: (stageId: string) =>
      api.post(`/deals/${id}/change_stage/`, { stage_id: stageId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["deal", id] });
      toast.success("Этап изменён");
    },
  });
  const updateAmount = useMutation({
    mutationFn: (amount: number) => api.patch(`/deals/${id}/`, { amount }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["deal", id] });
      toast.success("Сумма обновлена");
    },
  });
  const completeTask = useMutation({
    mutationFn: (taskId: string) => api.post(`/tasks/${taskId}/complete/`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["deal-tasks", id] }),
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm<Partial<DealDetail>>();
  const updateDeal = useMutation({
    mutationFn: (data: Partial<DealDetail>) => api.patch(`/deals/${id}/`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["deal", id] });
      toast.success("Сохранено");
      setEditDrawer(false);
    },
  });

  if (isLoading) return <PageLoader />;
  if (!deal)
    return (
      <EmptyState icon={<TrendingUp size={22} />} title="Сделка не найдена" />
    );

  const stages = [...deal.pipeline.stages].sort(
    (a, b) => a.position - b.position,
  );

  const downloadInvoice = async () => {
    const r = await fetch(`/api/v1/deals/${id}/invoice/`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!r.ok) {
      toast.error("Ошибка генерации PDF");
      return;
    }
    const url = URL.createObjectURL(await r.blob());
    Object.assign(document.createElement("a"), {
      href: url,
      download: `invoice-${id?.slice(0, 8)}.pdf`,
    }).click();
    URL.revokeObjectURL(url);
  };
  const daysToClose = deal.expected_close_date
    ? differenceInDays(new Date(deal.expected_close_date), new Date())
    : null;

  return (
    <div style={{ padding: "24px 28px", maxWidth: 1120 }}>
      <button
        onClick={() => navigate("/deals")}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 5,
          marginBottom: 18,
          fontSize: 13,
          color: "var(--color-text-muted)",
          background: "none",
          border: "none",
          cursor: "pointer",
          padding: 0,
          fontFamily: "var(--font-body)",
        }}
      >
        <ChevronLeft size={15} /> Назад к сделкам
      </button>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 268px",
          gap: 20,
          alignItems: "start",
        }}
      >
        <div>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              background: "var(--color-bg-elevated)",
              border: "1px solid var(--color-border)",
              borderRadius: "var(--radius-xl)",
              padding: "22px 24px",
              marginBottom: 16,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                marginBottom: 18,
                gap: 12,
              }}
            >
              <div>
                <h1
                  style={{
                    fontSize: 20,
                    fontWeight: 700,
                    fontFamily: "var(--font-display)",
                    margin: "0 0 6px",
                  }}
                >
                  {deal.title}
                </h1>
                <InlineAmount
                  value={deal.amount}
                  currency={deal.currency}
                  onSave={(v) => updateAmount.mutate(v)}
                  orgCurrency={orgCurrency}
                  convert={convert}
                />
              </div>
            </div>

            <div
              style={{
                padding: '12px 16px',
                background: 'var(--color-amber-subtle)',
                border: '1px solid var(--color-amber-light)',
                borderRadius: 'var(--radius-md)',
                marginBottom: 12,
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: 'var(--color-amber-dark)',
                  marginBottom: 4,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                Следующий шаг
              </div>
              {deal.next_step ? (
                <div style={{ fontSize: 13, color: 'var(--color-text-primary)' }}>
                  {deal.next_step}
                </div>
              ) : (
                <div style={{ fontSize: 12, color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
                  Не указан — добавьте следующее действие
                </div>
              )}
            </div>

            <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                <Badge
                  color={
                    deal.status === "won"
                      ? "var(--color-success)"
                      : deal.status === "lost"
                        ? "var(--color-danger)"
                        : "var(--color-warning)"
                  }
                  bg={
                    deal.status === "won"
                      ? "var(--color-success-light)"
                      : deal.status === "lost"
                        ? "var(--color-danger-light)"
                        : "var(--color-warning-light)"
                  }
                >
                  {deal.status === "won"
                    ? "Выиграна"
                    : deal.status === "lost"
                      ? "Проиграна"
                      : "В работе"}
                </Badge>
                <Button
                  variant="secondary"
                  size="sm"
                  icon={<Download size={13} />}
                  onClick={downloadInvoice}
                >
                  Счёт PDF
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  icon={<Edit3 size={13} />}
                  onClick={() => {
                    reset(deal);
                    setEditDrawer(true);
                  }}
                >
                  Изменить
                </Button>
              </div>

            <StageBar
              stages={stages}
              currentId={deal.stage.id}
              onSelect={(stageId) => changeStage.mutate(stageId)}
              loading={changeStage.isPending}
            />
          </motion.div>

          <div
            style={{
              display: "flex",
              gap: 2,
              padding: 3,
              background: "var(--color-bg-muted)",
              borderRadius: "var(--radius-md)",
              marginBottom: 16,
              width: "fit-content",
            }}
          >
            {TABS.map((t) => (
              <motion.button
                key={t}
                onClick={() => setTab(t)}
                whileTap={{ scale: 0.96 }}
                style={{
                  padding: "6px 14px",
                  border: "none",
                  cursor: "pointer",
                  borderRadius: 7,
                  fontSize: 13,
                  fontWeight: tab === t ? 600 : 400,
                  fontFamily: "var(--font-body)",
                  background:
                    tab === t ? "var(--color-bg-elevated)" : "transparent",
                  color:
                    tab === t
                      ? "var(--color-text-primary)"
                      : "var(--color-text-muted)",
                  boxShadow: tab === t ? "var(--shadow-sm)" : "none",
                  transition: "all var(--transition-fast)",
                }}
              >
                {TAB_LABELS[t]}
              </motion.button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={tab}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.14 }}
              style={{
                background: "var(--color-bg-elevated)",
                border: "1px solid var(--color-border)",
                borderRadius: "var(--radius-xl)",
                padding: "18px 20px",
              }}
            >
              {tab === "notes" && (
                <>
                  <QuickNote dealId={deal.id} />
                  {(activities?.results ?? [])
                    .filter((a) => a.type === "note.created")
                    .map((a) => (
                      <div
                        key={a.id}
                        style={{
                          padding: "10px 0",
                          borderTop: "1px solid var(--color-border)",
                        }}
                      >
                        <div
                          style={{
                            fontSize: 13,
                            color: "var(--color-text-primary)",
                            lineHeight: 1.5,
                          }}
                        >
                          {(a.payload as any)?.body}
                        </div>
                        <div
                          style={{
                            fontSize: 11,
                            color: "var(--color-text-muted)",
                            marginTop: 4,
                          }}
                        >
                          {a.actor?.full_name} ·{" "}
                          {formatDistanceToNow(new Date(a.created_at), {
                            addSuffix: true,
                            locale: getDateLocale(),
                          })}
                        </div>
                      </div>
                    ))}
                </>
              )}

              {tab === "tasks" && (
                <>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginBottom: 12,
                    }}
                  >
                    <span style={{ fontSize: 13, fontWeight: 600 }}>
                      Задачи
                    </span>
                    <Button
                      size="sm"
                      variant="secondary"
                      icon={<Plus size={13} />}
                      onClick={() => setNewTask(true)}
                    >
                      Добавить
                    </Button>
                  </div>
                  {(tasks?.results ?? []).length === 0 ? (
                    <EmptyState
                      icon={<CheckSquare size={18} />}
                      title="Задач нет"
                      subtitle="Добавьте задачу к этой сделке"
                    />
                  ) : (
                    (tasks?.results ?? []).map((task) => (
                      <motion.div
                        key={task.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                          padding: "8px 0",
                          borderTop: "1px solid var(--color-border)",
                          opacity: task.is_done ? 0.5 : 1,
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={task.is_done}
                          onChange={() =>
                            !task.is_done && completeTask.mutate(task.id)
                          }
                          style={{
                            width: 16,
                            height: 16,
                            cursor: "pointer",
                            accentColor: "var(--color-amber)",
                          }}
                        />
                        <div style={{ flex: 1 }}>
                          <div
                            style={{
                              fontSize: 13,
                              textDecoration: task.is_done
                                ? "line-through"
                                : "none",
                            }}
                          >
                            {task.title}
                          </div>
                          {task.due_date && (
                            <div
                              style={{
                                fontSize: 11,
                                color: "var(--color-text-muted)",
                                marginTop: 1,
                              }}
                            >
                              До{" "}
                              {format(new Date(task.due_date), "d MMM", {
                                locale: getDateLocale(),
                              })}
                            </div>
                          )}
                        </div>
                      </motion.div>
                    ))
                  )}
                </>
              )}

              {tab === "activity" && (
                <ActivityTimeline activities={activities?.results ?? []} />
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <CustomerCard
            customer={deal.customer}
            onClick={() =>
              deal.customer && navigate(`/customers/${deal.customer.id}`)
            }
          />

          <div
            style={{
              background: "var(--color-bg-elevated)",
              border: "1px solid var(--color-border)",
              borderRadius: "var(--radius-lg)",
              padding: 14,
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: "var(--color-text-muted)",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                marginBottom: 10,
              }}
            >
              Детали
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {deal.owner && (
                <MetaRow
                  icon={<User size={13} />}
                  label="Ответственный"
                  value={deal.owner.full_name}
                />
              )}
              <MetaRow
                icon={<Calendar size={13} />}
                label="Создана"
                value={format(new Date(deal.created_at), "d MMM yyyy", {
                  locale: getDateLocale(),
                })}
              />
              {deal.expected_close_date && (
                <MetaRow
                  icon={<Target size={13} />}
                  label="Дата закрытия"
                  value={format(
                    new Date(deal.expected_close_date),
                    "d MMM yyyy",
                    { locale: getDateLocale() },
                  )}
                  extra={
                    daysToClose !== null && (
                      <span
                        style={{
                          fontSize: 10,
                          color:
                            daysToClose < 0
                              ? "var(--color-danger)"
                              : daysToClose < 7
                                ? "var(--color-warning)"
                                : "var(--color-success)",
                        }}
                      >
                        {daysToClose < 0
                          ? `просрочено ${Math.abs(daysToClose)} дн`
                          : `через ${daysToClose} дн`}
                      </span>
                    )
                  }
                />
              )}
              <MetaRow
                icon={<AlertCircle size={13} />}
                label="Воронка"
                value={deal.pipeline.name}
              />
            </div>
          </div>
        </div>
      </div>

      <Drawer
        open={editDrawer}
        onClose={() => setEditDrawer(false)}
        title="Редактировать сделку"
        footer={
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <Button variant="secondary" onClick={() => setEditDrawer(false)}>
              Отмена
            </Button>
            <Button
              loading={isSubmitting}
              onClick={handleSubmit((d) => updateDeal.mutate(d))}
            >
              Сохранить
            </Button>
          </div>
        }
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <Field label="Название *">
            <input {...register("title")} className="crm-input" />
          </Field>
          <Field label="Сумма">
            <input
              {...register("amount")}
              type="number"
              className="crm-input"
            />
          </Field>
          <Field label="Дата закрытия">
            <input
              {...register("expected_close_date")}
              type="date"
              className="crm-input"
            />
          </Field>
        </div>
      </Drawer>
    </div>
  );
}

function MetaRow({
  icon,
  label,
  value,
  extra,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  extra?: React.ReactNode;
}) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
      <span
        style={{
          color: "var(--color-text-muted)",
          marginTop: 1,
          flexShrink: 0,
        }}
      >
        {icon}
      </span>
      <div>
        <div style={{ fontSize: 11, color: "var(--color-text-muted)" }}>
          {label}
        </div>
        <div
          style={{
            fontSize: 12,
            fontWeight: 500,
            color: "var(--color-text-primary)",
          }}
        >
          {value}
        </div>
        {extra}
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      <label
        style={{
          fontSize: 12,
          fontWeight: 500,
          color: "var(--color-text-secondary)",
        }}
      >
        {label}
      </label>
      {children}
    </div>
  );
}
