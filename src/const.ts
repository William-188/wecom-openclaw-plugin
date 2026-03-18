/**
 * 企业微信渠道常量定义
 */

/**
 * 企业微信渠道 ID
 */
export const CHANNEL_ID = "wecom" as const;

/**
 * 企业微信 WebSocket 命令枚举
 */
export enum WeComCommand {
  /** 认证订阅 */
  SUBSCRIBE = "aibot_subscribe",
  /** 心跳 */
  PING = "ping",
  /** 企业微信推送消息 */
  AIBOT_CALLBACK = "aibot_callback",
  /** clawdbot 响应消息 */
  AIBOT_RESPONSE = "aibot_response",
}

// ============================================================================
// 超时和重试配置
// ============================================================================

/** 图片下载超时时间（毫秒） */
export const IMAGE_DOWNLOAD_TIMEOUT_MS = 30_000;

/** 文件下载超时时间（毫秒） */
export const FILE_DOWNLOAD_TIMEOUT_MS = 60_000;

/** 消息发送超时时间（毫秒） */
export const REPLY_SEND_TIMEOUT_MS = 15_000;

/** 消息处理总超时时间（毫秒） */
export const MESSAGE_PROCESS_TIMEOUT_MS = 5 * 60 * 1000;

/** WebSocket 心跳间隔（毫秒） */
export const WS_HEARTBEAT_INTERVAL_MS = 30_000;

/** WebSocket 最大重连次数 */
export const WS_MAX_RECONNECT_ATTEMPTS = 100;

// ============================================================================
// 消息状态管理配置
// ============================================================================

/** messageStates Map 条目的最大 TTL（毫秒），防止内存泄漏 */
export const MESSAGE_STATE_TTL_MS = 10 * 60 * 1000;

/** messageStates Map 清理间隔（毫秒） */
export const MESSAGE_STATE_CLEANUP_INTERVAL_MS = 60_000;

/** messageStates Map 最大条目数 */
export const MESSAGE_STATE_MAX_SIZE = 500;

// ============================================================================
// 消息模板
// ============================================================================

/** "收到"即时回复消息 */
export const RECEIVED_MESSAGE = "收到，我看看";

/** "思考中"流式消息占位内容 */
export const THINKING_MESSAGE = "<think></think>";

/** 仅包含图片时的消息占位符 */
export const MEDIA_IMAGE_PLACEHOLDER = "<media:image>";

/** 仅包含文件时的消息占位符 */
export const MEDIA_DOCUMENT_PLACEHOLDER = "<media:document>";
// ============================================================================
// 默认值
// ============================================================================

/** 默认媒体大小上限（MB） */
export const DEFAULT_MEDIA_MAX_MB = 5;

/** 文本分块大小上限 */
export const TEXT_CHUNK_LIMIT = 4000;

// ============================================================================
// 待发送消息队列配置
// ============================================================================

/** 待发送消息队列的最大长度 */
export const PENDING_QUEUE_MAX_SIZE = 100;

/** 待发送消息的过期时间（毫秒），超过此时间的消息将被丢弃 */
export const PENDING_MESSAGE_TTL_MS = 60_000;

// ============================================================================
// MCP 配置相关
// ============================================================================

/** 获取 MCP 配置的 WebSocket 命令 */
export const MCP_GET_CONFIG_CMD = "aibot_get_mcp_config";

/** MCP 配置拉取超时时间（毫秒） */
export const MCP_CONFIG_FETCH_TIMEOUT_MS = 15_000;

/** 插件配置文件名 */
export const PLUGIN_JSON_FILENAME = "openclaw.plugin.json";

// ============================================================================
// 媒体文件大小限制
// ============================================================================

/** 图片大小上限（字节）：10MB */
export const IMAGE_MAX_BYTES = 10 * 1024 * 1024;

/** 视频大小上限（字节）：10MB */
export const VIDEO_MAX_BYTES = 10 * 1024 * 1024;

/** 语音大小上限（字节）：2MB */
export const VOICE_MAX_BYTES = 2 * 1024 * 1024;

/** 文件大小上限（字节）：20MB */
export const FILE_MAX_BYTES = 20 * 1024 * 1024;

/** 文件绝对上限（字节）：超过此值无法发送，等于 FILE_MAX_BYTES */
export const ABSOLUTE_MAX_BYTES = FILE_MAX_BYTES;

/** 上传分片大小（字节，Base64 编码前）：512KB */
export const UPLOAD_CHUNK_SIZE = 512 * 1024;
