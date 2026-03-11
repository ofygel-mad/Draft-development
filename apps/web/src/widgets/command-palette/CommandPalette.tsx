import { useEffect, useRef, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Search, Users, Briefcase, CheckSquare, Settings,
  Loader2, Clock, Plus, ArrowRight,
} from 'lucide-react';
import { useCommandPalette } from '../../shared/stores/commandPalette';
import { api } from '../../shared/api/client';
import { useDebounce } from '../../shared/hooks/useDebounce';
import styles from './CommandPalette.module.css';

interface SearchResult {
  id: string;
  type: 'customer' | 'deal' | 'task' | 'command' | 'recent';
  label: string;
  sublabel?: string;
  path: string;
  icon?: React.ReactNode;
}

const RECENT_KEY = 'crm:recent-items';
const MAX_RECENT = 5;

function getRecent(): SearchResult[] {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]'); }
  catch { return []; }
}

function pushRecent(item: SearchResult) {
  const list = getRecent().filter((r) => r.id !== item.id);
  list.unshift({ ...item, type: 'recent' });
  localStorage.setItem(RECENT_KEY, JSON.stringify(list.slice(0, MAX_RECENT)));
}

const SLASH_COMMANDS: SearchResult[] = [
  { id: 'cmd-new-customer', type: 'command', label: 'Новый клиент', sublabel: '/new client', path: '/customers', icon: <Plus size={14} /> },
  { id: 'cmd-new-deal', type: 'command', label: 'Новая сделка', sublabel: '/new deal', path: '/deals', icon: <Plus size={14} /> },
  { id: 'cmd-new-task', type: 'command', label: 'Новая задача', sublabel: '/new task', path: '/tasks', icon: <Plus size={14} /> },
  { id: 'cmd-go-reports', type: 'command', label: 'Открыть отчёты', sublabel: '/go reports', path: '/reports', icon: <ArrowRight size={14} /> },
  { id: 'cmd-go-settings', type: 'command', label: 'Настройки', sublabel: '/settings', path: '/settings', icon: <Settings size={14} /> },
];

const NAV_COMMANDS: SearchResult[] = [
  { id: 'nav-customers', type: 'command', label: 'Клиенты', path: '/customers', icon: <Users size={14} /> },
  { id: 'nav-deals', type: 'command', label: 'Сделки', path: '/deals', icon: <Briefcase size={14} /> },
  { id: 'nav-tasks', type: 'command', label: 'Задачи', path: '/tasks', icon: <CheckSquare size={14} /> },
  { id: 'nav-settings', type: 'command', label: 'Настройки', path: '/settings', icon: <Settings size={14} /> },
];

const TYPE_ICON: Record<string, React.ReactNode> = {
  customer: <Users size={14} />,
  deal: <Briefcase size={14} />,
  task: <CheckSquare size={14} />,
  recent: <Clock size={14} />,
};

export function CommandPalette() {
  const { close } = useCommandPalette();
  const navigate = useNavigate();

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const debouncedQ = useDebounce(query, 200);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const isSlash = query.startsWith('/');

  useEffect(() => {
    if (isSlash || debouncedQ.trim().length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    api.get('/search/', { q: debouncedQ, types: 'customers,deals,tasks', limit: 5 })
      .then((data: any) => setResults(data.results ?? []))
      .catch(() => setResults([]))
      .finally(() => setLoading(false));
  }, [debouncedQ, isSlash]);

  useEffect(() => { setActiveIdx(0); }, [results, query]);

  const visibleItems: SearchResult[] = (() => {
    if (isSlash) {
      const slashQ = query.slice(1).toLowerCase();
      return SLASH_COMMANDS.filter(
        (c) => c.label.toLowerCase().includes(slashQ) || (c.sublabel ?? '').includes(slashQ),
      );
    }
    if (query.trim().length < 2) {
      const recent = getRecent();
      return [...recent, ...NAV_COMMANDS.filter((c) => !recent.find((r) => r.path === c.path))];
    }
    return results;
  })();

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, visibleItems.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const item = visibleItems[activeIdx];
      if (item) handleSelect(item);
    } else if (e.key === 'Escape') {
      close();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleItems, activeIdx]);

  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-idx="${activeIdx}"]`) as HTMLElement;
    el?.scrollIntoView({ block: 'nearest' });
  }, [activeIdx]);

  function handleSelect(item: SearchResult) {
    pushRecent(item);
    navigate(item.path);
    if (item.id === 'cmd-new-task') window.dispatchEvent(new Event('crm:new-task'));
    if (item.id === 'cmd-new-customer') window.dispatchEvent(new Event('crm:new-customer'));
    if (item.id === 'cmd-new-deal') window.dispatchEvent(new Event('crm:new-deal'));
    close();
  }

  const sectionLabel = (() => {
    if (isSlash) return 'Команды';
    if (query.length < 2) return 'Недавние / Навигация';
    if (loading) return 'Поиск...';
    if (visibleItems.length) return `Результаты (${visibleItems.length})`;
    return null;
  })();

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
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      >
        <div className={styles.inputWrap}>
          {loading
            ? <Loader2 size={16} style={{ animation: 'cp-spin 0.6s linear infinite', flexShrink: 0, color: 'var(--color-text-muted)' }} />
            : <Search size={16} style={{ flexShrink: 0, color: 'var(--color-text-muted)' }} />
          }
          <input
            ref={inputRef}
            className={styles.input}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Поиск или / для команд..."
            autoComplete="off"
            spellCheck={false}
          />
          {query && (
            <button className={styles.clearBtn} onClick={() => setQuery('')}>✕</button>
          )}
          <kbd className={styles.escKbd}>esc</kbd>
        </div>

        <div ref={listRef} className={styles.resultList}>
          {sectionLabel && (
            <div className={styles.sectionLabel}>{sectionLabel}</div>
          )}

          {visibleItems.length === 0 && !loading && query.trim().length >= 2 && (
            <div className={styles.empty}>Ничего не найдено по «{query}»</div>
          )}

          {visibleItems.map((item, idx) => {
            const icon = item.icon ?? TYPE_ICON[item.type] ?? <Search size={14} />;
            const isActive = idx === activeIdx;
            return (
              <button
                key={item.id}
                data-idx={idx}
                className={`${styles.resultItem} ${isActive ? styles.active : ''}`}
                onClick={() => handleSelect(item)}
                onMouseEnter={() => setActiveIdx(idx)}
              >
                <span className={styles.resultIcon}>{icon}</span>
                <span className={styles.resultText}>
                  <span className={styles.resultLabel}>{item.label}</span>
                  {item.sublabel && (
                    <span className={styles.resultSub}>{item.sublabel}</span>
                  )}
                </span>
                {item.type === 'recent' && (
                  <span className={styles.resultTag}>Недавнее</span>
                )}
                {item.type === 'command' && (
                  <span className={styles.resultTag}>⌘</span>
                )}
              </button>
            );
          })}
        </div>

        <div className={styles.footer}>
          <span>↑↓ навигация</span>
          <span>↵ выбрать</span>
          <span>/ команды</span>
          <span>esc закрыть</span>
        </div>
      </motion.div>
    </>
  );
}
