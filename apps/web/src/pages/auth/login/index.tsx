import { useForm } from 'react-hook-form';
import { motion } from 'framer-motion';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../../../shared/api/client';
import { useAuthStore } from '../../../shared/stores/auth';
import { toast } from 'sonner';
import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

interface LoginForm { email: string; password: string; }

const inputStyle = (error?: boolean): React.CSSProperties => ({
  width: '100%', height: 40, padding: '0 12px',
  border: `1px solid ${error ? '#EF4444' : 'var(--color-border)'}`,
  borderRadius: 'var(--radius-md)', fontSize: 13,
  fontFamily: 'var(--font-body)', outline: 'none',
  background: 'var(--color-bg-elevated)', boxSizing: 'border-box',
  transition: 'border-color 0.15s',
});

export default function LoginPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [showPwd, setShowPwd] = useState(false);
  const { register, handleSubmit, formState: { isSubmitting, errors } } = useForm<LoginForm>();

  const onSubmit = async (data: LoginForm) => {
    try {
      const res: any = await api.post('/auth/login', {
        email: data.email.trim().toLowerCase(),
        password: data.password,
      });
      setAuth(
        res.user, res.org,
        res.access, res.refresh,
        res.capabilities ?? [],
        res.role ?? 'viewer',
      );
      if (!res.onboarding_completed) {
        navigate('/onboarding', { replace: true });
      } else {
        navigate('/', { replace: true });
      }
    } catch (e: any) {
      toast.error(e?.response?.data?.detail ?? 'Ошибка входа');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        width: 380, padding: '40px 36px',
        background: 'var(--color-bg-elevated)',
        borderRadius: 'var(--radius-xl)',
        border: '1px solid var(--color-border)',
        boxShadow: 'var(--shadow-lg)',
      }}
    >
      <div style={{ textAlign: 'center', marginBottom: 28 }}>
        <div style={{
          width: 44, height: 44, background: 'var(--color-amber)',
          borderRadius: 'var(--radius-md)', display: 'flex',
          alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 12px', color: 'white',
          fontWeight: 800, fontSize: 20, fontFamily: 'var(--font-display)',
        }}>C</div>
        <h1 style={{ fontSize: 22, fontWeight: 700, fontFamily: 'var(--font-display)', margin: 0 }}>
          Войти в CRM
        </h1>
        <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginTop: 6 }}>
          Введите данные вашего аккаунта
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 6 }}>
            Email
          </label>
          <input
            {...register('email', { required: true })}
            type="email"
            placeholder="you@company.kz"
            autoComplete="email"
            style={inputStyle(!!errors.email)}
          />
        </div>
        <div>
          <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 6 }}>
            Пароль
          </label>
          <div style={{ position: 'relative' }}>
            <input
              {...register('password', { required: true })}
              type={showPwd ? 'text' : 'password'}
              placeholder="••••••••"
              autoComplete="current-password"
              style={{ ...inputStyle(!!errors.password), paddingRight: 40 }}
            />
            <button
              type="button"
              onClick={() => setShowPwd(!showPwd)}
              style={{
                position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--color-text-muted)', display: 'flex', padding: 2,
              }}
            >
              {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
        </div>
        <motion.button
          whileTap={{ scale: 0.98 }}
          type="submit"
          disabled={isSubmitting}
          style={{
            height: 42, background: 'var(--color-amber)', border: 'none',
            borderRadius: 'var(--radius-md)', color: 'white',
            fontSize: 14, fontWeight: 600,
            cursor: isSubmitting ? 'not-allowed' : 'pointer',
            fontFamily: 'var(--font-body)', marginTop: 4,
            opacity: isSubmitting ? 0.75 : 1, transition: 'opacity 0.15s',
          }}
        >
          {isSubmitting ? 'Входим...' : 'Войти'}
        </motion.button>
      </form>

      <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--color-text-muted)', marginTop: 20 }}>
        Нет аккаунта?{' '}
        <Link to="/auth/register" style={{ color: 'var(--color-amber)', fontWeight: 500, textDecoration: 'none' }}>
          Зарегистрировать компанию
        </Link>
      </p>
    </motion.div>
  );
}
