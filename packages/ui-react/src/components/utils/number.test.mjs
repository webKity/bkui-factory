import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { after, before, test } from 'node:test';
import { build } from 'esbuild';

let directory, numbers;

before(async () => {
  directory = await mkdtemp(join(tmpdir(), 'bk-number-'));
  const outfile = join(directory, 'number.mjs');
  await build({
    entryPoints: [fileURLToPath(new URL('./number.ts', import.meta.url))],
    outfile, bundle: true, platform: 'node', format: 'esm',
  });
  numbers = await import(pathToFileURL(outfile).href);
});

after(async () => {
  if (directory) await rm(directory, { recursive: true, force: true });
});

test('decimal string converters expand scientific notation without number precision loss', () => {
  const cases = [
    ['1e-7', '0.0000001'],
    ['-1.23E-7', '-0.000000123'],
    ['1e21', '1000000000000000000000'],
    ['9007199254740993', '9007199254740993'],
    ['0.12345678901234567890123456789', '0.12345678901234567890123456789'],
    ['1e309', `1${'0'.repeat(309)}`],
    ['1e-400', `0.${'0'.repeat(399)}1`],
    [1e-7, '0.0000001'],
    [1e21, '1000000000000000000000'],
  ];
  for (const name of ['scientificToPlainString', 'exponentialToString', 'toNonExponential']) {
    for (const [input, expected] of cases) {
      assert.equal(numbers[name](input), expected, `${name}(${input})`);
    }
  }
});

test('decimal string converters normalize whitespace, trailing zeros and negative zero', () => {
  for (const name of ['scientificToPlainString', 'exponentialToString', 'toNonExponential']) {
    for (const [input, expected] of [[' +001.2300 ', '1.23'], ['-0.000', '0'], [-0, '0'], ['0', '0']]) {
      assert.equal(numbers[name](input), expected, `${name}(${input})`);
    }
  }
});

test('only toNonExponential treats nullish and blank inputs as empty values', () => {
  for (const input of [null, undefined, '', '   ']) {
    assert.equal(numbers.toNonExponential(input), '');
    assert.throws(() => numbers.scientificToPlainString(input), TypeError);
    assert.throws(() => numbers.exponentialToString(input), TypeError);
  }
});

test('decimal string converters preserve input validation', () => {
  for (const name of ['scientificToPlainString', 'exponentialToString', 'toNonExponential']) {
    for (const input of ['abc', '1,000', '0xff', 'NaN', 'Infinity', NaN, Infinity, -Infinity, {}]) {
      assert.throws(() => numbers[name](input), TypeError, `${name}(${input})`);
    }
    for (const input of ['1e100001', '1e-100001']) {
      assert.throws(() => numbers[name](input), RangeError);
    }
  }
});

test('arithmetic returns exact strings beyond the number precision and exponent limits', () => {
  assert.equal(numbers.add('0.1', '0.2'), '0.3');
  assert.equal(numbers.sub('0.3', '0.1'), '0.2');
  assert.equal(numbers.mul('0.1', '0.2'), '0.02');
  assert.equal(numbers.add('9007199254740993', '1'), '9007199254740994');
  assert.equal(numbers.add('9007199254740992', '1'), '9007199254740993');
  assert.equal(numbers.sub('9007199254740993', '0.01'), '9007199254740992.99');
  assert.equal(numbers.mul('12345678901234567890', '2'), '24691357802469135780');
  assert.equal(numbers.add('1e309', '0'), `1${'0'.repeat(309)}`);
  assert.equal(numbers.mul('1e-200', '1e-200'), `0.${'0'.repeat(399)}1`);
  assert.equal(numbers.compareDecimal('9007199254740993', '9007199254740992'), 1);
});

test('division and rounding preserve fixed scale and normalize negative zero', () => {
  assert.equal(numbers.division('1', '8', { scale: 2 }), '0.13');
  assert.equal(numbers.division('1', '2', { scale: 2 }), '0.50');
  assert.equal(numbers.division('1', '2', { scale: 0 }), '1');
  assert.equal(numbers.division('-1', '1000', { scale: 2 }), '0.00');
  assert.equal(numbers.roundDecimal('1.5', 2), '1.50');
  assert.equal(numbers.roundDecimal('1.255', 2), '1.26');
  assert.equal(numbers.roundDecimal('-0.001', 2), '0.00');
  assert.equal(numbers.ceilDecimal('-1.231', 2), '-1.23');
  assert.equal(numbers.roundDecimal('1.5', 1000), `1.5${'0'.repeat(999)}`);
});

test('all rounding modes handle positive and negative midpoint values', () => {
  const cases = {
    up: ['1.3', '-1.3'], down: ['1.2', '-1.2'], ceil: ['1.3', '-1.2'],
    floor: ['1.2', '-1.3'], 'half-up': ['1.3', '-1.3'],
    'half-down': ['1.2', '-1.2'], 'half-even': ['1.2', '-1.2'], trunc: ['1.2', '-1.2'],
  };
  for (const [rounding, [positive, negative]] of Object.entries(cases)) {
    assert.equal(numbers.roundDecimal('1.25', 1, rounding), positive);
    assert.equal(numbers.roundDecimal('-1.25', 1, rounding), negative);
    assert.equal(numbers.division('5', '4', { scale: 1, rounding }), positive);
    assert.equal(numbers.division('-5', '4', { scale: 1, rounding }), negative);
  }
  assert.equal(numbers.roundDecimal('1.35', 1, 'half-even'), '1.4');
});

test('division distinguishes values extremely close to a rounding midpoint', () => {
  assert.equal(numbers.division('1', `2.${'0'.repeat(99)}1`, { scale: 0 }), '0');
  assert.equal(numbers.division('1', `1.${'9'.repeat(100)}`, { scale: 0 }), '1');
  assert.equal(numbers.division('1', '3', { scale: 100 }), `0.${'3'.repeat(100)}`);
});

test('division requires explicit options and rejects zero divisors', () => {
  assert.throws(() => numbers.division('1', '2'), TypeError);
  assert.throws(() => numbers.division('1', '2', null), TypeError);
  assert.throws(() => numbers.division('1', '2', {}), RangeError);
  for (const zero of ['0', '-0', '0e20', 0]) {
    assert.throws(() => numbers.division('1', zero, { scale: 2 }), RangeError);
  }
});

test('rounding mode and scale validation reject inherited keys and implicit coercion', () => {
  for (const rounding of ['__proto__', 'constructor', 'toString', 'invalid', null, 0]) {
    assert.throws(() => numbers.roundDecimal('1.5', 1, rounding), /Unsupported rounding mode/);
    assert.throws(() => numbers.division('1', '2', { scale: 1, rounding }), /Unsupported rounding mode/);
  }
  for (const scale of [null, '2', NaN, Infinity, -1, 1001, 1.5]) {
    assert.throws(() => numbers.roundDecimal('1.5', scale), RangeError);
    assert.throws(() => numbers.division('1', '2', { scale }), RangeError);
  }
});

test('rounding options do not leak between operations', () => {
  for (let i = 0; i < 2; i++) {
    assert.equal(numbers.roundDecimal('1.255', 2, 'down'), '1.25');
    assert.equal(numbers.roundDecimal('1.255', 2), '1.26');
    assert.equal(numbers.division('1', '8', { scale: 2, rounding: 'down' }), '0.12');
    assert.equal(numbers.division('1', '8', { scale: 2 }), '0.13');
    assert.equal(numbers.add('9007199254740993', '1'), '9007199254740994');
  }
});

test('extreme coefficient lengths and calculation precision are bounded', () => {
  assert.throws(() => numbers.add('1e100000', '1e-100000'), /Calculation precision/);
  assert.throws(() => numbers.division('1e100000', '1', { scale: 2 }), /Calculation precision/);
  assert.throws(() => numbers.scientificToPlainString('1'.repeat(10001)), /coefficient digits/);
  assert.equal(numbers.scientificToPlainString('1.e5'), '100000');
  assert.equal(numbers.add('1.00', '1000'), '1001');
});

test('multiplication checks actual product precision at the 10000 digit boundary', () => {
  const nines = '9'.repeat(10000);
  const boundary = `1${'0'.repeat(9998)}1`;
  for (const sign of ['', '-']) {
    assert.equal(numbers.mul(`${sign}${nines}`, '1'), `${sign}${nines}`);
    assert.equal(numbers.mul(`${sign}${boundary}`, '2'), `${sign}2${'0'.repeat(9998)}2`);
    assert.throws(() => numbers.mul(`${sign}${nines}`, '9'), /Calculation precision/);
    assert.throws(() => numbers.mul('9', `${sign}${nines}`), /Calculation precision/);
    assert.throws(() => numbers.mul(`${sign}${nines}`, nines), /Calculation precision/);
    assert.equal(numbers.mul(`${sign}${nines}`, '0'), '0');
  }
});

test('addition and subtraction check carry precision before stripping trailing zeros', () => {
  const nines = '9'.repeat(10000);
  const shorter = '9'.repeat(9999);
  assert.equal(numbers.add(shorter, '1'), `1${'0'.repeat(9999)}`);
  assert.equal(numbers.sub(`-${shorter}`, '1'), `-1${'0'.repeat(9999)}`);
  assert.equal(numbers.add(nines, '0'), nines);
  assert.equal(numbers.sub(nines, nines), '0');
  assert.equal(numbers.add(nines, `-${nines}`), '0');
  for (const increment of ['1', '2']) {
    assert.throws(() => numbers.add(nines, increment), /Calculation precision/);
    assert.throws(() => numbers.add(`-${nines}`, `-${increment}`), /Calculation precision/);
    assert.throws(() => numbers.sub(nines, `-${increment}`), /Calculation precision/);
    assert.throws(() => numbers.sub(`-${nines}`, increment), /Calculation precision/);
  }
});

test('input digit limits count leading and trailing zeros', () => {
  assert.equal(numbers.scientificToPlainString('0'.repeat(10000)), '0');
  assert.equal(numbers.scientificToPlainString(`0.${'0'.repeat(9998)}1`).length, 10001);
  for (const value of ['0'.repeat(10001), `1.${'0'.repeat(10000)}`, `${'0'.repeat(10000)}1`]) {
    assert.throws(() => numbers.scientificToPlainString(value), /coefficient digits/);
  }
});

test('rounding handles tiny values, exact values and carries for every mode', () => {
  const expected = {
    up: ['0.01', '-0.01'], down: ['0.00', '0.00'],
    ceil: ['0.01', '0.00'], floor: ['0.00', '-0.01'],
    'half-up': ['0.00', '0.00'], 'half-down': ['0.00', '0.00'],
    'half-even': ['0.00', '0.00'], trunc: ['0.00', '0.00'],
  };
  for (const [rounding, [positive, negative]] of Object.entries(expected)) {
    assert.equal(numbers.roundDecimal('1e-100000', 2, rounding), positive);
    assert.equal(numbers.roundDecimal('-1e-100000', 2, rounding), negative);
    assert.equal(numbers.roundDecimal('-1.2500', 2, rounding), '-1.25');
    assert.equal(numbers.division('-5', '4', { scale: 2, rounding }), '-1.25');
  }
  for (const rounding of ['half-up', 'half-down', 'half-even']) {
    assert.equal(numbers.roundDecimal('9.999', 2, rounding), '10.00');
    assert.equal(numbers.division('-9999', '1000', { scale: 2, rounding }), '-10.00');
    assert.equal(numbers.roundDecimal('1.249', 1, rounding), '1.2');
    assert.equal(numbers.roundDecimal('-1.251', 1, rounding), '-1.3');
  }
});
