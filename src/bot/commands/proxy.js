/**
 * /proxies, /addproxy, /delproxy commands. Auto-clean chat.
 */

import { proxyMenu, proxyListKeyboard, proxyAddPrompt, proxyDeleteList, backOnly } from '../ui/keyboard.js';
import { writeFileSync } from 'fs';

let proxyManager = null;
let configPath = null;

function setProxyManager(pm, cfgPath) { proxyManager = pm; configPath = cfgPath; }

function _saveConfig(config) {
  if (configPath) writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n', 'utf8');
}

// Clean reply: hapus msg lama, kirim baru
async function cleanReply(ctx, text, markup) {
  try { await ctx.deleteMessage(); } catch (e) {}
  return ctx.replyWithMarkdown(text, markup);
}

// ---- /proxies — main proxy menu --------------------------------------

async function proxyMenuCommand(ctx) {
  if (!proxyManager) {
    return cleanReply(ctx, '🔌 Proxy is disabled.', backOnly('menu'));
  }
  const s = proxyManager.status();
  return cleanReply(ctx,
    `🔌 *Proxy Pool*\n\n🟢 ${s.healthy} healthy | 🔴 ${s.dead} dead | 📦 ${s.total} total`,
    proxyMenu(proxyManager)
  );
}

// ---- List proxies ----------------------------------------------------

async function proxyListAction(ctx) {
  if (!proxyManager || proxyManager.count === 0) { await ctx.answerCbQuery('No proxies'); return; }
  const page = parseInt(ctx.match?.[1] || 0, 10);
  const lines = proxyManager.proxies.map((p, i) => {
    const s = p.failures >= 3 ? '🔴' : '🟢';
    const ip = p.config?.server?.replace('http://', '').split(':')[0] || '?';
    return `${s} \`${ip}\` — fails: ${p.failures}`;
  });
  try { await ctx.editMessageText(lines.join('\n'), { parse_mode: 'Markdown' }); } catch (e) {}
  try { await ctx.editMessageReplyMarkup(proxyListKeyboard(proxyManager, page)); } catch (e) {}
}

// ---- Add proxy -------------------------------------------------------

async function proxyAddAction(ctx) {
  await ctx.editMessageReplyMarkup(null);
  await cleanReply(ctx,
    `➕ *Add Proxy*\n\nKirim proxy dalam format:\n\`ip:port:user:pass\`\n\nContoh:\n\`1.2.3.4:5000:username:password\``,
    proxyAddPrompt()
  );
  proxyManager._waitingForProxy = ctx.chat.id;
}

async function handleProxyText(ctx, config) {
  const text = ctx.message.text.trim();
  const parts = text.split(':');
  if (parts.length !== 4) {
    return ctx.reply('❌ Invalid format. Use: `ip:port:user:pass`', { parse_mode: 'Markdown' });
  }
  const [ip, port] = parts;
  if (!ip || !port) {
    return ctx.reply('❌ All fields required: `ip:port:user:pass`', { parse_mode: 'Markdown' });
  }

  config.proxy.proxyList.push(text);
  _saveConfig(config);

  // Rebuild pool
  const { parseProxy } = await import('../../browser/proxy.js');
  proxyManager.proxies = config.proxy.proxyList.map(raw => ({
    raw, config: parseProxy(raw), failures: 0, lastUsed: 0,
  })).filter(p => p.config !== null);
  proxyManager.index = 0;

  return ctx.reply(`✅ Proxy added: \`${ip}:${port}\`\n📦 Total: ${proxyManager.count} proxies`,
    { parse_mode: 'Markdown', ...proxyMenu(proxyManager) }
  );
}

// ---- Delete proxy ----------------------------------------------------

async function proxyDelMenuAction(ctx) {
  if (!proxyManager || proxyManager.count === 0) { await ctx.answerCbQuery('No proxies'); return; }
  return cleanReply(ctx, '🗑 *Delete proxy* — pilih:', proxyDeleteList(proxyManager));
}

async function proxyDelAction(ctx, config) {
  const idx = parseInt(ctx.match?.[1], 10);
  if (isNaN(idx) || idx < 0 || !proxyManager || idx >= proxyManager.count) {
    await ctx.answerCbQuery('Invalid proxy');
    return;
  }
  const removed = config.proxy.proxyList.splice(idx, 1)[0];
  _saveConfig(config);

  const { parseProxy } = await import('../../browser/proxy.js');
  proxyManager.proxies = config.proxy.proxyList.map(raw => ({
    raw, config: parseProxy(raw), failures: 0, lastUsed: 0,
  })).filter(p => p.config !== null);
  proxyManager.index = 0;

  const ip = removed.split(':')[0];
  await ctx.answerCbQuery(`Deleted ${ip}`);
  return cleanReply(ctx, `🗑 Deleted: \`${ip}\`\n📦 Remaining: ${proxyManager.count}`,
    proxyMenu(proxyManager));
}

export { setProxyManager, proxyMenuCommand, proxyListAction, proxyAddAction, proxyDelMenuAction, proxyDelAction, handleProxyText };
