/**
 * /export — send chain-result.txt as file.
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { Input } from 'telegraf';

let outputDir = null;

function setOutputDir(dir) { outputDir = dir; }

async function exportCommand(ctx) {
  const filePath = join(outputDir || '.', 'chain-result.txt');

  if (!existsSync(filePath)) {
    return ctx.reply('No results yet. Run a chain first.');
  }

  const content = readFileSync(filePath, 'utf8');
  if (!content || content.trim() === '' || content.split('\n').filter(l => !l.startsWith('#') && l.trim()).length === 0) {
    return ctx.reply('Results file is empty. Run a chain first.');
  }

  await ctx.replyWithDocument(
    { source: filePath, filename: 'chain-result.txt' },
    { caption: `📤 Chain results (${new Date().toLocaleDateString()})` }
  );
}

export { setOutputDir, exportCommand };
