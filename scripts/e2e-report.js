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

function splitList(value) {
  return String(value || '')
    .split(';')
    .map((item) => item.trim())
    .filter(Boolean);
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
const outputDir = values.outputDir || 'tests/e2e/reports';

function parseMarkdownTableRow(line) {
  if (!line.startsWith('|')) return null;
  const cells = line
    .slice(1, -1)
    .split('|')
    .map((cell) => cell.trim());
  return cells;
}

function readCatalogItems(catalogPath) {
  const content = fs.readFileSync(catalogPath, 'utf8');
  const rows = [];
  let section = '';

  for (const line of content.split(/\r?\n/)) {
    const sectionMatch = line.match(/^##\s+(.+)$/);
    if (sectionMatch) {
      section = sectionMatch[1].trim();
      continue;
    }

    const cells = parseMarkdownTableRow(line);
    if (!cells || cells.length < 4) continue;
    if (cells[0] === 'Area' || cells[0].startsWith('---')) continue;

    rows.push({
      section,
      area: cells[0],
      test: cells[1],
      status: cells[2],
      notes: cells[3],
    });
  }

  return rows;
}

function itemKey(item) {
  return `${item.section}|${item.area}|${item.test}`;
}

function localFullSmokePassKeys() {
  return [
    'Smoke / App Shell|Launch|App cold launch reaches Home',
    'Smoke / App Shell|Tabs|Home, Meeting, Story, News, My tab entry',
    'Auth|Login|Email/nickname login success',
    'Auth|Session|App restart keeps login',
    'Meeting|Discover|Meeting tab renders recommendations/search',
    'News|List|News tab renders list/promotions',
    'My Page / Settings|Guest|My tab opens login',
  ];
}

function resultForItem(item, passSet, failSet) {
  const key = itemKey(item);
  if (passSet.has(key)) return 'PASS';
  if (failSet.has(key)) return 'FAIL';
  if (/Needs (data|permission|selector|Android|mock)/.test(item.status)) return 'BLOCKED';
  return 'NOT RUN';
}

function writeFullMatrixReport() {
  const catalogPath = values.catalog || 'tests/e2e/reports/e2e-test-catalog.md';
  const suite = values.suite || values.test || 'E2E Full Matrix';
  const platform = values.platform || '-';
  const preset = values.preset || '';
  const passKeys = new Set(splitList(values.pass || values.passed));
  const failKeys = new Set(splitList(values.fail || values.failed));

  if (preset === 'local-full-smoke') {
    for (const key of localFullSmokePassKeys()) passKeys.add(key);
  }

  const items = readCatalogItems(catalogPath);
  const resultRows = items.map((item) => ({
    ...item,
    result: resultForItem(item, passKeys, failKeys),
  }));

  const counts = resultRows.reduce(
    (acc, item) => {
      acc[item.result] += 1;
      return acc;
    },
    { PASS: 0, FAIL: 0, 'NOT RUN': 0, BLOCKED: 0 },
  );

  fs.mkdirSync(outputDir, { recursive: true });

  const baseName = `${date}-e2e-full-matrix`;
  const mdPath = path.join(outputDir, `${baseName}.md`);
  const csvPath = path.join(outputDir, `${baseName}.csv`);

  const mdLines = [
    `# ${date} ${time} KST E2E 전체 기능 결과표 - ${suite}`,
    '',
    `- Platform: ${platform}`,
    `- Source catalog: \`${catalogPath}\``,
    `- Result counts: PASS ${counts.PASS}, FAIL ${counts.FAIL}, NOT RUN ${counts['NOT RUN']}, BLOCKED ${counts.BLOCKED}`,
    '- Rule: 실행한 기능만 PASS/FAIL로 표시하고, 실행하지 않은 기능은 NOT RUN 또는 BLOCKED로 둔다.',
    '',
    '| 날짜 | 시간(KST) | 기능영역 | 하위영역 | 테스트/기능 | 결과 | 실행가능 상태 | 비고 |',
    '| --- | --- | --- | --- | --- | --- | --- | --- |',
  ];

  for (const row of resultRows) {
    mdLines.push(
      `| ${escapeMarkdown(date)} | ${escapeMarkdown(time)} | ${escapeMarkdown(row.section)} | ${escapeMarkdown(row.area)} | ${escapeMarkdown(row.test)} | ${row.result} | ${escapeMarkdown(row.status)} | ${escapeMarkdown(row.notes)} |`,
    );
  }

  const csvHeader = [
    '날짜',
    '시간(KST)',
    '기능영역',
    '하위영역',
    '테스트/기능',
    '결과',
    '실행가능 상태',
    '비고',
  ].join(',');
  const csvRows = resultRows.map((row) => [
    date,
    time,
    row.section,
    row.area,
    row.test,
    row.result,
    row.status,
    row.notes,
  ]
    .map(escapeCsv)
    .join(','));

  fs.writeFileSync(mdPath, `${mdLines.join('\n')}\n`, 'utf8');
  fs.writeFileSync(csvPath, `${csvHeader}\n${csvRows.join('\n')}\n`, 'utf8');

  console.log(`Markdown full matrix: ${mdPath}`);
  console.log(`CSV full matrix: ${csvPath}`);
}

if (values.matrix === 'true' || values.fullMatrix === 'true' || values['full-matrix'] === 'true') {
  writeFullMatrixReport();
  process.exit(0);
}

const suite = values.suite || values.test || 'E2E Test';
const platform = values.platform || '-';
const flow = values.flow || '-';
const result = values.result || 'unknown';
const errorCount = Number.parseInt(values.errors || values.errorCount || '0', 10) || 0;
const errorItems = values['error-items'] || values.errorItems || '-';
const notes = values.notes || '-';

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
