/**
 * Проверяет контрольную сумму БИН/ИИН Казахстана (12 цифр).
 * Алгоритм: сумма (digit_i * weight_i) mod 11, если 10 — второй проход с другими весами.
 */
export function validateBinIin(value: string): boolean {
  const digits = value.replace(/\D/g, '');
  if (digits.length !== 12) return false;

  const d = digits.split('').map(Number);
  const w1 = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
  const w2 = [3, 4, 5, 6, 7, 8, 9, 10, 11, 1, 2];

  let sum = 0;
  for (let i = 0; i < 11; i++) sum += d[i] * w1[i];
  let check = sum % 11;

  if (check === 10) {
    sum = 0;
    for (let i = 0; i < 11; i++) sum += d[i] * w2[i];
    check = sum % 11;
  }

  return check === d[11];
}

export function isBin(value: string): boolean {
  const d = value.replace(/\D/g, '');
  return d.length === 12 && (d[4] === '4' || d[4] === '5');
}

export function isIin(value: string): boolean {
  const d = value.replace(/\D/g, '');
  return d.length === 12 && !isBin(d);
}

export function formatBinIin(value: string): string {
  return value.replace(/\D/g, '').slice(0, 12);
}

/**
 * Форматирует казахстанский номер телефона для wa.me
 * +7 700 123 45 67 → 77001234567
 */
export function formatPhoneForWhatsApp(phone: string): string {
  let p = phone.replace(/\D/g, '');
  if (p.startsWith('8') && p.length === 11) p = '7' + p.slice(1);
  return p;
}
