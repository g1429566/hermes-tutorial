// Chapter 17「Profiles 多实例」数据源：隔离模型 / profile-safe 规则 GOOD vs BAD / 路径解析器。
// 内容对齐 hermes-agent/AGENTS.md 的「Profiles: Multi-Instance Support」一节（6 条规则），
// 代码示例逐字对齐 hermes_constants.py、hermes_cli/main.py、hermes_cli/profiles.py、gateway/status.py。

export interface ProfileRule {
  id: string;
  title: string;
  rule: string; // 规则原文要义
  good: { label: string; code: string };
  bad: { label: string; code: string };
  note: string;
}

export interface ProfileResource {
  id: string;
  label: string;
  suffix: string; // HERMES_HOME 下的相对路径
  note: string;
}

export const PROFILES_INTRO =
  'Hermes 支持 profiles——多个完全隔离的实例，每个实例有自己的 HERMES_HOME 目录：' +
  'config、API keys、记忆、会话、技能、网关状态全都各自独立。默认实例住 ~/.hermes，' +
  '命名 profile 住 ~/.hermes/profiles/<name>。核心机制只有一个：' +
  '_apply_profile_override()（hermes_cli/main.py）在任何 module import 之前设置好 ' +
  'HERMES_HOME 环境变量，之后所有 get_hermes_home() 调用自动 scoped 到当前 profile。';

/* ── ① 隔离模型 ─────────────────────────────────────────────────── */
export const ISOLATION_OWNED = [
  { label: 'config.yaml', note: '模型 / agent / 网关等全部配置' },
  { label: '.env', note: 'API keys 等密钥' },
  { label: 'state.db', note: '会话（SessionDB，hermes_state.py）' },
  { label: 'skills/', note: '技能目录' },
  { label: 'plugins/', note: '记忆等插件数据' },
  { label: 'gateway-starts.log', note: '网关状态' },
];

export const ISOLATION_MECHANISM = [
  { id: 'flag', label: 'hermes -p coder', desc: '命令行指定激活的 profile' },
  {
    id: 'override',
    label: '_apply_profile_override()',
    desc: 'hermes_cli/main.py：在任何 module import 之前设置 HERMES_HOME',
  },
  {
    id: 'env',
    label: 'HERMES_HOME',
    desc: '环境变量指向 ~/.hermes/profiles/coder',
  },
  {
    id: 'scoped',
    label: 'get_hermes_home()',
    desc: 'hermes_constants.py：所有调用自动 scoped 到当前 profile',
  },
];

/* ── ② profile-safe 规则：GOOD vs BAD ───────────────────────────── */
export const PROFILE_RULES: ProfileRule[] = [
  {
    id: 'paths',
    title: '规则 1 · 路径一律走 get_hermes_home()',
    rule: '读写状态的代码里，绝不允许硬编码 ~/.hermes 或 Path.home() / ".hermes"。',
    good: {
      label: 'GOOD',
      code: `from hermes_constants import get_hermes_home
config_path = get_hermes_home() / "config.yaml"`,
    },
    bad: {
      label: 'BAD — breaks profiles',
      code: `config_path = Path.home() / ".hermes" / "config.yaml"`,
    },
    note: '硬编码路径会让所有 profile 读写同一份文件。AGENTS.md 记载：PR #3575 一口气修了 5 个这样的 bug。',
  },
  {
    id: 'display',
    title: '规则 2 · 用户可见消息走 display_hermes_home()',
    rule: '打印 / 日志里展示给用户的路径，用 display_hermes_home()——default 返回 ~/.hermes，profile 返回 ~/.hermes/profiles/<name>。',
    good: {
      label: 'GOOD',
      code: `from hermes_constants import display_hermes_home
print(f"Config saved to {display_hermes_home()}/config.yaml")`,
    },
    bad: {
      label: 'BAD — 给 profile 用户指错路',
      code: `print("Config saved to ~/.hermes/config.yaml")`,
    },
    note: '代码路径用 get_hermes_home()（返回 Path），展示路径用 display_hermes_home()（返回 str），分工明确。',
  },
  {
    id: 'anchor',
    title: '规则 6 · profile 操作锚定 HOME，而非 HERMES_HOME',
    rule: '_get_profiles_root()（hermes_cli/profiles.py）返回 Path.home() / ".hermes" / "profiles"，不是 get_hermes_home() / "profiles"。',
    good: {
      label: 'GOOD',
      code: `def _get_profiles_root() -> Path:
    return Path.home() / ".hermes" / "profiles"`,
    },
    bad: {
      label: 'BAD — 只看得到当前 profile',
      code: `return get_hermes_home() / "profiles"`,
    },
    note: '这是故意的：hermes -p coder profile list 无论激活哪个 profile，都要能看到全部 profiles。与规则 1 方向相反——状态读写锚定 HERMES_HOME，profile 管理锚定 HOME。',
  },
  {
    id: 'lock',
    title: '规则 5 · 网关平台适配器用 token 锁',
    rule: '适配器用唯一凭证（bot token、API key）连接时，connect()/start() 里 acquire_scoped_lock()，disconnect()/stop() 里 release_scoped_lock()（gateway/status.py）。',
    good: {
      label: 'GOOD（plugins/platforms/irc/adapter.py 的范式）',
      code: `from gateway.status import acquire_scoped_lock
if not acquire_scoped_lock("irc", lock_key):
    ...  # 凭证已被另一个 profile 占用`,
    },
    bad: {
      label: 'BAD — 两个 profile 抢同一凭证',
      code: `def connect(self):
    ...  # 直接拿同一个 bot token 上线，
    ...  # 两个实例互相把对方挤掉线`,
    },
    note: '锁防止两个 profile 同时使用同一凭证——否则两个实例会用同一个 bot 身份互相踢掉对方。',
  },
];

export const EXTRA_RULES_NOTE =
  '另两条规则：模块级常量是安全的——它们在 import 时缓存 get_hermes_home()，而 import 发生在 ' +
  '_apply_profile_override() 之后（规则 3）；mock Path.home() 的测试必须同时 patch ' +
  'HERMES_HOME 环境变量，因为代码读的是环境变量（规则 4）。';

/* ── ③ 路径解析器 ───────────────────────────────────────────────── */
export const RESOLVER_PROFILES = [
  { id: 'default', name: 'default', home: '~/.hermes' },
  { id: 'coder', name: 'coder', home: '~/.hermes/profiles/coder' },
  { id: 'work', name: 'work', home: '~/.hermes/profiles/work' },
];

export const RESOLVER_RESOURCES: ProfileResource[] = [
  { id: 'config', label: '配置', suffix: 'config.yaml', note: 'config / 模型 / 网关配置' },
  { id: 'env', label: '密钥', suffix: '.env', note: 'API keys（仅密钥）' },
  { id: 'sessions', label: '会话', suffix: 'state.db', note: 'SessionDB（hermes_state.py）' },
  { id: 'skills', label: '技能', suffix: 'skills/', note: '技能斜杠命令扫描目录' },
  { id: 'memory', label: '记忆', suffix: 'plugins/', note: 'memory 等插件数据' },
  {
    id: 'gateway',
    label: '网关',
    suffix: 'gateway-starts.log',
    note: '网关状态（gateway/status.py）',
  },
];

// ── 英文版（结构与上方中文导出一一对应） ─────────────────────────

export const PROFILES_INTRO_EN =
  'Hermes supports profiles — multiple fully isolated instances, each with its own HERMES_HOME ' +
  'directory: config, API keys, memory, sessions, skills, and gateway state are all independent. ' +
  'The default instance lives in ~/.hermes; a named profile lives in ' +
  '~/.hermes/profiles/<name>. There is exactly one core mechanism: _apply_profile_override() ' +
  '(hermes_cli/main.py) sets the HERMES_HOME environment variable before any module import, ' +
  'so every subsequent get_hermes_home() call is automatically scoped to the active profile.';

export const ISOLATION_OWNED_EN = [
  { label: 'config.yaml', note: 'All configuration: model / agent / gateway' },
  { label: '.env', note: 'Secrets such as API keys' },
  { label: 'state.db', note: 'Sessions (SessionDB, hermes_state.py)' },
  { label: 'skills/', note: 'Skills directory' },
  { label: 'plugins/', note: 'Plugin data such as memory' },
  { label: 'gateway-starts.log', note: 'Gateway state' },
];

export const ISOLATION_MECHANISM_EN = [
  { id: 'flag', label: 'hermes -p coder', desc: 'Pick the active profile on the command line' },
  {
    id: 'override',
    label: '_apply_profile_override()',
    desc: 'hermes_cli/main.py: sets HERMES_HOME before any module import',
  },
  {
    id: 'env',
    label: 'HERMES_HOME',
    desc: 'Environment variable pointing at ~/.hermes/profiles/coder',
  },
  {
    id: 'scoped',
    label: 'get_hermes_home()',
    desc: 'hermes_constants.py: every call is automatically scoped to the active profile',
  },
];

export const PROFILE_RULES_EN: ProfileRule[] = [
  {
    id: 'paths',
    title: 'Rule 1 · Paths always go through get_hermes_home()',
    rule: 'In code that reads or writes state, hardcoding ~/.hermes or Path.home() / ".hermes" is never allowed.',
    good: {
      label: 'GOOD',
      code: `from hermes_constants import get_hermes_home
config_path = get_hermes_home() / "config.yaml"`,
    },
    bad: {
      label: 'BAD — breaks profiles',
      code: `config_path = Path.home() / ".hermes" / "config.yaml"`,
    },
    note: 'Hardcoded paths make every profile read and write the same file. AGENTS.md records that PR #3575 fixed 5 such bugs in one go.',
  },
  {
    id: 'display',
    title: 'Rule 2 · User-visible messages go through display_hermes_home()',
    rule: 'For paths shown to the user in prints / logs, use display_hermes_home() — it returns ~/.hermes for default and ~/.hermes/profiles/<name> for a profile.',
    good: {
      label: 'GOOD',
      code: `from hermes_constants import display_hermes_home
print(f"Config saved to {display_hermes_home()}/config.yaml")`,
    },
    bad: {
      label: 'BAD — points profile users to the wrong place',
      code: `print("Config saved to ~/.hermes/config.yaml")`,
    },
    note: 'Code paths use get_hermes_home() (returns a Path); display paths use display_hermes_home() (returns a str). Clear division of labor.',
  },
  {
    id: 'anchor',
    title: 'Rule 6 · Profile operations anchor on HOME, not HERMES_HOME',
    rule: '_get_profiles_root() (hermes_cli/profiles.py) returns Path.home() / ".hermes" / "profiles", not get_hermes_home() / "profiles".',
    good: {
      label: 'GOOD',
      code: `def _get_profiles_root() -> Path:
    return Path.home() / ".hermes" / "profiles"`,
    },
    bad: {
      label: 'BAD — can only see the current profile',
      code: `return get_hermes_home() / "profiles"`,
    },
    note: 'This is deliberate: hermes -p coder profile list must see all profiles no matter which one is active. The opposite direction of Rule 1 — state reads/writes anchor on HERMES_HOME, profile management anchors on HOME.',
  },
  {
    id: 'lock',
    title: 'Rule 5 · Gateway platform adapters use token locks',
    rule: 'When an adapter connects with a unique credential (bot token, API key), call acquire_scoped_lock() in connect()/start() and release_scoped_lock() in disconnect()/stop() (gateway/status.py).',
    good: {
      label: 'GOOD (the plugins/platforms/irc/adapter.py pattern)',
      code: `from gateway.status import acquire_scoped_lock
if not acquire_scoped_lock("irc", lock_key):
    ...  # credential already in use by another profile`,
    },
    bad: {
      label: 'BAD — two profiles fighting over one credential',
      code: `def connect(self):
    ...  # goes online with the same bot token,
    ...  # the two instances kick each other offline`,
    },
    note: 'The lock prevents two profiles from using the same credential at once — otherwise the two instances would kick each other offline under the same bot identity.',
  },
];

export const EXTRA_RULES_NOTE_EN =
  'Two more rules: module-level constants are safe — they cache get_hermes_home() at import ' +
  'time, and imports happen after _apply_profile_override() (Rule 3); tests that mock ' +
  'Path.home() must also patch the HERMES_HOME environment variable, because the code reads ' +
  'the environment variable (Rule 4).';

export const RESOLVER_RESOURCES_EN: ProfileResource[] = [
  {
    id: 'config',
    label: 'Config',
    suffix: 'config.yaml',
    note: 'config / model / gateway settings',
  },
  { id: 'env', label: 'Secrets', suffix: '.env', note: 'API keys (secrets only)' },
  { id: 'sessions', label: 'Sessions', suffix: 'state.db', note: 'SessionDB (hermes_state.py)' },
  {
    id: 'skills',
    label: 'Skills',
    suffix: 'skills/',
    note: 'Directory scanned for skill slash commands',
  },
  { id: 'memory', label: 'Memory', suffix: 'plugins/', note: 'Plugin data such as memory' },
  {
    id: 'gateway',
    label: 'Gateway',
    suffix: 'gateway-starts.log',
    note: 'Gateway state (gateway/status.py)',
  },
];

/* ── 组件专属 UI 文案 ─────────────────────────────────────────── */
export const PROFILES_UI = {
  isolationKicker: { zh: '隔离模型', en: 'Isolation model' },
  isolationTitle: {
    zh: '两个实例，两套完整家当',
    en: 'Two instances, two complete households',
  },
  defaultInstance: { zh: '默认实例', en: 'Default instance' },
  namedProfile: { zh: '命名 profile', en: 'Named profile' },
  mechanismLabel: { zh: '核心机制', en: 'Core mechanism' },
  rulesKicker: { zh: 'profile-safe 规则', en: 'Profile-safe rules' },
  rulesTitle: { zh: 'GOOD vs BAD 代码对照', en: 'GOOD vs BAD code comparison' },
  rulesDesc: {
    zh: 'AGENTS.md 给贡献者立了 6 条 profile-safe 规则。点击左侧规则，看右侧代码对照。',
    en: 'AGENTS.md lays down 6 profile-safe rules for contributors. Click a rule on the left to see the code comparison on the right.',
  },
  badPrefix: { zh: '反例', en: 'Counter-example' },
  resolverKicker: { zh: '动手试试', en: 'Try it' },
  resolverTitle: { zh: '路径解析器', en: 'Path resolver' },
  resolverDesc: {
    zh: '选择一个 profile，看每类资源实际解析到哪个路径。',
    en: 'Pick a profile and see which path each kind of resource actually resolves to.',
  },
  takeaway: {
    zh: '一句话记住 profiles：_apply_profile_override() 抢在任何 import 之前设置 HERMES_HOME——之后每个 get_hermes_home() 都自动落在当前 profile 的目录里。',
    en: "Profiles in one sentence: _apply_profile_override() sets HERMES_HOME before any import — every get_hermes_home() afterwards automatically lands inside the active profile's directory.",
  },
};
