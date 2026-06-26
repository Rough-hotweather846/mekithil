/**
 * Proxy Manager — Multi-proxy pool dengan smart rotation.
 *
 * Format proxy yang didukung:
 *   "ip:port:user:pass"  (paling umum)
 *   "ip:port:user"       (pass kosong — jarang)
 *   "ip:port"            (tanpa auth)
 *   "http://user:pass@host:port" (URL format)
 *
 * Fitur:
 *   - Pool rotation: tiap iterasi ambil proxy berbeda (round-robin)
 *   - Random shuffle setiap putaran penuh biar gak predictable
 *   - Skip proxy mati, auto retry ke proxy berikutnya
 *   - Optional: proxy country detection → match locale/timezone fingerprint
 */

const PROXY_COUNTRY_MAP = {
  US: { locales: ['en-US'], timezones: ['America/New_York', 'America/Chicago', 'America/Los_Angeles'] },
  ID: { locales: ['id-ID'], timezones: ['Asia/Jakarta', 'Asia/Makassar', 'Asia/Jayapura'] },
  SG: { locales: ['en-SG', 'en-US'], timezones: ['Asia/Singapore'] },
  MY: { locales: ['en-US', 'ms-MY'], timezones: ['Asia/Kuala_Lumpur'] },
  TH: { locales: ['th-TH', 'en-US'], timezones: ['Asia/Bangkok'] },
  PH: { locales: ['en-PH', 'en-US'], timezones: ['Asia/Manila'] },
  VN: { locales: ['vi-VN', 'en-US'], timezones: ['Asia/Ho_Chi_Minh'] },
  GB: { locales: ['en-GB'], timezones: ['Europe/London'] },
  AU: { locales: ['en-AU'], timezones: ['Australia/Sydney'] },
  CA: { locales: ['en-CA', 'en-US'], timezones: ['America/Toronto', 'America/Vancouver'] },
};

/**
 * Parse proxy string ke object Playwright proxy config.
 * Support formats: "ip:port:user:pass", "ip:port:user", "ip:port"
 */
function parseProxy(raw) {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  // URL format: http://user:pass@host:port
  if (trimmed.startsWith('http://') || trimmed.startsWith('socks5://')) {
    return { server: trimmed };
  }

  // ip:port:user:pass format
  const parts = trimmed.split(':');
  if (parts.length === 4) {
    const [ip, port, username, password] = parts;
    return {
      server: `http://${ip}:${port}`,
      username,
      password,
    };
  }
  if (parts.length === 3) {
    const [ip, port, username] = parts;
    return {
      server: `http://${ip}:${port}`,
      username,
    };
  }
  if (parts.length === 2) {
    return { server: `http://${parts[0]}:${parts[1]}` };
  }

  return null;
}

class ProxyManager {
  /**
   * @param {string[]} proxyList — array of raw proxy strings
   * @param {object} options
   * @param {boolean} options.rotatePerAccount — round-robin per iterasi (default: true)
   * @param {string} options.defaultCountry — fallback country code (default: 'US')
   * @param {number} options.maxRetries — max retry ke proxy berikutnya kalau gagal (default: 3)
   */
  constructor(proxyList = [], options = {}) {
    this.proxies = proxyList.map(raw => ({
      raw,
      config: parseProxy(raw),
      failures: 0,
      lastUsed: 0,
    })).filter(p => p.config !== null);

    this.rotatePerAccount = options.rotatePerAccount !== false;
    this.defaultCountry = options.defaultCountry || 'US';
    this.maxRetries = options.maxRetries || 3;
    this.index = 0;
    this.totalGets = 0;

    // Shuffle awal biar gak sequential
    this._shuffle();
  }

  get count() {
    return this.proxies.length;
  }

  get healthyCount() {
    return this.proxies.filter(p => p.failures < this.maxRetries).length;
  }

  /**
   * Ambil proxy berikutnya. Auto-skip yang mati.
   * Kalau semua mati, reset failures + mulai dari awal.
   */
  getNext() {
    if (this.proxies.length === 0) return null;

    this.totalGets++;

    // Coba maksimal sepanjang pool
    for (let i = 0; i < this.proxies.length; i++) {
      const proxy = this.proxies[this.index];

      // Round-robin index
      this.index = (this.index + 1) % this.proxies.length;

      // Reset failures kalau sudah 5 menit sejak terakhir dipakai
      if (proxy.lastUsed > 0 && (Date.now() - proxy.lastUsed > 300000)) {
        proxy.failures = 0;
      }

      if (proxy.failures >= this.maxRetries) {
        continue; // Skip, proxy ini lagi jelek
      }

      proxy.lastUsed = Date.now();
      return proxy.config;
    }

    // Semua proxy mati — reset & coba lagi
    console.log('  [Proxy] All proxies marked bad, resetting failures...');
    this.proxies.forEach(p => { p.failures = 0; });

    // Kembalikan proxy pertama setelah reset
    const proxy = this.proxies[0];
    this.index = 1;
    proxy.lastUsed = Date.now();
    return proxy.config;
  }

  /**
   * Laporkan proxy gagal → skip di putaran berikutnya
   */
  reportFailure(config) {
    const proxy = this.proxies.find(p =>
      p.config && p.config.server === config.server &&
      p.config.username === config.username
    );
    if (proxy) {
      proxy.failures++;
      console.log(`  [Proxy] Marked ${config.server} as failed (${proxy.failures}/${this.maxRetries})`);
    }
  }

  /**
   * Dapetin fingerprint locale/timezone suggestion berdasarkan proxy country.
   * (Country detection butuh API eksternal — ini placeholder yang bisa di-extend)
   */
  getFingerprintHint(countryCode) {
    const country = (countryCode || this.defaultCountry).toUpperCase();
    const map = PROXY_COUNTRY_MAP[country] || PROXY_COUNTRY_MAP[this.defaultCountry];
    return {
      locale: map.locales[Math.floor(Math.random() * map.locales.length)],
      timezone: map.timezones[Math.floor(Math.random() * map.timezones.length)],
    };
  }

  status() {
    const healthy = this.healthyCount;
    const total = this.count;
    const dead = this.proxies.filter(p => p.failures >= this.maxRetries).length;
    return { total, healthy, dead, nextIndex: this.index };
  }

  _shuffle() {
    // Fisher-Yates
    for (let i = this.proxies.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.proxies[i], this.proxies[j]] = [this.proxies[j], this.proxies[i]];
    }
  }
}

export { ProxyManager, parseProxy, PROXY_COUNTRY_MAP };
