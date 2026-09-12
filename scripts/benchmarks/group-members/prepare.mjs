import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { relative, resolve } from 'node:path';
import ts from 'typescript';

const root = resolve(import.meta.dirname, '../../..');
const output = resolve(root, '.expo/group-members-benchmark');
const screenPath = 'src/screens/meeting/GroupManagementOverlay.tsx';
const beforeRef = '11897e9';
const variants = {
  before: execFileSync('git', ['show', `${beforeRef}:${screenPath}`], {
    cwd: root,
    encoding: 'utf8',
  }),
  after: readFileSync(resolve(root, screenPath), 'utf8'),
};
const metadata = {
  refs: { before: beforeRef, after: 'working-tree' },
  sourceHashes: {},
  imageMode: 'same-size View; no API or remote images',
};
mkdirSync(output, { recursive: true });

const parse = (text) =>
  ts.createSourceFile('Overlay.tsx', text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const allNodes = (node) => {
  const nodes = [node];
  ts.forEachChild(node, (child) => {
    nodes.push(...allNodes(child));
  });
  return nodes;
};
const instrumentCard = (code) => {
  const source = parse(code);
  const card = allNodes(source).find(
    (node) =>
      ts.isJsxElement(node) &&
      node.openingElement.attributes.getText(source).includes('styles.managementListCard') &&
      node.getText(source).includes('member.nickname'),
  );
  assert.ok(card, 'member card not found');
  const original = card.getText(source);
  const measured = original
    .replace('<View', '<MeasuredMemberCard metrics={metrics} memberId={member.id}')
    .replace(/<\/View>$/, '</MeasuredMemberCard>');
  return code.replace(original, measured);
};

for (const [variant, original] of Object.entries(variants)) {
  metadata.sourceHashes[variant] = createHash('sha256').update(original).digest('hex');
  const source = parse(original);
  const nodes = allNodes(source);
  let listCode;
  if (variant === 'before') {
    const fragment = nodes.find(
      (node) =>
        ts.isJsxFragment(node) &&
        node.getText(source).includes('members.map((member)') &&
        node.getText(source).includes('managementSummaryTitle'),
    );
    assert.ok(fragment, 'before member branch not found');
    listCode = `<ScrollView
      style={styles.managementScreenScroll}
      contentContainerStyle={[styles.managementScreenContent, { paddingBottom: managementScreenContentBottomPadding }]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      onContentSizeChange={() => { metrics.firstLayoutMs ??= performance.now() - started; }}
      refreshControl={<RefreshControl refreshing={refreshingMembers} onRefresh={handleRefreshMembers}
        tintColor={colors.primary1} colors={[colors.primary1]} />}
    >${fragment.getText(source)}</ScrollView>`;
  } else {
    const list = nodes.find(
      (node) =>
        ts.isJsxSelfClosingElement(node) &&
        node.tagName.getText(source) === 'FlatList' &&
        node.attributes.getText(source).includes('data={members}'),
    );
    assert.ok(list, 'after member FlatList not found');
    listCode = list
      .getText(source)
      .replace(
        '<FlatList',
        '<FlatList onContentSizeChange={() => { metrics.firstLayoutMs ??= performance.now() - started; }}',
      );
  }

  writeFileSync(
    resolve(output, `${variant}.tsx`),
    `// Generated from ${variant === 'before' ? beforeRef : 'working tree'}; benchmark only.
import { useLayoutEffect } from 'react';
import { FlatList, RefreshControl, ScrollView, Text, View } from 'react-native';
import { colors } from '../../src/theme';
import { styles } from '../../src/screens/meeting/meetingStyles';
import { FeedbackPressable as Pressable } from '../../src/components/common/FeedbackPressable';
const Image = ({ style }) => <View style={style} />;
const DefaultProfileAvatar = ({ size }) => <View style={{ width: size, height: size }} />;
const noop = () => {};
const l = (text, values = {}) => text.replace(/\\{(\\w+)\\}/g, (_, key) => String(values[key] ?? key));
function MeasuredMemberCard({ metrics, memberId, ...props }) {
  metrics.cardRenders += 1;
  useLayoutEffect(() => { metrics.mountedIds.add(memberId); }, [memberId, metrics]);
  return <View {...props} />;
}
export default function Fixture({ members, metrics, started }) {
  const managementScreenContentBottomPadding = 96;
  const refreshingMembers = false, submittingMemberAction = false;
  const handleRefreshMembers = noop, setSelectedMemberActionId = noop;
  return ${instrumentCard(listCode)};
}
`,
  );
}

const require = createRequire(import.meta.url);
const fileSystem = require.resolve('expo-file-system', { paths: [require.resolve('expo')] });
writeFileSync(
  resolve(output, 'index.tsx'),
  `import '../../src/theme/installGlobalStyleScale';
import { registerRootComponent } from 'expo';
import { File, Paths } from ${JSON.stringify(fileSystem)};
import Runner from '../../scripts/benchmarks/group-members/Runner';
import Before from './before';
import After from './after';
const metadata = ${JSON.stringify(metadata)};
const writeResult = (result) => new File(Paths.document, 'group-members-benchmark.json').write(JSON.stringify(result));
registerRootComponent(() => <Runner Before={Before} After={After} metadata={metadata} writeResult={writeResult} />);
`,
);
assert.equal(readFileSync(resolve(root, 'App.tsx'), 'utf8').includes('group-members-benchmark'), false);
console.log(`Benchmark entry: ${relative(root, output)}/index.tsx`);
console.log(JSON.stringify(metadata, null, 2));
