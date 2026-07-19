// 把 pyodide 运行时（npm 包）拷到 public/pyodide/，实现完全离线的浏览器 Python 沙箱：
// dev / build / nginx 都以静态文件直接服务，不依赖 CDN。
// 由 npm postinstall 自动执行，也可手动 node scripts/setup-pyodide.mjs。
import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const SRC = join(ROOT, 'node_modules', 'pyodide');
const DEST = join(ROOT, 'public', 'pyodide');

// loadPyodide 运行所需的最小文件集（其余为源码 map / 文档 / 测试页）
const FILES = [
  'pyodide.js',
  'pyodide.asm.mjs',
  'pyodide.asm.wasm',
  'pyodide-lock.json',
  'python_stdlib.zip',
];

if (!existsSync(join(SRC, 'pyodide.js'))) {
  console.error('✗ 未找到 node_modules/pyodide —— 请先 npm install');
  process.exit(1);
}

mkdirSync(DEST, { recursive: true });
for (const f of FILES) {
  copyFileSync(join(SRC, f), join(DEST, f));
}
console.log(`✓ pyodide 运行时已就位 → public/pyodide/（${FILES.length} 个文件）`);
