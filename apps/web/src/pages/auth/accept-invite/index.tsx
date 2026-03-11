import { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { api } from '../../../shared/api/client';
import { useAuthStore } from '../../../shared/stores/auth';

export default function AcceptInvitePage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const token = params.get('token') ?? '';

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const data = await api.post<any>('/auth/accept-invite', { token, password, full_name: fullName });
      setAuth(data.user, data.org, data.access, data.refresh, data.capabilities ?? [], data.role ?? 'viewer');
      navigate('/', { replace: true });
    } catch {
      setError('Не удалось принять приглашение');
    }
  };

  return (
    <form onSubmit={submit} style={{ maxWidth: 360, margin: '40px auto', display: 'grid', gap: 12 }}>
      <h2>Принять приглашение</h2>
      <input placeholder="Имя" value={fullName} onChange={(e) => setFullName(e.target.value)} />
      <input placeholder="Пароль" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
      {error && <div>{error}</div>}
      <button type="submit" disabled={!token}>Продолжить</button>
    </form>
  );
}
