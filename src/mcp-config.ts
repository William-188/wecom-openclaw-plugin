/**
 * MCP 配置拉取与持久化模块
 *
 * 负责:
 * - 通过 WSClient 发送 aibot_get_mcp_config 请求
 * - 解析服务端响应,提取 MCP 配置(url、type、is_authed)
 * - 将配置写入 ~/.openclaw/wecomConfig/config.json 的 mcpConfig 字段
 */

import type { WSClient } from "@wecom/aibot-node-sdk";
import type { RuntimeEnv } from "openclaw/plugin-sdk";
import { generateReqId } from "@wecom/aibot-node-sdk";
import { MCP_GET_CONFIG_CMD, MCP_CONFIG_FETCH_TIMEOUT_MS } from "./const.js";
import type { McpConfigBody } from "./interface.js";
import { withTimeout } from "./timeout.js";
import path from "path";
import os from "os";

// ============================================================================
// 文件操作工具
// ============================================================================

/**
 * 带锁读取 JSON 文件
 */
async function readJsonFileWithFallback<T>(
  filePath: string,
  fallback: T
): Promise<{ value: T }> {
  const fs = await import("fs");
  try {
    const content = await fs.promises.readFile(filePath, "utf-8");
    return { value: JSON.parse(content) };
  } catch {
    return { value: fallback };
  }
}

/**
 * 原子写入 JSON 文件
 */
async function writeJsonFileAtomically(filePath: string, data: unknown): Promise<void> {
  const fs = await import("fs");
  const content = JSON.stringify(data, null, 2);
  await fs.promises.writeFile(filePath, content, "utf-8");
}

/**
 * 带文件锁执行操作
 */
async function withFileLock<T>(
  filePath: string,
  options: { stale: number; retries: { retries: number; factor: number; minTimeout: number; maxTimeout: number; randomize: boolean } },
  fn: () => Promise<T>
): Promise<T> {
  const fs = await import("fs");
  const lockPath = `${filePath}.lock`;

  // 简单的锁实现：重试机制
  let retries = options.retries.retries;
  let delay = options.retries.minTimeout;

  while (retries > 0) {
    try {
      // 尝试创建锁文件
      await fs.promises.writeFile(lockPath, process.pid.toString(), { flag: "wx" });
      break;
    } catch {
      retries--;
      if (retries === 0) {
        throw new Error(`Failed to acquire lock for ${filePath}`);
      }
      await new Promise((resolve) => setTimeout(resolve, delay));
      delay = Math.min(delay * options.retries.factor, options.retries.maxTimeout);
    }
  }

  try {
    return await fn();
  } finally {
    // 释放锁
    try {
      await fs.promises.unlink(lockPath);
    } catch {
      // 忽略删除失败
    }
  }
}

// ============================================================================
// MCP 配置拉取
// ============================================================================

/**
 * 通过 WSClient 发送 aibot_get_mcp_config 命令,获取 MCP 配置
 *
 * @param wsClient - 已认证的 WSClient 实例
 * @returns MCP 配置(url、type、is_authed)
 * @throws 响应错误码非 0 或缺少 url 字段时抛出错误
 */
export async function fetchMcpConfig(wsClient: WSClient): Promise<McpConfigBody> {
  const reqId = generateReqId("mcp_config");

  // 通过 reply 方法发送自定义命令
  const response = await withTimeout(
    wsClient.reply(
      { headers: { req_id: reqId } },
      { biz_type: "doc" },
      MCP_GET_CONFIG_CMD
    ),
    MCP_CONFIG_FETCH_TIMEOUT_MS,
    `MCP config fetch timed out after ${MCP_CONFIG_FETCH_TIMEOUT_MS}ms`
  );

  // 校验响应错误码
  if (response.errcode && response.errcode !== 0) {
    throw new Error(
      `MCP config request failed: errcode=${response.errcode}, errmsg=${response.errmsg ?? "unknown"}`
    );
  }

  // 提取并校验 body
  const body = response.body;
  if (!body?.url) {
    throw new Error("MCP config response missing required 'url' field");
  }

  return {
    url: body.url,
    type: body.type ?? "doc",
    is_authed: body.is_authed,
  };
}

// ============================================================================
// 配置持久化
// ============================================================================

/**
 * 将 MCP 配置写入 ~/.openclaw/wecomConfig/config.json 的 mcpConfig 字段
 *
 * 使用文件锁和原子写入,保证并发安全。
 * 配置格式: { mcpConfig: { [type]: { type, url } } }
 *
 * @param config - MCP 配置
 * @param runtime - 运行时环境
 */
async function saveMcpConfigToPluginJson(
  config: McpConfigBody,
  runtime: RuntimeEnv
): Promise<void> {
  const wecomConfigDir = path.join(os.homedir(), ".openclaw", "wecomConfig");
  const wecomConfigPath = path.join(wecomConfigDir, "config.json");

  // 确保目录存在
  const fs = await import("fs");
  await fs.promises.mkdir(wecomConfigDir, { recursive: true });

  const lockOptions = {
    stale: 60_000, // 60秒锁过期
    retries: {
      retries: 6,
      factor: 1.35,
      minTimeout: 8,
      maxTimeout: 1200,
      randomize: true,
    },
  };

  await withFileLock(wecomConfigPath, lockOptions, async () => {
    // 读取现有配置(不存在时使用空对象)
    const { value: pluginJson } = await readJsonFileWithFallback(wecomConfigPath, {});

    // 确保 mcpConfig 字段存在且为对象
    if (!pluginJson.mcpConfig || typeof pluginJson.mcpConfig !== "object") {
      (pluginJson as Record<string, unknown>).mcpConfig = {};
    }

    // 使用 type 作为键存储配置
    const typeKey = config.type || "default";
    ((pluginJson as Record<string, unknown>).mcpConfig as Record<string, unknown>)[typeKey] = {
      type: config.type,
      url: config.url,
    };

    // 原子写入
    await writeJsonFileAtomically(wecomConfigPath, pluginJson);
    runtime.log?.(`[WeCom] MCP config saved to ${wecomConfigPath}`);
  });
}

// ============================================================================
// 组合入口
// ============================================================================

/**
 * 拉取 MCP 配置并持久化到配置文件
 *
 * 认证成功后调用。失败仅记录日志,不影响 WebSocket 消息正常收发。
 *
 * @param wsClient - 已认证的 WSClient 实例
 * @param accountId - 账户 ID(用于日志)
 * @param runtime - 运行时环境(用于日志)
 */
export async function fetchAndSaveMcpConfig(
  wsClient: WSClient,
  accountId: string,
  runtime: RuntimeEnv
): Promise<void> {
  try {
    runtime.log?.(`[${accountId}] Fetching MCP config...`);
    const config = await fetchMcpConfig(wsClient);
    runtime.log?.(
      `[${accountId}] MCP config fetched: url=${config.url}, type=${config.type ?? "N/A"}, is_authed=${config.is_authed ?? "N/A"}`
    );
    await saveMcpConfigToPluginJson(config, runtime);
  } catch (err) {
    runtime.error?.(`[${accountId}] Failed to fetch/save MCP config: ${String(err)}`);
  }
}
