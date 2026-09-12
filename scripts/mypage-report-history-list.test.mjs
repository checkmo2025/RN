import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const screen = readFileSync(
  new URL('../src/screens/MyPageScreen.tsx', import.meta.url),
  'utf8',
);
const accountState = readFileSync(
  new URL('../src/screens/mypage/useAccountSettingsState.ts', import.meta.url),
  'utf8',
);

const reportBranch = screen.slice(
  screen.indexOf("if (showSettings && selectedSetting === 'report')"),
  screen.indexOf('if (showSettings) {', screen.indexOf("if (showSettings && selectedSetting === 'report')") + 1),
);
const reportRenderer = screen.slice(
  screen.indexOf('const renderReportHistoryItem'),
  screen.indexOf('const renderReportHistoryStatus'),
);

test('uses a dedicated FlatList with the original report order and identity', () => {
  assert.match(reportBranch, /<FlatList/);
  assert.match(reportBranch, /data=\{reportHistory\}/);
  assert.match(reportBranch, /keyExtractor=\{\(report\) => report\.id\}/);
  assert.match(reportBranch, /renderItem=\{renderReportHistoryItem\}/);
  assert.doesNotMatch(screen, /reportHistory\.map\(\(report\)/);
});

test('preserves report content and target navigation', () => {
  for (const token of [
    'report.reportType',
    'report.targetTypeLabel',
    'report.targetImageUrl',
    'report.targetDisplayName',
    'report.createdAtLabel',
    'formatReportContent(report.content)',
    'handlePressReportHistory(report)',
  ]) {
    assert.ok(reportRenderer.includes(token), `missing report behavior: ${token}`);
  }
});

test('preserves loading, error and empty states before list rows', () => {
  const header = screen.slice(
    screen.indexOf('const renderReportHistoryStatus'),
    screen.indexOf('const handleWriteStory'),
  );
  assert.match(header, /loadingReportHistory/);
  assert.match(header, /\[0, 1, 2\]\.map/);
  assert.match(header, /reportHistoryErrorMessage/);
  assert.match(header, /신고한 내역이 없습니다\./);
  assert.match(reportBranch, /ListHeaderComponent=\{renderReportHistoryHeader\(\)\}/);
});

test('keeps report collection and mapping outside the rendering change', () => {
  assert.match(accountState, /const reports = await fetchMyReports\(\)/);
  assert.match(accountState, /setReportHistory\(mapReportItems\(reports\)\)/);
  assert.match(accountState, /setReportHistory\(\[\]\)/);
  assert.match(accountState, /setReportHistoryErrorMessage\(message\)/);
});

test('keeps other settings on their existing ScrollView', () => {
  const genericSettings = screen.slice(
    screen.indexOf('if (showSettings) {', screen.indexOf("if (showSettings && selectedSetting === 'report')") + 1),
    screen.indexOf('if (submittingLogout)'),
  );
  assert.match(genericSettings, /<ScrollView/);
  assert.match(genericSettings, /renderSettingDetail\(\)/);
});
