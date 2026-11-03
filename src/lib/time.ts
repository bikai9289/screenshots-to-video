export function getIsoTimestr(): string {
  return new Date().toISOString();
}

export const getTimestamp = () => {
  return Date.parse(new Date().toUTCString()) / 1000;
};

export const getMillisecond = () => {
  return new Date().getTime();
};

/**
 * 格式化前台日期时间 (YYYY-MM-DD HH:mm)
 * 例如: 2026-08-31 14:16
 */
export function formatDateTime(
  input: string | number | Date | null | undefined
): string {
  if (!input) return '—';
  const d = new Date(input);
  if (isNaN(d.getTime())) return '—';
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

/**
 * 格式化后台完整日期时间 (YYYY-MM-DD HH:mm:ss)
 * 例如: 2026-08-31 14:16:33
 */
export function formatAdminDateTime(
  input: string | number | Date | null | undefined
): string {
  if (!input) return '—';
  const d = new Date(input);
  if (isNaN(d.getTime())) return '—';
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

/**
 * 格式化日期 (YYYY-MM-DD)
 * 例如: 2026-08-31
 */
export function formatDate(
  input: string | number | Date | null | undefined
): string {
  if (!input) return '—';
  const d = new Date(input);
  if (isNaN(d.getTime())) return '—';
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export const getOneYearLaterTimestr = () => {
  const currentDate = new Date();
  const oneYearLater = new Date(currentDate);
  oneYearLater.setFullYear(currentDate.getFullYear() + 1);
  return oneYearLater.toISOString();
};
