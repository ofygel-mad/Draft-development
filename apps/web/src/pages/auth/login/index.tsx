import { useForm } from 'react-hook-form';
import { motion } from 'framer-motion';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../../../shared/api/client';
import { useAuthStore } from '../../../shared/stores/auth';
import { toast } from 'sonner';

interface LoginForm { email:string; password:string; }

export default function LoginPage() {
  const navigate = useNavigate();
  const setAuth  = useAuthStore(s => s.setAuth);
  const { register, handleSubmit, formState:{ isSubmitting, errors } } = useForm<LoginForm>();

  const onSubmit = async (data: LoginForm) => {
    try {
      const res: any = await api.post('/auth/login', data);
      setAuth(res.user, res.org, res.access, res.capabilities ?? [], res.role ?? 'viewer');
      navigate('/');
    } catch (e: any) {
      toast.error(e?.response?.data?.detail ?? 'Ошибка входа');
    }
  };

  return (
    <motion.div
      initial={{ opacity:0, y:12 }} animate={{ opacity:1, y:0 }}
      style={{ width:380, padding:'40px 36px', background:'var(--color-bg-elevated)', borderRadius:'var(--radius-xl)', border:'1px solid var(--color-border)', boxShadow:'var(--shadow-lg)' }}
    >
      <div style={{ textAlign:'center', marginBottom:28 }}>
        <div style={{ width:40,height:40,background:'var(--color-amber)',borderRadius:'var(--radius-md)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 12px',color:'white',fontWeight:700,fontSize:18,fontFamily:'var(--font-display)' }}>C</div>
        <h1 style={{ fontSize:20, fontWeight:700, fontFamily:'var(--font-display)', margin:0 }}>Войти в CRM</h1>
        <p style={{ fontSize:13, color:'var(--color-text-muted)', marginTop:6 }}>Введите данные вашего аккаунта</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} style={{ display:'flex', flexDirection:'column', gap:14 }}>
        <div>
          <label style={{ fontSize:12, fontWeight:500, color:'var(--color-text-secondary)', display:'block', marginBottom:6 }}>Email</label>
          <input
            {...register('email', { required:true })}
            type="email" placeholder="you@company.kz"
            style={{ width:'100%', height:38, padding:'0 12px', border:`1px solid ${errors.email?'#EF4444':'var(--color-border)'}`, borderRadius:'var(--radius-md)', fontSize:13, fontFamily:'var(--font-body)', outline:'none', background:'var(--color-bg-elevated)', boxSizing:'border-box' }}
          />
        </div>
        <div>
          <label style={{ fontSize:12, fontWeight:500, color:'var(--color-text-secondary)', display:'block', marginBottom:6 }}>Пароль</label>
          <input
            {...register('password', { required:true })}
            type="password" placeholder="••••••••"
            style={{ width:'100%', height:38, padding:'0 12px', border:`1px solid ${errors.password?'#EF4444':'var(--color-border)'}`, borderRadius:'var(--radius-md)', fontSize:13, fontFamily:'var(--font-body)', outline:'none', background:'var(--color-bg-elevated)', boxSizing:'border-box' }}
          />
        </div>
        <motion.button
          whileTap={{ scale:0.98 }}
          type="submit"
          disabled={isSubmitting}
          style={{ height:40, background:isSubmitting?'#FBBF24':'var(--color-amber)', border:'none', borderRadius:'var(--radius-md)', color:'white', fontSize:14, fontWeight:600, cursor:isSubmitting?'not-allowed':'pointer', fontFamily:'var(--font-body)', marginTop:4 }}
        >
          {isSubmitting ? 'Входим...' : 'Войти'}
        </motion.button>
      </form>

      <p style={{ textAlign:'center', fontSize:12, color:'var(--color-text-muted)', marginTop:20 }}>
        Нет аккаунта? <Link to="/auth/register" style={{ color:'var(--color-amber)', fontWeight:500, textDecoration:'none' }}>Зарегистрироваться</Link>
      </p>
    </motion.div>
  );
}
