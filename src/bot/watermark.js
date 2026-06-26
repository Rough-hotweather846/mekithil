/**
 * Watermark & branding. Hardcoded — tidak bisa diedit tanpa modifikasi source.
 */

import { existsSync, readFileSync } from 'fs';
import { execSync } from 'child_process';

const BRAND = {
  name: 'MiMo Chain Bot',
  version: '2.1.0',
  author: 'masantoid',
  github: 'https://github.com/hirotomasato/mekithil',
};

const REPO_SLUG = 'hirotomasato/mekithil';

function checkIntegrity() {
  let valid = false;
  try {
    // Cek folder .git exists & remote origin match
    if (existsSync('.git')) {
      const remote = execSync('git remote get-url origin 2>/dev/null || echo ""', {
        encoding: 'utf8', timeout: 3000, stdio: ['pipe', 'pipe', 'pipe'],
      });
      valid = remote.includes(REPO_SLUG);
    }
  } catch (e) {
    // Non-git environment — still works
  }
  return { valid, ...BRAND };
}

function brandHeader() {
  return `🔷 *${BRAND.name}* v${BRAND.version}  |  ${BRAND.github}`;
}

function brandFooter(repoValid) {
  return repoValid ? '' : '\n⚠ _Unofficial build_';
}

function aboutMessage(repoValid) {
  let text = `🤖 *${BRAND.name}*\n`;
  text += `🏷 v${BRAND.version}\n`;
  text += `👤 ${BRAND.author}\n`;
  text += `📦 [GitHub](${BRAND.github})\n`;
  text += repoValid ? `✅ Official build\n` : `⚠ Unofficial build\n`;
  return text;
}

export { BRAND, checkIntegrity, brandHeader, brandFooter, aboutMessage };
