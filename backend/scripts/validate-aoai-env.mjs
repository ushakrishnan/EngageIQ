#!/usr/bin/env node
// scripts/validate-aoai-env.mjs
// Purpose: Validate Azure OpenAI (AOAI) environment variables and do a lightweight ping
// Usage: node ./scripts/validate-aoai-env.mjs

import fs from 'fs';
import path from 'path';
import process from 'process';

function parseEnvContent(content) {
  const lines = content.split(/\r?\n/);
  const env = {};
  for (let line of lines) {
    line = line.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    let key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    // strip surrounding quotes if present
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    // strip inline comments after the value (e.g. `AOAI  # comment`)
    const hashIndex = val.indexOf('#');
    if (hashIndex !== -1) {
      val = val.slice(0, hashIndex).trim();
    }
    env[key] = val;
  }
  return env;
}

function loadEnv() {
  const candidate = {
    AUTOTAG_PROVIDER: process.env.AUTOTAG_PROVIDER,
    AOAI_ENDPOINT: process.env.AOAI_ENDPOINT,
    AOAI_KEY: process.env.AOAI_KEY,
    AOAI_DEPLOYMENT: process.env.AOAI_DEPLOYMENT,
    AOAI_API_VERSION: process.env.AOAI_API_VERSION,
  };

  const have = Object.values(candidate).some(Boolean);
  if (have) return { source: 'process.env', env: candidate };

  const envPath = path.resolve(process.cwd(), '.env');
  if (!fs.existsSync(envPath)) {
    return { source: 'none', env: {} };
  }

  const content = fs.readFileSync(envPath, 'utf8');
  const parsed = parseEnvContent(content);
  return { source: '.env', env: parsed };
}

async function pingAoai({ endpoint, key, deployment, apiVersion }) {
  if (typeof globalThis.fetch !== 'function') {
    console.error('global fetch() is not available in this Node runtime. Node 18+ is required or install a fetch polyfill (node-fetch).');
    process.exit(2);
  }

  const urlBase = endpoint.replace(/\/+$/, '');

  // Try chat/completions first (preferred for chat-enabled deployments)
  try {
    const chatController = new AbortController();
    const chatTimeout = setTimeout(() => chatController.abort(), 10000);
    try {
      const chatUrl = `${urlBase}/openai/deployments/${encodeURIComponent(deployment)}/chat/completions?api-version=${encodeURIComponent(apiVersion)}`;
      const chatBody = {
        messages: [
          { role: 'system', content: 'EngageIQ AOAI validation ping' },
          { role: 'user', content: 'ping' }
        ],
        max_tokens: 1,
        temperature: 0.0
      };

      const chatRes = await fetch(chatUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'api-key': key },
        body: JSON.stringify(chatBody),
        signal: chatController.signal
      });

      const chatText = await chatRes.text();
      let chatParsed;
      try { chatParsed = JSON.parse(chatText); } catch (e) { chatParsed = chatText; }

      clearTimeout(chatTimeout);

      if (chatRes.ok) {
        console.log('AOAI chat ping successful. status:', chatRes.status);
        console.log('Response (truncated):', typeof chatParsed === 'string' ? chatParsed.slice(0, 100) : (JSON.stringify(chatParsed).slice(0, 200)));
        return { ok: true, status: chatRes.status };
      } else {
        console.warn('AOAI chat ping returned non-OK status:', chatRes.status);
        console.warn('Attempting completions endpoint as a fallback...');
      }
    } finally {
      try { clearTimeout(chatTimeout); } catch (err) { console.debug('[validate-aoai-env] clearTimeout failed', err) }
    }
  } catch (err) {
    if (err.name === 'AbortError') {
      console.error('AOAI chat ping timed out (10s). Is the endpoint reachable?');
    } else {
      console.error('AOAI chat ping error:', err && err.message ? err.message : err);
    }
  }

  // Try legacy completions endpoint as a fallback
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const url = `${urlBase}/openai/deployments/${encodeURIComponent(deployment)}/completions?api-version=${encodeURIComponent(apiVersion)}`;

    const body = {
      prompt: 'EngageIQ AOAI validation ping',
      max_tokens: 1
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': key
      },
      body: JSON.stringify(body),
      signal: controller.signal
    });

    clearTimeout(timeout);

    const text = await res.text();
    let parsed;
    try { parsed = JSON.parse(text); } catch(e) { parsed = text; }

    if (res.ok) {
      console.log('AOAI completions ping successful. status:', res.status);
      console.log('Response (truncated):', typeof parsed === 'string' ? parsed.slice(0, 100) : (JSON.stringify(parsed).slice(0, 200)));
      return { ok: true, status: res.status };
    } else {
      console.error('AOAI completions ping failed. status:', res.status);
      console.error('Response body:', parsed);
      return { ok: false, status: res.status, body: parsed };
    }
  } catch (err) {
    if (err.name === 'AbortError') {
      console.error('AOAI ping timed out (10s). Is the endpoint reachable?');
    } else {
      console.error('AOAI ping error:', err && err.message ? err.message : err);
    }
    return { ok: false, error: err };
  }
}

async function main() {
  const { source, env } = loadEnv();
  console.log(`Using environment from: ${source}`);

  const provider = (env.AUTOTAG_PROVIDER || '').toUpperCase();
  if (provider !== 'AOAI') {
    console.error('AUTOTAG_PROVIDER is not set to AOAI. Current value:', env.AUTOTAG_PROVIDER || '(missing)');
    console.error('Set AUTOTAG_PROVIDER=AOAI in your environment to validate AOAI settings.');
    process.exit(1);
  }

  const required = ['AOAI_ENDPOINT', 'AOAI_KEY', 'AOAI_DEPLOYMENT', 'AOAI_API_VERSION'];
  const missing = required.filter(k => !(env[k] && env[k].length));
  if (missing.length) {
    console.error('Missing required AOAI environment variables:', missing.join(', '));
    process.exit(1);
  }

  const endpoint = env.AOAI_ENDPOINT;
  const key = env.AOAI_KEY;
  const deployment = env.AOAI_DEPLOYMENT;
  const apiVersion = env.AOAI_API_VERSION;

  console.log('AOAI_ENDPOINT:', endpoint);
  console.log('AOAI_DEPLOYMENT:', deployment);
  console.log('AOAI_API_VERSION:', apiVersion);

  const result = await pingAoai({ endpoint, key, deployment, apiVersion });
  if (result.ok) {
    console.log('AOAI environment validated successfully.');
    process.exit(0);
  } else {
    console.error('AOAI environment validation failed.');
    process.exit(2);
  }
}

main();
