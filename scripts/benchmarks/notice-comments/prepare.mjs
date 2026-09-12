import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { relative, resolve } from 'node:path';
import ts from 'typescript';

const root = resolve(import.meta.dirname, '../../..');
const output = resolve(root, '.expo/notice-comments-benchmark');
const beforeRef = '78e1e85';
const noticePath = 'src/screens/meeting/GroupNoticeView.tsx';
const meetingPath = 'src/screens/MeetingScreen.tsx';
const beforeNotice = execFileSync('git', ['show', `${beforeRef}:${noticePath}`], {
  cwd: root,
  encoding: 'utf8',
});
const afterNotice = readFileSync(resolve(root, noticePath), 'utf8');
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
const beforeSource = parse('before.tsx', beforeNotice);
const afterSource = parse('after.tsx', afterNotice);
const meetingSource = parse('MeetingScreen.tsx', afterMeeting);
const beforeMap = nodes(beforeSource).find(
  (node) =>
    ts.isCallExpression(node) &&
    ts.isPropertyAccessExpression(node.expression) &&
    node.expression.getText(beforeSource) === 'currentNoticeComments.map',
);
assert.ok(beforeMap && ts.isArrowFunction(beforeMap.arguments[0]), 'Before comment map not found');
const beforeRow = beforeMap.arguments[0].body.getText(beforeSource);
const rowFunction = nodes(afterSource).find(
  (node) => ts.isFunctionDeclaration(node) && node.name?.text === 'GroupNoticeCommentRow',
);
assert.ok(rowFunction?.body, 'After comment row not found');
const afterReturn = nodes(rowFunction.body).find((node) => ts.isReturnStatement(node));
assert.ok(afterReturn?.expression, 'After comment row return not found');
const afterRow = afterReturn.expression.getText(afterSource);
const productList = nodes(meetingSource).find(
  (node) =>
    ts.isJsxSelfClosingElement(node) &&
    node.tagName.getText(meetingSource) === 'FlatList' &&
    node.attributes.getText(meetingSource).includes('currentNoticeComments'),
);
assert.ok(productList, 'Product comment FlatList not found');

const instrument = (row) =>
  row
    .replace('<View', '<MeasuredComment metrics={metrics} commentId={comment.id}')
    .replace(/<\/View>(\s*\)?)$/, '</MeasuredComment>$1');
const metadata = {
  refs: { before: beforeRef, after: 'working-tree' },
  sourceHashes: {
    before: createHash('sha256').update(beforeNotice).digest('hex'),
    after: createHash('sha256').update(`${afterNotice}\n${afterMeeting}`).digest('hex'),
    beforeRow: createHash('sha256').update(beforeRow).digest('hex'),
    afterRow: createHash('sha256').update(afterRow).digest('hex'),
  },
  fixture: 'actual comment row JSX; equal static group/notice header; no API or remote images',
  scrollMetric: 'JS requestAnimationFrame FPS during equal 1200pt, 60-step programmatic scroll',
};
mkdirSync(output, { recursive: true });

const shared = `
import { forwardRef, useImperativeHandle, useLayoutEffect, useRef } from 'react';
import { FlatList, ScrollView, Text, View } from 'react-native';
import { colors, spacing } from '../../src/theme';
import { styles } from '../../src/screens/meeting/meetingStyles';
import { FeedbackPressable as Pressable } from '../../src/components/common/FeedbackPressable';
const Image = ({ style }) => <View style={style} />;
const DefaultProfileAvatar = ({ size }) => <View style={{ width: size, height: size }} />;
const ImageGallery = () => null;
const MaterialIcons = ({ size }) => <View style={{ width: size, height: size }} />;
const navigation = { navigate: () => {} };
const handlePressCommentMenu = () => {};
const setPhotoViewer = () => {};
const l = (text) => text;
const SCROLL_DISTANCE = 1200;
const GroupHeader = () => <View style={{ height: 240 }} />;
const NoticeHeader = () => <View style={{ height: 320 }} />;
function MeasuredComment({ metrics, commentId, ...props }) {
  metrics.commentRenders += 1;
  useLayoutEffect(() => { metrics.mountedIds.add(commentId); }, [commentId, metrics]);
  return <View {...props} />;
}
`;

writeFileSync(
  resolve(output, 'before.tsx'),
  `${shared}
export default forwardRef(function Before({ comments, metrics }, ref) {
  const listRef = useRef(null);
  useImperativeHandle(ref, () => ({
    scrollToProgress(progress) {
      const target = Math.min(SCROLL_DISTANCE, Math.max(0, metrics.contentHeight - metrics.viewportHeight));
      metrics.scrollTargetOffset = target;
      const offset = target * progress;
      listRef.current?.scrollTo({ y: offset, animated: false });
    },
  }), [metrics]);
  return (
    <ScrollView
      ref={listRef}
      style={{ flex: 1 }}
      contentContainerStyle={styles.content}
      onLayout={(event) => { metrics.viewportHeight = event.nativeEvent.layout.height; }}
      onContentSizeChange={(_width, height) => { metrics.contentHeight = height; }}
      onScroll={() => { metrics.scrollEvents += 1; }}
      scrollEventThrottle={16}
    >
      <GroupHeader />
      <View style={styles.noticeDetailCard}>
        <NoticeHeader />
        <View style={{ gap: spacing.sm }}>
          {comments.map((comment) => ${instrument(beforeRow)})}
        </View>
      </View>
    </ScrollView>
  );
});
`,
);

writeFileSync(
  resolve(output, 'after.tsx'),
  `${shared}
export default forwardRef(function After({ comments, metrics }, ref) {
  const listRef = useRef(null);
  useImperativeHandle(ref, () => ({
    scrollToProgress(progress) {
      const target = Math.min(SCROLL_DISTANCE, Math.max(0, metrics.contentHeight - metrics.viewportHeight));
      metrics.scrollTargetOffset = target;
      const offset = target * progress;
      listRef.current?.scrollToOffset({ offset, animated: false });
    },
  }), [metrics]);
  return (
    <FlatList
      ref={listRef}
      style={{ flex: 1 }}
      contentContainerStyle={[styles.content, styles.groupHomeVirtualizedContent]}
      data={comments}
      keyExtractor={(comment) => comment.id}
      renderItem={({ item: comment }) => (
        <View style={styles.noticeCommentVirtualizedCell}>{${instrument(afterRow)}}</View>
      )}
      ListHeaderComponent={<><GroupHeader /><View style={[styles.noticeDetailCard, styles.noticeDetailVirtualizedHeader]}><NoticeHeader /></View></>}
      ListHeaderComponentStyle={styles.groupHomeListHeader}
      ListFooterComponent={<View style={styles.noticeCommentVirtualizedFooter} />}
      onLayout={(event) => { metrics.viewportHeight = event.nativeEvent.layout.height; }}
      onContentSizeChange={(_width, height) => { metrics.contentHeight = height; }}
      onScroll={() => { metrics.scrollEvents += 1; }}
      scrollEventThrottle={16}
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
import Runner from '../../scripts/benchmarks/notice-comments/Runner';
import Before from './before';
import After from './after';
const metadata = ${JSON.stringify(metadata)};
const writeResult = (result) => new File(Paths.document, 'notice-comments-benchmark-v2.json').write(JSON.stringify(result));
registerRootComponent(() => <Runner Before={Before} After={After} metadata={metadata} writeResult={writeResult} />);
`,
);
assert.equal(readFileSync(resolve(root, 'App.tsx'), 'utf8').includes('notice-comments-benchmark'), false);
console.log(`Benchmark entry: ${relative(root, output)}/index.tsx`);
console.log(JSON.stringify(metadata, null, 2));
