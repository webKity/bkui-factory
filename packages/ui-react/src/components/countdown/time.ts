import type { CountdownItem, CountdownParts, CountdownTimeInput, CountdownUnit } from './type';

export const countdownUnits: CountdownUnit[] = ['days', 'hours', 'minutes', 'seconds'];
export const defaultLabels: Record<CountdownUnit, string> = {
  days: '天', hours: '时', minutes: '分', seconds: '秒',
};

export function normalizeRemaining(value: number): number {
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}

/** 数字小于 1e12 时按秒级 Unix 时间戳处理。字符串交由 Date.parse 解析。 */
export function parseTargetTime(value: CountdownTimeInput): number {
  const timestamp = value instanceof Date ? value.getTime()
    : typeof value === 'number' ? (Math.abs(value) < 1e12 ? value * 1000 : value)
    : /^\s*[+-]?\d+(?:\.\d+)?\s*$/.test(value) ? NaN : Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : 0;
}

export function getCountdownParts(remaining: number): CountdownParts {
  const total = normalizeRemaining(remaining);
  // 向上取整，剩余不足一秒时仍显示 01，归零与完成回调保持一致。
  const seconds = Math.ceil(total / 1000);
  return {
    total,
    days: Math.floor(seconds / 86400),
    hours: Math.floor(seconds / 3600) % 24,
    minutes: Math.floor(seconds / 60) % 60,
    seconds: seconds % 60,
    milliseconds: Math.floor(total % 1000),
  };
}

export function getCountdownItems(
  parts: CountdownParts,
  units: CountdownUnit[],
  labels: Partial<Record<CountdownUnit, string>> = {},
  showZeroUnits = true,
  padDays = false,
): CountdownItem[] {
  const divisors = { days: 86400, hours: 3600, minutes: 60, seconds: 1 };
  const seconds = Math.ceil(parts.total / 1000);
  const unique = countdownUnits.filter(unit => units.includes(unit));
  // 未展示的高位单位折算进第一个展示单位，例如 OTP 的 90 秒不会变成 30 秒。
  const items = unique.map((unit, index) => {
    const value = index === 0 ? Math.floor(seconds / divisors[unit]) : parts[unit];
    return {
      unit, value,
      text: unit === 'days' && !padDays ? String(value) : String(value).padStart(2, '0'),
      label: labels[unit] ?? defaultLabels[unit],
    };
  });
  if (showZeroUnits) return items;
  const first = items.findIndex(item => item.value > 0);
  return first === -1 ? items.slice(-1) : items.slice(first);
}
