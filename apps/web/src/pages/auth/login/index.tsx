import { useForm } from 'react-hook-form';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../../../shared/api/client';
import { useAuthStore } from '../../../shared/stores/auth';
import { toast } from 'sonner';
import { useState } from 'react';
import { Eye, EyeOff, Loader2 } from 'lucide-react';

interface LoginForm { email: string; password: string; }

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
      setAuth(res.user, res.org, res.access, res.refresh, res.capabilities ?? [], res.role ?? 'viewer');
      navigate(res.onboarding_completed ? '/' : '/onboarding', { replace: true });
    } catch (e: any) {
      const msg = e?.response?.data?.detail;
      if (msg?.includes('деактивирован')) {
        toast.error('Аккаунт деактивирован. Обратитесь к администратору.');
      } else if (e?.response?.status === 429) {
        toast.error('Слишком много попыток. Подождите минуту.');
      } else {
        toast.error('Неверный email или пароль');
      }
    }
  };

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, fontFamily: 'var(--font-display)', margin: '0 0 6px' }}>
          Добро пожаловать
        </h2>
        <p style={{ fontSize: 13, color: 'var(--color-text-muted)', margin: 0 }}>
          Войдите, чтобы продолжить работу
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
            autoFocus
            className="crm-input"
            style={{
              width: '100%',
              boxSizing: 'border-box',
              borderColor: errors.email ? 'var(--color-danger)' : undefined,
            }}
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
              className="crm-input"
              style={{
                width: '100%',
                boxSizing: 'border-box',
                paddingRight: 40,
                borderColor: errors.password ? 'var(--color-danger)' : undefined,
              }}
            />
            <button
              type="button"
              onClick={() => setShowPwd(!showPwd)}
              style={{
                position: 'absolute',
                right: 10,
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--color-text-muted)',
                display: 'flex',
                padding: 2,
              }}
            >
              {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          style={{
            height: 44,
            background: isSubmitting ? 'var(--color-amber-dark)' : 'var(--color-amber)',
            border: 'none',
            borderRadius: 'var(--radius-md)',
            color: '#fff',
            fontSize: 14,
            fontWeight: 600,
            cursor: isSubmitting ? 'not-allowed' : 'pointer',
            fontFamily: 'var(--font-body)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            transition: 'background 0.15s',
            boxShadow: 'var(--shadow-amber)',
          }}
        >
          {isSubmitting ? <><Loader2 size={15} style={{ animation: 'spin 0.8s linear infinite' }} /> Входим...</> : 'Войти'}
        </button>
      </form>

      <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--color-text-muted)', marginTop: 24 }}>
        Нет аккаунта?{' '}
        <Link to="/auth/register" style={{ color: 'var(--color-amber)', fontWeight: 500, textDecoration: 'none' }}>
          Зарегистрировать компанию
        </Link>
      </p>
    </div>
  );
}
