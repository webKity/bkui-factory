import './examples.css';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Typography } from './index';
import { componentSizes } from '../utils/size';
import { Button } from '../button';

const content = (
  <>
    <h1>排版 Typography</h1>
    <p>
      使用项目语义 token，为富文本提供一致的字号、颜色与间距。支持<strong>强调内容</strong>、
      <a href="#typography-example">链接</a>及 <code>inline code</code>。
    </p>
    <h2 id="typography-example">内容结构</h2>
    <ul>
      <li>有序呈现信息，保持清晰的阅读层次。</li>
      <li>自动适配亮色与暗色主题。</li>
    </ul>
    <blockquote>
      <p>排版样式仅作用于当前组件内的内容。</p>
    </blockquote>
    <h3>代码与表格</h3>
    <p>
      使用 <kbd>⌘</kbd> + <kbd>K</kbd> 打开搜索，使用 <kbd>Esc</kbd> 关闭。
    </p>
    <pre>
      <code>{'const message = "Hello Typography";\nconsole.log(message);'}</code>
    </pre>
    <table>
      <thead>
        <tr>
          <th>属性</th>
          <th>默认值</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>size</td>
          <td>base</td>
        </tr>
        <tr>
          <td>preLine</td>
          <td>false</td>
        </tr>
      </tbody>
    </table>
    <p>
      <small>最后更新：示例内容</small>
    </p>
  </>
);

const meta = {
  title: '组件/Typography',
  component: Typography,
  tags: ['autodocs'],
  args: { size: 'base', preLine: false, children: content },
  argTypes: {
    size: { control: 'select', options: componentSizes },
    as: { control: 'select', options: ['div', 'article', 'section'] },
    children: { control: false },
  },
  parameters: {
    docs: {
      description: {
        component:
          '基于 @tailwindcss/typography，使用 --typography-* 私有组件 tokens。标题基于项目 h1–h6 token，按独立七档设计比例缩放；lead 默认为正文的 1.1 倍。响应式 size 必须包含 base，data-size 标记配置模式，data-size-* 标记显式断点。原生属性、事件及 ref 类型随 as 变化。not-bk-typography 可排除嵌入内容；代码块和按键阴影均随主题切换。',
      },
    },
  },
} satisfies Meta<typeof Typography>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Playground: Story = { name: '可调试用例' };
export const ChineseArticle: Story = {
  name: '中文长文',
  args: {
    as: 'article',
    lang: 'zh-CN',
    children: (
      <>
        <h1>把一段路，走成生活的一部分</h1>
        <p className="lead">
          城市的节奏很快，但理解一座城市，往往要从一次没有明确目的的步行开始。沿着熟悉的街道慢慢走，我们会重新看见那些被日常忽略的细节。
        </p>
        <p>
          搬到新住处后的第一个月，我总是沿着同一条路线去地铁站。出门、过路口、穿过便利店门前的空地，整个过程几乎不需要思考。直到一个周末的清晨，我提前出了门，却没有赶时间的理由，才发现巷口的早餐店还摆着几张木凳，树下有一块被雨水洗得发亮的石阶。
        </p>
        <p>
          这条走过几十次的路，突然变得陌生起来。我原以为自己已经熟悉这里，其实记住的只是
          <strong>如何以最短的时间通过它</strong>
          。当脚步放慢，街道才开始显露出自己的层次：店铺开门的声音、窗台上新长出的叶子，以及人们打招呼时并不急于结束的停顿。
        </p>
        <h2>一、让观察先于判断</h2>
        <p>
          我们习惯迅速判断一个地方是否热闹、是否方便、是否值得停留。这些判断当然有用，却也容易把复杂的生活压缩成几个标签。步行提供了另一种可能：暂时不下结论，只记录自己看见了什么，以及这些事物如何随着时间变化。
        </p>
        <blockquote>
          <p>熟悉并不意味着看过很多次，而是愿意在下一次经过时，仍然认真地看。</p>
        </blockquote>
        <p>
          比如，同一个小广场，清晨是附近居民活动的地方，午后成为外卖骑手短暂休息的站点，傍晚则被放学后的孩子重新占据。空间没有改变，使用它的人和方式却在不断变化。只有停留得足够久，我们才会理解这些时间之间的联系。
        </p>
        <h3>从三个小问题开始</h3>
        <ul>
          <li>
            <strong>什么吸引了你的注意？</strong>
            可能是一种颜色、一段声音，也可能只是一个与昨天不同的细节。
          </li>
          <li>
            <strong>人们在哪里停下来？</strong>
            阴影、座椅和可以倚靠的墙面，往往比醒目的招牌更能说明一个空间的用途。
          </li>
          <li>
            <strong>还有什么没有被看见？</strong>
            换一个时间经过，或者从道路另一侧观察，答案可能完全不同。
          </li>
        </ul>
        <h2>二、为一次散步留出余地</h2>
        <p>
          不必为了散步安排一份严格的计划。过于详细的路线，容易让探索变成另一项需要完成的任务。比较轻松的做法是确定一个大致方向，再留出可以临时改变主意的时间：在书店多待一会儿，绕进一条有树荫的小路，或者坐下来把刚才想到的事情记在纸上。
        </p>
        <p>
          如果希望把观察保存下来，可以尝试下面这个简单流程。记录的重点是具体，而不是漂亮；一句准确的描述，通常比一长串抽象的感受更能帮助我们回忆当时的情景。
        </p>
        <ol>
          <li>选择一条步行二十分钟左右的路线，不要求经过任何知名地点。</li>
          <li>途中找一个可以安全停留的位置，花几分钟观察周围的声音、光线与人流。</li>
          <li>结束后写下三个细节，以及一个希望下次继续了解的问题。</li>
        </ol>
        <h3>一份简单的观察记录</h3>
        <table>
          <thead>
            <tr>
              <th>时段</th>
              <th>观察到的变化</th>
              <th>下一次的问题</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>清晨</td>
              <td>面包店门前有人排队，街道较安静</td>
              <td>周末的开门时间是否相同？</td>
            </tr>
            <tr>
              <td>午后</td>
              <td>树荫下的长椅几乎坐满</td>
              <td>太阳移动后，人们会坐在哪里？</td>
            </tr>
            <tr>
              <td>傍晚</td>
              <td>路口出现临时的花摊</td>
              <td>摊主通常会停留多久？</td>
            </tr>
          </tbody>
        </table>
        <h2>三、记录也可以很轻</h2>
        <p>
          有时我会把这些片段存成纯文本。文件名不需要复杂，一条 <code>walk-01.md</code>{' '}
          就足够。内容只保留地点、观察和问题，方便下一次回来时继续补充。工具的作用，是让记录容易发生，而不是让记录本身成为负担。
        </p>
        <pre>
          <code>
            {
              '# 巷口散步\n\n观察：雨后石阶的颜色比平时更深。\n问题：树下的木凳是谁每天搬出来的？\n下次：换一个傍晚再来看看。'
            }
          </code>
        </pre>
        <p>
          同样地，也不必要求每次出门都有新的发现。有些日子，我们只是沿着熟悉的路走了一圈，买一份晚饭，再平静地回家。
          <em>这种没有特别收获的重复，本身也是生活的一部分。</em>
          当它不再被视为效率低下的空白，我们便有了更多可以安放注意力的时间。
        </p>
        <hr />
        <h2>从下一次经过开始</h2>
        <p>
          认识一座城市，并不一定需要走得很远。我们可以从楼下的一棵树、一家常去的小店，或每天都会经过的路口开始。把目光停留得久一点，把结论放得晚一点，原本只是连接两个目的地的道路，也会慢慢成为值得记住的地方。
        </p>
        <p>
          <small>
            本文为中文长文排版示例，内容为原创，用于观察连续段落、标点、强调文字和不同内容结构的阅读效果。
          </small>
        </p>
      </>
    ),
  },
};
export const EnglishArticle: Story = {
  name: '英文长文',
  args: {
    as: 'article',
    lang: 'en',
    children: (
      <>
        <h1>Learning to Notice the Ordinary</h1>
        <p className="lead">
          A familiar street can become invisible through repetition. Walking it without a deadline
          offers a chance to notice what has been there all along: small routines, changing light,
          and the quiet ways people make a place their own.
        </p>
        <p>
          For the first few weeks after moving, I took the same route to the station every morning.
          I knew where to cross, which corner became crowded, and how long I could wait before
          leaving home. The neighborhood was useful to me, but it was mostly a collection of
          instructions for arriving somewhere else.
        </p>
        <p>
          One Saturday, I left at the usual time with nowhere in particular to go. Outside the
          bakery, someone was arranging chairs beneath a narrow awning. A delivery worker paused to
          speak with the owner. Across the street, sunlight reached a window that was always dark
          when I passed on weekdays. None of this was remarkable, yet together these details made
          the street feel newly present.
        </p>
        <h2>1. Observe Before You Explain</h2>
        <p>
          It is easy to describe a neighborhood with a few quick judgments: busy, quiet, convenient,
          expensive. Those words may be accurate, but they leave little room for the relationships
          that give a place its character. Observation begins with a smaller question:{' '}
          <strong>what is actually happening here, right now?</strong>
        </p>
        <blockquote>
          <p>
            Familiarity is not only the result of passing something many times. It also comes from
            remaining curious the next time you pass.
          </p>
        </blockquote>
        <p>
          A small square might belong to early walkers in the morning, office workers at lunchtime,
          and children in the evening. The paving and benches remain the same, while the purpose of
          the space changes throughout the day. A single visit gives us one scene; returning at
          another hour helps us understand how the scenes connect.
        </p>
        <h3>Three Questions to Carry Along</h3>
        <ul>
          <li>
            <strong>What caught your attention?</strong> Start with something specific: a sound, a
            color, or an object that was not there yesterday.
          </li>
          <li>
            <strong>Where do people choose to pause?</strong> A patch of shade or a low wall may
            tell you more about a space than its most visible sign.
          </li>
          <li>
            <strong>What might you have missed?</strong> Consider how a different time, direction,
            or pace could change what you see.
          </li>
        </ul>
        <h2>2. Leave Room for the Unexpected</h2>
        <p>
          A walk does not need a detailed itinerary to be worthwhile. In fact, a tightly planned
          route can turn an opportunity to explore into another task to complete. Choose a general
          direction and allow yourself to change it. Spend a little longer in a bookshop, follow the
          shaded side of a street, or stop somewhere comfortable to write down a thought.
        </p>
        <p>
          The aim is not to collect as many experiences as possible. It is to give a few experiences
          enough attention to become memorable. A short route walked slowly can offer more to
          reflect on than a long route completed while thinking about the next appointment.
        </p>
        <ol>
          <li>
            Choose a route that takes about twenty minutes and does not depend on reaching a famous
            destination.
          </li>
          <li>
            Find a safe place to pause and observe the light, sounds, and movement around you.
          </li>
          <li>
            Afterward, write down three details and one question you would like to explore on a
            future visit.
          </li>
        </ol>
        <h3>A Small Observation Log</h3>
        <table>
          <thead>
            <tr>
              <th>Time</th>
              <th>Observation</th>
              <th>Question for Next Time</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Morning</td>
              <td>A queue forms outside the bakery while the rest of the street is quiet.</td>
              <td>Does the same routine happen on Sundays?</td>
            </tr>
            <tr>
              <td>Afternoon</td>
              <td>The benches beneath the trees are almost full.</td>
              <td>Where do people move when the shade shifts?</td>
            </tr>
            <tr>
              <td>Evening</td>
              <td>A small flower stand appears near the crossing.</td>
              <td>How long does the seller usually stay?</td>
            </tr>
          </tbody>
        </table>
        <h2>3. Keep the Record Simple</h2>
        <p>
          You do not need a dedicated notebook or a carefully organized application. A plain text
          file named <code>walk-01.md</code> can hold everything necessary: where you went, what you
          noticed, and what you are still wondering about. The best recording method is one that
          leaves you willing to use it again.
        </p>
        <pre>
          <code>
            {
              '# A walk around the corner\n\nNoticed: The stone steps looked darker after the rain.\nQuestion: Who brings out the wooden chairs each morning?\nNext visit: Try returning just before sunset.'
            }
          </code>
        </pre>
        <p>
          Specific descriptions tend to last longer than broad impressions. “A blue chair beside the
          open door” gives your memory somewhere to begin. “A lovely atmosphere” may describe your
          feeling accurately, but it does not preserve much of the scene that produced it. You can
          include both; just make sure the concrete detail has a place.
        </p>
        <p>
          Some walks will produce no surprising discoveries at all. You might follow the usual
          route, buy something for dinner, and return home with little to write down.{' '}
          <em>That ordinary repetition is part of the experience, too.</em> Attention does not have
          to result in a story every time it is practiced.
        </p>
        <hr />
        <h2>Begin with the Next Familiar Corner</h2>
        <p>
          Getting to know a city does not always mean traveling farther. It can begin with a tree
          outside your building, a shop you visit each week, or a crossing you have stopped
          noticing. Give the scene a little more time before deciding what it means. Gradually, a
          route between destinations can become a place worth remembering in its own right.
        </p>
        <p>
          <small>
            This original article is sample content for evaluating English typography, including
            long paragraphs, emphasis, lists, quotations, tables, and code blocks.
          </small>
        </p>
      </>
    ),
  },
};
export const Sizes: Story = {
  name: '七档正文尺寸',
  render: () => (
    <div className="example-stack">
      {componentSizes.map(size => (
        <Typography key={size} size={size}>
          <h2>{size}：标题 Heading</h2>
          <p className="lead">{size}：导语 Lead paragraph</p>
          <p>
            {size}：排版正文 Typography <strong>强调文本</strong>
          </p>
        </Typography>
      ))}
    </div>
  ),
};
export const Responsive: Story = {
  name: '响应式尺寸',
  args: { as: 'article', size: { base: 'sm', md: 'base', xl: 'lg' } },
};
export const PreLine: Story = {
  name: '保留换行',
  args: {
    preLine: true,
    children:
      '第一行：保留文本中的换行。\n第二行：连续空格仍按正常文本处理。\n第三行：支持中文与 English。',
  },
};
export const CustomTokens: Story = {
  name: '覆盖组件 Token',
  args: { className: 'example-typography-custom' },
};
export const EmbeddedContent: Story = {
  name: '排除嵌入组件',
  args: {
    children: (
      <>
        <h2>操作区域</h2>
        <p>嵌入内容使用 not-bk-typography 排除排版样式。</p>
        <div className="not-bk-typography">
          <Button intent="brand">继续操作</Button>
        </div>
      </>
    ),
  },
};
