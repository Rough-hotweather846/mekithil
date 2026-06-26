/**
 * Tempmail Client — Self-hosted disposable email service
 *
 * API endpoints:
 *   GET  /api/session                → { sessionId }
 *   POST /api/inboxes                → { address }  (body: { localPart } optional)
 *   GET  /api/inboxes/{addr}/messages → [ { subject, body, from_address, received_at } ]
 *
 * Auth: x-session-id header setelah session dibuat.
 */

import fetch from 'node-fetch';

class TempmailClient {
  constructor(apiUrl) {
    this.apiUrl = apiUrl;
    this.sessionId = null;
  }

  async initSession() {
    if (this.sessionId) return this.sessionId;

    const response = await fetch(`${this.apiUrl}/session`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });

    if (!response.ok) {
      throw new Error(`Failed to init session: ${response.status}`);
    }

    const data = await response.json();
    this.sessionId = data.sessionId || data.id || data.session_id;
    return this.sessionId;
  }

  async createInbox() {
    await this.initSession();

    const response = await fetch(`${this.apiUrl}/inboxes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-session-id': this.sessionId
      },
      body: JSON.stringify({})  // kosongkan untuk random inbox
    });

    if (!response.ok) {
      throw new Error(`Tempmail API error: ${response.status}`);
    }

    const data = await response.json();
    return data.address;
  }

  async getMessages(address, maxWait = 120000, interval = 5000) {
    const startTime = Date.now();

    while (Date.now() - startTime < maxWait) {
      const headers = { 'Content-Type': 'application/json' };
      if (this.sessionId) {
        headers['x-session-id'] = this.sessionId;
      }

      try {
        const response = await fetch(`${this.apiUrl}/inboxes/${address}/messages`, {
          method: 'GET',
          headers: headers
        });

        if (response.ok) {
          const messages = await response.json();
          if (messages && messages.length > 0) {
            return messages;
          }
        } else {
          console.log(`  [Tempmail] Poll warning: HTTP ${response.status} ${response.statusText}`);
        }
      } catch (err) {
        console.log(`  [Tempmail] Fetch error: ${err.message}`);
      }

      await new Promise(resolve => setTimeout(resolve, interval));
    }

    throw new Error('Timeout waiting for email');
  }

  extractVerificationCode(messages) {
    for (const msg of messages) {
      const subject = msg.subject || '';
      const body = msg.body || msg.text || '';
      const content = subject + ' ' + body;

      // Common verification code patterns
      const patterns = [
        /verification code[:\s]+([0-9]{4,8})/i,
        /code[:\s]+([0-9]{4,8})/i,
        /([0-9]{6})/,  // 6-digit code
      ];

      for (const pattern of patterns) {
        const match = content.match(pattern);
        if (match) {
          return match[1];
        }
      }
    }

    throw new Error('Could not extract verification code from emails');
  }
}

export { TempmailClient };
