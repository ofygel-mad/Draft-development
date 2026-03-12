import { Outlet, Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuthStore } from '../../shared/stores/auth';
import { TrendingUp, Users, CheckSquare, Zap, Shield, Globe } from 'lucide-react';

const STATS = [
  { icon: <Users size={14} />, value: '2 400+', label: 'клиентов под управлением' },
  { icon: <TrendingUp size={14} />, value: '₸ 1.2 млрд', label: 'сделок в воронке' },
  { icon: <CheckSquare size={14} />, value: '98%', label: 'задач закрыты вовремя' },
];

const FEATURES = [
  { icon: <Zap size={15} />, title: 'Скорость', desc: 'Поиск за 200мс. Действие в один клик.' },
  { icon: <Shield size={15} />, title: 'Надёжность', desc: 'Аудит, роли, права. Данные под контролем.' },
  { icon: <Globe size={15} />, title: 'Локально', desc: '₸, WhatsApp, БИН/ИИН. Сделано для Казахстана.' },
];

export function AuthShell() {
  const token = useAuthStore((s) => s.token);
  if (token) return <Navigate to="/" replace />;

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: 'var(--color-bg-base)' }}>
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        style={{
          flex: '1 1 55%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '60px 64px',
          background: 'linear-gradient(150deg, #0C0E14 0%, #13161E 60%, #1A1E2A 100%)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: -120,
            right: -80,
            width: 400,
            height: 400,
            borderRadius: '50%',
            background: 'rgba(217,119,6,0.12)',
            filter: 'blur(80px)',
            pointerEvents: 'none',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: -60,
            left: -40,
            width: 260,
            height: 260,
            borderRadius: '50%',
            background: 'rgba(59,130,246,0.07)',
            filter: 'blur(60px)',
            pointerEvents: 'none',
          }}
        />

        <div style={{ position: 'relative', zIndex: 1, maxWidth: 480 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 52 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
                boxShadow: '0 4px 14px rgba(217,119,6,0.35)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 18,
                fontWeight: 800,
                color: '#fff',
                fontFamily: 'var(--font-display)',
              }}
            >
              C
            </div>
            <span style={{ fontSize: 20, fontWeight: 700, color: '#F0F2F5', fontFamily: 'var(--font-display)' }}>
              CRM
            </span>
          </div>

          <h1
            style={{
              fontSize: 38,
              fontWeight: 800,
              color: '#F0F2F5',
              fontFamily: 'var(--font-display)',
              lineHeight: 1.15,
              letterSpacing: '-0.02em',
              margin: '0 0 16px',
            }}
          >
            Операционный центр
            <br />
            <span style={{ color: '#F59E0B' }}>вашего бизнеса</span>
          </h1>
          <p style={{ fontSize: 16, color: '#9AA4B8', lineHeight: 1.6, margin: '0 0 40px' }}>
            Клиенты, сделки, задачи и коммуникации&nbsp;—
            <br />
            в одной системе. Без хаоса Excel и мессенджеров.
          </p>

          <div
            style={{
              display: 'flex',
              gap: 20,
              marginBottom: 44,
              padding: '16px 20px',
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 12,
            }}
          >
            {STATS.map((s) => (
              <div key={s.label} style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#F59E0B', marginBottom: 4 }}>
                  {s.icon}
                  <span style={{ fontSize: 18, fontWeight: 700, color: '#F0F2F5', fontFamily: 'var(--font-display)' }}>
                    {s.value}
                  </span>
                </div>
                <div style={{ fontSize: 11, color: '#5D6780' }}>{s.label}</div>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {FEATURES.map((f) => (
              <div key={f.title} style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <div
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: 8,
                    flexShrink: 0,
                    background: 'rgba(217,119,6,0.12)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#F59E0B',
                  }}
                >
                  {f.icon}
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#F0F2F5', marginBottom: 2 }}>{f.title}</div>
                  <div style={{ fontSize: 12, color: '#5D6780' }}>{f.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.15 }}
        style={{
          flex: '0 0 420px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '40px 40px',
          background: 'var(--color-bg-elevated)',
          borderLeft: '1px solid var(--color-border)',
        }}
      >
        <div style={{ width: '100%', maxWidth: 340 }}>
          <Outlet />
        </div>
        <div style={{ marginTop: 32, fontSize: 11, color: 'var(--color-text-muted)', textAlign: 'center' }}>
          © 2025 CRM · Казахстан · Все права защищены
        </div>
      </motion.div>
    </div>
  );
}
