import { useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle2, Zap, Factory, ChevronRight, ArrowLeft, Users } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { api } from '../../shared/api/client';
import { Button } from '../../shared/ui/Button';
import { useAuthStore } from '../../shared/stores/auth';
import { toast } from 'sonner';

const BUSINESS_TYPES = [
  { value: 'retail', label: 'Розница', icon: '🛍️' },
  { value: 'services', label: 'Услуги', icon: '🎯' },
  { value: 'sales', label: 'Продажи', icon: '💼' },
  { value: 'production', label: 'Производство', icon: '🏭' },
  { value: 'other', label: 'Другое', icon: '✨' },
];

const SIZES = [
  { value: '1_5', label: '1–5' },
  { value: '6_20', label: '6–20' },
  { value: '21_100', label: '21–100' },
  { value: '100_plus', label: '100+' },
];

interface ModeCard {
  mode: string; title: string; subtitle: string;
  features: string[]; icon: ReactNode; color: string;
}

const MODES: ModeCard[] = [
  { mode: 'basic', title: 'Базовый', subtitle: 'Для малого бизнеса', features: ['Клиенты и сделки', 'Задачи', 'Простые отчёты'], icon: <Users size={22} />, color: '#3B82F6' },
  { mode: 'advanced', title: 'Продвинутый', subtitle: 'Для растущей команды', features: ['Воронки и этапы', 'Роли сотрудников', 'Автоматизации', 'Расширенная аналитика'], icon: <Zap size={22} />, color: '#D97706' },
  { mode: 'industrial', title: 'Промышленный', subtitle: 'Для крупного бизнеса', features: ['Филиалы', 'API и интеграции', 'Аудит', 'Сложные права', 'SLA'], icon: <Factory size={22} />, color: '#8B5CF6' },
];

const STEPS = ['Ваш бизнес', 'Режим CRM', 'Быстрый старт'];

export default function OnboardingPage() {
  const navigate = useNavigate();
  const user = useAuthStore(s => s.user);
  const [step, setStep] = useState(0);
  const [industry, setIndustry] = useState('');
  const [companySize, setCompanySize] = useState('');
  const [selectedMode, setSelectedMode] = useState('advanced');

  const setupMutation = useMutation({
    mutationFn: (data: object) => api.patch('/organization/', data),
    onSuccess: () => {
      toast.success('Настройки сохранены');
      navigate('/');
    },
  });

  const canNext = step === 0 ? (industry !== '' && companySize !== '') : true;

  function handleFinish() {
    setupMutation.mutate({ mode: selectedMode, industry, company_size: companySize });
  }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #FFF8F0 0%, #FFFBF5 50%, #F9F9F7 100%)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 32, display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--color-amber-gradient)', boxShadow: 'var(--shadow-amber)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 800, color: '#fff', fontFamily: 'var(--font-display)' }}>C</div>
        <span style={{ fontSize: 20, fontWeight: 700, fontFamily: 'var(--font-display)' }}>CRM</span>
      </motion.div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 32 }}>
        {STEPS.map((s, idx) => (
          <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 26, height: 26, borderRadius: 'var(--radius-full)', background: idx < step ? '#10B981' : idx === step ? 'var(--color-amber)' : 'var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background var(--transition-base)' }}>
                {idx < step ? <CheckCircle2 size={14} color="#fff" /> : <span style={{ fontSize: 11, fontWeight: 700, color: idx === step ? '#fff' : 'var(--color-text-muted)' }}>{idx + 1}</span>}
              </div>
              <span style={{ fontSize: 12, fontWeight: idx === step ? 600 : 400, color: idx === step ? 'var(--color-text-primary)' : 'var(--color-text-muted)' }}>{s}</span>
            </div>
            {idx < STEPS.length - 1 && <div style={{ width: 24, height: 1, background: idx < step ? '#10B981' : 'var(--color-border)', transition: 'background var(--transition-base)' }} />}
          </div>
        ))}
      </div>

      <motion.div key={step} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xl)', padding: '36px 40px', width: '100%', maxWidth: step === 1 ? 760 : 540, boxShadow: 'var(--shadow-lg)' }}>
        {step === 0 && (
          <>
            <h2 style={{ fontSize: 22, fontWeight: 700, fontFamily: 'var(--font-display)', marginBottom: 6 }}>Расскажите о вашем бизнесе</h2>
            <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', marginBottom: 28 }}>Это поможет нам настроить CRM под ваши задачи</p>

            <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>Тип бизнеса</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8, marginBottom: 24 }}>
              {BUSINESS_TYPES.map(bt => (
                <motion.button key={bt.value} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={() => setIndustry(bt.value)} style={{ padding: '12px 8px', borderRadius: 'var(--radius-md)', border: `2px solid ${industry === bt.value ? 'var(--color-amber)' : 'var(--color-border)'}`, background: industry === bt.value ? 'var(--color-amber-subtle)' : 'var(--color-bg-elevated)', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, transition: 'all var(--transition-fast)', fontFamily: 'var(--font-body)' }}>
                  <span style={{ fontSize: 22 }}>{bt.icon}</span>
                  <span style={{ fontSize: 12, fontWeight: 500, color: industry === bt.value ? 'var(--color-amber-dark)' : 'var(--color-text-primary)' }}>{bt.label}</span>
                </motion.button>
              ))}
            </div>

            <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>Размер команды</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
              {SIZES.map(s => (
                <motion.button key={s.value} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={() => setCompanySize(s.value)} style={{ padding: '10px', borderRadius: 'var(--radius-md)', border: `2px solid ${companySize === s.value ? 'var(--color-amber)' : 'var(--color-border)'}`, background: companySize === s.value ? 'var(--color-amber-subtle)' : 'var(--color-bg-elevated)', cursor: 'pointer', fontSize: 14, fontWeight: 600, color: companySize === s.value ? 'var(--color-amber-dark)' : 'var(--color-text-primary)', transition: 'all var(--transition-fast)', fontFamily: 'var(--font-body)' }}>{s.label}</motion.button>
              ))}
            </div>
          </>
        )}

        {step === 1 && (
          <>
            <h2 style={{ fontSize: 22, fontWeight: 700, fontFamily: 'var(--font-display)', marginBottom: 6 }}>Выберите режим CRM</h2>
            <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', marginBottom: 28 }}>Вы сможете изменить это позже в настройках</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
              {MODES.map(m => (
                <motion.button key={m.mode} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => setSelectedMode(m.mode)} style={{ padding: '20px 16px', borderRadius: 'var(--radius-lg)', border: `2px solid ${selectedMode === m.mode ? m.color : 'var(--color-border)'}`, background: selectedMode === m.mode ? `${m.color}08` : 'var(--color-bg-elevated)', cursor: 'pointer', textAlign: 'left', transition: 'all var(--transition-fast)', fontFamily: 'var(--font-body)', boxShadow: selectedMode === m.mode ? `0 0 0 3px ${m.color}22` : 'none' }}>
                  <div style={{ width: 40, height: 40, borderRadius: 'var(--radius-md)', background: `${m.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: m.color, marginBottom: 12 }}>{m.icon}</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: 4 }}>{m.title}</div>
                  <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 12 }}>{m.subtitle}</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {m.features.map(f => (
                      <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--color-text-secondary)' }}><span style={{ width: 14, height: 14, borderRadius: 'var(--radius-full)', background: m.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><CheckCircle2 size={9} color="#fff" /></span>{f}</div>
                    ))}
                  </div>
                </motion.button>
              ))}
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <div style={{ textAlign: 'center', marginBottom: 28 }}>
              <div style={{ fontSize: 44, marginBottom: 12 }}>🎉</div>
              <h2 style={{ fontSize: 22, fontWeight: 700, fontFamily: 'var(--font-display)', marginBottom: 8 }}>Вы готовы к работе!</h2>
              <p style={{ fontSize: 14, color: 'var(--color-text-secondary)' }}>Привет, {user?.full_name?.split(' ')[0]}! CRM настроена и готова.</p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
              {[
                { icon: '👤', title: 'Добавьте первого клиента', desc: 'Создайте карточку или импортируйте из Excel', action: () => { handleFinish(); navigate('/customers'); } },
                { icon: '💼', title: 'Создайте первую сделку', desc: 'Добавьте клиента в воронку продаж', action: () => { handleFinish(); navigate('/deals'); } },
                { icon: '📥', title: 'Импорт из Excel', desc: 'Загрузите существующую базу клиентов', action: () => { handleFinish(); navigate('/imports'); } },
              ].map(item => (
                <motion.button key={item.title} whileHover={{ x: 4 }} whileTap={{ scale: 0.98 }} onClick={item.action} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px', background: 'var(--color-bg-muted)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', cursor: 'pointer', textAlign: 'left', fontFamily: 'var(--font-body)', transition: 'all var(--transition-fast)' }}>
                  <span style={{ fontSize: 24 }}>{item.icon}</span>
                  <div><div style={{ fontSize: 13, fontWeight: 600 }}>{item.title}</div><div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{item.desc}</div></div>
                  <ChevronRight size={16} color="var(--color-text-muted)" style={{ marginLeft: 'auto' }} />
                </motion.button>
              ))}
            </div>
          </>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 24 }}>
          <Button variant="ghost" size="sm" icon={<ArrowLeft size={14} />} onClick={() => step > 0 ? setStep(step - 1) : null} style={{ visibility: step === 0 ? 'hidden' : 'visible' }}>Назад</Button>
          {step < STEPS.length - 1 ? <Button disabled={!canNext} iconRight={<ChevronRight size={14} />} onClick={() => setStep(step + 1)}>Продолжить</Button> : <Button loading={setupMutation.isPending} onClick={handleFinish}>Начать работу</Button>}
        </div>
      </motion.div>

      <button onClick={() => navigate('/')} style={{ marginTop: 16, fontSize: 12, color: 'var(--color-text-muted)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-body)' }}>Пропустить настройку →</button>
    </div>
  );
}
