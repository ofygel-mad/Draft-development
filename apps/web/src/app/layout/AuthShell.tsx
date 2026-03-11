import { Outlet, Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuthStore } from '../../shared/stores/auth';

export function AuthShell() {
  const token = useAuthStore((s) => s.token);
  if (token) return <Navigate to="/" replace />;

  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        background: 'linear-gradient(135deg, #FAFAF8 0%, #FEF3C7 50%, #FAFAF8 100%)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'absolute', top: -100, right: -100,
          width: 400, height: 400, borderRadius: '50%',
          background: 'rgba(217,119,6,0.06)', pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute', bottom: -80, left: -80,
          width: 300, height: 300, borderRadius: '50%',
          background: 'rgba(217,119,6,0.04)', pointerEvents: 'none',
        }}
      />
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        style={{ position: 'relative', zIndex: 1 }}
      >
        <Outlet />
      </motion.div>
    </main>
  );
}
