import { useMemo, useRef, useState, useCallback } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
  LayoutAnimation,
  Platform,
  UIManager,
  Image,
  ImageBackground,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import { SvgUri } from 'react-native-svg';

import { colors, radius, spacing, typography } from '../theme';
import { BookStoryCard } from '../components/BookStoryCard';

const likeIconUri = Image.resolveAssetSource(
  require('../../assets/book-story/bookstory-like.svg'),
).uri;
const commentIconUri = Image.resolveAssetSource(
  require('../../assets/book-story/bookstory-comment.svg'),
).uri;

type Book = {
  id: string;
  title: string;
  author: string;
  description: string;
  image?: string;
};

type Comment = {
  id: string;
  author: string;
  time: string;
  text: string;
  replyTo?: string;
};

type Story = {
  id: string;
  author: string;
  timeAgo: string;
  views: number;
  title: string;
  body: string;
  fullText: string;
  likes: number;
  comments: number;
  tag: string;
  subscribed: boolean;
  liked: boolean;
  book?: Book;
  commentList: Comment[];
};

const filters = ['전체', '구독중', '긍적긍정', '복직복직'];

const bookOptions: Book[] = [
  {
    id: 'b1',
    title: '어린 왕자',
    author: '생텍쥐페리',
    description: '작은 왕자가 여행하며 만난 이야기와 어른들을 비추는 동화.',
    image: Image.resolveAssetSource(require('../../assets/tmp/little-prince.jpg')).uri,
  },
  {
    id: 'b2',
    title: '돈키호테',
    author: '세르반테스',
    description: '풍차와 모험, 기사도에 대한 유쾌한 풍자.',
  },
  {
    id: 'b3',
    title: '데미안',
    author: '헤르만 헤세',
    description: '자아를 찾아가는 싱클레어의 성장과 깨달음.',
  },
];

export function StoryScreen() {
  if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  }

  const [selectedFilter, setSelectedFilter] = useState(filters[0]);
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [showBookPicker, setShowBookPicker] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [stories, setStories] = useState<Story[]>(() => buildStories(6));
  const [isComposing, setIsComposing] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedStory, setSelectedStory] = useState<Story | null>(null);
  const [commentInput, setCommentInput] = useState('');
  const listRef = useRef<FlatList<Story>>(null);
  const writeIconUri = Image.resolveAssetSource(
    require('../../assets/write-floating.svg'),
  ).uri;

  const animateTransition = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
  };

  const openCompose = () => {
    setSelectedStory(null);
    animateTransition();
    setIsComposing(true);
  };

  const closeCompose = () => {
    animateTransition();
    setIsComposing(false);
  };

  const filteredStories = useMemo(() => {
    if (selectedFilter === '전체') return stories;
    if (selectedFilter === '구독중') {
      return stories.filter((story) => story.subscribed);
    }
    return stories.filter((story) => story.tag === selectedFilter);
  }, [selectedFilter, stories]);

  const handleSelectBook = (book: Book) => {
    setSelectedBook(book);
    setShowBookPicker(false);
  };

  const handleSubmit = () => {
    if (!title.trim() || !body.trim()) return;
    const book = selectedBook ?? bookOptions[0];
    const newStory: Story = {
      id: `story-${Date.now()}`,
      author: 'hy_0716',
      timeAgo: '방금 전',
      views: 0,
      title: title.trim(),
      body: body.trim(),
      fullText: body.trim(),
      likes: 0,
      comments: 0,
      tag: '전체',
      subscribed: false,
      liked: false,
      book,
      commentList: [],
    };
    setStories((prev) => [newStory, ...prev]);
    setTitle('');
    setBody('');
    setSelectedBook(null);
    closeCompose();
    listRef.current?.scrollToOffset({ offset: 0, animated: true });
  };

  const handleToggleSubscribe = (id: string) => {
    setStories((prev) =>
      prev.map((story) =>
        story.id === id ? { ...story, subscribed: !story.subscribed } : story,
      ),
    );
    if (selectedStory?.id === id) {
      setSelectedStory((prev) =>
        prev ? { ...prev, subscribed: !prev.subscribed } : prev,
      );
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => {
      setStories(buildStories(6));
      setSelectedStory(null);
      setRefreshing(false);
    }, 700);
  };

  const handleSelectStory = (story: Story) => {
    animateTransition();
    setIsComposing(false);
    setSelectedStory(story);
  };

  const handleToggleLike = (id: string) => {
    setStories((prev) =>
      prev.map((story) => {
        if (story.id !== id) return story;
        const liked = !story.liked;
        const likes = liked ? story.likes + 1 : Math.max(0, story.likes - 1);
        return { ...story, liked, likes };
      }),
    );
    setSelectedStory((prev) => {
      if (!prev || prev.id !== id) return prev;
      const liked = !prev.liked;
      const likes = liked ? prev.likes + 1 : Math.max(0, prev.likes - 1);
      return { ...prev, liked, likes };
    });
  };

  const handleSubmitComment = () => {
    if (!selectedStory || !commentInput.trim()) return;
    const newComment: Comment = {
      id: `c-${Date.now()}`,
      author: 'hy_me',
      time: '방금 전',
      text: commentInput.trim(),
    };
    const updated = {
      ...selectedStory,
      commentList: [newComment, ...selectedStory.commentList],
      comments: selectedStory.comments + 1,
    };
    setSelectedStory(updated);
    setStories((prev) =>
      prev.map((s) => (s.id === updated.id ? updated : s)),
    );
    setCommentInput('');
  };

  useFocusEffect(
    useCallback(() => {
      return () => {
        setSelectedStory(null);
        setIsComposing(false);
      };
    }, []),
  );

  if (selectedStory) {
    const book = selectedStory.book;
    return (
      <KeyboardAvoidingView style={styles.container} behavior="padding">
        <ScrollView
          contentContainerStyle={styles.detailContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.breadcrumbRow}>
            <Pressable
              style={styles.breadcrumbButton}
              onPress={() => {
                animateTransition();
                setSelectedStory(null);
              }}
            >
              <Text style={styles.breadcrumbText}>책이야기</Text>
              <MaterialIcons
                name="chevron-right"
                size={18}
                color={colors.gray4}
              />
              <Text style={[styles.breadcrumbText, styles.breadcrumbActive]}>
                상세보기
              </Text>
            </Pressable>
          </View>

          <View style={styles.detailMetaRow}>
            <Text style={styles.detailMetaText}>{selectedStory.timeAgo}</Text>
            <Text style={styles.detailMetaDot}>·</Text>
            <Text style={styles.detailMetaText}>
              조회수 {selectedStory.views}
            </Text>
          </View>

          <View style={styles.detailHeader}>
            <View style={styles.storyAvatar}>
              <MaterialIcons
                name="person-outline"
                size={28}
                color={colors.gray5}
              />
            </View>
            <View style={styles.detailAuthorBlock}>
              <Text style={styles.storyAuthor}>{selectedStory.author}</Text>
            </View>
            <Pressable
              style={[
                styles.chipButton,
                selectedStory.subscribed ? styles.chipActive : styles.chipInactive,
              ]}
              onPress={() => handleToggleSubscribe(selectedStory.id)}
            >
              <Text
                style={[
                  styles.chipText,
                  selectedStory.subscribed
                    ? styles.chipTextActive
                    : styles.chipTextInactive,
                ]}
              >
                {selectedStory.subscribed ? '구독중' : '구독'}
              </Text>
            </Pressable>
            <MaterialIcons
              name="more-vert"
              size={22}
              color={colors.gray5}
            />
          </View>

          {book && (
            <View style={styles.detailBookRow}>
              <View style={styles.detailBookThumb} />
              <View style={styles.detailBookInfo}>
                <Text style={styles.detailBookTitle}>{book.title}</Text>
                <Text style={styles.detailBookAuthor}>{book.author}</Text>
              </View>
              <View style={styles.detailActionCol}>
                <Pressable style={styles.detailActionRow}>
                  <MaterialIcons
                    name={selectedStory.liked ? 'favorite' : 'favorite-border'}
                    size={20}
                    color={selectedStory.liked ? colors.likeRed : colors.gray5}
                  />
                  <Text style={styles.detailActionText}>
                    좋아요 {selectedStory.likes}
                  </Text>
                </Pressable>
                <Pressable style={styles.detailActionRow}>
                  <MaterialIcons
                    name="share"
                    size={20}
                    color={colors.gray5}
                  />
                  <Text style={styles.detailActionText}>공유하기</Text>
                </Pressable>
              </View>
            </View>
          )}

          <Text style={styles.detailTitle}>{selectedStory.title}</Text>
          <Text style={styles.detailBody}>{selectedStory.fullText}</Text>

          <View style={styles.commentSection}>
            <Text style={styles.commentHeader}>댓글</Text>
            <View style={styles.commentInputRow}>
              <TextInput
                style={styles.commentInput}
                placeholder="댓글 내용"
                placeholderTextColor={colors.gray3}
                value={commentInput}
                onChangeText={setCommentInput}
              />
              <Pressable
                style={styles.commentSubmit}
                onPress={handleSubmitComment}
              >
                <Text style={styles.commentSubmitText}>입력</Text>
              </Pressable>
            </View>

            <View style={styles.commentList}>
              {selectedStory.commentList.map((comment) => (
                <View
                  key={comment.id}
                  style={[
                    styles.commentItem,
                    comment.replyTo ? styles.commentReply : null,
                  ]}
                >
                  <View style={styles.commentAvatar}>
                    <MaterialIcons
                      name="person-outline"
                      size={20}
                      color={colors.gray5}
                    />
                  </View>
                  <View style={styles.commentBody}>
                    <View style={styles.commentHeaderRow}>
                      <Text style={styles.commentAuthor}>{comment.author}</Text>
                      <Text style={styles.commentTime}>{comment.time}</Text>
                    </View>
                    <Text style={styles.commentText}>{comment.text}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  if (isComposing) {
    return (
      <KeyboardAvoidingView style={styles.container} behavior="padding">
        <ScrollView
          contentContainerStyle={styles.composeContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.composeHeader}>
            <Pressable
              style={styles.composeBack}
              onPress={closeCompose}
            >
              <MaterialIcons name="chevron-left" size={20} color={colors.gray5} />
              <Text style={styles.composeBackText}>목록으로</Text>
            </Pressable>
            <View style={styles.writeRow}>
              <MaterialIcons
                name="play-arrow"
                size={18}
                color={colors.gray5}
              />
              <Text style={styles.writeLabel}>글 작성하기</Text>
            </View>
          </View>

          <View style={styles.card}>
            {!selectedBook ? (
              <>
                <Pressable
                  style={styles.bookSelectButton}
                  onPress={() => setShowBookPicker((prev) => !prev)}
                >
                  <Text style={styles.bookSelectText}>책 선택하기</Text>
                </Pressable>
                {showBookPicker && (
                  <View style={styles.bookPicker}>
                    {bookOptions.map((book) => (
                      <Pressable
                        key={book.id}
                        onPress={() => handleSelectBook(book)}
                        style={styles.bookOption}
                      >
                        <View style={styles.bookThumb} />
                        <View style={styles.bookInfo}>
                          <Text style={styles.bookTitle}>{book.title}</Text>
                          <Text style={styles.bookAuthor}>{book.author}</Text>
                          <Text style={styles.bookDescription} numberOfLines={2}>
                            {book.description}
                          </Text>
                        </View>
                      </Pressable>
                    ))}
                  </View>
                )}
              </>
            ) : (
              <View style={styles.bookSummary}>
                <View style={styles.bookThumbLarge} />
                <View style={styles.bookInfo}>
                  <Text style={styles.bookTitle}>{selectedBook.title}</Text>
                  <Text style={styles.bookAuthor}>{selectedBook.author}</Text>
                  <Text style={styles.bookDescription} numberOfLines={3}>
                    {selectedBook.description}
                  </Text>
                </View>
              </View>
            )}
            {selectedBook && (
              <Pressable
                style={styles.secondaryButton}
                onPress={() => setShowBookPicker((prev) => !prev)}
              >
                <Text style={styles.secondaryButtonText}>변경하기</Text>
              </Pressable>
            )}
          </View>

          <View style={styles.formCard}>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="제목을 입력해주세요."
              placeholderTextColor={colors.gray3}
              style={styles.titleInput}
            />
            <TextInput
              value={body}
              onChangeText={setBody}
              placeholder="자신의 책이야기를 들려주세요. (최대 5000자)"
              placeholderTextColor={colors.gray3}
              style={styles.bodyInput}
              multiline
              textAlignVertical="top"
            />
            <View style={styles.formActions}>
              <Pressable
                style={styles.secondaryButton}
              onPress={closeCompose}
            >
              <Text style={styles.secondaryButtonText}>취소</Text>
            </Pressable>
            <Pressable style={styles.primaryButton} onPress={handleSubmit}>
              <Text style={styles.primaryButtonText}>등록</Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior="padding">
      <FlatList
        ref={listRef}
        data={filteredStories}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <View style={styles.header}>
            <View style={styles.filterRow}>
              {filters.map((filter) => {
                const active = selectedFilter === filter;
                return (
                  <Pressable
                    key={filter}
                    onPress={() => setSelectedFilter(filter)}
                    style={[styles.filterPill, active ? styles.filterPillActive : null]}
                  >
                    <Text
                      style={[styles.filterPillText, active ? styles.filterPillTextActive : null]}
                    >
                      {filter}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        }
        renderItem={({ item }) => (
      <BookStoryCard
        author={item.author}
        timeAgo={item.timeAgo}
        views={item.views}
        title={item.title}
        body={item.body}
        likes={item.likes}
        comments={item.comments}
        liked={item.liked}
        subscribed={item.subscribed}
        image={item.book?.image}
        onPress={() => handleSelectStory(item)}
        onToggleLike={() => handleToggleLike(item.id)}
        onToggleSubscribe={() => handleToggleSubscribe(item.id)}
      />
        )}
        contentContainerStyle={styles.listContent}
        onEndReached={() =>
          setStories((prev) => [...prev, ...buildStories(3, prev.length)])
        }
        onEndReachedThreshold={0.3}
        showsVerticalScrollIndicator={false}
        ListFooterComponent={<View style={{ height: spacing.xxl }} />}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary1}
            colors={[colors.primary1]}
          />
        }
      />
      <Pressable style={styles.fab} onPress={openCompose}>
        <SvgUri uri={writeIconUri} width={48} height={48} />
      </Pressable>
    </KeyboardAvoidingView>
  );
}

function buildStories(count: number, offset = 0): Story[] {
  return Array.from({ length: count }).map((_, index) => {
    const id = offset + index + 1;
    const book = bookOptions[id % bookOptions.length];
    return {
      id: `story-${id}`,
      author: `hy_07${(10 + id).toString()}`,
      timeAgo: `${1 + (id % 5)}분전`,
      views: 300 + id,
      title: '나는 나이든 왕자다',
      body:
        '나는 나이트 왕자다. 그 누가 숫자가 중요하다가 했던가. 세고 또 세는 그런 마법같은 경험을 한 사람은 놀랍도록 이 세상에 얼마 안된다! 나는 숲이 아닌 바다만큼...',
      fullText:
        '나는 나이든 왕자다. 그 누가 숫자가 중요하다가 했던가. 세고 또 세는 그런 마법같은 경험을 한 사람은 놀랍도록 이 세상에 얼마 안된다! 나는 숲이 아닌 바다만큼...\n\n숫자를 세는 일은 신비한 일이다. 그 과정에서 사람들은 마음을 들여다보고, 나를 되돌아본다. 그리고 어느새 숫자가 아닌 이야기를 세고 있다는 것을 깨닫는다.\n\n그래서 나는 다시 한번 숫자를 세기 시작한다. 그 사이사이로 나의 이야기가 흘러나온다.',
      likes: 1 + (id % 3),
      comments: 1 + (id % 2),
      tag: id % 2 === 0 ? '긍적긍정' : '복직복직',
      subscribed: id % 3 === 0,
      liked: false,
      book,
      commentList: [
        {
          id: `c-${id}-1`,
          author: 'hy_1234',
          time: '2025.09.22',
          text: '인정합니다.',
        },
        {
          id: `c-${id}-2`,
          author: 'hy_1234',
          time: '2025.09.22',
          text: '인정합니다.',
          replyTo: 'hy_1234',
        },
      ],
    };
  });
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  listContent: {
    paddingBottom: spacing.xl,
  },
  header: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    gap: spacing.md,
  },
  filterRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  filterPill: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.gray2,
  },
  filterPillActive: {
    backgroundColor: colors.primary1,
    borderColor: colors.primary1,
  },
  filterPillText: {
    ...typography.body1_3,
    color: colors.gray5,
  },
  filterPillTextActive: {
    color: colors.white,
  },
  writeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  writeLabel: {
    ...typography.body1_3,
    color: colors.gray6,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  bookSelectButton: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.primary1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
  },
  bookSelectText: {
    ...typography.body1_2,
    color: colors.primary1,
  },
  bookPicker: {
    gap: spacing.sm,
  },
  bookOption: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.sm,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.gray2,
  },
  bookThumb: {
    width: 48,
    height: 64,
    borderRadius: radius.xs,
    backgroundColor: colors.subbrown4,
  },
  bookThumbLarge: {
    width: 64,
    height: 90,
    borderRadius: radius.xs,
    backgroundColor: colors.subbrown4,
  },
  bookInfo: {
    flex: 1,
    gap: spacing.xs,
  },
  bookTitle: {
    ...typography.body1_2,
    color: colors.gray6,
  },
  bookAuthor: {
    ...typography.body2_3,
    color: colors.gray5,
  },
  bookDescription: {
    ...typography.body2_3,
    color: colors.gray5,
  },
  bookSummary: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'flex-start',
  },
  secondaryButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.gray2,
    alignSelf: 'flex-start',
  },
  secondaryButtonText: {
    ...typography.body1_2,
    color: colors.gray6,
  },
  primaryButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.primary1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    ...typography.body1_2,
    color: colors.white,
  },
  formCard: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  titleInput: {
    ...typography.subhead4,
    color: colors.gray6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.gray2,
    paddingBottom: spacing.xs,
  },
  bodyInput: {
    ...typography.body1_3,
    color: colors.gray6,
    minHeight: 160,
    paddingTop: spacing.sm,
  },
  formActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
  },
  storyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  storyAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.gray1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  storyMeta: {
    flex: 1,
  },
  storyAuthor: {
    ...typography.body1_2,
    color: colors.gray6,
  },
  storySubtitle: {
    ...typography.body2_3,
    color: colors.gray4,
  },
  chipButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  chipActive: {
    backgroundColor: colors.subbrown4,
    borderColor: colors.subbrown4,
  },
  chipInactive: {
    backgroundColor: colors.primary2,
    borderColor: colors.primary2,
  },
  chipText: {
    ...typography.body2_2,
  },
  chipTextActive: {
    color: colors.primary3,
  },
  chipTextInactive: {
    color: colors.white,
  },
  storyImagePlaceholder: {
    aspectRatio: 16 / 9,
    borderRadius: radius.md,
    backgroundColor: colors.gray1,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  storyImageBg: {
    opacity: 0.55,
  },
  storyImage: {
    width: '60%',
    height: '60%',
  },
  storyTitle: {
    ...typography.subhead4_1,
    color: colors.gray6,
  },
  storyText: {
    ...typography.body1_3,
    color: colors.gray6,
  },
  storyActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  actionDivider: {
    width: 1,
    height: 16,
    backgroundColor: colors.gray2,
  },
  postAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  postActionText: {
    ...typography.body2_3,
    color: colors.gray5,
  },
  fab: {
    position: 'absolute',
    right: spacing.xl,
    bottom: spacing.xl,
    width: 48,
    height: 48,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  composeContent: {
    padding: spacing.md,
    gap: spacing.md,
  },
  composeHeader: {
    gap: spacing.xs,
  },
  composeBack: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs / 2,
  },
  composeBackText: {
    ...typography.body1_3,
    color: colors.gray5,
  },
  detailContent: {
    padding: spacing.md,
    gap: spacing.md,
  },
  breadcrumbRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  breadcrumbButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  breadcrumbText: {
    ...typography.body2_3,
    color: colors.gray4,
  },
  breadcrumbActive: {
    color: colors.gray6,
  },
  detailMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  detailMetaText: {
    ...typography.body2_3,
    color: colors.gray5,
  },
  detailMetaDot: {
    ...typography.body2_3,
    color: colors.gray3,
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  detailAuthorBlock: {
    flex: 1,
  },
  detailBookRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.gray2,
  },
  detailBookThumb: {
    width: 64,
    height: 90,
    borderRadius: radius.xs,
    backgroundColor: colors.subbrown4,
  },
  detailBookInfo: {
    flex: 1,
    gap: spacing.xs / 2,
  },
  detailBookTitle: {
    ...typography.subhead4_1,
    color: colors.gray6,
  },
  detailBookAuthor: {
    ...typography.body2_3,
    color: colors.gray5,
  },
  detailActionCol: {
    gap: spacing.sm,
  },
  detailActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  detailActionText: {
    ...typography.body2_3,
    color: colors.gray5,
  },
  detailTitle: {
    ...typography.subhead3,
    color: colors.gray6,
    marginTop: spacing.sm,
  },
  detailBody: {
    ...typography.body1_3,
    color: colors.gray6,
    lineHeight: 22,
    marginTop: spacing.xs,
  },
  commentSection: {
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  commentHeader: {
    ...typography.body1_2,
    color: colors.gray6,
  },
  commentInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  commentInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.gray2,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    ...typography.body1_3,
    color: colors.gray6,
  },
  commentSubmit: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.primary1,
    borderRadius: radius.md,
  },
  commentSubmitText: {
    ...typography.body1_2,
    color: colors.white,
  },
  commentList: {
    gap: spacing.sm,
  },
  commentItem: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  commentReply: {
    marginLeft: spacing.md,
  },
  commentAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.gray1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  commentBody: {
    flex: 1,
    gap: spacing.xs / 2,
  },
  commentHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  commentAuthor: {
    ...typography.body1_3,
    color: colors.gray6,
  },
  commentTime: {
    ...typography.body2_3,
    color: colors.gray4,
  },
  commentText: {
    ...typography.body1_3,
    color: colors.gray6,
  },
});
