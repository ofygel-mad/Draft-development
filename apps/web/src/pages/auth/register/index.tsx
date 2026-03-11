import { useForm } from 'react-hook-form';
import { motion } from 'framer-motion';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../../../shared/api/client';
import { useAuthStore } from '../../../shared/stores/auth';
import { toast } from 'sonner';

interface RegisterForm {
  organization_name:string; full_name:string; email:string;
  phone?:string; password:string;
}

function FInput({ label, error, ...props }: { label:string; error?:boolean } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label style={{ fontSize:12, fontWeight:500, color:'var(--color-text-secondary)', display:'block', marginBottom:6 }}>{label}</label>
      <input {...props} style={{ width:'100%', height:38, padding:'0 12px', border:`1px solid ${error?'#EF4444':'var(--color-border)'}`, borderRadius:'var(--radius-md)', fontSize:13, fontFamily:'var(--font-body)', outline:'none', background:'var(--color-bg-elevated)', boxSizing:'border-box', ...props.style }} />
    </div>
  );
}

export default function RegisterPage() {
  const navigate = useNavigate();
  const setAuth  = useAuthStore(s => s.setAuth);
  const { register, handleSubmit, formState:{ isSubmitting, errors } } = useForm<RegisterForm>();

  const onSubmit = async (data: RegisterForm) => {
    try {
      const res: any = await api.post('/auth/register', data);
      setAuth(res.user, res.org, res.access, res.capabilities ?? [], res.role ?? 'viewer');
      navigate('/onboarding');
    } catch (e: any) {
      toast.error(e?.response?.data?.detail ?? 'Ошибка регистрации');
    }
  };

  return (
    <motion.div
      initial={{ opacity:0, y:12 }} animate={{ opacity:1, y:0 }}
      style={{ width:420, padding:'40px 36px', background:'var(--color-bg-elevated)', borderRadius:'var(--radius-xl)', border:'1px solid var(--color-border)', boxShadow:'var(--shadow-lg)' }}
    >
      <div style={{ textAlign:'center', marginBottom:28 }}>
        <div style={{ width:40,height:40,background:'var(--color-amber)',borderRadius:'var(--radius-md)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 12px',color:'white',fontWeight:700,fontSize:18,fontFamily:'var(--font-display)' }}>C</div>
        <h1 style={{ fontSize:20, fontWeight:700, fontFamily:'var(--font-display)', margin:0 }}>Создать аккаунт</h1>
        <p style={{ fontSize:13, color:'var(--color-text-muted)', marginTop:6 }}>Регистрация займёт меньше 2 минут</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} style={{ display:'flex', flexDirection:'column', gap:14 }}>
        <FInput label="Название компании *" error={!!errors.organization_name} {...register('organization_name', { required:true })} placeholder="ТОО Моя Компания" />
        <FInput label="Ваше имя *" error={!!errors.full_name} {...register('full_name', { required:true })} placeholder="Иван Иванов" />
        <FInput label="Email *" type="email" error={!!errors.email} {...register('email', { required:true })} placeholder="ivan@company.kz" />
        <FInput label="Телефон" {...register('phone')} placeholder="+7 700 000 00 00" />
        <FInput label="Пароль *" type="password" error={!!errors.password} {...register('password', { required:true, minLength:6 })} placeholder="Минимум 6 символов" />
        <motion.button
          whileTap={{ scale:0.98 }}
          type="submit"
          disabled={isSubmitting}
          style={{ height:40, background:'var(--color-amber)', border:'none', borderRadius:'var(--radius-md)', color:'white', fontSize:14, fontWeight:600, cursor:isSubmitting?'not-allowed':'pointer', fontFamily:'var(--font-body)', marginTop:4, opacity:isSubmitting?0.8:1 }}
        >
          {isSubmitting ? 'Создаём...' : 'Создать аккаунт'}
        </motion.button>
      </form>

      <p style={{ textAlign:'center', fontSize:12, color:'var(--color-text-muted)', marginTop:20 }}>
        Уже есть аккаунт? <Link to="/auth/login" style={{ color:'var(--color-amber)', fontWeight:500, textDecoration:'none' }}>Войти</Link>
      </p>
    </motion.div>
  );
}
