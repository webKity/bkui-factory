import Decimal from 'decimal.js-light';

/**
 * 金融计算的输入应优先使用字符串。
 *
 * number 在进入函数前可能已经丢失精度，例如：
 * Number('9007199254740993') === 9007199254740992。
 * 因此 number 只作为兼容入口，无法恢复它进入函数前已经丢失的信息。
 */
export type DecimalInput = string | number;

/**
 * 十进制舍入模式。
 *
 * - `up`：只要被舍弃的位中存在非零数字，就向远离零的方向舍入。
 * - `down`：向零的方向舍入，直接舍弃多余的小数位。
 * - `ceil`：向正无穷方向舍入。例如 `-1.21` 保留 1 位小数时为 `-1.2`。
 * - `floor`：向负无穷方向舍入。例如 `-1.21` 保留 1 位小数时为 `-1.3`。
 * - `half-up`：舍入到最近值，恰好处于中点时向远离零的方向舍入。
 * - `half-down`：舍入到最近值，恰好处于中点时向零的方向舍入。
 * - `half-even`：舍入到最近值，恰好处于中点时向保留位的偶数方向舍入，也称为银行家舍入。
 * - `trunc`：截断多余位，行为等同于 `down`。
 *
 * 金融计算必须根据具体业务规则选择舍入模式，不能默认所有场景都使用
 * `half-up`。
 */
export type DecimalRounding =
  | 'up'
  | 'down'
  | 'ceil'
  | 'floor'
  | 'half-up'
  | 'half-down'
  | 'half-even'
  | 'trunc';

export interface DivisionOptions {
  /** 小数位数，必须显式指定 */
  scale: number;
  /** 默认 half-up */
  rounding?: DecimalRounding;
}

const MAX_SCALE = 1_000;
const MAX_EXPONENT = 100_000;
const DECIMAL_PATTERN = /^[+-]?(?:(?:\d+(?:\.\d*)?)|(?:\.\d+))(?:e[+-]?\d+)?$/i;

const decimalRoundingMap: Record<DecimalRounding, number> = {
  up: Decimal.ROUND_UP,
  down: Decimal.ROUND_DOWN,
  ceil: Decimal.ROUND_CEIL,
  floor: Decimal.ROUND_FLOOR,
  'half-up': Decimal.ROUND_HALF_UP,
  'half-down': Decimal.ROUND_HALF_DOWN,
  'half-even': Decimal.ROUND_HALF_EVEN,
  trunc: Decimal.ROUND_DOWN,
};

const toInputString = (value: DecimalInput, name: string): string => {
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      throw new TypeError(`${name} must be a finite decimal`);
    }

    return String(value);
  }

  if (typeof value !== 'string') {
    throw new TypeError(`${name} must be a decimal string or finite number`);
  }

  const normalized = value.trim();

  if (!normalized || !DECIMAL_PATTERN.test(normalized)) {
    throw new TypeError(`${name} must be a valid decimal`);
  }

  const exponent = normalized.match(/[eE]([+-]?\d+)$/)?.[1];

  if (exponent && Math.abs(Number(exponent)) > MAX_EXPONENT) {
    throw new RangeError(`${name} exponent must be between -${MAX_EXPONENT} and ${MAX_EXPONENT}`);
  }

  return normalized.replace(/^\+/, '');
};

const toDecimal = (value: DecimalInput, name: string): Decimal => {
  const input = toInputString(value, name);

  try {
    return new Decimal(input);
  } catch {
    throw new TypeError(`${name} must be a valid decimal`);
  }
};

const significantDigits = (value: DecimalInput): number => {
  const input = toInputString(value, 'value').replace(/^[+-]/, '');
  const [coefficient] = input.split(/[eE]/);
  const digits = coefficient.replace('.', '').replace(/^0+/, '');

  return Math.max(1, digits.length);
};

const arithmeticPrecision = (left: DecimalInput, right: DecimalInput, extra = 2): number => {
  const leftDecimal = toDecimal(left, 'left');
  const rightDecimal = toDecimal(right, 'right');
  const exponentSpan = Math.abs(leftDecimal.exponent() - rightDecimal.exponent());

  return significantDigits(left) + significantDigits(right) + exponentSpan + extra;
};

const withPrecision = <T>(precision: number, operation: () => T): T => {
  const previousPrecision = Decimal.precision;
  const previousRounding = Decimal.rounding;

  Decimal.set({
    precision: Math.max(precision, 1),
    rounding: Decimal.ROUND_DOWN,
  });

  try {
    return operation();
  } finally {
    Decimal.set({
      precision: previousPrecision,
      rounding: previousRounding,
    });
  }
};

const normalize = (value: Decimal): number => {
  const result = value
    .toFixed()
    .replace(/(\.\d*?)0+$/, '$1')
    .replace(/\.$/, '');
  return result === '-0' ? 0 : Number(result);
};

const validateScale = (scale: number): void => {
  if (!Number.isInteger(scale) || scale < 0 || scale > MAX_SCALE) {
    throw new RangeError(
      `scale must be an integer between 0 and ${MAX_SCALE}, but now is ${scale}`,
    );
  }
};

const resolveRounding = (rounding: DecimalRounding = 'half-up'): number => {
  const mode = decimalRoundingMap[rounding];

  if (typeof mode === 'undefined') {
    throw new TypeError(`Unsupported rounding mode: ${rounding}`);
  }

  return mode;
};

/**
 * 精确加法。结果始终返回普通十进制字符串，不返回 number。
 */
export const add = (left: DecimalInput, right: DecimalInput): number => {
  const precision = arithmeticPrecision(left, right);

  return withPrecision(precision, () =>
    normalize(toDecimal(left, 'left').plus(toDecimal(right, 'right'))),
  );
};

/**
 * 精确减法。结果始终返回普通十进制字符串，不返回 number。
 */
export const sub = (left: DecimalInput, right: DecimalInput): number => {
  const precision = arithmeticPrecision(left, right);

  return withPrecision(precision, () =>
    normalize(toDecimal(left, 'left').minus(toDecimal(right, 'right'))),
  );
};

/**
 * 精确比较两个十进制数。
 *
 * 返回值：
 * - `-1`：left 小于 right
 * - `0`：left 等于 right
 * - `1`：left 大于 right
 */
export const compareDecimal = (left: DecimalInput, right: DecimalInput): -1 | 0 | 1 => {
  const result = toDecimal(left, 'left').cmp(toDecimal(right, 'right'));

  return result === -1 || result === 0 ? result : 1;
};

/**
 * 精确乘法。结果始终返回普通十进制字符串，不返回 number。
 */
export const mul = (left: DecimalInput, right: DecimalInput): number => {
  const precision = significantDigits(left) + significantDigits(right) + 2;

  return withPrecision(precision, () =>
    normalize(toDecimal(left, 'left').times(toDecimal(right, 'right'))),
  );
};

/**
 * 精确除法。
 *
 * 除法不是有限小数时，必须由调用方明确指定保留位数和舍入方式。
 * 结果固定保留 scale 位小数，避免不同调用点产生不同语义。
 */
export const division = (
  left: DecimalInput,
  right: DecimalInput,
  options: DivisionOptions = { scale: 18, rounding: 'half-up' },
): number => {
  validateScale(options.scale);

  const divisor = toDecimal(right, 'right');

  if (divisor.isZero()) return 0;

  const dividend = toDecimal(left, 'left');
  const integerDigits = Math.max(1, dividend.exponent() - divisor.exponent() + 1);
  const precision = Math.max(
    significantDigits(left) + significantDigits(right) + 2,
    integerDigits + options.scale + 10,
  );
  const rounding = resolveRounding(options.rounding);

  return Number(
    withPrecision(precision, () => dividend.div(divisor).toFixed(options.scale, rounding)),
  );
};

/**
 * 按指定舍入模式保留小数位。
 */
export const roundDecimal = (
  value: DecimalInput,
  scale: number,
  rounding: DecimalRounding = 'half-up',
): number => {
  const numScale = Number(scale);
  validateScale(numScale);
  const decimal = toDecimal(value, 'value');
  const precision = significantDigits(value) + Math.max(decimal.exponent() + 1, 1) + 2;

  return Number(
    withPrecision(precision, () => decimal.toFixed(numScale, resolveRounding(rounding))),
  );
};

/**
 * 数学意义上的向上取整到指定小数位。
 * 例如 ceilDecimal('-1.231', 2) === '-1.23'。
 */
export const ceilDecimal = (value: DecimalInput, scale: number): number =>
  roundDecimal(value, scale, 'ceil');

/**
 * 将科学计数法展开为普通十进制字符串。
 */
export const scientificToPlainString = (input: DecimalInput): number => {
  const value = toDecimal(input, 'input');
  return normalize(value);
};

/**
 * 将任意合法十进制输入转换为普通十进制字符串。
 */
export const exponentialToString = (input: DecimalInput): number => scientificToPlainString(input);

/**
 * 数字展示层使用的非科学计数法转换。
 * null、undefined、空字符串仍表示无值；其他非法值直接抛错。
 */
export const toNonExponential = (value: DecimalInput | null | undefined): string => {
  if (value === null || typeof value === 'undefined') return '';

  if (typeof value === 'string' && value.trim() === '') return '';

  return `${scientificToPlainString(value)}`;
};
