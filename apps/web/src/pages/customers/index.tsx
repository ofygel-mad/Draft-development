import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, User, Filter, X, Check, Trash2, UserCog, Tag } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../shared/api/client';
import type { Customer } from '../../entities/customer/model/types';
import { STATUS_LABELS, STATUS_COLORS } from '../../entities/customer/model/types';
import { PageHeader } from '../../shared/ui/PageHeader';
import { Button } from '../../shared/ui/Button';
import { SearchInput } from '../../shared/ui/SearchInput';
import { Badge } from '../../shared/ui/Badge';
import { Skeleton } from '../../shared/ui/Skeleton';
import { Drawer } from '../../shared/ui/Drawer';
import { EmptyState } from '../../shared/ui/EmptyState';
import { useDebounce } from '../../shared/hooks/useDebounce';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { useIsMobile } from '../../shared/hooks/useIsMobile';
import { validateBinIin, formatBinIin, isBin } from '../../shared/utils/kz';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text-secondary)' }}>{label}</label>
      {children}
    </div>
  );
}

interface Filters { status: string; source: string; owner_id: string; created_after: string; created_before: string; }
const EMPTY: Filters = { status: '', source: '', owner_id: '', created_after: '', created_before: '' };
const countActive = (f: Filters) => Object.values(f).filter(Boolean).length;

function CheckboxIcon({ checked, indeterminate }: { checked: boolean; indeterminate?: boolean }) {
  return (
    <motion.div animate={{ scale: checked || indeterminate ? 1 : 0.95 }}
      style={{ width: 16, height: 16, borderRadius: 4, flexShrink: 0,
        border: `1.5px solid ${checked || indeterminate ? 'var(--color-amber)' : 'var(--color-border)'}`,
        background: checked || indeterminate ? 'var(--color-amber)' : 'transparent',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'all var(--transition-fast)' }}>
      {checked && <Check size={10} style={{ color: 'white' }} />}
      {indeterminate && !checked && <div style={{ width: 8, height: 2, background: 'white', borderRadius: 1 }} />}
    </motion.div>
  );
}

function Chip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
      style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '3px 8px 3px 10px',
        background: 'var(--color-amber-light)', border: '1px solid var(--color-amber)',
        borderRadius: 'var(--radius-full)', fontSize: 12, color: 'var(--color-amber-dark)' }}>
      {label}
      <button onClick={onRemove} style={{ background: 'none', border: 'none', cursor: 'pointer',
        color: 'var(--color-amber-dark)', padding: 0, display: 'flex', alignItems: 'center' }}>
        <X size={11} />
      </button>
    </motion.div>
  );
}

function FilterPanel({ open, onClose, filters, onChange }: {
  open: boolean; onClose: () => void; filters: Filters; onChange: (f: Filters) => void;
}) {
  const [local, setLocal] = useState<Filters>(filters);
  const { data: team } = useQuery<{ results: any[] }>({
    queryKey: ['team'], queryFn: () => api.get('/users/team/'), enabled: open,
  });
  return (
    <Drawer open={open} onClose={onClose} title="Фильтры"
      footer={
        <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between' }}>
          <Button variant="ghost" size="sm" onClick={() => { setLocal(EMPTY); onChange(EMPTY); onClose(); }}>Сбросить</Button>
          <Button size="sm" onClick={() => { onChange(local); onClose(); }}>Применить</Button>
        </div>
      }>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Field label="Статус">
          <select value={local.status} onChange={(e) => setLocal(f => ({ ...f, status: e.target.value }))} className="crm-input">
            <option value="">Все</option>
            <option value="new">Новый</option>
            <option value="active">Активный</option>
            <option value="inactive">Неактивный</option>
            <option value="archived">Архив</option>
          </select>
        </Field>
        <Field label="Источник">
          <input value={local.source} onChange={(e) => setLocal(f => ({ ...f, source: e.target.value }))}
            placeholder="Instagram, сайт..." className="crm-input" />
        </Field>
        <Field label="Ответственный">
          <select value={local.owner_id} onChange={(e) => setLocal(f => ({ ...f, owner_id: e.target.value }))} className="crm-input">
            <option value="">Все</option>
            {(team?.results ?? []).map((u: any) => <option key={u.id} value={u.id}>{u.full_name}</option>)}
          </select>
        </Field>
        <Field label="Добавлен после">
          <input type="date" value={local.created_after} onChange={(e) => setLocal(f => ({ ...f, created_after: e.target.value }))} className="crm-input" />
        </Field>
        <Field label="Добавлен до">
          <input type="date" value={local.created_before} onChange={(e) => setLocal(f => ({ ...f, created_before: e.target.value }))} className="crm-input" />
        </Field>
      </div>
    </Drawer>
  );
}

function BulkBar({ count, onAssign, onStatus, onDelete, onClear }: {
  count: number; onAssign: () => void; onStatus: () => void; onDelete: () => void; onClear: () => void;
}) {
  const Btn = ({ onClick, children, danger }: { onClick: () => void; children: React.ReactNode; danger?: boolean }) => (
    <button onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: 'none',
      cursor: 'pointer', color: danger ? '#FCA5A5' : 'rgba(255,255,255,0.85)',
      fontSize: 13, fontFamily: 'var(--font-body)', padding: '4px 6px', borderRadius: 6,
    }}>{children}</button>
  );
  return (
    <motion.div initial={{ opacity: 0, y: 32, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 32, scale: 0.96 }} transition={{ type: 'spring', stiffness: 400, damping: 32 }}
      style={{ position: 'fixed', bottom: 28, left: '50%', transform: 'translateX(-50%)',
        background: 'var(--color-text-primary)', color: 'white', borderRadius: 'var(--radius-full)',
        padding: '10px 20px', display: 'flex', alignItems: 'center', gap: 10,
        boxShadow: '0 8px 32px rgba(0,0,0,0.25)', zIndex: 300, whiteSpace: 'nowrap' }}>
      <span style={{ fontSize: 13, fontWeight: 600 }}>Выбрано: {count}</span>
      <div style={{ width: 1, height: 18, background: 'rgba(255,255,255,0.18)' }} />
      <Btn onClick={onAssign}><UserCog size={14} />Назначить</Btn>
      <Btn onClick={onStatus}><Tag size={14} />Статус</Btn>
      <Btn onClick={onDelete} danger><Trash2 size={14} />Удалить</Btn>
      <div style={{ width: 1, height: 18, background: 'rgba(255,255,255,0.18)' }} />
      <button onClick={onClear} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.5)', padding: 2 }}>
        <X size={15} />
      </button>
    </motion.div>
  );
}

export default function CustomersPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [drawerOpen, setDrawer] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [filters, setFilters] = useState<Filters>(EMPTY);
  const isMobile = useIsMobile();
  const debouncedSearch = useDebounce(search, 300);

  useEffect(() => {
    const handler = () => setDrawer(true);
    window.addEventListener('crm:new-customer', handler);
    return () => window.removeEventListener('crm:new-customer', handler);
  }, []);

  const qp = { search: debouncedSearch,
    ...(filters.status        && { status:         filters.status }),
    ...(filters.source        && { source:         filters.source }),
    ...(filters.owner_id      && { owner_id:        filters.owner_id }),
    ...(filters.created_after  && { created_after:  filters.created_after }),
    ...(filters.created_before && { created_before: filters.created_before }),
  };

  const { data, isLoading } = useQuery<{ results: Customer[]; count: number }>({
    queryKey: ['customers', qp], queryFn: () => api.get('/customers/', qp),
  });

  const customers = data?.results ?? [];
  const allChecked = selected.size === customers.length && customers.length > 0;
  const someChecked = selected.size > 0 && selected.size < customers.length;
  const toggleOne = (id: string) => setSelected(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });
  const toggleAll = () => setSelected(allChecked ? new Set() : new Set(customers.map(c => c.id)));

  const bulkMutation = useMutation({
    mutationFn: (body: object) => api.post('/customers/bulk/', body),
    onSuccess: (_, v: any) => {
      qc.invalidateQueries({ queryKey: ['customers'] });
      setSelected(new Set());
      const messages: Record<string, string> = { delete: 'Удалено', assign: 'Назначено', change_status: 'Статус изменён' };
      toast.success(messages[v.action] ?? 'Готово');
    },
  });

  const { register, handleSubmit, reset, watch, formState } = useForm<{
    full_name: string; phone?: string; email?: string; company_name?: string; source?: string; bin_iin?: string;
  }>();
  const createMutation = useMutation({
    mutationFn: (d: object) => api.post('/customers/', d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['customers'] }); toast.success('Клиент создан'); setDrawer(false); reset(); },
  });

  const { data: team } = useQuery<{ results: any[] }>({
    queryKey: ['team'], queryFn: () => api.get('/users/team/'), enabled: assignOpen,
  });

  const fc = countActive(filters);

  return (
    <div style={{ padding: isMobile ? '14px' : '24px 28px' }}>
      <PageHeader
        title="Клиенты"
        subtitle={data ? `${data.count} всего` : undefined}
        actions={
          <div style={{ display: 'flex', gap: 8 }}>
            <Button variant="secondary" size="sm" icon={<Filter size={13} />} onClick={() => setFilterOpen(true)}>
              Фильтры{fc > 0 && <span style={{ marginLeft: 4, background: 'var(--color-amber)', color: 'white',
                borderRadius: 'var(--radius-full)', padding: '0 5px', fontSize: 10, fontWeight: 700 }}>{fc}</span>}
            </Button>
            <Button icon={<Plus size={15} />} onClick={() => setDrawer(true)}>Добавить клиента</Button>
          </div>
        }
      />

      <AnimatePresence>
        {fc > 0 && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
            {filters.status        && <Chip label={`Статус: ${STATUS_LABELS[filters.status as keyof typeof STATUS_LABELS] ?? filters.status}`} onRemove={() => setFilters(f => ({ ...f, status: '' }))} />}
            {filters.source        && <Chip label={`Источник: ${filters.source}`}                        onRemove={() => setFilters(f => ({ ...f, source: '' }))} />}
            {filters.created_after  && <Chip label={`После: ${filters.created_after}`}                   onRemove={() => setFilters(f => ({ ...f, created_after: '' }))} />}
            {filters.created_before && <Chip label={`До: ${filters.created_before}`}                     onRemove={() => setFilters(f => ({ ...f, created_before: '' }))} />}
            <button onClick={() => setFilters(EMPTY)} style={{ fontSize: 11, color: 'var(--color-text-muted)',
              background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-body)' }}>Сбросить все</button>
          </motion.div>
        )}
      </AnimatePresence>

      <div style={{ marginBottom: 14 }}>
        <SearchInput value={search} onChange={setSearch} placeholder="Поиск по имени, телефону, email..." />
      </div>

      <div style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-xl)', overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '36px 1fr 1fr 1fr' : '36px 2fr 1.4fr 1.4fr 1fr 1fr',
          padding: '10px 16px', borderBottom: '1px solid var(--color-border)',
          fontSize: 11, fontWeight: 600, color: 'var(--color-text-muted)',
          textTransform: 'uppercase', letterSpacing: '0.05em', background: 'var(--color-bg-muted)' }}>
          <div onClick={toggleAll} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
            <CheckboxIcon checked={allChecked} indeterminate={someChecked} />
          </div>
          <span>Имя</span><span>Телефон</span>{!isMobile && <span>Email</span>}<span>Статус</span>{!isMobile && <span>Добавлен</span>}
        </div>

        {isLoading
          ? [1, 2, 3, 4, 5].map(i => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: isMobile ? '36px 1fr 1fr 1fr' : '36px 2fr 1.4fr 1.4fr 1fr 1fr',
                padding: '13px 16px', borderBottom: '1px solid var(--color-border)', gap: 12, alignItems: 'center' }}>
                <Skeleton height={14} width={14} /><Skeleton height={14} width="70%" /><Skeleton height={14} width="60%" />
                <Skeleton height={14} width="80%" /><Skeleton height={16} width={60} radius="var(--radius-full)" /><Skeleton height={14} width={60} />
              </div>
            ))
          : customers.length === 0
            ? <EmptyState icon={<User size={22} />} title="Клиентов нет"
                subtitle={fc > 0 ? 'Попробуйте изменить фильтры' : 'Добавьте первого клиента'}
                action={<Button size="sm" icon={<Plus size={14} />} onClick={() => setDrawer(true)}>Добавить</Button>} />
            : customers.map((c, idx) => {
                const sc = STATUS_COLORS[c.status];
                const isSel = selected.has(c.id);
                return (
                  <motion.div key={c.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: idx * 0.025 }}
                    style={{ display: 'grid', gridTemplateColumns: isMobile ? '36px 1fr 1fr 1fr' : '36px 2fr 1.4fr 1.4fr 1fr 1fr',
                      padding: '11px 16px', borderBottom: '1px solid var(--color-border)',
                      cursor: 'pointer', fontSize: 13, alignItems: 'center',
                      background: isSel ? 'var(--color-amber-subtle)' : 'transparent',
                      transition: 'background var(--transition-fast)' }}
                    onMouseEnter={e => { if (!isSel) (e.currentTarget as HTMLElement).style.background = 'var(--color-bg-muted)'; }}
                    onMouseLeave={e => { if (!isSel) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>
                    <div onClick={e => { e.stopPropagation(); toggleOne(c.id); }} style={{ display: 'flex', alignItems: 'center' }}>
                      <CheckboxIcon checked={isSel} />
                    </div>
                    <div onClick={() => navigate(`/customers/${c.id}`)}>
                      <div style={{ fontWeight: 500 }}>{c.full_name}</div>
                      {c.company_name && <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{c.company_name}</div>}
                    </div>
                    <span onClick={() => navigate(`/customers/${c.id}`)} style={{ color: 'var(--color-text-secondary)' }}>{c.phone || '—'}</span>
                    {!isMobile && <span onClick={() => navigate(`/customers/${c.id}`)} style={{ color: 'var(--color-text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.email || '—'}</span>}
                    <div onClick={() => navigate(`/customers/${c.id}`)}><Badge bg={sc.bg} color={sc.color}>{STATUS_LABELS[c.status]}</Badge></div>
                    {!isMobile && <span onClick={() => navigate(`/customers/${c.id}`)} style={{ color: 'var(--color-text-muted)', fontSize: 12 }}>
                      {new Date(c.created_at).toLocaleDateString('ru-RU')}
                    </span>}
                  </motion.div>
                );
              })
        }
      </div>

      <AnimatePresence>
        {selected.size > 0 && (
          <BulkBar count={selected.size}
            onAssign={() => setAssignOpen(true)}
            onStatus={() => setStatusOpen(true)}
            onDelete={() => { if (confirm(`Удалить ${selected.size} клиентов?`)) bulkMutation.mutate({ action: 'delete', ids: Array.from(selected) }); }}
            onClear={() => setSelected(new Set())} />
        )}
      </AnimatePresence>

      {/* Assign Drawer */}
      <Drawer open={assignOpen} onClose={() => setAssignOpen(false)} title={`Назначить (${selected.size})`}
        footer={<Button variant="secondary" size="sm" onClick={() => setAssignOpen(false)}>Закрыть</Button>}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {(team?.results ?? []).map((u: any) => (
            <motion.button key={u.id} whileHover={{ x: 3 }}
              onClick={() => { bulkMutation.mutate({ action: 'assign', ids: Array.from(selected), payload: { owner_id: u.id } }); setAssignOpen(false); }}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
                border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)',
                background: 'transparent', cursor: 'pointer', textAlign: 'left' }}>
              <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--color-amber-light)',
                color: 'var(--color-amber)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13 }}>
                {u.full_name[0]}
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{u.full_name}</div>
                <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{u.email}</div>
              </div>
            </motion.button>
          ))}
        </div>
      </Drawer>

      {/* Status Drawer */}
      <Drawer open={statusOpen} onClose={() => setStatusOpen(false)} title={`Изменить статус (${selected.size})`}
        footer={<Button variant="secondary" size="sm" onClick={() => setStatusOpen(false)}>Закрыть</Button>}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {(['new', 'active', 'inactive', 'archived'] as const).map(s => (
            <motion.button key={s} whileHover={{ x: 3 }}
              onClick={() => { bulkMutation.mutate({ action: 'change_status', ids: Array.from(selected), payload: { status: s } }); setStatusOpen(false); }}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
                border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)',
                background: 'transparent', cursor: 'pointer', textAlign: 'left' }}>
              <Badge bg={STATUS_COLORS[s].bg} color={STATUS_COLORS[s].color}>{STATUS_LABELS[s]}</Badge>
            </motion.button>
          ))}
        </div>
      </Drawer>

      <FilterPanel open={filterOpen} onClose={() => setFilterOpen(false)} filters={filters} onChange={setFilters} />

      <Drawer open={drawerOpen} onClose={() => { setDrawer(false); reset(); }} title="Новый клиент"
        footer={
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <Button variant="secondary" onClick={() => { setDrawer(false); reset(); }}>Отмена</Button>
            <Button loading={formState.isSubmitting} onClick={handleSubmit(d => createMutation.mutate(d))}>Создать</Button>
          </div>
        }>
        <form style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Field label="Имя *"><input {...register('full_name', { required: true })} placeholder="Иван Иванов" className="crm-input" /></Field>
          <Field label="Телефон"><input {...register('phone')} placeholder="+7 700 000 00 00" className="crm-input" /></Field>
          <Field label="Email"><input {...register('email')} type="email" placeholder="ivan@company.kz" className="crm-input" /></Field>
          <Field label="Компания"><input {...register('company_name')} placeholder="ТОО Компания" className="crm-input" /></Field>
          <Field label="БИН/ИИН">
            <div style={{ position: 'relative' }}>
              <input
                {...register('bin_iin', {
                  validate: (v) => !v || validateBinIin(v) || 'Неверный БИН/ИИН',
                  onChange: (e) => { e.target.value = formatBinIin(e.target.value); },
                })}
                placeholder="000000000000"
                maxLength={12}
                className="crm-input"
                style={{ paddingRight: 80 }}
              />
              {watch('bin_iin') && validateBinIin(watch('bin_iin') ?? '') && (
                <span style={{
                  position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                  fontSize: 11, fontWeight: 600, color: '#059669',
                  background: '#D1FAE5', padding: '2px 6px', borderRadius: 4,
                }}>
                  {isBin(watch('bin_iin') ?? '') ? 'БИН ✓' : 'ИИН ✓'}
                </span>
              )}
              {watch('bin_iin') && !validateBinIin(watch('bin_iin') ?? '') && (watch('bin_iin') ?? '').length === 12 && (
                <span style={{
                  position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                  fontSize: 11, fontWeight: 600, color: '#DC2626',
                  background: '#FEE2E2', padding: '2px 6px', borderRadius: 4,
                }}>
                  Ошибка
                </span>
              )}
            </div>
            {formState.errors.bin_iin && (
              <span style={{ fontSize: 11, color: '#DC2626' }}>{formState.errors.bin_iin.message}</span>
            )}
          </Field>
          <Field label="Источник"><input {...register('source')} placeholder="Instagram, Referral..." className="crm-input" /></Field>
        </form>
      </Drawer>
    </div>
  );
}
