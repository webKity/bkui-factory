import Decimal from 'decimal.js-light';
import type {
  InputProps,
  StepDirection,
  StepReason,
  StepValidator,
  StepValidateParams,
} from './type';

// Decimal precision scales with the operands so stepping also preserves large balances.
function arithmetic(a: string, b: string, subtract = false) {
  const D = Decimal.clone({ precision: Math.max(a.length, b.length) * 2 + 32 });
  return (subtract ? new D(a).minus(b) : new D(a).plus(b)).toFixed();
}

const add = (a: string, b: string) => arithmetic(a, b);

const sub = (a: string, b: string) => arithmetic(a, b, true);

const compareDecimal = (a: string, b: string) => new Decimal(a).comparedTo(b);

const scientificToPlainString = (value: string) => new Decimal(value).toFixed();

const DRAFT_RE = /^(?:\d+\.?\d*|\.\d*)$/;
const SIGNED_DECIMAL_RE = /^-?(?:\d+(?:\.\d*)?|\.\d+)$/;

const getLocaleDecimalSeparator = (locale?: string): string => {
  try {
    return (
      new Intl.NumberFormat(locale).formatToParts(1.1).find(part => part.type === 'decimal')
        ?.value ?? '.'
    );
  } catch {
    return '.';
  }
};

// ==================== 数字归一化 / 校验 ====================

/**
 * 多语言归一化：
 * - 全角数字 ０-９ → 0-9
 * - 全角句号/句点 。． → 半角小数点
 * - 全角逗号 ， → 半角逗号
 * - 阿拉伯/波斯十进制分隔符 → 半角小数点
 * - 根据 locale 处理法语/德语等逗号小数点
 */
export const normalizeNumericInput = (
  raw: string,
  locale = typeof navigator === 'undefined' ? undefined : navigator.language,
): string => {
  if (!raw) return raw;

  let result = raw;

  result = result.replace(/[\uFF10-\uFF19]/g, ch => String.fromCharCode(ch.charCodeAt(0) - 0xfee0));
  result = result.replace(/[。．]/g, '.');
  result = result.replace(/，/g, ',');
  result = result.replace(/[\u066B\u2396]/g, '.');

  // Accept one locale-specific decimal separator. Never guess grouping separators.
  if (getLocaleDecimalSeparator(locale) === ',' && /^\d+,\d*$/.test(result)) {
    result = result.replace(',', '.');
  }

  return result;
};

export const isNumericDraft = (raw: string, decimal?: number): boolean => {
  if (raw === '') return true;

  // 用户输入的小数点前必须有数字，避免将 "." 等非法数值传入表单和计算逻辑。
  if (!DRAFT_RE.test(raw) || raw.startsWith('.')) return false;

  if (decimal !== undefined && decimal >= 0) {
    const dotIndex = raw.indexOf('.');
    if (dotIndex !== -1) {
      if (decimal <= 0) return false;

      const fracLength = raw.length - dotIndex - 1;

      if (fracLength > Math.floor(decimal)) return false;
    }
  }

  return true;
};

const roundDecimalString = (raw: string, decimal: number): string => {
  if (decimal < 0) return raw;

  const dotIndex = raw.indexOf('.');

  if (dotIndex === -1) return raw;

  const intPart = raw.slice(0, dotIndex);
  const fracPart = raw.slice(dotIndex + 1);

  if (fracPart.length <= decimal) {
    return decimal === 0 ? intPart : raw;
  }

  const keep = fracPart.slice(0, decimal);
  const nextDigit = fracPart.charCodeAt(decimal) - 48;

  if (nextDigit < 5) {
    if (decimal === 0) return intPart;
    return `${intPart}.${keep}`;
  }

  let carry = 1;
  let fracResult = '';

  for (let i = keep.length - 1; i >= 0; i--) {
    const digit = keep.charCodeAt(i) - 48 + carry;
    if (digit >= 10) {
      fracResult = `0${fracResult}`;
      carry = 1;
    } else {
      fracResult = `${digit}${fracResult}`;
      carry = 0;
    }
  }

  let intResult = intPart;

  if (carry) {
    let intCarry = 1;
    let newInt = '';

    for (let i = intPart.length - 1; i >= 0; i--) {
      const digit = intPart.charCodeAt(i) - 48 + intCarry;
      if (digit >= 10) {
        newInt = `0${newInt}`;
        intCarry = 1;
      } else {
        newInt = `${digit}${newInt}`;
        intCarry = 0;
      }
    }

    if (intCarry) newInt = `1${newInt}`;

    intResult = newInt;
  }

  if (decimal === 0) return intResult;

  return `${intResult}.${fracResult}`;
};

export const finalizeNumberValue = (raw: string, decimal?: number): string => {
  if (raw === '' || raw === '.') return '';

  let normalized = raw;

  if (normalized.startsWith('.')) normalized = `0${normalized}`;

  if (normalized.endsWith('.')) normalized = normalized.slice(0, -1);

  if (normalized === '') return '';

  if (decimal !== undefined && decimal >= 0) {
    return roundDecimalString(normalized, Math.floor(decimal));
  }

  return normalized;
};

export const normalizeExternalNumberValue = (
  value: InputProps['value'] | InputProps['defaultValue'],
  decimal?: number,
): string => {
  if (value === undefined || value === null) return '';

  const rawValue = String(value);

  if (rawValue === '') return '';

  let expanded = rawValue;

  if (!DRAFT_RE.test(rawValue)) {
    try {
      expanded = `${scientificToPlainString(rawValue)}`;
    } catch {
      return '';
    }
  }

  if (!DRAFT_RE.test(expanded)) return '';

  let normalized = expanded;

  if (normalized.startsWith('.')) normalized = `0${normalized}`;

  if (normalized === '') return '';

  if (decimal !== undefined && decimal >= 0) {
    return roundDecimalString(normalized, Math.floor(decimal));
  }

  return normalized;
};

const parseNumericArg = (value: number | string | undefined | null): string | null => {
  if (value === undefined || value === null || value === '') return null;

  const raw = String(value);
  let expanded = raw;

  if (!SIGNED_DECIMAL_RE.test(raw)) {
    try {
      expanded = `${scientificToPlainString(raw)}`;
    } catch {
      return null;
    }
  }

  if (!SIGNED_DECIMAL_RE.test(expanded)) return null;

  return expanded;
};

// ==================== DOM 工具 ====================

export const getSelectedValue = (
  input: HTMLInputElement,
  insertedValue: string,
  start = input.selectionStart ?? input.value.length,
  end = input.selectionEnd ?? start,
) => `${input.value.slice(0, start)}${insertedValue}${input.value.slice(end)}`;

export const setNativeInputValue = (input: HTMLInputElement, value: string) => {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
  setter?.call(input, value);
};

// ==================== 步进计算 ====================

export type StepResult = {
  nextValue: string;
  reason: StepReason;
};

export const computeSteppedNumberValue = ({
  value,
  direction,
  step,
  min,
  max,
  decimal,
}: {
  value: string;
  direction: StepDirection;
  step?: number | string;
  min?: number | string;
  max?: number | string;
  decimal?: number;
}): StepResult => {
  let cleanValue = value;

  if (cleanValue.startsWith('.')) cleanValue = `0${cleanValue}`;

  if (cleanValue.endsWith('.')) cleanValue = cleanValue.slice(0, -1);

  if (cleanValue === '' || cleanValue === '.') cleanValue = '0';

  const increment = step === undefined || step === 'any' ? '1' : parseNumericArg(step);

  if (!increment || compareDecimal(increment, '0') <= 0) {
    return { nextValue: cleanValue, reason: 'invalid-step' };
  }

  // Numeric input is non-negative. Quantize bounds inward, so every committed
  // step satisfies both the requested precision and the supplied interval.
  const parsedMinimum = parseNumericArg(min) ?? '0';
  let minimum = compareDecimal(parsedMinimum, '0') < 0 ? '0' : parsedMinimum;
  let maximum = parseNumericArg(max);
  const places =
    decimal !== undefined && Number.isFinite(decimal) && decimal >= 0
      ? Math.floor(decimal)
      : undefined;

  if (places !== undefined) {
    minimum = new Decimal(minimum).toDecimalPlaces(places, Decimal.ROUND_CEIL).toFixed();
    if (maximum !== null) {
      maximum = new Decimal(maximum).toDecimalPlaces(places, Decimal.ROUND_FLOOR).toFixed();
    }
  }

  if (maximum !== null && compareDecimal(minimum, maximum) > 0) {
    return { nextValue: cleanValue, reason: 'boundary' };
  }

  const base = compareDecimal(cleanValue, minimum) < 0 ? minimum : cleanValue;
  let next = direction === 'up' ? add(base, increment) : sub(base, increment);

  if (places !== undefined) next = roundDecimalString(next, places);

  if (compareDecimal(next, minimum) < 0) next = minimum;

  if (maximum !== null && compareDecimal(next, maximum) > 0) next = maximum;

  if (compareDecimal(next, cleanValue) === 0) {
    return { nextValue: cleanValue, reason: 'boundary' };
  }

  return { nextValue: next, reason: 'ok' };
};

export const safeStepValidator = (
  validator: StepValidator | undefined,
  params: StepValidateParams,
): boolean => {
  if (!validator) return true;
  try {
    return validator(params) !== false;
  } catch {
    return true;
  }
};
