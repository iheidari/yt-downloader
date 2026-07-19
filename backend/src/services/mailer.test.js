const { test, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');

const { sendMagicLink, buildMagicLink } = require('./mailer');

// Capture console output so we can assert the dev fallback logs the link without
// actually spawning any Resend call. RESEND_API_KEY is the true external
// boundary; with it unset, sendMagicLink must never reach the network.
let logs;
let originalLog;
let savedKey;
let savedAppUrl;

beforeEach(() => {
  logs = [];
  originalLog = console.log;
  console.log = (...args) => logs.push(args.join(' '));
  savedKey = process.env.RESEND_API_KEY;
  savedAppUrl = process.env.APP_URL;
});

afterEach(() => {
  console.log = originalLog;
  if (savedKey === undefined) delete process.env.RESEND_API_KEY;
  else process.env.RESEND_API_KEY = savedKey;
  if (savedAppUrl === undefined) delete process.env.APP_URL;
  else process.env.APP_URL = savedAppUrl;
});

test('buildMagicLink points at the verify route with the encoded token', () => {
  process.env.APP_URL = 'https://tube.example.com/';
  const link = buildMagicLink('raw token/with+chars');
  assert.equal(link, 'https://tube.example.com/api/auth/verify?token=raw%20token%2Fwith%2Bchars');
});

test('sendMagicLink dev fallback logs the link and does not throw when RESEND_API_KEY is unset', async () => {
  delete process.env.RESEND_API_KEY;
  process.env.APP_URL = 'http://localhost:3001';

  await assert.doesNotReject(sendMagicLink('alice@example.com', 'raw-token'));

  const logged = logs.join('\n');
  assert.match(logged, /alice@example\.com/);
  assert.match(logged, /http:\/\/localhost:3001\/api\/auth\/verify\?token=raw-token/);
});
