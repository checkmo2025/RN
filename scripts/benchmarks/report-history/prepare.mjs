import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { relative, resolve } from 'node:path';
import ts from 'typescript';

const root = resolve(import.meta.dirname, '../../..');
const output = resolve(root, '.expo/report-history-benchmark');
const screenPath = 'src/screens/MyPageScreen.tsx';
const beforeRef = 'bb46891';
const variants = {
  before: execFileSync('git', ['show', `${beforeRef}:${screenPath}`], {
    cwd: root,
    encoding: 'utf8',
  }),
  after: readFileSync(resolve(root, screenPath), 'utf8'),
};
const parse = (name, text) =>
  ts.createSourceFile(name, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const nodes = (source) => {
  const result = [];
  const visit = (node) => {
    result.push(node);
    ts.forEachChild(node, visit);
  };
  visit(source);
  return result;
};
const findBeforeRow = (source) => {
  const map = nodes(source).find(
    (node) =>
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      node.expression.getText(source) === 'reportHistory.map',
  );
  assert.ok(map && ts.isArrowFunction(map.arguments[0]), 'Before report row not found');
  return map.arguments[0].body.getText(source);
};
const findAfterRow = (source) => {
  const declaration = nodes(source).find(
    (node) =>
      ts.isVariableDeclaration(node) &&
      node.name.getText(source) === 'renderReportHistoryItem',
  );
  assert.ok(declaration?.initializer && ts.isCallExpression(declaration.initializer), 'After renderer not found');
  const callback = declaration.initializer.arguments[0];
  assert.ok(callback && ts.isArrowFunction(callback), 'After renderer callback not found');
  return callback.body.getText(source);
};
const sources = {
  before: parse('before.tsx', variants.before),
  after: parse('after.tsx', variants.after),
};
const rows = {
  before: findBeforeRow(sources.before),
  after: findAfterRow(sources.after),
};
const productList = nodes(sources.after).find(
  (node) =>
    ts.isJsxSelfClosingElement(node) &&
    node.tagName.getText(sources.after) === 'FlatList' &&
    node.attributes.getText(sources.after).includes('data={reportHistory}'),
);
assert.ok(productList, 'Product report FlatList not found');
const instrument = (row) =>
  row
    .replace('<Pressable', '<MeasuredReport metrics={metrics} reportId={report.id}')
    .replace('</Pressable>', '</MeasuredReport>');
const metadata = {
  refs: { before: beforeRef, after: 'working-tree' },
  sourceHashes: {
    before: createHash('sha256').update(variants.before).digest('hex'),
    after: createHash('sha256').update(variants.after).digest('hex'),
    beforeRow: createHash('sha256').update(rows.before).digest('hex'),
    afterRow: createHash('sha256').update(rows.after).digest('hex'),
  },
  fixture: 'actual report row JSX; equal static settings header; no API or remote images',
  scrollMetric: 'JS requestAnimationFrame FPS during equal up-to-1000pt, 60-step programmatic scroll',
};
mkdirSync(output, { recursive: true });

const shared = `
import { forwardRef, useImperativeHandle, useLayoutEffect, useRef } from 'react';
import { FlatList, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing, typography } from '../../src/theme';
const Image = ({ style }) => <View style={style} />;
const MaterialIcons = ({ size }) => <View style={{ width: size, height: size }} />;
const handlePressReportHistory = () => {};
const formatReportContent = (text) => text;
const SCROLL_DISTANCE = 1000;
const Header = () => <View style={{ height: 104 }} />;
function MeasuredReport({ metrics, reportId, ...props }) {
  metrics.rowRenders += 1;
  useLayoutEffect(() => { metrics.mountedIds.add(reportId); }, [metrics, reportId]);
  return <View {...props} />;
}
const styles = StyleSheet.create({
  reportList: { gap: spacing.sm },
  reportCard: { backgroundColor: colors.white, borderRadius: radius.md, borderWidth: 1, borderColor: colors.subbrown4, padding: spacing.md, gap: spacing.xs },
  reportBadgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  reportBadge: { alignSelf: 'flex-start', backgroundColor: colors.secondary1, color: colors.white, ...typography.body2_3, paddingHorizontal: spacing.sm, paddingVertical: spacing.xxs, borderRadius: radius.lg },
  reportTargetBadge: { alignSelf: 'flex-start', backgroundColor: colors.subbrown4, color: colors.primary1, ...typography.body2_3, paddingHorizontal: spacing.sm, paddingVertical: spacing.xxs, borderRadius: radius.lg },
  reportHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm },
  reportTargetInfo: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  reportAvatar: { width: 28, height: 28, borderRadius: 14, borderWidth: 1, borderColor: colors.subbrown3, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  reportAvatarImage: { width: '100%', height: '100%' },
  reportUser: { flex: 1, minWidth: 0, ...typography.body1_3, color: colors.gray6 },
  reportDate: { flexShrink: 0, ...typography.body2_3, color: colors.gray4 },
  reportText: { width: '100%', alignSelf: 'stretch', flexShrink: 1, ...typography.body2_3, color: colors.gray5 },
  pressed: { opacity: 0.8 },
});
`;

writeFileSync(
  resolve(output, 'before.tsx'),
  `${shared}
export default forwardRef(function Before({ reportHistory, metrics }, ref) {
  const listRef = useRef(null);
  useImperativeHandle(ref, () => ({
    scrollToProgress(progress) {
      const target = Math.min(SCROLL_DISTANCE, Math.max(0, metrics.contentHeight - metrics.viewportHeight));
      metrics.scrollTargetOffset = target;
      listRef.current?.scrollTo({ y: target * progress, animated: false });
    },
  }), [metrics]);
  return <ScrollView ref={listRef} style={{ flex: 1 }} contentContainerStyle={{ padding: spacing.md }}
    onLayout={(event) => { metrics.viewportHeight = event.nativeEvent.layout.height; }}
    onContentSizeChange={(_width, height) => { metrics.contentHeight = height; }}
    onScroll={() => { metrics.scrollEvents += 1; }} scrollEventThrottle={16}>
    <Header /><View style={{ height: spacing.sm }} />
    <View style={styles.reportList}>{reportHistory.map((report) => ${instrument(rows.before)})}</View>
  </ScrollView>;
});
`,
);

writeFileSync(
  resolve(output, 'after.tsx'),
  `${shared}
export default forwardRef(function After({ reportHistory, metrics }, ref) {
  const listRef = useRef(null);
  useImperativeHandle(ref, () => ({
    scrollToProgress(progress) {
      const target = Math.min(SCROLL_DISTANCE, Math.max(0, metrics.contentHeight - metrics.viewportHeight));
      metrics.scrollTargetOffset = target;
      listRef.current?.scrollToOffset({ offset: target * progress, animated: false });
    },
  }), [metrics]);
  return <FlatList ref={listRef} style={{ flex: 1 }} contentContainerStyle={{ padding: spacing.md }}
    data={reportHistory} keyExtractor={(report) => report.id}
    renderItem={({ item: report }) => ${instrument(rows.after)}}
    ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
    ListHeaderComponent={<><Header /><View style={{ height: spacing.sm }} /></>}
    onLayout={(event) => { metrics.viewportHeight = event.nativeEvent.layout.height; }}
    onContentSizeChange={(_width, height) => { metrics.contentHeight = height; }}
    onScroll={() => { metrics.scrollEvents += 1; }} scrollEventThrottle={16} />;
});
`,
);

const require = createRequire(import.meta.url);
const fileSystem = require.resolve('expo-file-system', { paths: [require.resolve('expo')] });
writeFileSync(
  resolve(output, 'index.tsx'),
  `import '../../src/theme/installGlobalStyleScale';
import { registerRootComponent } from 'expo';
import { File, Paths } from ${JSON.stringify(fileSystem)};
import Runner from '../../scripts/benchmarks/report-history/Runner';
import Before from './before';
import After from './after';
const metadata = ${JSON.stringify(metadata)};
const writeResult = (result) => new File(Paths.document, 'report-history-benchmark.json').write(JSON.stringify(result));
registerRootComponent(() => <Runner Before={Before} After={After} metadata={metadata} writeResult={writeResult} />);
`,
);
assert.equal(readFileSync(resolve(root, 'App.tsx'), 'utf8').includes('report-history-benchmark'), false);
console.log(`Benchmark entry: ${relative(root, output)}/index.tsx`);
console.log(JSON.stringify(metadata, null, 2));
