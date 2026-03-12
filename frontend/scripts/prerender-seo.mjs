import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const DIST_DIR = resolve(process.cwd(), 'dist');
const INDEX_FILE = resolve(DIST_DIR, 'index.html');
const SITE_URL = 'https://sub.kerwin.cloud';
const SEO_SHELL_STYLE = `
<style id="seo-static-shell-style">
  .seo-static-shell {
    max-width: 960px;
    margin: 0 auto;
    padding: 56px 24px 72px;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    color: #0f172a;
    line-height: 1.7;
  }

  .seo-static-shell-badge {
    display: inline-flex;
    align-items: center;
    padding: 6px 12px;
    border-radius: 999px;
    background: #e0f2fe;
    color: #0369a1;
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .seo-static-shell h1 {
    margin: 18px 0 14px;
    font-size: 42px;
    line-height: 1.15;
  }

  .seo-static-shell p {
    margin: 0 0 14px;
    font-size: 17px;
    color: #334155;
  }

  .seo-static-shell ul {
    margin: 24px 0;
    padding-left: 20px;
  }

  .seo-static-shell li {
    margin: 8px 0;
    color: #475569;
  }

  .seo-static-shell a {
    color: #0284c7;
    font-weight: 700;
    text-decoration: none;
  }
</style>
`.trim();
const SEO_SHELL_GUARD_SCRIPT = `
<script id="seo-static-shell-guard">
  (function () {
    var normalizedPath = window.location.pathname.replace(/\\/+$/, '') || '/';
    if (normalizedPath !== '/' && normalizedPath !== '/plans') {
      var root = document.getElementById('root');
      if (root) {
        root.innerHTML = '';
      }
    }
  })();
</script>
`.trim();

const pages = [
  {
    directory: '',
    title: 'OneSub - AI 订阅代充平台',
    description:
      'OneSub 提供 ChatGPT、Claude、Gemini 等 AI 订阅代充服务，支持支付宝/微信支付、优惠码、工单客服与邀请返利。',
    canonicalPath: '/',
    shell: `
      <section class="seo-static-shell">
        <span class="seo-static-shell-badge">OneSub</span>
        <h1>AI 订阅代充平台</h1>
        <p>OneSub 提供 ChatGPT、Claude、Gemini 等热门 AI 工具的便捷订阅服务，支持支付宝与微信支付、优惠码抵扣、邀请返利和工单客服。</p>
        <p>无需海外信用卡，无需复杂操作，适合需要快速开通 AI 会员服务的个人与团队用户。</p>
        <ul>
          <li>支持热门 AI 套餐选择与快速开通</li>
          <li>支持订单查询、支付凭证、退款和进度跟踪</li>
          <li>支持优惠码、邀请返利和客服工单</li>
        </ul>
        <p><a href="/plans">查看 AI 订阅套餐</a></p>
      </section>
    `.trim(),
  },
  {
    directory: 'plans',
    title: 'AI 订阅套餐 - OneSub',
    description:
      '查看 OneSub 提供的 ChatGPT、Claude、Gemini 等 AI 订阅套餐，支持多种时长、优惠码与快速开通。',
    canonicalPath: '/plans',
    shell: `
      <section class="seo-static-shell">
        <span class="seo-static-shell-badge">Plans</span>
        <h1>AI 订阅套餐列表</h1>
        <p>在 OneSub 查看 ChatGPT、Claude、Gemini 等 AI 工具订阅套餐，支持不同周期、优惠码抵扣和快捷支付。</p>
        <p>套餐页会持续更新热门 AI 工具的价格、特性和订阅时长，帮助你更快选择合适方案。</p>
        <ul>
          <li>支持多款 AI 工具套餐对比</li>
          <li>支持优惠码验证与支付方式切换</li>
          <li>支持登录后快速下单与订单跟踪</li>
        </ul>
        <p><a href="/">返回 OneSub 首页</a></p>
      </section>
    `.trim(),
  },
];

/**
 * 统一替换 HTML 中的标题和常见 meta 标签，确保静态页能被搜索引擎直接读取。
 */
function applyHeadMeta(html, page) {
  const canonicalUrl = new URL(page.canonicalPath, SITE_URL).toString();
  const replacements = [
    { pattern: /<title>.*?<\/title>/s, value: `<title>${page.title}</title>` },
    {
      pattern: /<meta\s+[^>]*name="description"[^>]*>/s,
      value: `<meta name="description" content="${page.description}" />`,
    },
    {
      pattern: /<meta\s+[^>]*name="robots"[^>]*>/s,
      value: '<meta name="robots" content="index, follow" />',
    },
    {
      pattern: /<link\s+[^>]*rel="canonical"[^>]*>/s,
      value: `<link rel="canonical" href="${canonicalUrl}" />`,
    },
    {
      pattern: /<meta\s+[^>]*property="og:title"[^>]*>/s,
      value: `<meta property="og:title" content="${page.title}" />`,
    },
    {
      pattern: /<meta\s+[^>]*property="og:description"[^>]*>/s,
      value: `<meta property="og:description" content="${page.description}" />`,
    },
    {
      pattern: /<meta\s+[^>]*property="og:url"[^>]*>/s,
      value: `<meta property="og:url" content="${canonicalUrl}" />`,
    },
    {
      pattern: /<meta\s+[^>]*name="twitter:title"[^>]*>/s,
      value: `<meta name="twitter:title" content="${page.title}" />`,
    },
    {
      pattern: /<meta\s+[^>]*name="twitter:description"[^>]*>/s,
      value: `<meta name="twitter:description" content="${page.description}" />`,
    },
  ];

  return replacements.reduce(
    (currentHtml, item) => currentHtml.replace(item.pattern, item.value),
    html,
  );
}

/**
 * 将静态摘要内容写入根节点，给爬虫提供首屏可读文本，同时不影响前端接管渲染。
 */
function applyStaticShell(html, shell) {
  return html.replace(
    '<div id="root"></div>',
    `<div id="root">${shell}</div>`,
  );
}

/**
 * 将预渲染所需的极简样式注入 head，避免静态摘要完全失去可读性。
 */
function ensureShellAssets(html) {
  if (html.includes('seo-static-shell-style') && html.includes('seo-static-shell-guard')) {
    return html;
  }
  return html.replace(
    '</head>',
    `  ${SEO_SHELL_STYLE}\n  ${SEO_SHELL_GUARD_SCRIPT}\n  </head>`,
  );
}

/**
 * 为公开页生成独立的静态 HTML，便于搜索引擎在不执行完整 JS 的情况下读取关键信息。
 */
async function buildSeoPages() {
  const baseHtml = await readFile(INDEX_FILE, 'utf8');

  for (const page of pages) {
    const pageHtml = applyStaticShell(
      ensureShellAssets(applyHeadMeta(baseHtml, page)),
      page.shell,
    );
    const outputFile = page.directory
      ? resolve(DIST_DIR, page.directory, 'index.html')
      : INDEX_FILE;

    if (page.directory) {
      await mkdir(resolve(DIST_DIR, page.directory), { recursive: true });
    }

    await writeFile(outputFile, pageHtml, 'utf8');
  }
}

await buildSeoPages();
