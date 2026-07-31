#!/usr/bin/env node

'use strict';

const fs = require('fs');
const path = require('path');

const RESULTS_FILE = path.join(__dirname, '..', 'results.json');

// Tests that are intentionally failing — known findings.
// Build is NOT considered broken when only these fail.
// Update this list when a finding is fixed or a new one is added.
const EXPECTED_FAILURES = [
  'SECURITY: unauthenticated request returned 200',
  'SECURITY: malformed token caused server error instead of clean 401',
  'Negative price is rejected (400 or 422)',
  'Negative quantity is rejected (400 or 422)'
];

if (!fs.existsSync(RESULTS_FILE)) {
  console.error('ERROR: results.json not found. Run newman first.');
  process.exit(1);
}

const results = JSON.parse(fs.readFileSync(RESULTS_FILE, 'utf8'));
const failures = results.run.failures || [];
const stats = results.run.stats;

console.log('');
console.log('='.repeat(60));
console.log('Newman results check');
console.log('='.repeat(60));
console.log(`Requests   : ${stats.requests.total}`);
console.log(`Assertions : ${stats.assertions.total} total, ${stats.assertions.failed} failed`);
console.log('');

const unexpected = [];
const expected   = [];
const foundExpected = new Set();

for (const failure of failures) {
  const testName    = failure.error.test;
  const requestName = failure.source.name;
  const folder      = (failure.parent && failure.parent.name) || '';
  const message     = failure.error.message || '';

  if (EXPECTED_FAILURES.includes(testName)) {
    foundExpected.add(testName);
    expected.push({ testName, requestName, folder });
  } else {
    unexpected.push({ testName, requestName, folder, message });
  }
}

// Expected failures that are no longer failing — findings may have been resolved
const resolved = EXPECTED_FAILURES.filter(name => !foundExpected.has(name));

if (expected.length > 0) {
  console.log(`[known]    ${expected.length} expected failure(s) — documented findings, build not affected:`);
  for (const f of expected) {
    console.log(`           ${f.folder} / ${f.requestName}`);
    console.log(`           → "${f.testName}"`);
  }
  console.log('');
}

if (resolved.length > 0) {
  console.log(`[resolved] ${resolved.length} previously expected failure(s) are now passing:`);
  for (const name of resolved) {
    console.log(`           → "${name}"`);
  }
  console.log('           Review known-limitations.md — findings may have been fixed upstream.');
  console.log('');
}

if (unexpected.length > 0) {
  console.error(`[FAIL]     ${unexpected.length} UNEXPECTED failure(s) detected:`);
  for (const f of unexpected) {
    console.error(`           ${f.folder} / ${f.requestName}`);
    console.error(`           → "${f.testName}"`);
    if (f.message) console.error(`              ${f.message}`);
  }
  console.error('');
  console.error('Build FAILED — unexpected test failures must be investigated.');
  console.error('='.repeat(60));
  process.exit(1);
}

console.log('[pass]     All assertions pass (excluding known findings).');
console.log('Build OK.');
console.log('='.repeat(60));
process.exit(0);
