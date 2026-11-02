import type { Meta, StoryObj } from '@storybook/react-vite';
import {
  add, sub, mul, division, compareDecimal, roundDecimal, ceilDecimal,
  scientificToPlainString, exponentialToString, toNonExponential,
} from './number';
import type { DecimalRounding } from './number';

const operations = ['add', 'sub', 'mul', 'division', 'compareDecimal', 'roundDecimal',
  'ceilDecimal', 'scientificToPlainString', 'exponentialToString', 'toNonExponential'] as const;
const roundingModes: DecimalRounding[] = ['up', 'down', 'ceil', 'floor', 'half-up', 'half-down', 'half-even', 'trunc'];

interface PlaygroundProps {
  operation: typeof operations[number];
  left: string;
  right: string;
  scale: number;
  rounding: DecimalRounding;
}

function describe(operation: () => unknown) {
  try {
    const value = operation();
    return `${String(value)}（${typeof value}）`;
  } catch (error) {
    return error instanceof Error ? `${error.name}: ${error.message}` : String(error);
  }
}

function NumberPlayground({ operation, left, right, scale, rounding }: PlaygroundProps) {
  const output = describe(() => {
    switch (operation) {
      case 'add': return add(left, right);
      case 'sub': return sub(left, right);
      case 'mul': return mul(left, right);
      case 'division': return division(left, right, { scale, rounding });
      case 'compareDecimal': return compareDecimal(left, right);
      case 'roundDecimal': return roundDecimal(left, scale, rounding);
      case 'ceilDecimal': return ceilDecimal(left, scale);
      case 'scientificToPlainString': return scientificToPlainString(left);
      case 'exponentialToString': return exponentialToString(left);
      case 'toNonExponential': return toNonExponential(left);
    }
  });
  return <section className="example-stack">
    <p>通过 Controls 修改方法与输入。单值方法使用 left；scale 仅用于除法和舍入，rounding 仅用于 division、roundDecimal。</p>
    <pre role="status" aria-live="polite">{operation}: {output}</pre>
  </section>;
}

type Example = { expression: string; run: () => unknown };

function Examples({ cases }: { cases: Example[] }) {
  return <table>
    <thead><tr><th>调用</th><th>实际结果与类型</th></tr></thead>
    <tbody>{cases.map(({ expression, run }) => <tr key={expression}>
      <td><code>{expression}</code></td><td><code>{describe(run)}</code></td>
    </tr>)}</tbody>
  </table>;
}

const meta = {
  title: '工具与服务/Number',
  component: NumberPlayground,
  args: { operation: 'add', left: '0.1', right: '0.2', scale: 2, rounding: 'half-up' },
  argTypes: {
    operation: { control: 'select', options: operations, description: '需要调用的 number.ts 方法。' },
    left: { control: 'text', description: '第一个操作数或单值输入；保留字符串以避免输入阶段丢失精度。' },
    right: { control: 'text', description: '加、减、乘、除、比较的第二个操作数。' },
    scale: { control: { type: 'number', min: 0, max: 1000, step: 1 }, description: '除法与舍入使用的小数位数，范围为 0～1000 的整数。' },
    rounding: { control: 'select', options: roundingModes, description: 'division、roundDecimal 的舍入模式，默认 half-up。' },
  },
} satisfies Meta<typeof NumberPlayground>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = { name: '可调试用例' };

export const Arithmetic: Story = {
  name: '十进制运算与精度边界',
  parameters: { controls: { disable: true } },
  render: () => <Examples cases={[
    { expression: "add('0.1', '0.2')", run: () => add('0.1', '0.2') },
    { expression: "sub('0.3', '0.1')", run: () => sub('0.3', '0.1') },
    { expression: "mul('0.1', '0.2')", run: () => mul('0.1', '0.2') },
    { expression: "division('1', '3', { scale: 4 })", run: () => division('1', '3', { scale: 4 }) },
    { expression: "division('1', '0', { scale: 2 })", run: () => division('1', '0', { scale: 2 }) },
    { expression: "add('9007199254740993', '1')", run: () => add('9007199254740993', '1') },
    { expression: "mul('12345678901234567890', '2')", run: () => mul('12345678901234567890', '2') },
    { expression: "division('1', '2', { scale: 2 })", run: () => division('1', '2', { scale: 2 }) },
    { expression: "roundDecimal('1.5', 2)", run: () => roundDecimal('1.5', 2) },
    { expression: "compareDecimal('9007199254740993', '9007199254740992')", run: () => compareDecimal('9007199254740993', '9007199254740992') },
    { expression: "add('1e309', '0')", run: () => add('1e309', '0') },
  ]} />,
};

export const Rounding: Story = {
  name: '舍入模式对照',
  parameters: { controls: { disable: true } },
  render: () => <table>
    <thead><tr><th>rounding</th><th>1.25 → 1 位</th><th>-1.25 → 1 位</th><th>-1.21 → 1 位</th></tr></thead>
    <tbody>{roundingModes.map(mode => <tr key={mode}>
      <td><code>{mode}</code></td>
      {['1.25', '-1.25', '-1.21'].map(value => <td key={value}>{String(roundDecimal(value, 1, mode))}</td>)}
    </tr>)}</tbody>
  </table>,
};

export const Conversion: Story = {
  name: '转换、空值与科学计数法',
  parameters: { controls: { disable: true } },
  render: () => <Examples cases={[
    { expression: "scientificToPlainString('1.23e3')", run: () => scientificToPlainString('1.23e3') },
    { expression: "exponentialToString('1.2300')", run: () => exponentialToString('1.2300') },
    { expression: "toNonExponential('1e-7')", run: () => toNonExponential('1e-7') },
    { expression: "scientificToPlainString('1e21')", run: () => scientificToPlainString('1e21') },
    { expression: "exponentialToString('9007199254740993')", run: () => exponentialToString('9007199254740993') },
    { expression: "toNonExponential('0.12345678901234567890123456789')", run: () => toNonExponential('0.12345678901234567890123456789') },
    { expression: 'toNonExponential(null)', run: () => toNonExponential(null) },
    { expression: 'toNonExponential(undefined)', run: () => toNonExponential(undefined) },
    { expression: "toNonExponential('   ')", run: () => toNonExponential('   ') },
    { expression: "toNonExponential('0')", run: () => toNonExponential('0') },
  ]} />,
};

export const InvalidInput: Story = {
  name: '输入校验与错误',
  parameters: { controls: { disable: true } },
  render: () => <Examples cases={[
    { expression: "add('1,000', '1')", run: () => add('1,000', '1') },
    { expression: "add('', '1')", run: () => add('', '1') },
    { expression: "add(Infinity, '1')", run: () => add(Infinity, '1') },
    { expression: "scientificToPlainString('1e100001')", run: () => scientificToPlainString('1e100001') },
    { expression: "roundDecimal('1.2', -1)", run: () => roundDecimal('1.2', -1) },
    { expression: "division('1', '3', { scale: 1.5 })", run: () => division('1', '3', { scale: 1.5 }) },
    { expression: "toNonExponential('abc')", run: () => toNonExponential('abc') },
    { expression: "add('1e100000', '1e-100000')", run: () => add('1e100000', '1e-100000') },
  ]} />,
};
