import { useEffect, useRef, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Search, Users, Briefcase, CheckSquare, Settings,
  BarChart2, Zap, Upload, Shield, Clock, Loader2,
  ArrowRight, Plus,
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
  action: () => void;
}

const NAV_COMMANDS = [
  { id: 'go-customers', label: 'Клиенты', sub: 'Перейти', icon: <Users size={14} />, path: '/customers' },
  { id: 'go-deals', label: 'Сделки', sub: 'Перейти', icon: <Briefcase size={14} />, path: '/deals' },
  { id: 'go-tasks', label: 'Задачи', sub: 'Перейти', icon: <CheckSquare size={14} />, path: '/tasks' },
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

  useEffect(() => { inputRef.current?.focus(); }, []);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [close]);

  useEffect(() => {
    if (!dq || dq.length < 2) { setApiRes([]); return; }
    let cancelled = false;
    setSearching(true);
    api.get('/search/', { q: dq, limit: '5' })
      .then((data: any) => {
        if (cancelled) return;
        const results: Result[] = (data.results ?? []).map((r: any) => ({
          id: `api-${r.type}-${r.id}`,
          type: r.type,
          label: r.label,
          sub: r.sublabel,
          path: r.path,
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
            });
            navigate(r.path);
          },
        }));
        setApiRes(results);
      })
      .catch(() => setApiRes([]))
      .finally(() => { if (!cancelled) setSearching(false); });
    return () => { cancelled = true; };
  }, [dq, navigate]);

  const results: (Result & { _section?: string })[] = [];

  if (!query) {
    const recent = getRecent();
    if (recent.length > 0) {
      recent.forEach((r, i) => results.push({
        ...r,
        _section: i === 0 ? 'Недавние' : undefined,
        icon: r.type === 'customer'
          ? <Users size={14} />
          : r.type === 'deal'
            ? <Briefcase size={14} />
            : r.type === 'task'
              ? <CheckSquare size={14} />
              : <Clock size={14} />,
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
      <motion.div
        className={styles.backdrop}
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={close}
      />
      <motion.div
        className={styles.palette}
        initial={{ opacity: 0, scale: 0.96, y: -8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: -8 }}
        transition={{ type: 'spring', stiffness: 420, damping: 30 }}
      >
        <div className={styles.inputWrap}>
          {searching
            ? <Loader2 size={15} style={{ color: 'var(--color-amber)', animation: 'cp-spin 0.6s linear infinite', flexShrink: 0 }} />
            : <Search size={15} style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />}
          <input
            ref={inputRef}
            className={styles.input}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Поиск клиентов, сделок, задач..."
          />
          {query && (
            <button className={styles.clearBtn} onClick={() => setQuery('')}>✕</button>
          )}
        </div>

        <div className={styles.results}>
          {results.length === 0 && query.length >= 2 && !searching && (
            <div className={styles.empty}>Ничего не найдено по «{query}»</div>
          )}
          {results.map((r, idx) => (
            <div key={r.id}>
              {r._section && <div className={styles.sectionLabel}>{r._section}</div>}
              <button
                className={[styles.resultItem, idx === activeIdx ? styles.resultItemActive : ''].join(' ')}
                onMouseEnter={() => setActiveIdx(idx)}
                onClick={() => { r.action(); close(); }}
              >
                <span className={styles.resultIcon} style={{ background: r.color ? `${r.color}18` : 'var(--color-bg-muted)', color: r.color ?? 'var(--color-text-muted)' }}>
                  {r.icon}
                </span>
                <span className={styles.resultText}>
                  <span className={styles.resultLabel}>{r.label}</span>
                  {r.sub && <span className={styles.resultSub}>{r.sub}</span>}
                </span>
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
