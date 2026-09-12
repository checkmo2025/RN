import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve, relative } from 'node:path';
import ts from 'typescript';

const root = resolve(import.meta.dirname, '../../..');
const output = resolve(root, '.expo/public-library-benchmark');
const screenPath = 'src/screens/UserProfileScreen.tsx';
const refs = { before: '2de3411', after: 'f0d9b77' };
const metadata = { refs, sourceHashes: {}, imageMode: 'same-size View, no API or remote images' };
mkdirSync(output, { recursive: true });
const parse = (text) => ts.createSourceFile('Screen.tsx', text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const allNodes = (node) => {
  const nodes = [node];
  ts.forEachChild(node, (child) => { nodes.push(...allNodes(child)); });
  return nodes;
};
for (const [variant, ref] of Object.entries(refs)) {
  const original = execFileSync('git', ['show', `${ref}:${screenPath}`], { cwd: root, encoding: 'utf8' });
  metadata.sourceHashes[variant] = createHash('sha256').update(original).digest('hex');
  let source = parse(original);
  const card = allNodes(source).find((node) => ts.isJsxElement(node)
    && node.openingElement.tagName.getText(source) === 'Pressable'
    && node.openingElement.attributes.getText(source).includes('key={book.id}'));
  assert.ok(card, `${variant}: book card not found`);
  const cardCode = card.getText(source);
  source = parse(original.replace(cardCode, cardCode
    .replace('<Pressable', '<MeasuredBookPressable metrics={metrics} bookId={book.id}')
    .replace('</Pressable>', '</MeasuredBookPressable>')));
  const screen = source.statements.find((node) => node.name?.text === 'UserProfileScreen');
  const declarations = screen.body.statements.filter(ts.isVariableStatement);
  const start = declarations.findIndex((node) => node.declarationList.declarations[0].name.text === 'handleOpenStoryDetail');
  const end = declarations.findIndex((node) => node.declarationList.declarations[0].name.text === 'renderTabContent');
  const list = allNodes(screen).find((node) => ts.isJsxSelfClosingElement(node)
    && node.tagName.getText(source) === 'FlatList'
    && node.attributes.getText(source).includes('styles.mainListContent'));
  const styles = source.statements.find((node) => ts.isVariableStatement(node)
    && node.declarationList.declarations[0].name.text === 'styles');
  assert.ok(start >= 0 && end > start && list && styles);
  writeFileSync(resolve(output, `${variant}.tsx`), `// Generated from ${ref}; not part of the product entry point.
import { useCallback, useMemo, useLayoutEffect } from 'react';
import { FlatList, View, Text, RefreshControl, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, dialog, interactionOpacity, radius, spacing, typography } from '../../src/theme';
import { FeedbackPressable as Pressable } from '../../src/components/common/FeedbackPressable';
import { DefaultProfileAvatar } from '../../src/components/common/DefaultProfileAvatar';
const Image = ({style}) => <View style={style} />;
const SkeletonBox = View, LikeIcon = View, CommentIcon = View;
const BOOK_DEFAULT_IMAGE = '', tabs = ['책 이야기', '서재', '모임'];
const noop = () => {}, navigation = { navigate: noop };
const l = (text, values = {}) => text.replace(/\\{(\\w+)\\}/g, (_, key) => String(values[key] ?? key));
function MeasuredBookPressable({ metrics, bookId, ...props }) {
  metrics.cardRenders += 1;
  useLayoutEffect(() => { metrics.mountedIds.add(bookId); }, []);
  return <Pressable {...props} />;
}
export default function Fixture({ books, metrics }) {
  const stories = [], groups = [], activeTab = '서재';
  const loadingBooks = false, loadingGroups = false, profileLoading = false, refreshing = false;
  const profile = null, profileName = '공개 서재 실험', profileDesc = '동일한 프로필·책 데이터로 비교';
  const profileCategories = [], followingCount = 19, followerCount = 7, following = false, submittingFollow = false;
  const handleGoBack = noop, setProfileImageViewerVisible = noop, triggerSelectionHaptic = noop;
  const openFollowingList = noop, openFollowerList = noop, handleSubscribe = noop;
  const setShowBlockReportModal = noop, setActiveTab = noop, handleRefresh = noop;
  ${declarations.slice(start, end + 1).map((node) => node.getText(source)).join('\n')}
  return ${list.getText(source)};
}
${styles.getText(source)}
`);
}
const require = createRequire(import.meta.url);
const fileSystem = require.resolve('expo-file-system', { paths: [require.resolve('expo')] });
writeFileSync(resolve(output, 'index.tsx'), `
import '../../src/theme/installGlobalStyleScale';
import { registerRootComponent } from 'expo';
import { File, Paths } from ${JSON.stringify(fileSystem)};
import Runner from '../../scripts/benchmarks/public-library/Runner';
import Before from './before';
import After from './after';
const metadata = ${JSON.stringify(metadata)};
const writeResult = (result) => new File(Paths.document, 'public-library-benchmark.json').write(JSON.stringify(result));
registerRootComponent(() => <Runner Before={Before} After={After} metadata={metadata} writeResult={writeResult} />);
`);
assert.equal(readFileSync(resolve(root, 'App.tsx'), 'utf8').includes('public-library-benchmark'), false);
console.log(`Benchmark entry: ${relative(root, output)}/index.tsx`);
console.log(JSON.stringify(metadata, null, 2));
