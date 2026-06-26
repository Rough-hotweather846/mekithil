/**
 * Config loader — membaca config/default.json.
 *
 * Support env var override:
 *   HERMES_BOT_MIMO_CONFIG  → path ke config file alternatif
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const configPath = process.env.HERMES_BOT_MIMO_CONFIG || join(__dirname, '..', 'config', 'default.json');
const config = JSON.parse(readFileSync(configPath, 'utf8'));

export { config, configPath };
