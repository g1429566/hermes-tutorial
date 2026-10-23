// Chapter 10「消息网关（上）」数据源：网关拓扑图 + 平台 adapter 浏览器。
// 平台路径对齐真实仓库布局：内置 adapter 只剩 api_server / webhook / msgraph_webhook
//（gateway/platforms/ 基类与共享件仍在），各消息平台 adapter 住在 plugins/platforms/ 捆绑插件
//（gateway/run.py 的 _BUILTIN_ADAPTERS 表 + gateway/platforms/ADDING_A_PLATFORM.md；文件系统为准）。

export interface GatewayPlatform {
  id: string;
  name: string;
  tagline: string;
  source: string; // adapter 源码路径（真实存在）
  extraSources?: string[]; // 平台特有的辅助文件
  builtin: boolean; // true = gateway/platforms/ 内置；false = plugins/platforms/ 插件
  features: string[];
}

export const GATEWAY_INTRO =
  '网关是一个常驻后台进程：一边连着 Telegram、Discord、Slack、WhatsApp、Signal 等约 20 个平台，' +
  '另一边连着同一个 agent 核心。每个平台一个 adapter，把平台协议翻译成统一的消息事件，' +
  '再把 agent 的回复路由回原平台。点击左侧平台，看它的 adapter 源码与平台特性。';

// 拓扑图三栏的说明文字（左：平台集合；中：gateway 进程；右：agent 核心）。
export const GATEWAY_TOPOLOGY = {
  left: {
    title: '平台 adapters',
    body: '每平台一个 adapter，继承 gateway/platforms/base.py 的 BasePlatformAdapter。gateway/platforms/ 只剩 api_server / webhook / msgraph_webhook 三个内置 adapter 与基类，各消息平台 adapter 住在 plugins/platforms/ 捆绑插件并通过 platform_registry.py 自注册。',
  },
  middle: {
    title: 'gateway 进程',
    body: 'gateway/run.py 的 GatewayRunner 主循环 + gateway/session.py 的会话管理（SessionSource / SessionStore / build_session_key）。同时托管 cron 调度与 kanban dispatcher。',
  },
  right: {
    title: 'agent 核心',
    body: 'run_agent.py 的 AIAgent——与 CLI 里跑的是同一个主循环。平台只是新的输入来源，循环本身不变。',
  },
};

export const GATEWAY_PLATFORMS: GatewayPlatform[] = [
  {
    id: 'telegram',
    name: 'Telegram',
    tagline: '能力最全的参考实现',
    source: 'plugins/platforms/telegram/adapter.py',
    extraSources: ['plugins/platforms/telegram/telegram_ids.py'],
    builtin: false,
    features: [
      'BotCommand 菜单由中央注册表 telegram_bot_commands() 自动生成',
      '支持 forum topics；/handoff 移交会话时会开一个新 topic',
      '默认工具面是 hermes-telegram 预设（即 _HERMES_CORE_TOOLS 本体），可用 platform_toolsets.telegram 整体替换',
    ],
  },
  {
    id: 'discord',
    name: 'Discord',
    tagline: '线程与语音频道',
    source: 'plugins/platforms/discord/adapter.py',
    extraSources: [
      'plugins/platforms/discord/recovery.py',
      'plugins/platforms/discord/voice_mixer.py',
    ],
    builtin: false,
    features: [
      '可自动建 thread（SessionSource.auto_thread_created），/handoff 创建 1440 分钟自动归档线程',
      '语音频道闭环：听用户说话 → 转录 → agent → 经 voice_mixer.py 混音回播',
      'recovery.py 负责断连恢复',
    ],
  },
  {
    id: 'slack',
    name: 'Slack',
    tagline: 'Block Kit 交互',
    source: 'plugins/platforms/slack/adapter.py',
    extraSources: ['plugins/platforms/slack/block_kit.py'],
    builtin: false,
    features: [
      '/hermes 子命令路由由 slack_subcommand_map() 从中央注册表生成',
      'block_kit.py 渲染按钮等富交互（审批 / clarify 选项）',
      '/handoff 以一条 seed 消息的 ts 作为 thread 锚点',
    ],
  },
  {
    id: 'whatsapp',
    name: 'WhatsApp',
    tagline: '一套行为 mixin，两种接入',
    source: 'plugins/platforms/whatsapp/adapter.py',
    extraSources: ['plugins/platforms/whatsapp_cloud/', 'gateway/platforms/whatsapp_common.py'],
    builtin: false,
    features: [
      'Baileys bridge（插件）与 Meta Cloud API（plugins/platforms/whatsapp_cloud/ 插件）两种接入',
      '两者共享 gateway/platforms/whatsapp_common.py 的 WhatsAppBehaviorMixin',
      'mixin 必须排在基类列表最前，覆盖默认的 format_message',
    ],
  },
  {
    id: 'signal',
    name: 'Signal',
    tagline: '捆绑插件',
    source: 'plugins/platforms/signal/adapter.py',
    extraSources: [
      'plugins/platforms/signal/signal_format.py',
      'plugins/platforms/signal/signal_rate_limit.py',
    ],
    builtin: false,
    features: [
      '捆绑插件：plugins/platforms/signal/，随仓库直装',
      'signal_rate_limit.py 处理平台限流，signal_format.py 处理消息格式',
      '无原生 thread——/handoff 回落到 home channel',
    ],
  },
  {
    id: 'homeassistant',
    name: 'Home Assistant',
    tagline: '智能家居入口',
    source: 'plugin-catalog/homeassistant.yaml',
    builtin: false,
    features: [
      '已迁出核心树：现为官方 catalog 插件（老用户由 hermes update 自动迁移安装）',
      '家庭助手事件进会话 + homeassistant toolset 控设备（ha_call_service 等），需 HASS_TOKEN',
    ],
  },
  {
    id: 'matrix',
    name: 'Matrix',
    tagline: '开放协议',
    source: 'plugins/platforms/matrix/adapter.py',
    builtin: false,
    features: [
      'Matrix 协议接入，scope_id 区分服务器（工作区隔离）',
      '没有建线程 API——/handoff 发 seed 消息，用 event_id 作线程锚（Slack 同款）',
    ],
  },
  {
    id: 'mattermost',
    name: 'Mattermost',
    tagline: '自托管 Slack 替代',
    source: 'plugins/platforms/mattermost/adapter.py',
    builtin: false,
    features: ['自托管团队聊天接入', '与 Slack 类似的频道/线程模型'],
  },
  {
    id: 'email',
    name: 'Email',
    tagline: '异步长邮件',
    source: 'plugins/platforms/email/adapter.py',
    builtin: false,
    features: ['邮件即消息：收件箱轮询进会话，回复走 SMTP 发出', '适合低频异步任务'],
  },
  {
    id: 'sms',
    name: 'SMS',
    tagline: '最朴素的通道',
    source: 'plugins/platforms/sms/adapter.py',
    builtin: false,
    features: ['短信收发接入', '无富交互——纯文本来回'],
  },
  {
    id: 'dingtalk',
    name: 'DingTalk 钉钉',
    tagline: '国内企业 IM',
    source: 'plugins/platforms/dingtalk/adapter.py',
    builtin: false,
    features: ['钉钉机器人接入', 'scope_id 做工作区隔离'],
  },
  {
    id: 'wecom',
    name: 'WeCom 企业微信',
    tagline: '双模式接入',
    source: 'plugins/platforms/wecom/adapter.py',
    extraSources: [
      'plugins/platforms/wecom/callback_adapter.py',
      'plugins/platforms/wecom/wecom_crypto.py',
    ],
    builtin: false,
    features: [
      'adapter.py 常规模式 + callback_adapter.py 回调模式',
      'wecom_crypto.py 处理企业微信的消息加解密',
    ],
  },
  {
    id: 'weixin',
    name: 'Weixin 微信',
    tagline: '捆绑插件',
    source: 'plugins/platforms/weixin/adapter.py',
    builtin: false,
    features: ['捆绑插件：plugins/platforms/weixin/', '个人微信消息接入'],
  },
  {
    id: 'feishu',
    name: 'Feishu 飞书',
    tagline: '带文档扩展',
    source: 'plugins/platforms/feishu/adapter.py',
    extraSources: [
      'plugins/platforms/feishu/feishu_comment.py',
      'plugins/platforms/feishu/feishu_meeting_invite.py',
    ],
    builtin: false,
    features: [
      '飞书机器人接入，另有 feishu_doc / feishu_drive toolset 操作云文档',
      'feishu_comment.py 处理文档评论，feishu_meeting_invite.py 处理会议邀请',
    ],
  },
  {
    id: 'qqbot',
    name: 'QQ Bot',
    tagline: '插件包',
    source: 'plugins/platforms/qqbot/',
    builtin: false,
    features: ['捆绑插件：plugins/platforms/qqbot/', 'QQ 官方机器人协议接入'],
  },
];

export const GATEWAY_REGISTRY_NOTE = {
  title: '新平台怎么进来',
  body: '内置 adapter 登记在 gateway/run.py 的 _BUILTIN_ADAPTERS 表里（每项带依赖检查，不满足就跳过）；插件平台通过 PluginContext.register_platform() 注册进 gateway/platform_registry.py——查找时插件优先，未注册再回落内置表。写一个 adapter 的完整清单见 gateway/platforms/ADDING_A_PLATFORM.md：继承 BasePlatformAdapter，实现收发、按钮回调（clarify 选项 cl:<id>:<idx>、审批 appr:<id>:<choice>、斜杠确认 sc:<choice>:<id> 等共享 id 约定），并带上 check_<platform>_requirements 环境检查。',
  points: [
    '每个平台有预设工具面（如 telegram 默认 hermes-telegram 预设，即 _HERMES_CORE_TOOLS 本体）；各预设都共享 _HERMES_CORE_TOOLS 核心包',
    'config.yaml 的 platform_toolsets.<platform> 按平台替换工具面（hermes tools 可交互配置）',
    '用独立凭据联网的 adapter 应在 connect() 里拿 token lock（gateway.status 的 acquire_scoped_lock），防止两个 profile 抢同一个 bot token',
  ],
};

// ── 英文版（结构与上方中文导出一一对应） ─────────────────────────

export const GATEWAY_INTRO_EN =
  'The gateway is a long-running background process: one side connects to about 20 platforms — ' +
  'Telegram, Discord, Slack, WhatsApp, Signal and more — the other side connects to the same ' +
  'agent core. Each platform has one adapter that translates the platform protocol into unified ' +
  "message events and routes the agent's replies back. Click a platform on the left to see its " +
  'adapter source and platform features.';

export const GATEWAY_TOPOLOGY_EN: typeof GATEWAY_TOPOLOGY = {
  left: {
    title: 'Platform adapters',
    body: 'One adapter per platform, inheriting BasePlatformAdapter from gateway/platforms/base.py. gateway/platforms/ now holds only three built-in adapters (api_server / webhook / msgraph_webhook) plus the base classes; messaging-platform adapters live in plugins/platforms/ as bundled plugins and self-register via platform_registry.py.',
  },
  middle: {
    title: 'gateway process',
    body: 'The GatewayRunner main loop in gateway/run.py + session management in gateway/session.py (SessionSource / SessionStore / build_session_key). It also hosts the cron scheduler and the kanban dispatcher.',
  },
  right: {
    title: 'agent core',
    body: 'AIAgent in run_agent.py — the same main loop that runs in the CLI. Platforms are just new input sources; the loop itself is unchanged.',
  },
};

export const GATEWAY_PLATFORMS_EN: GatewayPlatform[] = [
  {
    id: 'telegram',
    name: 'Telegram',
    tagline: 'The most complete reference implementation',
    source: 'plugins/platforms/telegram/adapter.py',
    extraSources: ['plugins/platforms/telegram/telegram_ids.py'],
    builtin: false,
    features: [
      'The BotCommand menu is auto-generated from the central registry telegram_bot_commands()',
      'Supports forum topics; /handoff opens a new topic when moving a session over',
      'Default tool surface is the hermes-telegram preset (i.e. the _HERMES_CORE_TOOLS body); replace it wholesale via platform_toolsets.telegram',
    ],
  },
  {
    id: 'discord',
    name: 'Discord',
    tagline: 'Threads and voice channels',
    source: 'plugins/platforms/discord/adapter.py',
    extraSources: [
      'plugins/platforms/discord/recovery.py',
      'plugins/platforms/discord/voice_mixer.py',
    ],
    builtin: false,
    features: [
      'Can auto-create threads (SessionSource.auto_thread_created); /handoff creates a 1440-minute auto-archive thread',
      'Voice-channel loop: listen to the user → transcribe → agent → voice_mixer.py mixes the spoken reply',
      'recovery.py handles reconnect recovery',
    ],
  },
  {
    id: 'slack',
    name: 'Slack',
    tagline: 'Block Kit interactions',
    source: 'plugins/platforms/slack/adapter.py',
    extraSources: ['plugins/platforms/slack/block_kit.py'],
    builtin: false,
    features: [
      'The /hermes subcommand routing is generated by slack_subcommand_map() from the central registry',
      'block_kit.py renders rich interactions like buttons (approvals / clarify options)',
      '/handoff uses the ts of a seed message as the thread anchor',
    ],
  },
  {
    id: 'whatsapp',
    name: 'WhatsApp',
    tagline: 'One behavior mixin, two transports',
    source: 'plugins/platforms/whatsapp/adapter.py',
    extraSources: ['plugins/platforms/whatsapp_cloud/', 'gateway/platforms/whatsapp_common.py'],
    builtin: false,
    features: [
      'Two transports: the Baileys bridge (plugin) and the Meta Cloud API (plugins/platforms/whatsapp_cloud/ plugin)',
      'Both share the WhatsAppBehaviorMixin in gateway/platforms/whatsapp_common.py',
      'The mixin must come first in the base-class list to override the default format_message',
    ],
  },
  {
    id: 'signal',
    name: 'Signal',
    tagline: 'Bundled plugin',
    source: 'plugins/platforms/signal/adapter.py',
    extraSources: [
      'plugins/platforms/signal/signal_format.py',
      'plugins/platforms/signal/signal_rate_limit.py',
    ],
    builtin: false,
    features: [
      'Bundled plugin: plugins/platforms/signal/, shipped with the repo',
      'signal_rate_limit.py handles platform rate limiting, signal_format.py handles message formatting',
      'No native threads — /handoff falls back to the home channel',
    ],
  },
  {
    id: 'homeassistant',
    name: 'Home Assistant',
    tagline: 'Smart-home entry point',
    source: 'plugin-catalog/homeassistant.yaml',
    builtin: false,
    features: [
      'Moved out of the core tree: now an official catalog plugin (hermes update auto-migrates existing installs)',
      'Home Assistant events feed sessions; the homeassistant toolset controls devices (ha_call_service etc.), requiring HASS_TOKEN',
    ],
  },
  {
    id: 'matrix',
    name: 'Matrix',
    tagline: 'Open protocol',
    source: 'plugins/platforms/matrix/adapter.py',
    builtin: false,
    features: [
      'Matrix protocol transport; scope_id distinguishes servers (workspace isolation)',
      'No thread-creation API — /handoff posts a seed message and uses its event_id as the thread anchor (Slack-style)',
    ],
  },
  {
    id: 'mattermost',
    name: 'Mattermost',
    tagline: 'Self-hosted Slack alternative',
    source: 'plugins/platforms/mattermost/adapter.py',
    builtin: false,
    features: ['Self-hosted team chat transport', 'A channel/thread model similar to Slack'],
  },
  {
    id: 'email',
    name: 'Email',
    tagline: 'Async long-form mail',
    source: 'plugins/platforms/email/adapter.py',
    builtin: false,
    features: [
      'Email as messages: inbox polling feeds the session, replies go out via SMTP',
      'Good for low-frequency async tasks',
    ],
  },
  {
    id: 'sms',
    name: 'SMS',
    tagline: 'The plainest channel',
    source: 'plugins/platforms/sms/adapter.py',
    builtin: false,
    features: ['SMS send/receive transport', 'No rich interactions — plain text back and forth'],
  },
  {
    id: 'dingtalk',
    name: 'DingTalk 钉钉',
    tagline: 'Enterprise IM in China',
    source: 'plugins/platforms/dingtalk/adapter.py',
    builtin: false,
    features: ['DingTalk bot transport', 'scope_id for workspace isolation'],
  },
  {
    id: 'wecom',
    name: 'WeCom 企业微信',
    tagline: 'Dual-mode transport',
    source: 'plugins/platforms/wecom/adapter.py',
    extraSources: [
      'plugins/platforms/wecom/callback_adapter.py',
      'plugins/platforms/wecom/wecom_crypto.py',
    ],
    builtin: false,
    features: [
      'adapter.py regular mode + callback_adapter.py callback mode',
      'wecom_crypto.py handles WeCom message encryption/decryption',
    ],
  },
  {
    id: 'weixin',
    name: 'Weixin 微信',
    tagline: 'Bundled plugin',
    source: 'plugins/platforms/weixin/adapter.py',
    builtin: false,
    features: ['Bundled plugin: plugins/platforms/weixin/', 'Personal WeChat message transport'],
  },
  {
    id: 'feishu',
    name: 'Feishu 飞书',
    tagline: 'With doc extensions',
    source: 'plugins/platforms/feishu/adapter.py',
    extraSources: [
      'plugins/platforms/feishu/feishu_comment.py',
      'plugins/platforms/feishu/feishu_meeting_invite.py',
    ],
    builtin: false,
    features: [
      'Feishu bot transport, plus feishu_doc / feishu_drive toolsets for operating cloud docs',
      'feishu_comment.py handles doc comments, feishu_meeting_invite.py handles meeting invites',
    ],
  },
  {
    id: 'qqbot',
    name: 'QQ Bot',
    tagline: 'Plugin package',
    source: 'plugins/platforms/qqbot/',
    builtin: false,
    features: ['Bundled plugin: plugins/platforms/qqbot/', 'Official QQ bot protocol transport'],
  },
];

export const GATEWAY_REGISTRY_NOTE_EN: typeof GATEWAY_REGISTRY_NOTE = {
  title: 'How a new platform gets in',
  body: 'Built-in adapters are listed in the _BUILTIN_ADAPTERS table in gateway/run.py (each entry carries a requirements check and is skipped when unmet); plugin platforms register into gateway/platform_registry.py via PluginContext.register_platform() — lookup prefers plugins, then falls back to the built-in table. The full checklist for writing an adapter is in gateway/platforms/ADDING_A_PLATFORM.md: inherit BasePlatformAdapter, implement send/receive and button callbacks (shared id conventions like clarify options cl:<id>:<idx>, approvals appr:<id>:<choice> and slash confirms sc:<choice>:<id>), and ship a check_<platform>_requirements environment check.',
  points: [
    'Each platform has a preset tool surface (e.g. telegram defaults to the hermes-telegram preset, i.e. the _HERMES_CORE_TOOLS bundle itself); all presets share the _HERMES_CORE_TOOLS core bundle',
    'platform_toolsets.<platform> in config.yaml replaces the tool surface per platform (configurable interactively via hermes tools)',
    'Adapters that go online with their own credentials should take a token lock in connect() (acquire_scoped_lock from gateway.status) to stop two profiles from fighting over the same bot token',
  ],
};

// 本章专属 UI 文案（组件硬编码部分）。
export const GATEWAY_UI = {
  explorerKicker: { zh: '逐平台拆解', en: 'Platform by platform' },
  explorerTitle: { zh: 'adapter 详情', en: 'Adapter details' },
  sourcePath: { zh: '源码路径', en: 'Source path' },
  features: { zh: '平台特性', en: 'Platform features' },
  extKicker: { zh: '扩展点', en: 'Extension point' },
};
