import { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { api } from '../../../shared/api/client';
import { useAuthStore } from '../../../shared/stores/auth';
import { toast } from 'sonner';
import { Eye, EyeOff } from 'lucide-react';

export default function AcceptInvitePage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!token) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <p style={{ color: '#EF4444' }}>Неверная ссылка приглашения.</p>
        <Link to="/auth/login">← Войти</Link>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) { toast.error('Пароль минимум 8 символов'); return; }
    setLoading(true);
    try {
      const res: any = await api.post('/auth/accept-invite', { token, password, full_name: fullName });
      setAuth(res.user, res.org, res.access, res.refresh, res.capabilities ?? [], res.role ?? 'manager');
      toast.success('Добро пожаловать!');
      navigate('/', { replace: true });
    } catch (e: any) {
      toast.error(e?.response?.data?.detail ?? 'Ошибка принятия приглашения');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      style={{
        width: 380, padding: '40px 36px',
        background: 'var(--color-bg-elevated)',
        borderRadius: 'var(--radius-xl)',
        border: '1px solid var(--color-border)',
        boxShadow: 'var(--shadow-lg)',
      }}>
      <div style={{ textAlign: 'center', marginBottom: 28 }}>
        <div style={{ width: 44, height: 44, background: 'var(--color-amber)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', color: 'white', fontWeight: 800, fontSize: 20 }}>C</div>
        <h1 style={{ fontSize: 20, fontWeight: 700, fontFamily: 'var(--font-display)', margin: 0 }}>Принять приглашение</h1>
        <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginTop: 6 }}>Создайте пароль для вашего аккаунта</p>
      </div>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 6 }}>Ваше имя</label>
          <input value={fullName} onChange={(e) => setFullName(e.target.value)}
            placeholder="Иван Иванов" required
            style={{ width: '100%', height: 40, padding: '0 12px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', fontSize: 13, fontFamily: 'var(--font-body)', outline: 'none', background: 'var(--color-bg-elevated)', boxSizing: 'border-box' }} />
        </div>
        <div>
          <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 6 }}>Пароль *</label>
          <div style={{ position: 'relative' }}>
            <input value={password} onChange={(e) => setPassword(e.target.value)}
              type={showPwd ? 'text' : 'password'} placeholder="Минимум 8 символов" required
              style={{ width: '100%', height: 40, padding: '0 40px 0 12px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', fontSize: 13, fontFamily: 'var(--font-body)', outline: 'none', background: 'var(--color-bg-elevated)', boxSizing: 'border-box' }} />
            <button type="button" onClick={() => setShowPwd(!showPwd)}
              style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', display: 'flex' }}>
              {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
        </div>
        <button type="submit" disabled={loading}
          style={{ height: 42, background: 'var(--color-amber)', border: 'none', borderRadius: 'var(--radius-md)', color: 'white', fontSize: 14, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'var(--font-body)', opacity: loading ? 0.75 : 1 }}>
          {loading ? 'Регистрируемся...' : 'Принять и войти'}
        </button>
      </form>
    </motion.div>
  );
}
