import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../../../shared/api/client';
import { useAuthStore } from '../../../shared/stores/auth';
import { toast } from 'sonner';
import { CheckCircle2, Users, Zap, Factory, ChevronRight, ArrowLeft, Eye, EyeOff } from 'lucide-react';

interface RegisterForm {
  organization_name: string;
  full_name: string;
  email: string;
  phone?: string;
  password: string;
}

const MODES = [
  {
    mode: 'basic',
    title: 'Базовый',
    subtitle: 'Малый бизнес, старт',
    icon: <Users size={20} />,
    color: '#3B82F6',
    features: ['Клиенты и контакты', 'Сделки и воронка', 'Задачи и заметки', 'Простые отчёты'],
  },
  {
    mode: 'advanced',
    title: 'Продвинутый',
    subtitle: 'Растущая команда',
    icon: <Zap size={20} />,
    color: '#D97706',
    features: ['Всё из Базового', 'Роли сотрудников', 'Автоматизации', 'Расширенная аналитика', 'Кастомные поля'],
    recommended: true,
  },
  {
    mode: 'industrial',
    title: 'Промышленный',
    subtitle: 'Крупный бизнес',
    icon: <Factory size={20} />,
    color: '#8B5CF6',
    features: ['Всё из Продвинутого', 'API доступ', 'Аудит действий', 'SLA и очереди', 'Мультифилиальность'],
  },
];

const inputStyle = (error?: boolean): React.CSSProperties => ({
  width: '100%', height: 40, padding: '0 12px',
  border: `1px solid ${error ? '#EF4444' : 'var(--color-border)'}`,
  borderRadius: 'var(--radius-md)', fontSize: 13,
  fontFamily: 'var(--font-body)', outline: 'none',
  background: 'var(--color-bg-elevated)', boxSizing: 'border-box',
});

const STEPS = ['Аккаунт', 'Выбор плана'];

export default function RegisterPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [step, setStep] = useState(0);
  const [selectedMode, setSelectedMode] = useState('advanced');
  const [showPwd, setShowPwd] = useState(false);
  const { register, handleSubmit, getValues, formState: { isSubmitting, errors } } = useForm<RegisterForm>();

  const onSubmit = async (data: RegisterForm) => {
    try {
      const res: any = await api.post('/auth/register', {
        ...data,
        email: data.email.trim().toLowerCase(),
        mode: selectedMode,
      });
      setAuth(
        res.user, res.org,
        res.access, res.refresh,
        res.capabilities ?? [],
        res.role ?? 'owner',
      );
      navigate('/onboarding', { replace: true });
    } catch (e: any) {
      toast.error(e?.response?.data?.detail ?? 'Ошибка регистрации');
      setStep(0);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        width: step === 1 ? 680 : 420,
        padding: '40px 36px',
        background: 'var(--color-bg-elevated)',
        borderRadius: 'var(--radius-xl)',
        border: '1px solid var(--color-border)',
        boxShadow: 'var(--shadow-lg)',
        transition: 'width 0.3s ease',
      }}
    >
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <div style={{
          width: 44, height: 44, background: 'var(--color-amber)',
          borderRadius: 'var(--radius-md)', display: 'flex',
          alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 10px', color: 'white',
          fontWeight: 800, fontSize: 20, fontFamily: 'var(--font-display)',
        }}>C</div>
        <h1 style={{ fontSize: 20, fontWeight: 700, fontFamily: 'var(--font-display)', margin: 0 }}>
          Создать аккаунт
        </h1>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 28 }}>
        {STEPS.map((s, idx) => (
          <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{
                width: 24, height: 24, borderRadius: '50%',
                background: idx < step ? '#10B981' : idx === step ? 'var(--color-amber)' : 'var(--color-border)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {idx < step
                  ? <CheckCircle2 size={13} color="#fff" />
                  : <span style={{ fontSize: 11, fontWeight: 700, color: idx === step ? '#fff' : 'var(--color-text-muted)' }}>{idx + 1}</span>
                }
              </div>
              <span style={{ fontSize: 12, fontWeight: idx === step ? 600 : 400, color: idx === step ? 'var(--color-text-primary)' : 'var(--color-text-muted)' }}>
                {s}
              </span>
            </div>
            {idx < STEPS.length - 1 && (
              <div style={{ width: 20, height: 1, background: idx < step ? '#10B981' : 'var(--color-border)' }} />
            )}
          </div>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {step === 0 && (
          <motion.div key="step0" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {[
                { field: 'organization_name' as const, label: 'Название компании *', placeholder: 'ТОО Моя Компания', required: true },
                { field: 'full_name' as const, label: 'Ваше имя *', placeholder: 'Иван Иванов', required: true },
                { field: 'email' as const, label: 'Email *', placeholder: 'ivan@company.kz', type: 'email', required: true },
                { field: 'phone' as const, label: 'Телефон', placeholder: '+7 700 000 00 00', required: false },
              ].map(({ field, label, placeholder, type, required }) => (
                <div key={field}>
                  <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 6 }}>
                    {label}
                  </label>
                  <input
                    {...register(field, { required })}
                    type={type ?? 'text'}
                    placeholder={placeholder}
                    style={inputStyle(!!errors[field])}
                  />
                </div>
              ))}
              <div>
                <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 6 }}>
                  Пароль * (минимум 8 символов)
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    {...register('password', { required: true, minLength: 8 })}
                    type={showPwd ? 'text' : 'password'}
                    placeholder="Минимум 8 символов"
                    style={{ ...inputStyle(!!errors.password), paddingRight: 40 }}
                  />
                  <button type="button" onClick={() => setShowPwd(!showPwd)}
                    style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', display: 'flex', padding: 2 }}>
                    {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>
              <motion.button
                whileTap={{ scale: 0.98 }} type="button"
                onClick={() => {
                  const v = getValues();
                  if (!v.organization_name || !v.full_name || !v.email || !v.password) {
                    toast.error('Заполните все обязательные поля');
                    return;
                  }
                  if (v.password.length < 8) {
                    toast.error('Пароль минимум 8 символов');
                    return;
                  }
                  setStep(1);
                }}
                style={{
                  height: 42, background: 'var(--color-amber)', border: 'none',
                  borderRadius: 'var(--radius-md)', color: 'white',
                  fontSize: 14, fontWeight: 600, cursor: 'pointer',
                  fontFamily: 'var(--font-body)', marginTop: 4,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                }}
              >
                Продолжить <ChevronRight size={16} />
              </motion.button>
            </div>
          </motion.div>
        )}

        {step === 1 && (
          <motion.form key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
            onSubmit={handleSubmit(onSubmit)}>
            <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', marginBottom: 16, textAlign: 'center' }}>
              Выберите режим CRM. Вы сможете изменить его позже.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
              {MODES.map((m) => (
                <motion.button key={m.mode} type="button"
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  onClick={() => setSelectedMode(m.mode)}
                  style={{
                    padding: '18px 14px', borderRadius: 'var(--radius-lg)',
                    border: `2px solid ${selectedMode === m.mode ? m.color : 'var(--color-border)'}`,
                    background: selectedMode === m.mode ? `${m.color}0D` : 'var(--color-bg-elevated)',
                    cursor: 'pointer', textAlign: 'left',
                    fontFamily: 'var(--font-body)', position: 'relative',
                    boxShadow: selectedMode === m.mode ? `0 0 0 3px ${m.color}22` : 'none',
                    transition: 'all 0.15s',
                  }}>
                  {m.recommended && (
                    <div style={{
                      position: 'absolute', top: -10, right: 12,
                      background: m.color, color: '#fff',
                      fontSize: 10, fontWeight: 700, padding: '2px 8px',
                      borderRadius: 99,
                    }}>Рекомендуем</div>
                  )}
                  <div style={{
                    width: 36, height: 36, borderRadius: 'var(--radius-md)',
                    background: `${m.color}1A`, display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                    color: m.color, marginBottom: 10,
                  }}>{m.icon}</div>
                  <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 2 }}>{m.title}</div>
                  <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 10 }}>{m.subtitle}</div>
                  {m.features.map((f) => (
                    <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--color-text-secondary)', marginBottom: 3 }}>
                      <CheckCircle2 size={11} color={m.color} />
                      {f}
                    </div>
                  ))}
                </motion.button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" onClick={() => setStep(0)}
                style={{
                  height: 42, padding: '0 16px', background: 'none',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)', cursor: 'pointer',
                  fontSize: 13, fontFamily: 'var(--font-body)',
                  display: 'flex', alignItems: 'center', gap: 6,
                }}>
                <ArrowLeft size={14} /> Назад
              </button>
              <motion.button whileTap={{ scale: 0.98 }} type="submit" disabled={isSubmitting}
                style={{
                  flex: 1, height: 42, background: 'var(--color-amber)',
                  border: 'none', borderRadius: 'var(--radius-md)',
                  color: 'white', fontSize: 14, fontWeight: 600,
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  fontFamily: 'var(--font-body)',
                  opacity: isSubmitting ? 0.75 : 1,
                }}>
                {isSubmitting ? 'Создаём аккаунт...' : 'Начать работу →'}
              </motion.button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--color-text-muted)', marginTop: 20 }}>
        Уже есть аккаунт?{' '}
        <Link to="/auth/login" style={{ color: 'var(--color-amber)', fontWeight: 500, textDecoration: 'none' }}>
          Войти
        </Link>
      </p>
    </motion.div>
  );
}
