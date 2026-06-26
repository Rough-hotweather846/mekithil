/**
 * /chain & /stop command handlers.
 * Modern UI: animated progress bar, loading spinner, ETA, auto-clean chat.
 */

import { chainCountMenu, stopConfirmMenu, mainMenu } from '../ui/keyboard.js';
import { brandHeader, checkIntegrity } from '../watermark.js';

let runner = null;
function setRunner(r) { runner = r; }

const _INTEGRITY = checkIntegrity();

// ---- Clean reply helper: hapus msg lama, kirim baru -------------------

async function cleanReply(ctx, text, markup) {
  try {
    await ctx.deleteMessage();
  } catch (e) {
    // msg already deleted or too old — ignore
  }
  return ctx.replyWithMarkdown(text, markup);
}

async function cleanEditOrReply(ctx, text, markup) {
  try {
    await ctx.editMessageText(text, { parse_mode: 'Markdown', ...markup });
  } catch (e) {
    // edit failed — delete & send new
    try { await ctx.deleteMessage(); } catch (e2) {}
    return ctx.replyWithMarkdown(text, markup);
  }
}

// ---- /start — main menu ----------------------------------------------

function startCommand(ctx) {
  const proxyCount = runner?.proxyManager ? runner.proxyManager.status() : null;
  const proxyEnabled = runner?.config?.proxy?.enabled !== false;

  let text = `${brandHeader()}\n\n`;
  text += '_Xiaomi MiMo auto-registration_\n';
  if (proxyCount) text += `\n🔌 *Proxies*: ${proxyCount.healthy}/${proxyCount.total} healthy\n`;
  if (runner?.running) text += '⚡ *Chain running...*\n';

  return cleanReply(ctx, text, mainMenu(proxyCount, proxyEnabled));
}

// ---- /chain — show count selector ------------------------------------

function chainCommand(ctx) {
  if (runner?.running) {
    return cleanReply(ctx, '⚠ *Chain is already running.*\n\n_Gunakan ⏹ Stop untuk menghentikan._', stopConfirmMenu());
  }
  const seed = runner?.config?.xiaomi?.inviteCode || '?';
  return cleanReply(ctx, `▶ *Run Chain Loop*\n\n📌 Seed: \`${seed}\`\n\n_Pilih jumlah akun:_`, chainCountMenu(seed));
}

// ---- Progress bar helpers ---------------------------------------------

function renderProgressBar(current, total) {
  const barLen = 14;
  const filled = Math.round((current / total) * barLen);
  const empty = barLen - filled;
  return '█'.repeat(filled) + '░'.repeat(empty);
}

function renderDots(count = 0) {
  const frames = ['', '.', '..', '...'];
  return `Processing${frames[count % frames.length]}`;
}

// ---- Chain start action ------------------------------------------------

let _updateTimer = null;
let _progressMsgId = null;   // track progress message buat clean nanti

async function chainStartAction(ctx) {
  const count = parseInt(ctx.match[1], 10);  // [0]="chain_5", [1]="5"
  if (!count || count < 1 || count > 100) {
    await ctx.answerCbQuery('❌ Invalid count');
    return cleanReply(ctx, '❌ Invalid count. Use 1-100.', mainMenu());
  }

  if (!runner || runner.running) {
    await ctx.answerCbQuery('⚠ Chain is already running');
    return;
  }

  await ctx.answerCbQuery('🚀 Starting...');

  // Hapus message pilih-count, biar bersih
  try { await ctx.deleteMessage(); } catch (e) {}
  cleanupOldProgress();  // hapus progress message lama kalau ada

  const seed = runner.config.xiaomi.inviteCode;
  const chatId = ctx.chat.id;

  // Kirim progress message langsung
  const startMsg = await ctx.telegram.sendMessage(chatId,
    `🚀 *Chain Running*\n📌 Seed: \`${seed}\`\n⏱ Elapsed: 0s\n\n░░░░░░░░░░░░░░\n🔵 Processing  ·  _0/${count}_\n✅ 0 success  ·  ❌ 0 failed`,
    { parse_mode: 'Markdown' }
  );
  _progressMsgId = startMsg.message_id;

  let completedCount = 0;
  let failedCount = 0;
  let startTime = Date.now();
  const progressHistory = [];

  // Animated loading updater
  let loadingFrame = 0;
  _updateTimer = setInterval(async () => {
    if (!_progressMsgId) return;
    loadingFrame++;

    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    const elapsedStr = elapsed > 60
      ? `${Math.floor(elapsed / 60)}m ${elapsed % 60}s`
      : `${elapsed}s`;

    let text = `🚀 *Chain Running*\n`;
    text += `📌 Seed: \`${seed}\`\n`;
    text += `⏱ Elapsed: ${elapsedStr}\n`;
    text += `\n${renderProgressBar(completedCount, count)}`;
    text += `\n🔵 ${renderDots(loadingFrame)}  ·  _${completedCount + failedCount}/${count}_`;
    text += `\n✅ ${completedCount} success  ·  ❌ ${failedCount} failed`;

    if (progressHistory.length > 0) {
      text += `\n\n📋 *Latest:*\n`;
      progressHistory.slice(-6).reverse().forEach(line => { text += `${line}\n`; });
    }

    try {
      await ctx.telegram.editMessageText(chatId, _progressMsgId, null, text, { parse_mode: 'Markdown' });
    } catch (e) {
      // message gone — stop timer
    }
  }, 1500);

  // Event handlers — progress sudah langsung dikirim di atas
  const onProgress = (r) => {
    if (r.ok) {
      completedCount++;
      progressHistory.push(`✅ \`${(r.email || '').slice(0, 20)}\` → \`${r.refCode || '-'}\``);
    } else {
      failedCount++;
      progressHistory.push(`❌ \`${(r.email || '?').slice(0, 18)}\` _${(r.error || '').slice(0, 40)}_`);
    }
  };

  const onDone = async ({ okCount, failCount }) => {
    clearInterval(_updateTimer);
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    const elapsedStr = elapsed > 60
      ? `${Math.floor(elapsed / 60)}m ${elapsed % 60}s`
      : `${elapsed}s`;

    let text = '✅ *CHAIN COMPLETE*\n\n';
    text += `📌 Seed: \`${seed}\`\n`;
    text += `⏱ Total: ${elapsedStr}\n`;
    text += `\n▰▰▰▰▰▰▰▰▰▰▰▰▰▰ 100%\n`;
    text += `\n✨ *${okCount} success*  |  ❌ *${failCount} failed*\n`;
    text += `\n📤 _/export untuk download hasil_\n`;
    text += `\n_${brandHeader()}_`;

    if (_progressMsgId) {
      try { await ctx.telegram.editMessageText(chatId, _progressMsgId, null, text, { parse_mode: 'Markdown' }); } catch (e) {}
    }
    _progressMsgId = null;
    cleanup();
  };

  const onStopped = async ({ okCount, failCount }) => {
    clearInterval(_updateTimer);
    let text = '⏹ *CHAIN STOPPED*\n\n';
    text += `⏸ Dihentikan oleh admin\n`;
    text += `✨ ${okCount} success | ❌ ${failCount} failed\n`;
    text += `\n📤 _/export untuk download hasil_\n`;
    text += `\n_${brandHeader()}_`;

    if (_progressMsgId) {
      try { await ctx.telegram.editMessageText(chatId, _progressMsgId, null, text, { parse_mode: 'Markdown' }); } catch (e) {}
    }
    _progressMsgId = null;
    cleanup();
  };

  const cleanup = () => {
    runner.off('progress', onProgress);
    runner.off('done', onDone);
    runner.off('stopped', onStopped);
  };

  runner.on('progress', onProgress);
  runner.on('done', onDone);
  runner.on('stopped', onStopped);

  runner.start({ count, seedRef: seed }).catch(async (err) => {
    clearInterval(_updateTimer);
    await ctx.telegram.sendMessage(chatId, `💥 *Fatal error:* ${err.message}`, { parse_mode: 'Markdown' });
    _progressMsgId = null;
    cleanup();
  });
}

function cleanupOldProgress() {
  clearInterval(_updateTimer);
  _progressMsgId = null;
}

// ---- /stop -----------------------------------------------------------

async function stopCommand(ctx) {
  if (!runner?.running) {
    await ctx.answerCbQuery('Tidak ada chain berjalan');
    return cleanReply(ctx, '✅ Tidak ada chain yang berjalan.', mainMenu(runner?.proxyManager?.status()));
  }
  return cleanReply(ctx, '⚠ *Yakin ingin stop?*\n\n_Iterasi yang sedang berjalan akan diselesaikan dulu._', stopConfirmMenu());
}

async function stopConfirmAction(ctx) {
  if (!runner?.running) {
    await ctx.answerCbQuery('Tidak ada chain berjalan');
    return cleanEditOrReply(ctx, '✅ Tidak ada chain yang berjalan.', mainMenu(runner?.proxyManager?.status()));
  }
  await ctx.answerCbQuery('⏹ Menghentikan...');
  runner.stop();
  return cleanEditOrReply(ctx, '⏹ *Menghentikan...*\n_Menunggu iterasi saat ini selesai._', undefined);
}

export { setRunner, startCommand, chainCommand, chainStartAction, stopCommand, stopConfirmAction };
