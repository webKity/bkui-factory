import assert from 'node:assert/strict';
import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import { after, before, test } from 'node:test';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import { JSDOM } from 'jsdom';

let temporary, BKSameSiteChannel;

before(async () => {
  await mkdir(new URL('../../../../../.test-output/', import.meta.url), { recursive: true });
  temporary = await mkdtemp(new URL('../../../../../.test-output/same-site-', import.meta.url));
  const outfile = `${temporary}/channel.mjs`;
  await build({
    entryPoints: [new URL('./same.site.channel.ts', import.meta.url).pathname],
    outfile,
    bundle: true,
    platform: 'node',
    format: 'esm',
    packages: 'external',
    tsconfigRaw: { compilerOptions: { experimentalDecorators: true } },
  });
  ({ BKSameSiteChannel } = await import(pathToFileURL(outfile).href));
});

after(async () => {
  if (temporary) await rm(temporary, { recursive: true, force: true });
});

function withChannel(origin, run) {
  const dom = new JSDOM('', { url: origin });
  globalThis.window = dom.window;
  globalThis.document = dom.window.document;
  const channel = new BKSameSiteChannel();
  try {
    run(channel);
  } finally {
    channel.destroy();
    dom.window.close();
    delete globalThis.window;
    delete globalThis.document;
  }
}

test('正式域名默认拒绝，配置仅对本次 addTarget 生效', () => {
  withChannel('https://example.com', channel => {
    assert.equal(channel.addTarget('https://sim.example.com'), null);
    const target = channel.addTarget('https://sim.example.com', {
      trustedSiteDomains: [' EXAMPLE.COM '],
    });
    assert.ok(target);
    assert.equal(target.origin, 'https://sim.example.com');
    assert.equal(new URL(target.iframe.src).hash, `#__bk_ss_token=${target.token}`);
    assert.equal(channel.addTarget('https://sim.example.com'), null);
    assert.equal(channel.addTarget('https://example.com', { trustedSiteDomains: [] }), null);
  });
});

test('拒绝跨协议、跨可信后缀及伪造后缀，不创建 iframe', () => {
  withChannel('https://app.example.com', channel => {
    const options = { trustedSiteDomains: ['example.com', 'other.com'] };
    for (const url of [
      'http://sim.example.com',
      'https://other.com',
      'https://evilexample.com',
      'https://example.com.evil.com',
    ]) {
      assert.equal(channel.addTarget(url, options), null, url);
    }
    assert.equal(document.querySelectorAll('iframe').length, 0);
  });
});

test('重叠的可信域名不受列表顺序影响', () => {
  withChannel('https://app.example.com', channel => {
    assert.ok(channel.addTarget('https://sim.example.com', {
      trustedSiteDomains: ['app.example.com', 'example.com'],
    }));
  });
});

test('localhost / IPv4 / IPv6 无需配置，仅允许相同协议和 hostname', () => {
  for (const host of ['localhost', '127.0.0.1', '[::1]']) {
    withChannel(`http://${host}:3000`, channel => {
      assert.ok(channel.addTarget(`http://${host}:4000`));
      assert.equal(channel.addTarget(`https://${host}:4000`), null);
      assert.equal(channel.addTarget('http://127.0.0.2:4000', {
        trustedSiteDomains: ['0.0.2', 'localhost', '127.0.0.1', '[::1]'],
      }), null);
    });
  }
});
