#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const values = {};

for (let index = 0; index < args.length; index += 1) {
  const arg = args[index];
  if (!arg.startsWith('--')) continue;
  const key = arg.slice(2);
  const next = args[index + 1];
  if (!next || next.startsWith('--')) {
    values[key] = 'true';
  } else {
    values[key] = next;
    index += 1;
  }
}

function kstParts(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
    .formatToParts(now)
    .reduce((acc, part) => {
      if (part.type !== 'literal') acc[part.type] = part.value;
      return acc;
    }, {});

  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    time: `${parts.hour}:${parts.minute}:${parts.second}`,
  };
}

function escapeMarkdown(value) {
  return String(value ?? '')
    .replace(/\r?\n/g, '<br>')
    .replace(/\|/g, '\\|');
}

function escapeCsv(value) {
  const text = String(value ?? '');
  if (!/[",\r\n]/.test(text)) return text;
  return `"${text.replace(/"/g, '""')}"`;
}

const { date, time } = kstParts();
const suite = values.suite || values.test || 'E2E Test';
const platform = values.platform || '-';
const flow = values.flow || '-';
const result = values.result || 'unknown';
const errorCount = Number.parseInt(values.errors || values.errorCount || '0', 10) || 0;
const errorItems = values['error-items'] || values.errorItems || '-';
const notes = values.notes || '-';
const outputDir = values.outputDir || 'docs/e2e-reports';

fs.mkdirSync(outputDir, { recursive: true });

const mdPath = path.join(outputDir, `${date}-e2e-report.md`);
const csvPath = path.join(outputDir, `${date}-e2e-report.csv`);

const title = `# ${date} ${time} KST E2E 테스트 리포트 - ${suite} - 오류항목 ${errorCount}개`;
const mdHeader = [
  title,
  '',
  '| 날짜 | 시간(KST) | 테스트 | 플랫폼 | Flow | 결과 | 오류항목 개수 | 오류항목 | 비고 |',
  '| --- | --- | --- | --- | --- | --- | ---: | --- | --- |',
].join('\n');

const mdRow = `| ${escapeMarkdown(date)} | ${escapeMarkdown(time)} | ${escapeMarkdown(suite)} | ${escapeMarkdown(platform)} | ${escapeMarkdown(flow)} | ${escapeMarkdown(result)} | ${errorCount} | ${escapeMarkdown(errorItems)} | ${escapeMarkdown(notes)} |`;

if (!fs.existsSync(mdPath)) {
  fs.writeFileSync(mdPath, `${mdHeader}\n${mdRow}\n`, 'utf8');
} else {
  fs.appendFileSync(mdPath, `${mdRow}\n`, 'utf8');
}

const csvHeader = [
  '날짜',
  '시간(KST)',
  '테스트',
  '플랫폼',
  'Flow',
  '결과',
  '오류항목 개수',
  '오류항목',
  '비고',
].join(',');
const csvRow = [
  date,
  time,
  suite,
  platform,
  flow,
  result,
  String(errorCount),
  errorItems,
  notes,
]
  .map(escapeCsv)
  .join(',');

if (!fs.existsSync(csvPath)) {
  fs.writeFileSync(csvPath, `${csvHeader}\n${csvRow}\n`, 'utf8');
} else {
  fs.appendFileSync(csvPath, `${csvRow}\n`, 'utf8');
}

console.log(`Markdown report: ${mdPath}`);
console.log(`CSV report: ${csvPath}`);
