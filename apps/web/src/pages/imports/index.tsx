import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, FileText, CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react';
import { api } from '../../shared/api/client';
import { PageHeader } from '../../shared/ui/PageHeader';
import { Button } from '../../shared/ui/Button';
import { Skeleton } from '../../shared/ui/Skeleton';
import { toast } from 'sonner';
import { useDocumentTitle } from '../../shared/hooks/useDocumentTitle';
import { SpreadsheetReview } from '../../widgets/spreadsheet-review/SpreadsheetReview';

const CRM_FIELDS = [
  { value: '', label: '— Не импортировать —' },
  { value: 'full_name', label: 'Имя клиента' },
  { value: 'phone', label: 'Телефон' },
  { value: 'email', label: 'Email' },
  { value: 'company_name', label: 'Компания' },
  { value: 'source', label: 'Источник' },
  { value: 'status', label: 'Статус' },
];

interface ImportJob {
  id: string; status: string; import_type: string;
  preview_json?: { headers: string[]; rows: string[][]; total: number; auto_mapping: Record<string, string> };
  result_json?: { success: number; errors: number; duplicates: number };
  created_at: string;
}

const STEPS = ['Загрузка', 'Маппинг', 'Импорт'];

const STATUS_LABELS: Record<string, string> = {
  uploaded: 'Загружен', analyzing: 'Анализ', mapping_required: 'Требуется маппинг', mapping_confirmed: 'Маппинг подтверждён', processing: 'Обработка',
  completed: 'Завершён', failed: 'Ошибка', pending: 'Ожидание',
};
const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  completed: { bg: '#D1FAE5', color: '#065F46' },
  failed: { bg: '#FEE2E2', color: '#991B1B' },
  processing: { bg: '#DBEAFE', color: '#1D4ED8' },
  analyzing: { bg: '#DBEAFE', color: '#1D4ED8' },
  mapping_required: { bg: '#FEF3C7', color: '#92400E' },
  mapping_confirmed: { bg: '#F3E8FF', color: '#6B21A8' },
  uploaded: { bg: '#F3F4F6', color: '#6B7280' },
  pending: { bg: '#F3F4F6', color: '#6B7280' },
};

export default function ImportsPage() {
  useDocumentTitle('Импорт');
  const qc = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [wizardStep, setWizardStep] = useState(0);

  const { data: jobs, isLoading } = useQuery<{ results: ImportJob[] }>({
    queryKey: ['import-jobs'],
    queryFn: () => api.get('/imports/'),
    refetchInterval: (query) => {
      const hasProcessing = (query.state.data as { results: ImportJob[] } | undefined)?.results.some(
        j => ['processing', 'analyzing', 'mapping_required', 'mapping_confirmed'].includes(j.status),
      );
      return hasProcessing ? 3000 : false;
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('import_type', 'customers');
      return api.post<ImportJob>('/imports/', formData as unknown as object);
    },
    onSuccess: (job: ImportJob) => {
      qc.invalidateQueries({ queryKey: ['import-jobs'] });
      setActiveJobId(job.id);
      setWizardStep(1);
      toast.success('Файл загружен, анализируем...');
    },
    onError: () => toast.error('Ошибка загрузки файла'),
  });

  const startImport = useMutation({
    mutationFn: () => api.post(`/imports/${activeJobId}/start/`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['import-jobs'] });
      toast.success('Импорт запущен!');
    },
  });

  const confirmMapping = useMutation({
    mutationFn: () => api.post(`/imports/${activeJobId}/mapping/`, { column_mapping: mapping }),
    onSuccess: () => { setWizardStep(2); startImport.mutate(); },
  });

  const activeJob = jobs?.results.find(j => j.id === activeJobId);
  const preview = activeJob?.preview_json;

  useEffect(() => {
    if (preview?.auto_mapping && Object.keys(mapping).length === 0) {
      setMapping(preview.auto_mapping);
    }
  }, [preview, mapping]);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.match(/\.(xlsx|xls|csv)$/i)) {
      toast.error('Поддерживаются только файлы Excel (.xlsx, .xls) и CSV');
      return;
    }
    uploadMutation.mutate(file);
  }

  return (
    <div style={{ maxWidth: 900 }}>
      <PageHeader title="Импорт данных" subtitle="Загрузите клиентов из Excel или CSV" />
      <div style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xl)', padding: '28px', marginBottom: 24, boxShadow: 'var(--shadow-sm)' }}>
        <div style={{ display: 'flex', gap: 12, marginBottom: 24, justifyContent: 'center' }}>
          {STEPS.map((s, idx) => (
            <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                width: 28, height: 28, borderRadius: 'var(--radius-full)',
                background: idx < wizardStep ? '#10B981' : idx === wizardStep ? 'var(--color-amber)' : 'var(--color-border)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'background var(--transition-base)',
              }}>
                {idx < wizardStep
                  ? <CheckCircle2 size={14} color="#fff"/>
                  : <span style={{ fontSize: 12, fontWeight: 700, color: idx === wizardStep ? '#fff' : 'var(--color-text-muted)' }}>{idx + 1}</span>
                }
              </div>
              <span style={{ fontSize: 13, fontWeight: idx === wizardStep ? 600 : 400, color: idx === wizardStep ? 'var(--color-text-primary)' : 'var(--color-text-muted)' }}>{s}</span>
              {idx < STEPS.length - 1 && <div style={{ width: 32, height: 1, background: idx < wizardStep ? '#10B981' : 'var(--color-border)', transition: 'background var(--transition-base)' }}/>}
            </div>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {wizardStep === 0 && (
            <motion.div key="upload" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <input ref={inputRef} type="file" accept=".xlsx,.xls,.csv" style={{ display: 'none' }} onChange={handleFileChange}/>
              <motion.div
                whileHover={{ borderColor: 'var(--color-amber)' }}
                onClick={() => inputRef.current?.click()}
                style={{
                  border: '2px dashed var(--color-border)', borderRadius: 'var(--radius-lg)',
                  padding: '48px 24px', textAlign: 'center', cursor: 'pointer',
                  transition: 'border-color var(--transition-fast)',
                  background: uploadMutation.isPending ? 'var(--color-amber-subtle)' : 'transparent',
                }}
              >
                {uploadMutation.isPending
                  ? <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 36, height: 36, border: '3px solid var(--color-amber)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }}/>
                      <span style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>Загружаем и анализируем...</span>
                    </div>
                  : <>
                      <Upload size={32} color="var(--color-amber)" style={{ margin: '0 auto 12px' }}/>
                      <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>Перетащите файл или нажмите</div>
                      <div style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>Поддерживаются .xlsx, .xls, .csv</div>
                    </>
                }
              </motion.div>
            </motion.div>
          )}

          {wizardStep === 1 && preview && (
            <motion.div key="mapping" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>Сопоставление колонок</div>
                  <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Всего строк: {preview.total}</div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <Button variant="secondary" size="sm" onClick={() => { setWizardStep(0); setActiveJobId(null); setMapping({}); }}>
                    Заново
                  </Button>
                  <Button size="sm" loading={confirmMapping.isPending} iconRight={<ArrowRight size={13}/>} onClick={() => confirmMapping.mutate()}>
                    Импортировать
                  </Button>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
                {preview.headers.map(header => (
                  <div key={header} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', background: 'var(--color-bg-muted)', borderRadius: 'var(--radius-md)' }}>
                    <span style={{ fontSize: 12, flex: 1, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{header}</span>
                    <ArrowRight size={12} color="var(--color-text-muted)" style={{ flexShrink: 0 }}/>
                    <select
                      value={mapping[header] ?? ''}
                      onChange={e => setMapping(m => ({ ...m, [header]: e.target.value }))}
                      className="crm-select"
                      style={{ width: 160, flexShrink: 0 }}
                    >
                      {CRM_FIELDS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                    </select>
                  </div>
                ))}
              </div>

              <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 8 }}>Предварительный просмотр (первые 5 строк)</div>
              <div style={{ overflowX: 'auto', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: 'var(--color-bg-muted)' }}>
                      {preview.headers.map(h => <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, borderBottom: '1px solid var(--color-border)', whiteSpace: 'nowrap' }}>{h}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.rows.slice(0, 5).map((row, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid var(--color-border)' }}>
                        {row.map((cell, j) => <td key={j} style={{ padding: '7px 12px', color: 'var(--color-text-secondary)', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cell}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}

          {wizardStep === 2 && (
            <motion.div key="result" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
              {activeJob?.status === 'processing' ? (
                <div style={{ textAlign: 'center', padding: '32px' }}>
                  <div style={{ width: 48, height: 48, border: '3px solid var(--color-amber)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite', margin: '0 auto 16px' }}/>
                  <div style={{ fontSize: 15, fontWeight: 600 }}>Импортируем клиентов...</div>
                  <div style={{ fontSize: 13, color: 'var(--color-text-muted)', marginTop: 4 }}>Обновим результат автоматически</div>
                </div>
              ) : activeJob?.status === 'completed' ? (
                <div style={{ textAlign: 'center', padding: '32px' }}>
                  <CheckCircle2 size={40} color="#10B981" style={{ margin: '0 auto 12px' }}/>
                  <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>Импорт завершён!</div>
                  <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginTop: 16 }}>
                    {[
                      { label: 'Успешно', value: activeJob.result_json?.success ?? 0, color: '#10B981' },
                      { label: 'Дублей', value: activeJob.result_json?.duplicates ?? 0, color: '#F59E0B' },
                      { label: 'Ошибок', value: activeJob.result_json?.errors ?? 0, color: '#EF4444' },
                    ].map(stat => (
                      <div key={stat.label} style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 28, fontWeight: 800, color: stat.color, fontFamily: 'var(--font-display)' }}>{stat.value}</div>
                        <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{stat.label}</div>
                      </div>
                    ))}
                  </div>
                  <Button style={{ marginTop: 20 }} onClick={() => { setWizardStep(0); setActiveJobId(null); setMapping({}); }}>
                    Новый импорт
                  </Button>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '32px', color: '#EF4444' }}>
                  <AlertCircle size={32} style={{ margin: '0 auto 12px' }}/>
                  <div>Ошибка импорта. Попробуйте снова.</div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--color-border)', fontSize: 13, fontWeight: 600 }}>История импортов</div>
        {isLoading ? [1,2,3].map(i => <div key={i} style={{ padding: '12px 18px', borderBottom: '1px solid var(--color-border)' }}><Skeleton height={14} width="50%"/></div>)
          : (jobs?.results ?? []).length === 0
            ? <div style={{ padding: '24px', textAlign: 'center', fontSize: 12, color: 'var(--color-text-muted)' }}>Импортов не было</div>
            : (jobs?.results ?? []).map(job => {
                const sm = STATUS_COLORS[job.status] ?? STATUS_COLORS.pending;
                return (
                  <div key={job.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 18px', borderBottom: '1px solid var(--color-border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <FileText size={14} color="var(--color-amber)"/>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 500 }}>Импорт клиентов</div>
                        <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
                          {new Date(job.created_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>
                    <div style={{ fontSize: 12, background: sm.bg, color: sm.color, padding: '2px 10px', borderRadius: 'var(--radius-full)', fontWeight: 500 }}>
                      {STATUS_LABELS[job.status] ?? job.status}
                    </div>
                  </div>
                );
              })
        }
      </div>
    </div>
  );
}
