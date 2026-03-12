import { useEffect, useState, type ReactNode } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft,
  Phone,
  Mail,
  Building2,
  User,
  Edit3,
  Plus,
  MessageSquare,
  CheckSquare,
  Briefcase,
  Clock,
  Tag,
  Calendar,
  Send,
  MessageCircle,
  FileText,
  PhoneCall,
  Copy,
  Check,
} from "lucide-react";
import { api } from "../../../shared/api/client";
import { Button } from "../../../shared/ui/Button";
import { Badge } from "../../../shared/ui/Badge";
import { PageLoader } from "../../../shared/ui/PageLoader";
import { EmptyState } from "../../../shared/ui/EmptyState";
import { Drawer } from "../../../shared/ui/Drawer";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { format, formatDistanceToNow } from "date-fns";
import { CustomFieldsTab } from "../../../shared/ui/CustomFieldsTab";
import { ru } from "date-fns/locale";
import { formatPhoneForWhatsApp } from "../../../shared/utils/kz";
import { formatMoney } from "../../../shared/utils/format";
import { AiAssistant } from "../../../widgets/ai-assistant/AiAssistant";
import { useCopyToClipboard } from '../../../shared/hooks/useCopyToClipboard';
import { useDocumentTitle } from '../../../shared/hooks/useDocumentTitle';

interface CustomerDetail {
  id: string;
  full_name: string;
  company_name: string;
  phone: string;
  email: string;
  source: string;
  status: string;
  owner: { id: string; full_name: string } | null;
  tags: string[];
  notes: string;
  created_at: string;
  updated_at: string;
  last_contact_at?: string | null;
  follow_up_due_at?: string | null;
  response_state?: string;
  next_action_note?: string;
}
interface Activity {
  id: string;
  type: string;
  payload: Record<string, unknown>;
  actor: { full_name: string } | null;
  created_at: string;
}
interface Deal {
  id: string;
  title: string;
  amount: number | null;
  currency: string;
  status: string;
  stage: { name: string; type: string };
  created_at: string;
}
interface Task {
  id: string;
  title: string;
  priority: string;
  status: string;
  due_at: string | null;
  assigned_to: { full_name: string } | null;
}

const TABS = [
  { key: "overview", label: "Обзор" },
  { key: "activity", label: "Активность" },
  { key: "deals", label: "Сделки" },
  { key: "tasks", label: "Задачи" },
  { key: "fields", label: "Доп. поля" },
];

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  new: { bg: "#DBEAFE", color: "#1D4ED8" },
  active: { bg: "#D1FAE5", color: "#065F46" },
  inactive: { bg: "#F3F4F6", color: "#6B7280" },
  archived: { bg: "#F3F4F6", color: "#9CA3AF" },
};
const STATUS_LABELS: Record<string, string> = {
  new: "Новый",
  active: "Активный",
  inactive: "Неактивный",
  archived: "Архив",
};

const ACTIVITY_META: Record<
  string,
  { icon: ReactNode; color: string; label: string }
> = {
  note: {
    icon: <MessageSquare size={14} />,
    color: "#6B7280",
    label: "Заметка",
  },
  call: { icon: <PhoneCall size={14} />, color: "#3B82F6", label: "Звонок" },
  whatsapp: {
    icon: <MessageCircle size={14} />,
    color: "#10B981",
    label: "WhatsApp",
  },
  email_sent: {
    icon: <Send size={14} />,
    color: "#8B5CF6",
    label: "Email отправлен",
  },
  email_in: {
    icon: <Mail size={14} />,
    color: "#F59E0B",
    label: "Email получен",
  },
  task_created: {
    icon: <CheckSquare size={14} />,
    color: "#D97706",
    label: "Задача",
  },
  task_done: {
    icon: <CheckSquare size={14} />,
    color: "#10B981",
    label: "Задача выполнена",
  },
  deal_created: {
    icon: <Briefcase size={14} />,
    color: "#D97706",
    label: "Сделка",
  },
  stage_change: {
    icon: <Briefcase size={14} />,
    color: "#3B82F6",
    label: "Этап изменён",
  },
  status_change: {
    icon: <Tag size={14} />,
    color: "#EC4899",
    label: "Статус изменён",
  },
  document_sent: {
    icon: <FileText size={14} />,
    color: "#06B6D4",
    label: "Документ отправлен",
  },
};
const DEFAULT_ACTIVITY = {
  icon: <Clock size={14} />,
  color: "#9CA3AF",
  label: "Событие",
};

function CopyableValue({ value, href, children }: { value: string; href?: string; children: React.ReactNode }) {
  const [copied, setCopied] = useState(false);
  const copyToClipboard = useCopyToClipboard();
  const copy = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    copyToClipboard(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
      {href ? <a href={href} style={{ color: "var(--color-text-primary)", textDecoration: "none" }}>{children}</a> : children}
      <button
        onClick={copy}
        title="Копировать"
        style={{
          background: "none", border: "none", cursor: "pointer", padding: "0 2px",
          color: copied ? "#10B981" : "var(--color-text-muted)", display: "flex", transition: "color 0.15s",
        }}
      >
        {copied ? <Check size={12} /> : <Copy size={12} />}
      </button>
    </div>
  );
}

function ContactItem({
  icon,
  label,
  value,
  href,
}: {
  icon: ReactNode;
  label: string;
  value: ReactNode;
  href?: string;
}) {
  if (!value) return null;
  const content = (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <span
        style={{
          width: 32,
          height: 32,
          borderRadius: "var(--radius-md)",
          background: "var(--color-bg-muted)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--color-text-secondary)",
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
            fontSize: 13,
            fontWeight: 500,
            color: "var(--color-text-primary)",
          }}
        >
          {value}
        </div>
      </div>
    </div>
  );
  return href ? (
    <a href={href} style={{ textDecoration: "none" }}>
      {content}
    </a>
  ) : (
    content
  );
}

type NoteType = "note" | "call" | "whatsapp" | "email_sent";
interface NoteFormData {
  body: string;
  type: NoteType;
  subject?: string;
  duration_minutes?: number;
}



const RESPONSE_STATES: Record<string, { label: string; color: string; bg: string }> = {
  waiting_reply: { label: 'Ждём ответа', color: '#D97706', bg: '#FEF3C7' },
  replied: { label: 'Ответил', color: '#065F46', bg: '#D1FAE5' },
  no_response: { label: 'Не отвечает', color: '#991B1B', bg: '#FEE2E2' },
  not_contacted: { label: 'Не связались', color: '#6B7280', bg: '#F3F4F6' },
};

function FollowUpBar({ customer, onUpdated }: { customer: CustomerDetail; onUpdated: () => void }) {
  const [open, setOpen] = useState(false);
  const [dueDate, setDueDate] = useState('');
  const [state, setState] = useState(customer.response_state ?? '');
  const [note, setNote] = useState('');
  const qc = useQueryClient();
  useEffect(() => { setState(customer.response_state ?? ''); }, [customer.response_state]);

  const mutation = useMutation({
    mutationFn: () => api.post(`/customers/${customer.id}/follow-up/`, {
      follow_up_due_at: dueDate || null,
      response_state: state,
      note,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['customer', customer.id] });
      qc.invalidateQueries({ queryKey: ['customer-activities', customer.id] });
      toast.success('Follow-up сохранён');
      setOpen(false);
      setNote('');
      onUpdated();
    },
  });

  const rs = RESPONSE_STATES[customer.response_state ?? ''];
  const isOverdue = !!(customer.follow_up_due_at && new Date(customer.follow_up_due_at) < new Date());

  return <div style={{ marginBottom: 12 }}>
    <div onClick={() => setOpen((v) => !v)} style={{ display:'flex', gap:8, alignItems:'center', padding:'8px 12px', border:'1px solid var(--color-border)', borderRadius:'var(--radius-md)', cursor:'pointer', background: isOverdue ? '#FFF1F1' : 'var(--color-bg-muted)' }}>
      <span style={{ fontSize: 13 }}>🎯</span>
      <div style={{ flex:1, fontSize:12 }}>Follow-up {customer.follow_up_due_at && <span style={{ color: isOverdue ? '#EF4444' : 'var(--color-text-muted)' }}>{format(new Date(customer.follow_up_due_at), 'd MMM HH:mm', { locale: ru })}</span>}</div>
      {rs && <span style={{ fontSize:11, fontWeight:600, padding:'2px 8px', borderRadius: 99, color: rs.color, background: rs.bg }}>{rs.label}</span>}
    </div>
    <AnimatePresence>{open && <motion.div initial={{opacity:0,height:0}} animate={{opacity:1,height:'auto'}} exit={{opacity:0,height:0}} style={{overflow:'hidden'}}>
      <div style={{ padding: 12, border:'1px solid var(--color-border)', borderTop:'none', borderRadius:'0 0 var(--radius-md) var(--radius-md)', display:'grid', gap:8 }}>
        <input type="datetime-local" value={dueDate} onChange={(e)=>setDueDate(e.target.value)} className="crm-input" />
        <select value={state} onChange={(e)=>setState(e.target.value)} className="crm-input">
          <option value="">— не указан —</option>
          {Object.entries(RESPONSE_STATES).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <textarea value={note} onChange={(e)=>setNote(e.target.value)} placeholder="Заметка" className="crm-textarea" style={{ minHeight: 52 }} />
        <div style={{ display:'flex', justifyContent:'flex-end', gap:8 }}>
          <Button variant="secondary" size="sm" onClick={() => setOpen(false)}>Отмена</Button>
          <Button size="sm" loading={mutation.isPending} onClick={() => mutation.mutate()}>Сохранить</Button>
        </div>
      </div>
    </motion.div>}</AnimatePresence>
  </div>;
}

function TemplateQuickPick({ channel, onSelect }: { channel: string; onSelect: (body: string) => void }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const { data } = useQuery<{ results: Array<{ id: string; name: string; body: string; shortcut: string }> }>({
    queryKey: ['msg-templates', channel],
    queryFn: () => api.get('/message-templates/', { channel }),
    enabled: open,
    staleTime: 30_000,
  });
  const templates = data?.results ?? [];
  const filtered = q ? templates.filter((t) => t.name.toLowerCase().includes(q.toLowerCase()) || (t.shortcut || '').includes(q)) : templates;
  if (!open) return <button type="button" onClick={() => setOpen(true)} style={{ fontSize: 11, border: '1px solid var(--color-amber)', borderRadius:'var(--radius-sm)', background:'none', color:'var(--color-amber)', padding:'2px 8px' }}>📋 Шаблон</button>;
  return <div style={{ border:'1px solid var(--color-border)', borderRadius:'var(--radius-md)', background:'var(--color-bg-elevated)' }}>
    <div style={{ display:'flex', gap:6, padding:'6px 8px', borderBottom:'1px solid var(--color-border)' }}>
      <input autoFocus value={q} onChange={(e)=>setQ(e.target.value)} placeholder="Поиск" className="crm-input" style={{ flex:1, fontSize:12, height:28 }} />
      <button type="button" onClick={() => setOpen(false)} style={{ background:'none', border:'none' }}>✕</button>
    </div>
    <div style={{ maxHeight: 180, overflowY: 'auto' }}>
      {filtered.map((t) => <button key={t.id} type="button" onClick={() => { onSelect(t.body); setOpen(false); api.post(`/message-templates/${t.id}/use/`); }} style={{ width:'100%', textAlign:'left', background:'none', border:'none', borderBottom:'1px solid var(--color-border)', padding:'8px 10px' }}>
        <div style={{ fontSize:12, fontWeight:600 }}>{t.name} <span style={{ fontSize:10, color:'var(--color-text-muted)' }}>{t.shortcut}</span></div>
        <div style={{ fontSize:11, color:'var(--color-text-muted)' }}>{t.body.slice(0, 80)}</div>
      </button>)}
    </div>
  </div>;
}

const TYPE_LABELS: Record<NoteType, string> = {
  note: "💬 Заметка",
  call: "📞 Звонок",
  whatsapp: "📱 WhatsApp",
  email_sent: "✉️ Email",
};

function NoteForm({
  customerId,
  dealId,
  onSuccess,
}: {
  customerId?: string;
  dealId?: string;
  onSuccess: () => void;
}) {
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { isSubmitting },
  } = useForm<NoteFormData>({ defaultValues: { type: "note" } });
  const noteType = watch("type");
  const mutation = useMutation({
    mutationFn: (data: NoteFormData) =>
      api.post("/activities/", {
        ...data,
        customer_id: customerId,
        deal_id: dealId,
      }),
    onSuccess: () => {
      onSuccess();
      reset({ type: noteType });
      toast.success("Добавлено");
    },
  });
  return (
    <form
      onSubmit={handleSubmit((d) => mutation.mutate(d))}
      style={{ display: "flex", flexDirection: "column", gap: 10 }}
    >
      <div style={{ display: "flex", gap: 4 }}>
        {(Object.keys(TYPE_LABELS) as NoteType[]).map((t) => (
          <label
            key={t}
            style={{
              padding: "4px 10px",
              borderRadius: "var(--radius-full)",
              fontSize: 12,
              fontWeight: 500,
              cursor: "pointer",
              fontFamily: "var(--font-body)",
              background:
                noteType === t ? "var(--color-amber)" : "var(--color-bg-muted)",
              color: noteType === t ? "#fff" : "var(--color-text-secondary)",
              border: `1px solid ${noteType === t ? "var(--color-amber)" : "var(--color-border)"}`,
              transition: "all var(--transition-fast)",
            }}
          >
            <input
              type="radio"
              {...register("type")}
              value={t}
              style={{ display: "none" }}
            />
            {TYPE_LABELS[t]}
          </label>
        ))}
        <div style={{ marginLeft: "auto" }}>
          <TemplateQuickPick
            channel={noteType === "email_sent" ? "email" : noteType === "call" ? "call" : noteType}
            onSelect={(body) => setValue("body", body)}
          />
        </div>
      </div>

      {noteType === "email_sent" && (
        <input
          {...register("subject")}
          placeholder="Тема письма"
          className="crm-input"
          style={{ fontSize: 13 }}
        />
      )}
      {noteType === "call" && (
        <input
          type="number"
          {...register("duration_minutes")}
          placeholder="Длительность (мин)"
          className="crm-input"
          style={{ fontSize: 13 }}
        />
      )}

      <textarea
        {...register("body", { required: true })}
        className="crm-textarea"
        placeholder={
          noteType === "call"
            ? "Итог звонка..."
            : noteType === "whatsapp"
              ? "Что обсудили..."
              : noteType === "email_sent"
                ? "Текст / краткое содержание..."
                : "Написать заметку..."
        }
        style={{ minHeight: 72 }}
      />
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <Button size="sm" loading={isSubmitting} type="submit">
          Сохранить
        </Button>
      </div>
    </form>
  );
}

export default function CustomerProfilePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState("overview");
  const [editDrawer, setEditDrawer] = useState(false);

  const { data: customer, isLoading } = useQuery<CustomerDetail>({
    queryKey: ["customer", id],
    queryFn: () => api.get(`/customers/${id}/`),
  });
  useDocumentTitle(customer?.full_name);
  const { data: activities } = useQuery<{ results: Activity[] }>({
    queryKey: ["customer-activities", id],
    queryFn: () => api.get(`/customers/${id}/activities/`),
    enabled: activeTab === "activity" || activeTab === "overview",
  });
  const { data: deals } = useQuery<{ results: Deal[] }>({
    queryKey: ["customer-deals", id],
    queryFn: () => api.get(`/customers/${id}/deals/`),
    enabled: activeTab === "deals" || activeTab === "overview",
  });
  const { data: tasks } = useQuery<{ results: Task[] }>({
    queryKey: ["customer-tasks", id],
    queryFn: () => api.get(`/customers/${id}/tasks/`),
    enabled: activeTab === "tasks",
  });

  const {
    register,
    handleSubmit,
    reset: resetEdit,
    formState: { isSubmitting: editSubmitting },
  } = useForm<Partial<CustomerDetail>>();

  const updateMutation = useMutation({
    mutationFn: (data: Partial<CustomerDetail>) =>
      api.patch(`/customers/${id}/`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["customer", id] });
      qc.invalidateQueries({ queryKey: ["customers"] });
      toast.success("Клиент обновлён");
      setEditDrawer(false);
    },
  });

  if (isLoading) return <PageLoader />;
  if (!customer)
    return <EmptyState icon={<User size={22} />} title="Клиент не найден" />;

  const sc = STATUS_COLORS[customer.status] ?? STATUS_COLORS.new;
  const activeDeals = deals?.results.filter((d) => d.status === "open") ?? [];

  return (
    <div style={{ maxWidth: 1000, animation: "slideUp 0.25s ease" }}>
      <button
        onClick={() => navigate("/customers")}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          marginBottom: 20,
          fontSize: 13,
          color: "var(--color-text-secondary)",
          background: "none",
          border: "none",
          cursor: "pointer",
          padding: 0,
          fontFamily: "var(--font-body)",
        }}
      >
        <ChevronLeft size={16} /> Назад к клиентам
      </button>

      <div
        style={{
          background: "var(--color-bg-elevated)",
          border: "1px solid var(--color-border)",
          borderRadius: "var(--radius-xl)",
          padding: "24px 28px",
          marginBottom: 16,
          boxShadow: "var(--shadow-sm)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 16,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: "var(--radius-lg)",
                background: "var(--color-amber-light)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 20,
                fontWeight: 700,
                color: "var(--color-amber)",
                fontFamily: "var(--font-display)",
                flexShrink: 0,
              }}
            >
              {customer.full_name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1
                style={{
                  fontSize: 22,
                  fontWeight: 700,
                  fontFamily: "var(--font-display)",
                  margin: 0,
                }}
              >
                {customer.full_name}
              </h1>
              {customer.company_name && (
                <div
                  style={{
                    fontSize: 14,
                    color: "var(--color-text-secondary)",
                    marginTop: 3,
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                  }}
                >
                  <Building2 size={13} />
                  {customer.company_name}
                </div>
              )}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginTop: 8,
                }}
              >
                <Badge bg={sc.bg} color={sc.color}>
                  {STATUS_LABELS[customer.status]}
                </Badge>
                {customer.source && (
                  <span
                    style={{
                      fontSize: 11,
                      color: "var(--color-text-muted)",
                      background: "var(--color-bg-muted)",
                      padding: "2px 8px",
                      borderRadius: "var(--radius-full)",
                    }}
                  >
                    {customer.source}
                  </span>
                )}
                {activeDeals.length > 0 && (
                  <span
                    style={{
                      fontSize: 11,
                      color: "#065F46",
                      background: "#D1FAE5",
                      padding: "2px 8px",
                      borderRadius: "var(--radius-full)",
                    }}
                  >
                    {activeDeals.length} активных сделок
                  </span>
                )}
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
            <Button
              variant="secondary"
              size="sm"
              icon={<Edit3 size={13} />}
              onClick={() => {
                resetEdit(customer);
                setEditDrawer(true);
              }}
            >
              Редактировать
            </Button>
            <Button
              size="sm"
              icon={<Plus size={13} />}
              onClick={() => navigate("/deals")}
            >
              Сделка
            </Button>
          </div>
        </div>

        <div
          style={{ display: "flex", gap: 24, marginTop: 20, flexWrap: "wrap" }}
        >
          {customer.phone && (
            <ContactItem
              icon={<Phone size={14} />}
              label="Телефон"
              value={<CopyableValue value={customer.phone} href={`tel:${customer.phone}`}>{customer.phone}</CopyableValue>}
            />
          )}
          {customer.phone && (
            <a
              href={`https://wa.me/${formatPhoneForWhatsApp(customer.phone)}?text=${encodeURIComponent(`Добрый день, ${customer.full_name}!`)}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ textDecoration: "none" }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  cursor: "pointer",
                }}
              >
                <span
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: "var(--radius-md)",
                    background: "#D1FAE5",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#059669",
                    flexShrink: 0,
                  }}
                >
                  <MessageCircle size={14} />
                </span>
                <div>
                  <div
                    style={{ fontSize: 11, color: "var(--color-text-muted)" }}
                  >
                    WhatsApp
                  </div>
                  <div
                    style={{ fontSize: 13, fontWeight: 500, color: "#059669" }}
                  >
                    Написать в WhatsApp
                  </div>
                </div>
              </div>
            </a>
          )}
          {customer.email && (
            <ContactItem
              icon={<Mail size={14} />}
              label="Email"
              value={<CopyableValue value={customer.email} href={`mailto:${customer.email}`}>{customer.email}</CopyableValue>}
            />
          )}
          {customer.owner && (
            <ContactItem
              icon={<User size={14} />}
              label="Ответственный"
              value={customer.owner.full_name}
            />
          )}
          <ContactItem
            icon={<Calendar size={14} />}
            label="Добавлен"
            value={format(new Date(customer.created_at), "d MMM yyyy", {
              locale: ru,
            })}
          />
        </div>
      </div>

      <div
        style={{
          display: "flex",
          gap: 2,
          background: "var(--color-bg-elevated)",
          border: "1px solid var(--color-border)",
          borderRadius: "var(--radius-lg)",
          padding: "4px",
          marginBottom: 16,
          width: "fit-content",
        }}
      >
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              padding: "6px 16px",
              borderRadius: "var(--radius-md)",
              border: "none",
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 500,
              fontFamily: "var(--font-body)",
              background:
                activeTab === tab.key ? "var(--color-amber)" : "transparent",
              color:
                activeTab === tab.key ? "#fff" : "var(--color-text-secondary)",
              transition:
                "background var(--transition-fast), color var(--transition-fast)",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.15 }}
        >
          {activeTab === "overview" && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 16,
              }}
            >
              <FollowUpBar
                customer={customer}
                onUpdated={() => qc.invalidateQueries({ queryKey: ["customer", id] })}
              />
              <div
                style={{
                  background: "var(--color-bg-elevated)",
                  border: "1px solid var(--color-border)",
                  borderRadius: "var(--radius-lg)",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    padding: "14px 18px",
                    borderBottom: "1px solid var(--color-border)",
                    fontSize: 13,
                    fontWeight: 600,
                  }}
                >
                  Последняя активность
                </div>
                <div style={{ padding: "12px 18px" }}>
                  <NoteForm
                    customerId={id!}
                    onSuccess={() =>
                      qc.invalidateQueries({
                        queryKey: ["customer-activities", id],
                      })
                    }
                  />
                </div>
                <div>
                  {(activities?.results ?? []).slice(0, 5).map((act) => (
                    <div
                      key={act.id}
                      style={{
                        display: "flex",
                        gap: 10,
                        padding: "10px 18px",
                        borderTop: "1px solid var(--color-border)",
                      }}
                    >
                      <span
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: "var(--radius-md)",
                          background: "var(--color-bg-muted)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "var(--color-text-muted)",
                          flexShrink: 0,
                          marginTop: 1,
                        }}
                      >
                        {(ACTIVITY_META[act.type] ?? DEFAULT_ACTIVITY).icon}
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: 12,
                            color: "var(--color-text-secondary)",
                            lineHeight: 1.5,
                          }}
                        >
                          {(act.payload as any)?.body ?? act.type}
                        </div>
                        <div
                          style={{
                            fontSize: 11,
                            color: "var(--color-text-muted)",
                            marginTop: 2,
                          }}
                        >
                          {act.actor?.full_name && (
                            <>{act.actor.full_name} · </>
                          )}
                          {formatDistanceToNow(new Date(act.created_at), {
                            addSuffix: true,
                            locale: ru,
                          })}
                        </div>
                      </div>
                    </div>
                  ))}
                  {(activities?.results ?? []).length === 0 && (
                    <div
                      style={{
                        padding: "20px 18px",
                        textAlign: "center",
                        fontSize: 12,
                        color: "var(--color-text-muted)",
                      }}
                    >
                      Активностей пока нет
                    </div>
                  )}
                </div>
              </div>

              <div
                style={{
                  background: "var(--color-bg-elevated)",
                  border: "1px solid var(--color-border)",
                  borderRadius: "var(--radius-lg)",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    padding: "14px 18px",
                    borderBottom: "1px solid var(--color-border)",
                    fontSize: 13,
                    fontWeight: 600,
                    display: "flex",
                    justifyContent: "space-between",
                  }}
                >
                  <span>Сделки</span>
                  <button
                    onClick={() => navigate("/deals")}
                    style={{
                      fontSize: 12,
                      color: "var(--color-amber)",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      fontFamily: "var(--font-body)",
                    }}
                  >
                    + Создать
                  </button>
                </div>
                {(deals?.results ?? []).length === 0 ? (
                  <div
                    style={{
                      padding: "24px",
                      textAlign: "center",
                      fontSize: 12,
                      color: "var(--color-text-muted)",
                    }}
                  >
                    Сделок нет. Создайте первую.
                  </div>
                ) : (
                  (deals?.results ?? []).map((deal) => {
                    const stageColors: Record<string, string> = {
                      won: "#10B981",
                      lost: "#EF4444",
                      open: "var(--color-amber)",
                    };
                    return (
                      <motion.div
                        key={deal.id}
                        whileHover={{
                          backgroundColor: "var(--color-bg-muted)",
                        }}
                        onClick={() => navigate(`/deals/${deal.id}`)}
                        style={{
                          padding: "12px 18px",
                          borderBottom: "1px solid var(--color-border)",
                          cursor: "pointer",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                          }}
                        >
                          <span style={{ fontSize: 13, fontWeight: 500 }}>
                            {deal.title}
                          </span>
                          {deal.amount && (
                            <span
                              style={{
                                fontSize: 13,
                                fontWeight: 700,
                                color: "var(--color-amber)",
                                fontFamily: "var(--font-display)",
                              }}
                            >
                              {formatMoney(deal.amount, deal.currency)}
                            </span>
                          )}
                        </div>
                        <div
                          style={{
                            fontSize: 11,
                            color:
                              stageColors[deal.stage.type] ??
                              "var(--color-text-muted)",
                            marginTop: 3,
                          }}
                        >
                          {deal.stage.name}
                        </div>
                      </motion.div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {activeTab === "activity" && (
            <div
              style={{
                background: "var(--color-bg-elevated)",
                border: "1px solid var(--color-border)",
                borderRadius: "var(--radius-lg)",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  padding: "16px 20px",
                  borderBottom: "1px solid var(--color-border)",
                }}
              >
                <NoteForm
                  customerId={id!}
                  onSuccess={() =>
                    qc.invalidateQueries({
                      queryKey: ["customer-activities", id],
                    })
                  }
                />
              </div>
              <div>
                {(activities?.results ?? []).map((act, idx) => {
                  const meta = ACTIVITY_META[act.type] ?? DEFAULT_ACTIVITY;
                  const p = act.payload as any;
                  return (
                    <motion.div
                      key={act.id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.03 }}
                      style={{
                        display: "flex",
                        gap: 12,
                        padding: "14px 20px",
                        borderBottom: "1px solid var(--color-border)",
                      }}
                    >
                      <span
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: "var(--radius-md)",
                          background: `${meta.color}18`,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: meta.color,
                          flexShrink: 0,
                        }}
                      >
                        {meta.icon}
                      </span>
                      <div style={{ flex: 1 }}>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            marginBottom: 3,
                          }}
                        >
                          <span
                            style={{
                              fontSize: 12,
                              fontWeight: 600,
                              color: meta.color,
                            }}
                          >
                            {meta.label}
                          </span>
                          {p?.subject && (
                            <span
                              style={{
                                fontSize: 12,
                                color: "var(--color-text-secondary)",
                              }}
                            >
                              · {p.subject}
                            </span>
                          )}
                          {p?.duration_minutes && (
                            <span
                              style={{
                                fontSize: 11,
                                color: "var(--color-text-muted)",
                              }}
                            >
                              {p.duration_minutes} мин
                            </span>
                          )}
                        </div>
                        {p?.body && (
                          <div
                            style={{
                              fontSize: 13,
                              lineHeight: 1.6,
                              color: "var(--color-text-primary)",
                              whiteSpace: "pre-wrap",
                            }}
                          >
                            {p.body}
                          </div>
                        )}
                        <div
                          style={{
                            fontSize: 11,
                            color: "var(--color-text-muted)",
                            marginTop: 4,
                          }}
                        >
                          {act.actor?.full_name && <b>{act.actor.full_name}</b>}
                          {act.actor && " · "}
                          {format(new Date(act.created_at), "d MMM, HH:mm", {
                            locale: ru,
                          })}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
                {(activities?.results ?? []).length === 0 && (
                  <EmptyState
                    icon={<Clock size={20} />}
                    title="Активностей нет"
                    subtitle="Добавьте заметку выше"
                  />
                )}
              </div>
            </div>
          )}

          {activeTab === "deals" && (
            <div
              style={{
                background: "var(--color-bg-elevated)",
                border: "1px solid var(--color-border)",
                borderRadius: "var(--radius-lg)",
                overflow: "hidden",
              }}
            >
              {(deals?.results ?? []).length === 0 ? (
                <EmptyState
                  icon={<Briefcase size={20} />}
                  title="Сделок нет"
                  subtitle="Создайте первую сделку"
                />
              ) : (
                (deals?.results ?? []).map((deal) => {
                  return (
                    <motion.div
                      key={deal.id}
                      whileHover={{ backgroundColor: "var(--color-bg-muted)" }}
                      onClick={() => navigate(`/deals/${deal.id}`)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "14px 20px",
                        borderBottom: "1px solid var(--color-border)",
                        cursor: "pointer",
                      }}
                    >
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 500 }}>
                          {deal.title}
                        </div>
                        <div
                          style={{
                            fontSize: 11,
                            color: "var(--color-text-muted)",
                            marginTop: 2,
                          }}
                        >
                          {deal.stage.name} ·{" "}
                          {format(new Date(deal.created_at), "d MMM yyyy", {
                            locale: ru,
                          })}
                        </div>
                      </div>
                      {deal.amount && (
                        <span
                          style={{
                            fontSize: 14,
                            fontWeight: 700,
                            color: "var(--color-amber)",
                            fontFamily: "var(--font-display)",
                          }}
                        >
                          {formatMoney(deal.amount, deal.currency)}
                        </span>
                      )}
                    </motion.div>
                  );
                })
              )}
            </div>
          )}

          {activeTab === "fields" && id && (
            <CustomFieldsTab entityType="customer" entityId={id} />
          )}

          {activeTab === "tasks" && (
            <div
              style={{
                background: "var(--color-bg-elevated)",
                border: "1px solid var(--color-border)",
                borderRadius: "var(--radius-lg)",
                overflow: "hidden",
              }}
            >
              {(tasks?.results ?? []).length === 0 ? (
                <EmptyState
                  icon={<CheckSquare size={20} />}
                  title="Задач нет"
                />
              ) : (
                (tasks?.results ?? []).map((task) => {
                  const priorityColors: Record<
                    string,
                    { bg: string; color: string }
                  > = {
                    low: { bg: "#F3F4F6", color: "#6B7280" },
                    medium: { bg: "#FEF3C7", color: "#D97706" },
                    high: { bg: "#FEE2E2", color: "#DC2626" },
                  };
                  const pc =
                    priorityColors[task.priority] ?? priorityColors.low;
                  return (
                    <div
                      key={task.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        padding: "12px 20px",
                        borderBottom: "1px solid var(--color-border)",
                      }}
                    >
                      <div
                        style={{
                          width: 18,
                          height: 18,
                          borderRadius: "var(--radius-sm)",
                          border: `2px solid ${task.status === "done" ? "#10B981" : "var(--color-border-strong)"}`,
                          background:
                            task.status === "done" ? "#10B981" : "transparent",
                          flexShrink: 0,
                        }}
                      />
                      <div style={{ flex: 1 }}>
                        <div
                          style={{
                            fontSize: 13,
                            fontWeight: 500,
                            textDecoration:
                              task.status === "done" ? "line-through" : "none",
                            color:
                              task.status === "done"
                                ? "var(--color-text-muted)"
                                : "var(--color-text-primary)",
                          }}
                        >
                          {task.title}
                        </div>
                        {task.due_at && (
                          <div
                            style={{
                              fontSize: 11,
                              color: "var(--color-text-muted)",
                              marginTop: 2,
                            }}
                          >
                            {format(new Date(task.due_at), "d MMM, HH:mm", {
                              locale: ru,
                            })}
                          </div>
                        )}
                      </div>
                      <Badge bg={pc.bg} color={pc.color}>
                        {task.priority}
                      </Badge>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      <Drawer
        open={editDrawer}
        onClose={() => setEditDrawer(false)}
        title="Редактировать клиента"
        footer={
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <Button variant="secondary" onClick={() => setEditDrawer(false)}>
              Отмена
            </Button>
            <Button
              loading={editSubmitting}
              onClick={handleSubmit((d) => updateMutation.mutate(d))}
            >
              Сохранить
            </Button>
          </div>
        }
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {(
            [
              { label: "Имя *", name: "full_name", placeholder: "Иван Иванов" },
              {
                label: "Компания",
                name: "company_name",
                placeholder: "ТОО Название",
              },
              {
                label: "Телефон",
                name: "phone",
                placeholder: "+7 700 000 00 00",
              },
              { label: "Email", name: "email", placeholder: "ivan@company.kz" },
              { label: "Источник", name: "source", placeholder: "Instagram" },
            ] as const
          ).map((f) => (
            <div
              key={f.name}
              style={{ display: "flex", flexDirection: "column", gap: 6 }}
            >
              <label
                style={{
                  fontSize: 12,
                  fontWeight: 500,
                  color: "var(--color-text-secondary)",
                }}
              >
                {f.label}
              </label>
              <input
                {...register(f.name as any)}
                placeholder={f.placeholder}
                className="crm-input"
              />
            </div>
          ))}
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label
              style={{
                fontSize: 12,
                fontWeight: 500,
                color: "var(--color-text-secondary)",
              }}
            >
              Статус
            </label>
            <select {...register("status")} className="crm-select">
              <option value="new">Новый</option>
              <option value="active">Активный</option>
              <option value="inactive">Неактивный</option>
              <option value="archived">Архив</option>
            </select>
          </div>
        </div>
      </Drawer>
      <AiAssistant customerId={id} />
    </div>
  );
}
