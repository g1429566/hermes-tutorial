// Chapter 10「消息网关（上）」数据源：网关拓扑图 + 平台 adapter 浏览器。
// 平台路径对齐真实仓库布局：内置 adapter 在 gateway/platforms/，
// 插件平台在 plugins/platforms/<name>/adapter.py（AGENTS.md §Project Structure +
// gateway/platforms/ADDING_A_PLATFORM.md；文件系统为准）。

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
    body: '每平台一个 adapter，继承 gateway/platforms/base.py 的 BasePlatformAdapter。内置 adapter 住在 gateway/platforms/，插件平台住在 plugins/platforms/ 并通过 platform_registry.py 自注册。',
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
      '基础 toolset 选 "messaging"，再按 tools.telegram.enabled/disabled 增减',
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
      'voice_mixer.py 支撑语音频道：听用户说话 → 转录 → agent → 语音回播',
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
    extraSources: ['gateway/platforms/whatsapp_cloud.py', 'gateway/platforms/whatsapp_common.py'],
    builtin: false,
    features: [
      'Baileys bridge（插件）与 Meta Cloud API（内置 whatsapp_cloud.py）两种接入',
      '两者共享 gateway/platforms/whatsapp_common.py 的 WhatsAppBehaviorMixin',
      'mixin 必须排在基类列表最前，覆盖默认的 format_message',
    ],
  },
  {
    id: 'signal',
    name: 'Signal',
    tagline: '内置 adapter',
    source: 'gateway/platforms/signal.py',
    extraSources: ['gateway/platforms/signal_format.py', 'gateway/platforms/signal_rate_limit.py'],
    builtin: true,
    features: [
      '内置在 gateway/platforms/，随仓库直装',
      'signal_rate_limit.py 处理平台限流，signal_format.py 处理消息格式',
      '无原生 thread——/handoff 回落到 home channel',
    ],
  },
  {
    id: 'homeassistant',
    name: 'Home Assistant',
    tagline: '智能家居入口',
    source: 'plugins/platforms/homeassistant/adapter.py',
    builtin: false,
    features: ['把家庭助手事件变成 agent 会话', '专属 homeassistant toolset 控制设备'],
  },
  {
    id: 'matrix',
    name: 'Matrix',
    tagline: '开放协议',
    source: 'plugins/platforms/matrix/adapter.py',
    builtin: false,
    features: [
      'Matrix 协议接入，scope_id 区分服务器（工作区隔离）',
      '无原生 thread——/handoff 回落到 home channel',
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
    tagline: '内置个人微信',
    source: 'gateway/platforms/weixin.py',
    builtin: true,
    features: ['内置在 gateway/platforms/', '个人微信消息接入'],
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
    tagline: '内置包',
    source: 'gateway/platforms/qqbot/',
    builtin: true,
    features: ['内置在 gateway/platforms/qqbot/ 包', 'QQ 官方机器人协议接入'],
  },
];

export const GATEWAY_REGISTRY_NOTE = {
  title: '新平台怎么进来',
  body: '内置 adapter 走 run.py 里 _create_adapter() 的 if/elif 链；插件平台通过 PluginContext.register_platform() 注册进 gateway/platform_registry.py——查找时插件优先，找不到再回落内置路径。写一个 adapter 的完整清单见 gateway/platforms/ADDING_A_PLATFORM.md：继承 BasePlatformAdapter，实现收发、按钮回调（clarify 选项 cl:<id>:<idx>、审批 appr:<id>:<choice> 等共享 id 约定），并带上 check_fn 环境检查。',
  points: [
    '平台 adapter 选择基础 toolset（如 Telegram 用 "messaging"），_HERMES_CORE_TOOLS 是大多数平台继承的默认包',
    'config.yaml 的 tools.<platform>.enabled / disabled 按平台微调工具面',
    '用独立凭据联网的 adapter 应在 connect() 里拿 token lock（gateway.status 的 acquire_scoped_lock），防止两个 profile 抢同一个 bot token',
  ],
};
