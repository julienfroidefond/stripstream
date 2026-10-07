#!/usr/bin/env node
// Playwright E2E timing report — zero-dependency Node ESM.
// Usage: node scripts/e2e-report.mjs <playwright-json-report> [wall-clock-text]
import { readFileSync } from 'node:fs';
import process from 'node:process';

const EXCLUDED_PROJECT = 'setup';
const SLOWEST_LIMIT = 15;

function fail(message) {
  console.error(`[e2e-report] ${message}`);
  process.exit(1);
}

function testStatus(test) {
  switch (test.status) {
    case 'expected':
      return 'passed';
    case 'unexpected':
      return 'failed';
    case 'flaky':
      return 'flaky';
    case 'skipped':
      return 'skipped';
    default:
      break;
  }

  const results = Array.isArray(test.results) ? test.results : [];
  if (results.length === 0) return 'skipped';
  if (results.some((r) => r.status === 'failed' || r.status === 'timedOut')) return 'failed';
  if (results.some((r) => r.status === 'passed')) return 'passed';
  return 'skipped';
}

function collectTests(suites, tests) {
  for (const suite of suites ?? []) {
    for (const spec of suite.specs ?? []) {
      for (const test of spec.tests ?? []) {
        tests.push({
          title: spec.title ?? test.title ?? '(untitled)',
          project: test.projectName ?? '(unknown)',
          status: testStatus(test),
          duration: (test.results ?? []).reduce((sum, r) => sum + (r.duration ?? 0), 0),
        });
      }
    }
    collectTests(suite.suites, tests);
  }
}

const reportPath = process.argv[2];
if (!reportPath) {
  fail('usage: node scripts/e2e-report.mjs <playwright-json-report> [wall-clock-text]');
}

let report;
const raw = (() => {
  try {
    return readFileSync(reportPath, 'utf8');
  } catch (error) {
    return fail(`cannot read report "${reportPath}": ${error.message}`);
  }
})();
try {
  report = JSON.parse(raw);
} catch (error) {
  fail(`cannot parse JSON report "${reportPath}": ${error.message}`);
}

const allTests = [];
collectTests(report.suites, allTests);
const tests = allTests.filter((t) => t.project !== EXCLUDED_PROJECT);

const byStatus = (status) => tests.filter((t) => t.status === status).length;
const total = tests.length;
const passed = byStatus('passed');
const failed = byStatus('failed');
const flaky = byStatus('flaky');
const skipped = byStatus('skipped');
// Pinned definition: runtime count = tests with projectName != 'setup' whose status is not 'skipped'.
const runtimeCount = total - skipped;

const projects = new Map();
for (const test of tests) {
  const entry = projects.get(test.project) ?? { total: 0, passed: 0, failed: 0, flaky: 0, skipped: 0 };
  entry.total += 1;
  entry[test.status] += 1;
  projects.set(test.project, entry);
}

const slowest = [...tests].sort((a, b) => b.duration - a.duration).slice(0, SLOWEST_LIMIT);

const lines = [];
lines.push(`total tests:   ${total}`);
lines.push(`passed:        ${passed}`);
lines.push(`failed:        ${failed}`);
lines.push(`flaky:         ${flaky}`);
lines.push(`skipped:       ${skipped}`);
lines.push(`runtime count: ${runtimeCount} (executed = total - skipped)`);
lines.push('');
lines.push(`per-project counts (project "${EXCLUDED_PROJECT}" excluded):`);
if (projects.size === 0) {
  lines.push('  (none)');
} else {
  for (const [name, counts] of [...projects.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    lines.push(
      `  ${name}: total=${counts.total} passed=${counts.passed} failed=${counts.failed} flaky=${counts.flaky} skipped=${counts.skipped} runtime=${counts.total - counts.skipped}`
    );
  }
}
lines.push('');
lines.push(`slowest ${slowest.length} tests (summed results[].duration):`);
slowest.forEach((test, index) => {
  lines.push(`  ${String(index + 1).padStart(2)}. ${Math.round(test.duration)} ms — ${test.title} [${test.project}]`);
});

if (process.argv[3]) {
  lines.push('');
  lines.push(`wall-clock: ${process.argv[3]}`);
}

console.log(lines.join('\n'));
process.exit(0);
