import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { relative, resolve } from 'node:path';
import ts from 'typescript';

const root = resolve(import.meta.dirname, '../../..');
const output = resolve(root, '.expo/bookshelf-reviews-benchmark');
const beforeRef = '3013195';
const bookshelfPath = 'src/screens/meeting/GroupBookshelfView.tsx';
const meetingPath = 'src/screens/MeetingScreen.tsx';
const beforeBookshelf = execFileSync('git', ['show', `${beforeRef}:${bookshelfPath}`], {
  cwd: root,
  encoding: 'utf8',
});
const afterBookshelf = readFileSync(resolve(root, bookshelfPath), 'utf8');
const afterMeeting = readFileSync(resolve(root, meetingPath), 'utf8');
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
const beforeSource = parse('before.tsx', beforeBookshelf);
const afterSource = parse('after.tsx', afterBookshelf);
const meetingSource = parse('MeetingScreen.tsx', afterMeeting);
const beforeMap = nodes(beforeSource).find(
  (node) =>
    ts.isCallExpression(node) &&
    ts.isPropertyAccessExpression(node.expression) &&
    node.expression.getText(beforeSource) === 'bookshelfReviewItems.map',
);
assert.ok(beforeMap && ts.isArrowFunction(beforeMap.arguments[0]), 'Before review map not found');
const beforeRow = beforeMap.arguments[0].body.getText(beforeSource);
const rowFunction = nodes(afterSource).find(
  (node) => ts.isFunctionDeclaration(node) && node.name?.text === 'GroupBookshelfReviewRow',
);
assert.ok(rowFunction?.body, 'After review row not found');
const afterReturn = nodes(rowFunction.body).find((node) => ts.isReturnStatement(node));
assert.ok(afterReturn?.expression, 'After review row return not found');
const afterRow = afterReturn.expression.getText(afterSource);
const productList = nodes(meetingSource).find(
  (node) =>
    ts.isJsxSelfClosingElement(node) &&
    node.tagName.getText(meetingSource) === 'FlatList' &&
    node.attributes.getText(meetingSource).includes('data={groupHomeListItems}'),
);
assert.ok(productList, 'Product review FlatList not found');

const instrument = (row) =>
  row
    .replace('<View', '<MeasuredReview metrics={metrics} reviewId={item.id}')
    .replace(/<\/View>(\s*\)?)$/, '</MeasuredReview>$1');
const metadata = {
  refs: { before: beforeRef, after: 'working-tree' },
  sourceHashes: {
    before: createHash('sha256').update(beforeBookshelf).digest('hex'),
    after: createHash('sha256').update(`${afterBookshelf}\n${afterMeeting}`).digest('hex'),
    beforeRow: createHash('sha256').update(beforeRow).digest('hex'),
    afterRow: createHash('sha256').update(afterRow).digest('hex'),
  },
  fixture: 'actual bookshelf review row JSX; equal static group/bookshelf header; no API or remote images',
  scrollMetric: 'JS requestAnimationFrame FPS during equal 1200pt, 60-step programmatic scroll',
};
mkdirSync(output, { recursive: true });

const shared = `
import { forwardRef, useImperativeHandle, useLayoutEffect, useRef } from 'react';
import { FlatList, ScrollView, Text, View } from 'react-native';
import { spacing } from '../../src/theme';
import { styles } from '../../src/screens/meeting/meetingStyles';
import { FeedbackPressable as Pressable } from '../../src/components/common/FeedbackPressable';
const Image = ({ style }) => <View style={style} />;
const DefaultProfileAvatar = ({ size }) => <View style={{ width: size, height: size }} />;
const MaterialIcons = ({ size }) => <View style={{ width: size, height: size }} />;
const colors = { gray2: '#ddd', gray4: '#888', secondary2: '#f5a623' };
const getStarIconName = (rating, index) => rating >= index + 1 ? 'star' : 'star-border';
const handlePressBookshelfPostMenu = () => {};
const SCROLL_DISTANCE = 1200;
const GroupHeader = () => <View style={{ height: 240 }} />;
const BookshelfHeader = () => <View style={{ height: 360 }} />;
function MeasuredReview({ metrics, reviewId, ...props }) {
  metrics.reviewRenders += 1;
  useLayoutEffect(() => { metrics.mountedIds.add(reviewId); }, [metrics, reviewId]);
  return <View {...props} />;
}
`;

writeFileSync(
  resolve(output, 'before.tsx'),
  `${shared}
export default forwardRef(function Before({ reviews, metrics }, ref) {
  const listRef = useRef(null);
  useImperativeHandle(ref, () => ({
    scrollToProgress(progress) {
      const target = Math.min(SCROLL_DISTANCE, Math.max(0, metrics.contentHeight - metrics.viewportHeight));
      metrics.scrollTargetOffset = target;
      listRef.current?.scrollTo({ y: target * progress, animated: false });
    },
  }), [metrics]);
  return (
    <ScrollView ref={listRef} style={{ flex: 1 }} contentContainerStyle={styles.content}
      onLayout={(event) => { metrics.viewportHeight = event.nativeEvent.layout.height; }}
      onContentSizeChange={(_width, height) => { metrics.contentHeight = height; }}
      onScroll={() => { metrics.scrollEvents += 1; }} scrollEventThrottle={16}>
      <GroupHeader /><BookshelfHeader />
      <View style={styles.bookshelfPostList}>
        {reviews.map((item) => ${instrument(beforeRow)})}
      </View>
    </ScrollView>
  );
});
`,
);

writeFileSync(
  resolve(output, 'after.tsx'),
  `${shared}
export default forwardRef(function After({ reviews, metrics }, ref) {
  const listRef = useRef(null);
  useImperativeHandle(ref, () => ({
    scrollToProgress(progress) {
      const target = Math.min(SCROLL_DISTANCE, Math.max(0, metrics.contentHeight - metrics.viewportHeight));
      metrics.scrollTargetOffset = target;
      listRef.current?.scrollToOffset({ offset: target * progress, animated: false });
    },
  }), [metrics]);
  return (
    <FlatList ref={listRef} style={{ flex: 1 }}
      contentContainerStyle={[styles.content, styles.groupHomeVirtualizedContent]}
      data={reviews} keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <View style={styles.bookshelfTopicVirtualizedCell}>{${instrument(afterRow)}}</View>
      )}
      ListHeaderComponent={<><GroupHeader /><BookshelfHeader /></>}
      ListHeaderComponentStyle={styles.groupHomeListHeader}
      ListFooterComponent={<View />}
      onLayout={(event) => { metrics.viewportHeight = event.nativeEvent.layout.height; }}
      onContentSizeChange={(_width, height) => { metrics.contentHeight = height; }}
      onScroll={() => { metrics.scrollEvents += 1; }} scrollEventThrottle={16}
    />
  );
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
import Runner from '../../scripts/benchmarks/bookshelf-reviews/Runner';
import Before from './before';
import After from './after';
const metadata = ${JSON.stringify(metadata)};
const writeResult = (result) => new File(Paths.document, 'bookshelf-reviews-benchmark.json').write(JSON.stringify(result));
registerRootComponent(() => <Runner Before={Before} After={After} metadata={metadata} writeResult={writeResult} />);
`,
);
assert.equal(readFileSync(resolve(root, 'App.tsx'), 'utf8').includes('bookshelf-reviews-benchmark'), false);
console.log(`Benchmark entry: ${relative(root, output)}/index.tsx`);
console.log(JSON.stringify(metadata, null, 2));
