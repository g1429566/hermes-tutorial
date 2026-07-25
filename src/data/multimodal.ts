// Chapter 31「多模态工具」数据源。
// 对齐 tools/vision_tools.py、agent/image_gen_provider.py 的 docstring
// 与 plugins/ 目录真实结构；TTS/STT 以 tools/tts_tool.py、config 的 stt/tts 段为据。

export const MULTIMODAL_INTRO =
  'Hermes 的主循环只处理文本，但 agent 的感知力不止文本：看图、生图、生视频、说话、听写。' +
  '这些能力遵循同一条架构原则——主循环不变，多模态以工具/provider 插件的形式长在边缘。' +
  '这一章逐个拆开看它们怎么接进来的。';

export interface Modality {
  id: string;
  name: string;
  tagline: string;
  tool: string;
  architecture: string;
  configKey: string;
  sourceRef: string;
  notes: string[];
}

export const MODALITIES: Modality[] = [
  {
    id: 'vision',
    name: '视觉理解',
    tagline: '让 agent 看图',
    tool: 'vision_analyze',
    architecture:
      '不走主模型，走第 30 章的辅助 vision 路由：下载图片转 base64，交给解析链选出的 vision 后端分析，临时文件自动清理。主循环只收到文本结论——上下文不被图片撑爆。',
    configKey: 'auxiliary.vision.*',
    sourceRef: 'tools/vision_tools.py',
    notes: [
      '输入是图片 URL + 自定义 prompt',
      '本地视觉模型（Qwen-VL/LLaVA）可走自定义 endpoint',
      '图片过大时由压缩层做重编码自救（第 29 章）',
    ],
  },
  {
    id: 'image-gen',
    name: '图像生成',
    tagline: '文生图 / 图改图，一个工具',
    tool: 'image_generate',
    architecture:
      'Provider 插件制：plugins/image_gen/<name>/ 内置，用户可放 ~/.hermes/plugins/ 覆盖。provider 通过 PluginContext.register_image_gen_provider() 注册，image_gen.provider 配置选型，所有 image_generate 调用都路由到当前 provider。',
    configKey: 'image_gen.provider',
    sourceRef: 'agent/image_gen_provider.py',
    notes: [
      '统一接口：有没有传 image_url 决定走文生图还是图改图',
      '与 video_gen 同一套设计，两个面一起学习成本减半',
      '用户只选模型，provider 决定打哪个底层 endpoint',
    ],
  },
  {
    id: 'video-gen',
    name: '视频生成',
    tagline: '参考图生视频',
    tool: 'video_generate',
    architecture:
      '与 image_gen 镜像的 provider 插件面：参考图驱动，provider 各自的编辑能力被统一在同一工具签名后面。',
    configKey: 'video_gen.provider',
    sourceRef: 'agent/video_gen_provider.py',
    notes: ['image_url 可作参考图', 'provider 特定的编辑/延长时间能力'],
  },
  {
    id: 'tts',
    name: '语音合成',
    tagline: '让 agent 开口说话',
    tool: 'tts',
    architecture:
      'tts_tool + NeuTTS 合成（neutts_synth.py）：把回复文本渲染成语音，主要服务网关场景——在 Telegram 里收到的是语音消息而不是文字。',
    configKey: 'tts.*',
    sourceRef: 'tools/tts_tool.py',
    notes: ['neutts_samples/ 提供音色样本', '配置段 tts 控制开关与音色'],
  },
  {
    id: 'stt',
    name: '语音转写',
    tagline: '听懂用户发来的语音',
    tool: '（网关内部能力）',
    architecture:
      '你在 Telegram 发语音，网关先做语音转写（STT）变成文本，再进入统一的消息流——对 agent 主循环完全透明，它看到的永远是文本。',
    configKey: 'stt.*',
    sourceRef: 'gateway/（消息流转，见第 11 章）',
    notes: ['转写发生在 adapter/session 层', '与 TTS 组合成完整的语音对话闭环'],
  },
];

// 「统一接口」互动：image_generate 如何按入参路由
export const UNIFIED_SURFACE = {
  tool: 'image_generate(prompt, image_url?, reference_image_urls?)',
  routes: [
    {
      id: 't2i',
      condition: '不提供任何参考图',
      route: 'text-to-image endpoint',
      desc: '纯文生图：只有 prompt，provider 路由到自家的文生图端点。',
    },
    {
      id: 'i2i',
      condition: '提供 image_url / reference_image_urls',
      route: 'image-to-image / edit endpoint',
      route_extra: '',
      desc: '有源图即图改图：provider 自动切到图改图/编辑端点——用户不需要知道两个端点的存在。',
    },
  ] as { id: string; condition: string; route: string; route_extra?: string; desc: string }[],
};

// ── 英文版（结构与上方中文导出一一对应） ─────────────────────────

export const MULTIMODAL_INTRO_EN =
  'The Hermes agent loop only handles text, but the agent’s senses go beyond text: seeing images, ' +
  'generating images, generating video, speaking, and transcribing. These capabilities all follow ' +
  'the same architectural principle — the loop stays unchanged, and multimodality grows on the ' +
  'edges as tools / provider plugins. This chapter takes each one apart to see how it’s wired in.';

export const MODALITIES_EN: Modality[] = [
  {
    id: 'vision',
    name: 'Vision understanding',
    tagline: 'Let the agent look at images',
    tool: 'vision_analyze',
    architecture:
      'It bypasses the main model and goes through Chapter 30’s auxiliary vision routing: download the image, convert to base64, hand it to the vision backend chosen by the resolution chain, and clean up temp files automatically. The loop only receives a textual conclusion — the context is never bloated by images.',
    configKey: 'auxiliary.vision.*',
    sourceRef: 'tools/vision_tools.py',
    notes: [
      'Input is an image URL + a custom prompt',
      'Local vision models (Qwen-VL/LLaVA) can go through a custom endpoint',
      'Oversized images are self-rescued by the compression layer via re-encoding (Chapter 29)',
    ],
  },
  {
    id: 'image-gen',
    name: 'Image generation',
    tagline: 'Text-to-image / image editing, one tool',
    tool: 'image_generate',
    architecture:
      'Provider-plugin based: plugins/image_gen/<name>/ ships built-ins, and users can drop overrides into ~/.hermes/plugins/. A provider registers via PluginContext.register_image_gen_provider(), image_gen.provider selects which one is active, and every image_generate call is routed to the current provider.',
    configKey: 'image_gen.provider',
    sourceRef: 'agent/image_gen_provider.py',
    notes: [
      'Unified interface: whether image_url is passed decides text-to-image vs image editing',
      'Same design as video_gen — learn one surface and the other comes free',
      'The user only picks a model; the provider decides which underlying endpoint to call',
    ],
  },
  {
    id: 'video-gen',
    name: 'Video generation',
    tagline: 'Reference-image-driven video',
    tool: 'video_generate',
    architecture:
      'A provider-plugin surface mirroring image_gen: driven by reference images, with each provider’s editing capabilities unified behind the same tool signature.',
    configKey: 'video_gen.provider',
    sourceRef: 'agent/video_gen_provider.py',
    notes: [
      'image_url can serve as a reference image',
      'provider-specific editing / duration-extension capabilities',
    ],
  },
  {
    id: 'tts',
    name: 'Speech synthesis',
    tagline: 'Let the agent speak',
    tool: 'tts',
    architecture:
      'tts_tool + NeuTTS synthesis (neutts_synth.py): renders reply text into speech, mainly serving gateway scenarios — what arrives in Telegram is a voice message, not text.',
    configKey: 'tts.*',
    sourceRef: 'tools/tts_tool.py',
    notes: [
      'neutts_samples/ provides voice samples',
      'the tts config section controls the switch and the voice',
    ],
  },
  {
    id: 'stt',
    name: 'Speech transcription',
    tagline: 'Understand the voice messages users send',
    tool: '(gateway-internal capability)',
    architecture:
      'You send a voice message in Telegram; the gateway transcribes it (STT) into text first, then feeds it into the unified message stream — completely transparent to the agent loop, which always sees text.',
    configKey: 'stt.*',
    sourceRef: 'gateway/ (message flow, see Chapter 11)',
    notes: [
      'Transcription happens at the adapter/session layer',
      'Combines with TTS into a complete voice conversation loop',
    ],
  },
];

// 「统一接口」互动：image_generate 如何按入参路由
export const UNIFIED_SURFACE_EN: typeof UNIFIED_SURFACE = {
  tool: 'image_generate(prompt, image_url?, reference_image_urls?)',
  routes: [
    {
      id: 't2i',
      condition: 'No reference image provided',
      route: 'text-to-image endpoint',
      desc: 'Pure text-to-image: only a prompt, and the provider routes to its own text-to-image endpoint.',
    },
    {
      id: 'i2i',
      condition: 'image_url / reference_image_urls provided',
      route: 'image-to-image / edit endpoint',
      route_extra: '',
      desc: 'A source image means image editing: the provider automatically switches to its image-to-image / edit endpoint — the user never needs to know two endpoints exist.',
    },
  ],
};

// MultimodalLab 专属 UI 文案（中英对）。
export const MULTIMODAL_UI = {
  toolPrefix: { zh: '工具：', en: 'Tool: ' },
  configPrefix: { zh: '配置：', en: 'Config: ' },
  sourcePrefix: { zh: '源码：', en: 'Source: ' },
  unifiedKicker: { zh: '统一接口', en: 'UNIFIED INTERFACE' },
  unifiedTitle: { zh: '一个工具，两种路由', en: 'One tool, two routes' },
  unifiedNote: {
    zh: '——有没有源图决定一切。切换条件看看路由怎么变：',
    en: '— a source image changes everything. Toggle the condition to see how the route changes:',
  },
  routePrefix: { zh: '→ 路由到 ', en: '→ Routed to ' },
};
