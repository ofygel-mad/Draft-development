import { useMemo } from 'react';

export function SpreadsheetReview({ preview }: { preview: any }) {
  const suggestions = useMemo(() => preview?.preview_payload?.mapping_suggestions ?? [], [preview]);
  const sheets = preview?.preview_payload?.sheets ?? [];
  if (!preview) return null;
  return <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: 16 }}><section style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: 16 }}><h3 style={{ marginTop: 0 }}>Source preview</h3>{sheets.map((sheet: any) => <div key={sheet.sheet_name} style={{ marginBottom: 16 }}><div style={{ fontWeight: 600, marginBottom: 8 }}>{sheet.sheet_name}</div></div>)}</section><section style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: 16 }}><h3 style={{ marginTop: 0 }}>CRM interpretation</h3>{suggestions.map((item: any) => <div key={item.column_key} style={{ padding: '10px 0', borderBottom: '1px solid var(--color-border)' }}><div style={{ fontWeight: 600 }}>{item.column_key}</div><div style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>{item.target_entity}.{item.target_field}</div></div>)}</section></div>;
}
