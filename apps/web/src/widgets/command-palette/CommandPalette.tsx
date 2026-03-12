import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Search, Users, Briefcase, CheckSquare, Settings,
  BarChart2, Zap, Upload, Shield, Clock, Loader2,
  ArrowRight, Plus, Activity, MessageSquare,
} from 'lucide-react';
import { useCommandPalette } from '../../shared/stores/commandPalette';
import { api } from '../../shared/api/client';
import styles from './CommandPalette.module.css';

interface Result {
  id: string;
  type: 'customer' | 'deal' | 'task' | 'nav' | 'action' | 'recent';
  label: string;
  sub?: string;
  path?: string;
  icon: React.ReactNode;
  color?: string;
  meta?: any;
  action: () => void;
}

const NAV_COMMANDS = [
  { id: 'go-customers', label: 'Клиенты', sub: 'Перейти', icon: <Users size={14} />, path: '/customers' },
  { id: 'go-deals', label: 'Сделки', sub: 'Перейти', icon: <Briefcase size={14} />, path: '/deals' },
  { id: 'go-tasks', label: 'Задачи', sub: 'Перейти', icon: <CheckSquare size={14} />, path: '/tasks' },
  { id: 'go-feed', label: 'Лента событий', sub: 'Перейти', icon: <Activity size={14} />, path: '/feed' },
  { id: 'go-templates', label: 'Шаблоны сообщений', sub: 'Перейти', icon: <MessageSquare size={14} />, path: '/settings?tab=templates' },
  { id: 'go-reports', label: 'Отчёты', sub: 'Перейти', icon: <BarChart2 size={14} />, path: '/reports' },
  { id: 'go-settings', label: 'Настройки', sub: 'Перейти', icon: <Settings size={14} />, path: '/settings' },
  { id: 'go-auto', label: 'Автоматизации', sub: 'Перейти', icon: <Zap size={14} />, path: '/automations' },
  { id: 'go-import', label: 'Импорт', sub: 'Перейти', icon: <Upload size={14} />, path: '/imports' },
  { id: 'go-audit', label: 'Аудит', sub: 'Перейти', icon: <Shield size={14} />, path: '/audit' },
];

const ACTION_COMMANDS = [
  { id: 'new-customer', label: 'Новый клиент', icon: <Plus size={14} />, color: '#3B82F6', event: 'crm:new-customer' },
  { id: 'new-deal', label: 'Новая сделка', icon: <Plus size={14} />, color: '#D97706', event: 'crm:new-deal' },
  { id: 'new-task', label: 'Новая задача', icon: <Plus size={14} />, color: '#8B5CF6', event: 'crm:new-task' },
  { id: 'new-followup', label: 'Запланировать follow-up', icon: <Plus size={14} />, color: '#10B981', event: 'crm:new-followup' },
  { id: 'new-import', label: 'Импорт таблицы', icon: <Upload size={14} />, color: '#6B7280', event: 'crm:go-import' },
];

const RECENT_KEY = 'crm:recent-items';
const MAX_RECENT = 5;

function getRecent(): Result[] {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]');
  } catch {
    return [];
  }
}

function pushRecent(item: Omit<Result, 'action'>) {
  const prev = getRecent().filter((r) => r.id !== item.id);
  localStorage.setItem(RECENT_KEY, JSON.stringify([item, ...prev].slice(0, MAX_RECENT)));
}

function useDebounce<T>(value: T, ms: number): T {
  const [dv, setDv] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDv(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return dv;
}

export function CommandPalette() {
  const { close } = useCommandPalette();
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);

  const [query, setQuery] = useState('');
  const [apiRes, setApiRes] = useState<Result[]>([]);
  const [searching, setSearching] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);

  const dq = useDebounce(query.trim(), 200);

  const { cleanQuery, filterType } = useMemo(() => {
    const prefixMatch = query.match(/^@(customer|deal|task)\s*(.*)/i);
    if (prefixMatch) return { cleanQuery: prefixMatch[2], filterType: prefixMatch[1].toLowerCase() };
    return { cleanQuery: query, filterType: '' };
  }, [query]);

  useEffect(() => { inputRef.current?.focus(); }, []);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [close]);

  useEffect(() => {
    const effectiveQ = cleanQuery.trim();
    if (!effectiveQ || effectiveQ.length < 2 || query.startsWith('/')) { setApiRes([]); return; }
    let cancelled = false;
    setSearching(true);
    api.get('/search/', {
      q: effectiveQ,
      limit: '8',
      ...(filterType ? { types: filterType } : {}),
    })
      .then((data: any) => {
        if (cancelled) return;
        const results: Result[] = (data.results ?? []).map((r: any) => ({
          id: `api-${r.type}-${r.id}`,
          type: r.type,
          label: r.label,
          sub: r.sublabel,
          path: r.path,
          meta: r.meta,
          icon: r.type === 'customer' ? <Users size={14} />
            : r.type === 'deal' ? <Briefcase size={14} />
              : <CheckSquare size={14} />,
          color: r.type === 'customer' ? '#3B82F6'
            : r.type === 'deal' ? '#D97706'
              : '#8B5CF6',
          action: () => {
            pushRecent({
              id: `api-${r.type}-${r.id}`,
              type: r.type,
              label: r.label,
              sub: r.sublabel,
              path: r.path,
              icon: null,
              color: undefined,
              meta: r.meta,
            });
            navigate(r.path);
          },
        }));
        setApiRes(results);
      })
      .catch(() => setApiRes([]))
      .finally(() => { if (!cancelled) setSearching(false); });
    return () => { cancelled = true; };
  }, [dq, cleanQuery, query, filterType, navigate]);

  const results: (Result & { _section?: string })[] = [];

  const isSlash = query.startsWith('/');
  const slashMatch = isSlash ? query.slice(1).toLowerCase() : '';
  const SLASH_MAP = [
    { keys: ['клиент', 'client', 'customer', 'new-customer', 'к'], label: 'Создать клиента', color: '#3B82F6', event: 'crm:new-customer' },
    { keys: ['сделка', 'deal', 'new-deal', 'с'], label: 'Создать сделку', color: '#D97706', event: 'crm:new-deal' },
    { keys: ['задача', 'task', 'new-task', 'з'], label: 'Создать задачу', color: '#8B5CF6', event: 'crm:new-task' },
    { keys: ['импорт', 'import', 'и'], label: 'Открыть импорт', color: '#6B7280', event: 'crm:go-import' },
    { keys: ['followup', 'follow', 'фол', 'ф'], label: 'Запланировать follow-up', color: '#10B981', event: 'crm:new-followup' },
  ];

  if (!query) {
    const recent = getRecent();
    if (recent.length > 0) {
      recent.forEach((r, i) => results.push({
        ...r,
        _section: i === 0 ? 'Недавние' : undefined,
        icon: r.type === 'customer' ? <Users size={14} /> : r.type === 'deal' ? <Briefcase size={14} /> : r.type === 'task' ? <CheckSquare size={14} /> : <Clock size={14} />,
        action: r.action ?? (() => navigate(r.path ?? '/')),
      }));
    }

    ACTION_COMMANDS.forEach((a, i) => results.push({
      id: a.id,
      type: 'action',
      label: a.label,
      icon: a.icon,
      color: a.color,
      _section: i === 0 ? 'Действия' : undefined,
      action: () => { window.dispatchEvent(new CustomEvent(a.event)); close(); },
    }));

    NAV_COMMANDS.forEach((n, i) => results.push({
      id: n.id,
      type: 'nav',
      label: n.label,
      sub: n.sub,
      icon: n.icon,
      _section: i === 0 ? 'Навигация' : undefined,
      action: () => { navigate(n.path); close(); },
    }));
  } else if (isSlash) {
    const matched = SLASH_MAP.filter((s) => s.keys.some((k) => k.startsWith(slashMatch) || slashMatch === ''));
    matched.forEach((m, i) => results.push({
      id: `slash-${m.event}`,
      type: 'action',
      label: m.label,
      sub: `/${m.keys[0]}`,
      icon: <Zap size={14} />,
      color: m.color,
      _section: i === 0 ? 'Быстрые команды' : undefined,
      action: () => { window.dispatchEvent(new CustomEvent(m.event)); close(); },
    }));
  } else {
    apiRes.forEach((r, i) => results.push({ ...r, _section: i === 0 ? 'Результаты' : undefined }));

    const navFiltered = NAV_COMMANDS.filter((n) => n.label.toLowerCase().includes(query.toLowerCase()));
    navFiltered.forEach((n, i) => results.push({
      id: n.id,
      type: 'nav',
      label: n.label,
      sub: n.sub,
      icon: n.icon,
      _section: apiRes.length === 0 && i === 0 ? 'Навигация' : undefined,
      action: () => { navigate(n.path); close(); },
    }));

    const actFiltered = ACTION_COMMANDS.filter((a) => a.label.toLowerCase().includes(query.toLowerCase()));
    actFiltered.forEach((a, i) => results.push({
      id: a.id,
      type: 'action',
      label: a.label,
      icon: a.icon,
      color: a.color,
      _section: apiRes.length === 0 && navFiltered.length === 0 && i === 0 ? 'Действия' : undefined,
      action: () => { window.dispatchEvent(new CustomEvent(a.event)); close(); },
    }));
  }

  useEffect(() => { setActiveIdx(0); }, [results.length, query]);

  const handleKey = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx((i) => Math.min(i + 1, results.length - 1)); }
    if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIdx((i) => Math.max(i - 1, 0)); }
    if (e.key === 'Enter' && results[activeIdx]) { results[activeIdx].action(); close(); }
  }, [results, activeIdx, close]);

  return (
    <>
      <motion.div className={styles.backdrop} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={close} />
      <motion.div className={styles.palette} initial={{ opacity: 0, scale: 0.96, y: -8 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96, y: -8 }} transition={{ type: 'spring', stiffness: 420, damping: 30 }}>
        <div className={styles.inputWrap}>
          {searching
            ? <Loader2 size={15} style={{ color: 'var(--color-amber)', animation: 'cp-spin 0.6s linear infinite', flexShrink: 0 }} />
            : <Search size={15} style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />}
          <input ref={inputRef} className={styles.input} value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={handleKey} placeholder="Поиск · @ для фильтра · / для команд" />
          {filterType && (
            <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 'var(--radius-full)', flexShrink: 0, background: filterType === 'customer' ? '#DBEAFE' : filterType === 'deal' ? '#FEF3C7' : '#EDE9FE', color: filterType === 'customer' ? '#1D4ED8' : filterType === 'deal' ? '#92400E' : '#5B21B6' }}>
              {filterType === 'customer' ? 'Клиенты' : filterType === 'deal' ? 'Сделки' : 'Задачи'}
              <span onClick={() => setQuery('')} style={{ cursor: 'pointer', marginLeft: 4 }}>✕</span>
            </span>
          )}
          {query && <button className={styles.clearBtn} onClick={() => setQuery('')}>✕</button>}
        </div>

        {!query && (
          <div style={{ display: 'flex', gap: 12, padding: '6px 14px', borderBottom: '1px solid var(--color-border)', background: 'var(--color-bg-muted)' }}>
            {[
              { label: '@customer', hint: 'клиенты' },
              { label: '@deal', hint: 'сделки' },
              { label: '@task', hint: 'задачи' },
              { label: '/', hint: 'команды' },
            ].map((h) => (
              <button key={h.label} onClick={() => setQuery(h.label)} style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--color-text-muted)', background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', padding: '1px 7px', cursor: 'pointer' }}>
                {h.label}
              </button>
            ))}
          </div>
        )}

        <div className={styles.results}>
          {results.length === 0 && query.length >= 1 && !searching && <div className={styles.empty}>Ничего не найдено по «{query}»</div>}
          {results.map((r, idx) => (
            <div key={r.id}>
              {r._section && <div className={styles.sectionLabel}>{r._section}</div>}
              <button className={[styles.resultItem, idx === activeIdx ? styles.resultItemActive : ''].join(' ')} onMouseEnter={() => setActiveIdx(idx)} onClick={() => { r.action(); close(); }}>
                <span className={styles.resultIcon} style={{ background: r.color ? `${r.color}18` : 'var(--color-bg-muted)', color: r.color ?? 'var(--color-text-muted)' }}>{r.icon}</span>
                <span className={styles.resultText}>
                  <span className={styles.resultLabel}>{r.label}</span>
                  {r.sub && <span className={styles.resultSub}>{r.sub}</span>}
                </span>
                {(r as any).meta?.follow_up_due_at && <span style={{ fontSize: 10, color: '#D97706', background: '#FEF3C7', padding: '1px 6px', borderRadius: 99, flexShrink: 0 }}>follow-up</span>}
                {(r as any).meta?.amount != null && (r as any).meta.amount > 0 && <span style={{ fontSize: 11, color: 'var(--color-text-muted)', flexShrink: 0 }}>{Number((r as any).meta.amount).toLocaleString('ru')} {(r as any).meta.currency || '₸'}</span>}
                {(r as any).meta?.priority === 'high' && <span style={{ fontSize: 10, color: '#EF4444', background: '#FEE2E2', padding: '1px 6px', borderRadius: 99, flexShrink: 0 }}>high</span>}
                <ArrowRight size={12} className={styles.resultArrow} />
              </button>
            </div>
          ))}
        </div>

        <div className={styles.footer}>
          <span><kbd className={styles.kbd}>↑↓</kbd> навигация</span>
          <span><kbd className={styles.kbd}>↵</kbd> выбрать</span>
          <span><kbd className={styles.kbd}>esc</kbd> закрыть</span>
        </div>
      </motion.div>
    </>
  );
}
