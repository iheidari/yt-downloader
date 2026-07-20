const { test } = require('node:test');
const assert = require('node:assert/strict');

const { hasQuotaFor, remainingQuota, isUnlimitedQuota, UNLIMITED_QUOTA } = require('./storage');

const GB = 1024 ** 3;

test('a download fits while used + size stays within the quota', () => {
  assert.equal(hasQuotaFor(4 * GB, 5 * GB, 1 * GB), true); // exactly at the cap
  assert.equal(hasQuotaFor(4 * GB, 5 * GB, 1 * GB + 1), false); // one byte over
  assert.equal(hasQuotaFor(0, 5 * GB, 6 * GB), false);
});

test('an unlimited quota (-1) never blocks', () => {
  assert.equal(isUnlimitedQuota(UNLIMITED_QUOTA), true);
  assert.equal(hasQuotaFor(500 * GB, UNLIMITED_QUOTA, 100 * GB), true);
  assert.equal(remainingQuota(500 * GB, UNLIMITED_QUOTA), UNLIMITED_QUOTA);
});

test('unknown or zero filesize is never blocked (mirrors the disk guard)', () => {
  assert.equal(hasQuotaFor(5 * GB, 5 * GB, 0), true);
  assert.equal(hasQuotaFor(5 * GB, 5 * GB, null), true);
  assert.equal(hasQuotaFor(5 * GB, 5 * GB, undefined), true);
});

test('remaining quota never goes negative', () => {
  assert.equal(remainingQuota(2 * GB, 5 * GB), 3 * GB);
  assert.equal(remainingQuota(9 * GB, 5 * GB), 0);
});
