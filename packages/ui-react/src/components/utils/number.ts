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

// ============================================================
// 常量与输入校验
// ============================================================

const MAX_SCALE = 1_000;
const MAX_EXPONENT = 100_000;
// 限制输入长度和运算工作精度，避免极端尾数或指数跨度造成大规模分配。
// 这里统计系数中的所有数字字符（含前导零），作为防超长字符串的保守上限。
const MAX_INPUT_DIGITS = 10_000;
const MAX_CALCULATION_PRECISION = 10_000;

const DECIMAL_PATTERN = /^[+-]?(?:(?:\d+(?:\.\d*)?)|(?:\.\d+))(?:e[+-]?\d+)?$/i;

const ROUNDING_MODES: ReadonlySet<string> = new Set<string>([
  'up',
  'down',
  'ceil',
  'floor',
  'half-up',
  'half-down',
  'half-even',
  'trunc',
]);

// ============================================================
// 内部表示：value = coefficient * 10^exponent
// ============================================================

interface Dec {
  /** 带符号的有效数字 */
  coefficient: bigint;
  /** 十进制指数 */
  exponent: number;
}

const ZERO: Dec = { coefficient: 0n, exponent: 0 };
const TEN = 10n;

const absBigInt = (n: bigint): bigint => (n < 0n ? -n : n);

/** 返回 10^n，调用方需保证 n >= 0。 */
const pow10 = (n: number): bigint => TEN ** BigInt(n);

/** BigInt 的十进制位数（0 计为 1 位）。 */
const digitsOf = (n: bigint): number => {
  if (n === 0n) return 1;
  return absBigInt(n).toString().length;
};

/** 在去除尾零前检查实际运算结果，包含加法进位或乘积新增的位。 */
const validateResultPrecision = (coefficient: bigint): bigint => {
  if (digitsOf(coefficient) > MAX_CALCULATION_PRECISION) {
    throw new RangeError(
      `Calculation precision must not exceed ${MAX_CALCULATION_PRECISION} digits`,
    );
  }
  return coefficient;
};

/**
 * 去掉 coefficient 末尾的零并把指数相应增加；零规范化为 ZERO。
 * 用字符串裁剪实现，避免对尾零逐个做 BigInt 除法。
 */
const normalize = (d: Dec): Dec => {
  if (d.coefficient === 0n) return ZERO;

  const neg = d.coefficient < 0n;
  const rawStr = absBigInt(d.coefficient).toString();
  let end = rawStr.length;
  while (end > 0 && rawStr.charCodeAt(end - 1) === 48 /* '0' */) end--;
  if (end === rawStr.length) return d;

  const trimmed = rawStr.slice(0, end);
  let c = BigInt(trimmed);
  if (neg) c = -c;

  return { coefficient: c, exponent: d.exponent + (rawStr.length - end) };
};

// ============================================================
// 输入解析
// ============================================================

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

  const coefficient = normalized.split(/[eE]/)[0];
  if (coefficient.replace(/[^0-9]/g, '').length > MAX_INPUT_DIGITS) {
    throw new RangeError(`${name} must contain at most ${MAX_INPUT_DIGITS} coefficient digits`);
  }

  const exponent = normalized.match(/[eE]([+-]?\d+)$/)?.[1];

  if (exponent && Math.abs(Number(exponent)) > MAX_EXPONENT) {
    throw new RangeError(`${name} exponent must be between -${MAX_EXPONENT} and ${MAX_EXPONENT}`);
  }

  return normalized.replace(/^\+/, '');
};

/** 把已通过 toInputString 校验的字符串解析为 Dec。 */
const parseDec = (input: string): Dec => {
  let s = input;
  let sign = 1n;
  if (s.charCodeAt(0) === 43 /* '+' */) {
    s = s.slice(1);
  } else if (s.charCodeAt(0) === 45 /* '-' */) {
    sign = -1n;
    s = s.slice(1);
  }

  const eIdx = s.search(/[eE]/);
  let expPart = 0;
  let mantissa = s;
  if (eIdx >= 0) {
    expPart = Number(s.slice(eIdx + 1));
    mantissa = s.slice(0, eIdx);
  }

  const dotIdx = mantissa.indexOf('.');
  let intPart: string;
  let fracPart: string;
  if (dotIdx >= 0) {
    intPart = mantissa.slice(0, dotIdx);
    fracPart = mantissa.slice(dotIdx + 1);
  } else {
    intPart = mantissa;
    fracPart = '';
  }

  // 去掉前导零后再构造 BigInt，避免 "0000" 产生无意义的 0n 乘法开销。
  const digitStr = (intPart + fracPart).replace(/^0+/, '');
  const coefficient = digitStr ? sign * BigInt(digitStr) : 0n;
  const exponent = expPart - fracPart.length;

  return normalize({ coefficient, exponent });
};

const toDec = (value: DecimalInput, name: string): Dec =>
  parseDec(toInputString(value, name));

// ============================================================
// 舍入决策（商/余数层面）
// ============================================================

/**
 * 根据截断商 q、余数 r、正除数 divisor 和舍入模式决定是否向远离零方向进一。
 *
 * @param q       截断商（符号任选，内部取绝对值判奇偶）
 * @param r       余数（符号任选，内部取绝对值）
 * @param divisor 正除数
 * @param sign    结果符号（1n 或 -1n）
 */
const decideRoundUp = (
  q: bigint,
  r: bigint,
  divisor: bigint,
  mode: DecimalRounding,
  sign: bigint,
): boolean => {
  if (r === 0n) return false;

  const absR = absBigInt(r);

  switch (mode) {
    case 'down':
    case 'trunc':
      return false;
    case 'up':
      return true;
    case 'ceil':
      return sign > 0n;
    case 'floor':
      return sign < 0n;
    case 'half-up':
      return absR * 2n >= divisor;
    case 'half-down':
      return absR * 2n > divisor;
    case 'half-even': {
      const twice = absR * 2n;
      if (twice > divisor) return true;
      if (twice < divisor) return false;
      return absBigInt(q) % 2n !== 0n;
    }
    default:
      return false;
  }
};

// ============================================================
// 比较
// ============================================================

const cmpAbs = (a: Dec, b: Dec): -1 | 0 | 1 => {
  if (a.coefficient === 0n) return b.coefficient === 0n ? 0 : -1;
  if (b.coefficient === 0n) return 1;

  // 先比较数量级：exponent + 位数（最高位指数 + 1）
  const orderA = a.exponent + digitsOf(a.coefficient);
  const orderB = b.exponent + digitsOf(b.coefficient);
  if (orderA !== orderB) return orderA > orderB ? 1 : -1;

  // 数量级相同，对齐到较小指数后精确比较。
  // 此时 a.exponent - b.exponent 的绝对值 ≤ max(digitsOf(a), digitsOf(b))，
  // 不会产生超大 BigInt。
  const e = Math.min(a.exponent, b.exponent);
  const ca = a.coefficient * pow10(a.exponent - e);
  const cb = b.coefficient * pow10(b.exponent - e);
  return ca > cb ? 1 : ca < cb ? -1 : 0;
};

const cmpDec = (a: Dec, b: Dec): -1 | 0 | 1 => {
  const signA = a.coefficient === 0n ? 0 : a.coefficient > 0n ? 1 : -1;
  const signB = b.coefficient === 0n ? 0 : b.coefficient > 0n ? 1 : -1;
  if (signA !== signB) return signA > signB ? 1 : -1;
  if (signA === 0) return 0;

  const absA = signA > 0 ? a : { coefficient: -a.coefficient, exponent: a.exponent };
  const absB = signB > 0 ? b : { coefficient: -b.coefficient, exponent: b.exponent };
  const c = cmpAbs(absA, absB);
  return (signA > 0 ? c : -c) as -1 | 0 | 1;
};

// ============================================================
// 加、减、乘
// ============================================================

const addDec = (a: Dec, b: Dec): Dec => {
  if (a.coefficient === 0n) return b;
  if (b.coefficient === 0n) return a;

  const e = Math.min(a.exponent, b.exponent);
  const spanA = a.exponent - e;
  const spanB = b.exponent - e;

  // 对齐后两操作数的位数，超限直接拒绝，避免分配超大 BigInt。
  const digitsA = digitsOf(a.coefficient) + spanA;
  const digitsB = digitsOf(b.coefficient) + spanB;
  if (digitsA > MAX_CALCULATION_PRECISION || digitsB > MAX_CALCULATION_PRECISION) {
    throw new RangeError(
      `Calculation precision must not exceed ${MAX_CALCULATION_PRECISION} digits`,
    );
  }

  const ca = spanA === 0 ? a.coefficient : a.coefficient * pow10(spanA);
  const cb = spanB === 0 ? b.coefficient : b.coefficient * pow10(spanB);
  return normalize({ coefficient: validateResultPrecision(ca + cb), exponent: e });
};

const subDec = (a: Dec, b: Dec): Dec =>
  addDec(a, { coefficient: -b.coefficient, exponent: b.exponent });

const mulDec = (a: Dec, b: Dec): Dec => {
  if (a.coefficient === 0n || b.coefficient === 0n) return ZERO;

  const digitsA = digitsOf(a.coefficient);
  const digitsB = digitsOf(b.coefficient);
  // 非零乘积至少有 digitsA + digitsB - 1 位；必定超限时提前拒绝。
  // 边界情况需计算后检查实际位数，避免误拒绝恰好 10000 位的乘积。
  if (digitsA + digitsB > MAX_CALCULATION_PRECISION + 1) {
    throw new RangeError(
      `Calculation precision must not exceed ${MAX_CALCULATION_PRECISION} digits`,
    );
  }

  return normalize({
    coefficient: validateResultPrecision(a.coefficient * b.coefficient),
    exponent: a.exponent + b.exponent,
  });
};

// ============================================================
// 除法（固定 scale + 舍入）
// ============================================================

const divDec = (a: Dec, b: Dec, scale: number, mode: DecimalRounding): Dec => {
  if (b.coefficient === 0n) throw new RangeError('Cannot divide by zero');
  if (a.coefficient === 0n) return { coefficient: 0n, exponent: -scale };

  const sign = (a.coefficient > 0n) === (b.coefficient > 0n) ? 1n : -1n;
  const absA = absBigInt(a.coefficient);
  const absB = absBigInt(b.coefficient);
  const digitsA = digitsOf(absA);
  const digitsB = digitsOf(absB);

  // 需要 round(absA * 10^k / absB) * 10^(-scale)，其中 k = a.exp - b.exp + scale。
  const k = a.exponent - b.exponent + scale;

  const numDigits = k >= 0 ? digitsA + k : digitsA;
  const denDigits = k >= 0 ? digitsB : digitsB - k;
  if (numDigits > MAX_CALCULATION_PRECISION || denDigits > MAX_CALCULATION_PRECISION) {
    throw new RangeError(
      `Calculation precision must not exceed ${MAX_CALCULATION_PRECISION} digits`,
    );
  }

  const numerator = k >= 0 ? (k === 0 ? absA : absA * pow10(k)) : absA;
  const denominator = k >= 0 ? absB : absB * pow10(-k);

  const q = numerator / denominator; // 截断（非负）
  const r = numerator % denominator; // 非负
  const roundUp = decideRoundUp(q, r, denominator, mode, sign);

  let resultC = sign * q;
  if (roundUp) resultC += sign;

  return { coefficient: resultC, exponent: -scale };
};

// ============================================================
// 舍入到指定小数位
// ============================================================

const roundToScale = (d: Dec, scale: number, mode: DecimalRounding): Dec => {
  const targetExp = -scale;
  if (d.coefficient === 0n) return { coefficient: 0n, exponent: targetExp };

  if (d.exponent >= targetExp) {
    // 小数位数不足 scale，补零即可。
    const shift = d.exponent - targetExp;
    const digits = digitsOf(d.coefficient) + shift;
    if (digits > MAX_CALCULATION_PRECISION) {
      throw new RangeError(
        `Calculation precision must not exceed ${MAX_CALCULATION_PRECISION} digits`,
      );
    }
    return {
      coefficient: shift === 0 ? d.coefficient : d.coefficient * pow10(shift),
      exponent: targetExp,
    };
  }

  const drop = targetExp - d.exponent;
  const c = d.coefficient;
  const absC = absBigInt(c);
  const sign = c > 0n ? 1n : -1n;
  const digitsC = digitsOf(absC);

  // |c| / 10^drop < 0.1：所有 half 模式都不进位，只需处理 up/ceil/floor。
  if (drop > digitsC) {
    const roundUp =
      mode === 'up' ||
      (mode === 'ceil' && sign > 0n) ||
      (mode === 'floor' && sign < 0n);
    return { coefficient: roundUp ? sign : 0n, exponent: targetExp };
  }

  // drop <= digitsC ≤ MAX_CALCULATION_PRECISION，pow10(drop) 安全。
  const divisor = pow10(drop);
  const q = c / divisor;
  const r = c % divisor;
  const roundUp = decideRoundUp(q, r, divisor, mode, sign);
  const resultC = roundUp ? q + sign : q;

  return { coefficient: resultC, exponent: targetExp };
};

// ============================================================
// 输出格式化
// ============================================================

/** 把 Dec 格式化为普通十进制字符串（不含尾零规范化）。 */
const toPlainString = (d: Dec): string => {
  if (d.coefficient === 0n) return '0';

  const neg = d.coefficient < 0n;
  const absStr = absBigInt(d.coefficient).toString();
  const e = d.exponent;

  let result: string;
  if (e >= 0) {
    result = absStr + '0'.repeat(e);
  } else {
    const s = -e;
    if (absStr.length <= s) {
      result = `0.${'0'.repeat(s - absStr.length)}${absStr}`;
    } else {
      const split = absStr.length - s;
      result = `${absStr.slice(0, split)}.${absStr.slice(split)}`;
    }
  }

  return neg ? `-${result}` : result;
};

/** 对 add/sub/mul 等无 scale 语义的结果做规范化并输出。 */
const finalize = (d: Dec): string => {
  const n = normalize(d);
  if (n.coefficient === 0n) return '0';

  const order = n.exponent + digitsOf(n.coefficient) - 1;
  if (order > MAX_EXPONENT || order < -MAX_EXPONENT) {
    throw new RangeError(
      `result exponent must be between -${MAX_EXPONENT} and ${MAX_EXPONENT}`,
    );
  }

  return toPlainString(n);
};

/** 输出固定 scale 位小数，零统一为正零并保留 scale。 */
const formatRounded = (d: Dec): string => {
  if (d.coefficient === 0n) {
    const s = -d.exponent;
    return s <= 0 ? '0' : `0.${'0'.repeat(s)}`;
  }
  return toPlainString(d);
};

// ============================================================
// 参数校验
// ============================================================

const validateScale = (scale: number): void => {
  if (!Number.isInteger(scale) || scale < 0 || scale > MAX_SCALE) {
    throw new RangeError(
      `scale must be an integer between 0 and ${MAX_SCALE}, but now is ${scale}`,
    );
  }
};

const resolveRounding = (rounding: DecimalRounding = 'half-up'): DecimalRounding => {
  if (typeof rounding !== 'string' || !ROUNDING_MODES.has(rounding)) {
    throw new TypeError(`Unsupported rounding mode: ${String(rounding)}`);
  }
  return rounding;
};

// ============================================================
// 公共 API
// ============================================================

/**
 * 精确加法。结果始终返回普通十进制字符串，不返回 number。
 */
export const add = (left: DecimalInput, right: DecimalInput): string =>
  finalize(addDec(toDec(left, 'left'), toDec(right, 'right')));

/**
 * 精确减法。结果始终返回普通十进制字符串，不返回 number。
 */
export const sub = (left: DecimalInput, right: DecimalInput): string =>
  finalize(subDec(toDec(left, 'left'), toDec(right, 'right')));

/**
 * 精确比较两个十进制数。
 *
 * 返回值：
 * - `-1`：left 小于 right
 * - `0`：left 等于 right
 * - `1`：left 大于 right
 */
export const compareDecimal = (left: DecimalInput, right: DecimalInput): -1 | 0 | 1 =>
  cmpDec(toDec(left, 'left'), toDec(right, 'right'));

/**
 * 精确乘法。结果始终返回普通十进制字符串，不返回 number。
 */
export const mul = (left: DecimalInput, right: DecimalInput): string =>
  finalize(mulDec(toDec(left, 'left'), toDec(right, 'right')));

/**
 * 精确除法。
 *
 * 调用方必须明确指定保留位数；舍入方式默认 half-up，除零抛出 RangeError。
 * 结果固定保留 scale 位小数，避免不同调用点产生不同语义。
 */
export const division = (
  left: DecimalInput,
  right: DecimalInput,
  options: DivisionOptions,
): string => {
  if (!options || typeof options !== 'object') {
    throw new TypeError('division requires options with an explicit scale');
  }
  validateScale(options.scale);
  const rounding = resolveRounding(options.rounding);

  return formatRounded(
    divDec(toDec(left, 'left'), toDec(right, 'right'), options.scale, rounding),
  );
};

/**
 * 按指定舍入模式返回固定 scale 位小数的字符串。
 */
export const roundDecimal = (
  value: DecimalInput,
  scale: number,
  rounding: DecimalRounding = 'half-up',
): string => {
  validateScale(scale);
  const r = resolveRounding(rounding);
  return formatRounded(roundToScale(toDec(value, 'value'), scale, r));
};

/**
 * 数学意义上的向上取整到指定小数位。
 * 例如 ceilDecimal('-1.231', 2) === '-1.23'。
 */
export const ceilDecimal = (value: DecimalInput, scale: number): string =>
  roundDecimal(value, scale, 'ceil');

/**
 * 将科学计数法展开为普通十进制字符串。
 */
export const scientificToPlainString = (input: DecimalInput): string =>
  finalize(toDec(input, 'input'));

/**
 * 将任意合法十进制输入转换为普通十进制字符串。
 * 保留此导出以兼容历史调用；与 `scientificToPlainString` 等价。
 */
export const exponentialToString = (input: DecimalInput): string =>
  scientificToPlainString(input);

/**
 * 数字展示层使用的非科学计数法转换。
 * null、undefined、空字符串仍表示无值；其他非法值直接抛错。
 */
export const toNonExponential = (value: DecimalInput | null | undefined): string => {
  if (value === null || typeof value === 'undefined') return '';

  if (typeof value === 'string' && value.trim() === '') return '';

  return scientificToPlainString(value);
};
