import { useQuery } from '@tanstack/react-query';
import type { ElementType } from 'react';
import { motion } from 'framer-motion';
import {
  MessageSquare, Phone, Mail, Zap, CheckSquare,
  UserPlus, Briefcase, ArrowRight, Activity,
} from 'lucide-react';
import { api } from '../../shared/api/client';
import { PageHeader } from '../../shared/ui/PageHeader';
import { Skeleton } from '../../shared/ui/Skeleton';
import { EmptyState } from '../../shared/ui/EmptyState';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';

interface FeedItem {
  id: string;
  type: string;
  payload: Record<string, any>;
  actor: { id: string; full_name: string } | null;
  customer: { id: string; full_name: string } | null;
  deal: { id: string; title: string } | null;
  created_at: string;
}

const TYPE_META: Record<string, { icon: ElementType; color: string; label: string }> = {
  note: { icon: MessageSquare, color: '#6366F1', label: 'Заметка' },
  call: { icon: Phone, color: '#10B981', label: 'Звонок' },
  email_sent: { icon: Mail, color: '#3B82F6', label: 'Email отправлен' },
  email_in: { icon: Mail, color: '#8B5CF6', label: 'Email получен' },
  whatsapp: { icon: MessageSquare, color: '#25D366', label: 'WhatsApp' },
  status_change: { icon: ArrowRight, color: '#F59E0B', label: 'Смена статуса' },
  stage_change: { icon: ArrowRight, color: '#F59E0B', label: 'Смена стадии' },
  deal_created: { icon: Briefcase, color: '#EC4899', label: 'Сделка создана' },
  task_created: { icon: CheckSquare, color: '#14B8A6', label: 'Задача создана' },
  task_done: { icon: CheckSquare, color: '#10B981', label: 'Задача выполнена' },
  customer_created: { icon: UserPlus, color: '#F97316', label: 'Клиент добавлен' },
};

function FeedCard({ item }: { item: FeedItem }) {
  const navigate = useNavigate();
  const meta = TYPE_META[item.type] ?? { icon: Zap, color: '#6B7280', label: item.type };
  const Icon = meta.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        display: 'flex', gap: 12, padding: '14px 0',
        borderBottom: '1px solid var(--color-border)',
      }}
    >
      <div style={{
        width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
        background: `${meta.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon size={16} style={{ color: meta.color }} />
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, color: 'var(--color-text-primary)', lineHeight: 1.4 }}>
          <span style={{ fontWeight: 600 }}>{item.actor?.full_name ?? 'Система'}</span>
          {' — '}
          <span style={{ color: 'var(--color-text-secondary)' }}>{meta.label}</span>
          {item.customer && (
            <>
              {' для '}
              <button
                onClick={() => item.customer && navigate(`/customers/${item.customer.id}`)}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                  color: 'var(--color-amber)', fontWeight: 600, fontSize: 13,
                }}
              >
                {item.customer?.full_name}
              </button>
            </>
          )}
          {item.deal && (
            <>
              {' по сделке '}
              <button
                onClick={() => item.deal && navigate(`/deals/${item.deal.id}`)}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                  color: 'var(--color-amber)', fontWeight: 600, fontSize: 13,
                }}
              >
                {item.deal?.title}
              </button>
            </>
          )}
        </div>
        {item.payload?.body && (
          <div style={{
            fontSize: 12, color: 'var(--color-text-muted)', marginTop: 4,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {item.payload.body}
          </div>
        )}
        <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 4 }}>
          {formatDistanceToNow(new Date(item.created_at), { addSuffix: true, locale: ru })}
        </div>
      </div>
    </motion.div>
  );
}

export default function FeedPage() {
  const { data, isLoading } = useQuery<FeedItem[]>({
    queryKey: ['feed'],
    queryFn: () => api.get('/feed/'),
    refetchInterval: 30_000,
  });

  return (
    <div style={{ padding: '24px 28px', maxWidth: 760 }}>
      <PageHeader title="Лента активности" subtitle="Все события организации в реальном времени" />

      {isLoading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 24 }}>
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <Skeleton style={{ width: 36, height: 36, borderRadius: '50%' }} />
              <div style={{ flex: 1 }}>
                <Skeleton style={{ width: '60%', height: 14, marginBottom: 6 }} />
                <Skeleton style={{ width: '40%', height: 11 }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {!isLoading && (!data || data.length === 0) && (
        <EmptyState icon={<Activity size={22} />} title="Лента пуста" subtitle="Активность появится после первых действий в системе" />
      )}

      {!isLoading && data && data.length > 0 && (
        <div style={{ marginTop: 8 }}>
          {data.map((item) => <FeedCard key={item.id} item={item} />)}
        </div>
      )}
    </div>
  );
}
