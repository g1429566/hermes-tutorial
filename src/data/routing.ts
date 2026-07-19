// Chapter 30「模型路由与凭据池」数据源。
// 对齐 agent/auxiliary_client.py 的 docstring（解析顺序与 Codex 例外）、
// agent/credential_pool.py（同 provider 多凭据 failover）、AGENTS.md 的
// AIAgent 参数（credential_pool / fallback_model）与 auxiliary 配置段说明。

export const ROUTING_INTRO =
  '第 27 章讲可靠性时提过「重试→熔断→降级」。这一章看降级是怎么真实发生的：' +
  '主模型挂了谁来接盘？侧边任务（压缩、摘要、vision）又派给谁？' +
  'Hermes 的答案分三层：同 provider 的凭据池、跨 provider 的 fallback_model、以及辅助任务的统一路由器。';

export interface FailoverLayer {
  id: string;
  name: string;
  trigger: string;
  body: string;
  sourceRef: string;
}

export const FAILOVER_LAYERS: FailoverLayer[] = [
  {
    id: 'pool',
    name: '① 凭据池：同 provider 换 key',
    trigger: '单个凭据限流 / 失效',
    body: 'credential_pool 为同一 provider 持久化多个凭据。某个 key 触发限流或失效时，池子在同一 provider 内轮换到下一个凭据——用户无感。凭据来源、借用来源的脱敏、过期刷新（如 Codex token 的 skew 刷新）都在池子里处理。',
    sourceRef: 'agent/credential_pool.py',
  },
  {
    id: 'fallback',
    name: '② fallback_model：跨 provider 降级',
    trigger: '整个 provider 不可用',
    body: '凭据池救不了「整个 provider 挂了」。AIAgent 构造参数里的 fallback_model 是跨 provider 的最后一道：主模型彻底不可达时切到备用模型继续会话。',
    sourceRef: 'run_agent.py（AIAgent 构造参数）',
  },
  {
    id: 'auxiliary',
    name: '③ auxiliary：侧边任务的统一路由',
    trigger: '压缩 / 摘要 / vision 等辅助 LLM 调用',
    body: '主循环之外有大量「侧边」LLM 工作：上下文压缩、session_search、标题生成、vision 分析、curator 评审。auxiliary_client 给它们一条统一解析链，不为每个任务复制 fallback 逻辑；每个任务还能用 auxiliary.<task>.provider/model 单独钉住后端。',
    sourceRef: 'agent/auxiliary_client.py',
  },
];

export interface AuxTask {
  id: string;
  name: string;
  kind: 'text' | 'vision';
  desc: string;
}

export const AUX_TASKS: AuxTask[] = [
  { id: 'compression', name: '上下文压缩', kind: 'text', desc: '压缩必须是便宜快速的模型' },
  { id: 'session_search', name: '会话搜索', kind: 'text', desc: '跨会话召回的查询理解' },
  { id: 'title', name: '标题生成', kind: 'text', desc: '给会话起标题' },
  { id: 'curator', name: '策展评审', kind: 'text', desc: '技能质量 LLM review pass' },
  { id: 'vision', name: 'vision 分析', kind: 'vision', desc: '图片理解（第 31 章）' },
];

// 文本任务的 auto 解析顺序（agent/auxiliary_client.py docstring）
export const TEXT_CHAIN = [
  { step: 1, backend: '主 provider + 主模型', note: '无论 provider 类型，优先复用用户已配好的' },
  { step: 2, backend: 'OpenRouter', note: 'OPENROUTER_API_KEY' },
  { step: 3, backend: 'Nous Portal', note: '~/.hermes/auth.json 的 active provider' },
  { step: 4, backend: '自定义 endpoint', note: 'config.yaml model.base_url + OPENAI_API_KEY' },
  { step: 5, backend: '原生 Anthropic', note: '直连 key' },
  { step: 6, backend: '直连 key 系', note: 'z.ai/GLM、Kimi/Moonshot、MiniMax 等' },
  { step: 7, backend: 'None', note: '全部不可用——该辅助功能静默降级' },
];

// 视觉任务的 auto 解析顺序（同一份 docstring）
export const VISION_CHAIN = [
  { step: 1, backend: '主 provider（须支持视觉）', note: '在受支持的 vision 后端列表里才行' },
  { step: 2, backend: 'OpenRouter', note: '' },
  { step: 3, backend: 'Nous Portal', note: '' },
  { step: 4, backend: '原生 Anthropic', note: '' },
  { step: 5, backend: '自定义 endpoint', note: '本地视觉模型：Qwen-VL / LLaVA / Pixtral' },
  { step: 6, backend: 'None', note: '' },
];

export const CODEX_CALLOUT = {
  title: '为什么 Codex OAuth 不在 fallback 链里',
  body: 'OpenAI 给 Codex endpoint 上了未文档化、随时变动的模型白名单——「试试 Codex + 硬编码模型名」这条 fallback 会自己腐烂。所以 Codex 只在两种情况下使用：用户的主 provider 本来就是 openai-codex，或调用方显式指定 auxiliary.<task>.provider + model。fallback 链的设计原则：只放「今天明天都确定能用」的后端。',
};

export const AUX_CONFIG_EXAMPLE = `# config.yaml —— 每个辅助任务可单独钉住后端
auxiliary:
  compression:
    provider: openrouter
    model: google/gemini-flash
    max_tokens: 4096
  vision:
    provider: anthropic
    reasoning_effort: low`;
