import { motion } from 'framer-motion';

interface HealthScoreProps {
  score: number;
  band: 'green' | 'yellow' | 'red';
}

const BAND_COLORS = {
  green: { bg: '#D1FAE5', color: '#065F46', dot: '#10B981' },
  yellow: { bg: '#FEF3C7', color: '#92400E', dot: '#F59E0B' },
  red: { bg: '#FEE2E2', color: '#991B1B', dot: '#EF4444' },
};

export function HealthScoreBadge({ score, band }: HealthScoreProps) {
  const c = BAND_COLORS[band];
  return (
    <motion.div
      initial={{ scale: 0.85, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      title={`Health Score: ${score}/100`}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 5,
        padding: '2px 8px', borderRadius: 'var(--radius-full)',
        background: c.bg, color: c.color,
        fontSize: 11, fontWeight: 700, cursor: 'default',
      }}
    >
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: c.dot, flexShrink: 0 }} />
      {score}
    </motion.div>
  );
}
