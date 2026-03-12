import { useQuery } from '@tanstack/react-query';
import { api } from '../../shared/api/client';

export function TeamPresence() {
  const { data } = useQuery({ queryKey: ['team-presence'], queryFn: () => api.get<any[]>('/team/presence'), refetchInterval: 30000 });
  const rows = Array.isArray(data) ? data : [];
  if (!rows.length) return null;
  return <div style={{ display: 'grid', gap: 8 }}>{rows.map((row: any) => <div key={row.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}><span>{row.full_name}</span><span>{row.presence_state}</span></div>)}</div>;
}
