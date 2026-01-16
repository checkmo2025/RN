import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMemo, useState } from 'react';
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  ScrollView,
  TouchableWithoutFeedback,
} from 'react-native';
import { SvgUri } from 'react-native-svg';

import { colors, spacing, typography } from '../theme';
import { IconButton, IconName } from './IconButton';

const logoUri = Image.resolveAssetSource(
  require('../../assets/mobile-header-logo.svg'),
).uri;
const searchUri = Image.resolveAssetSource(
  require('../../assets/header/header-search.svg'),
).uri;
const alarmUri = Image.resolveAssetSource(
  require('../../assets/header/header-alarm.svg'),
).uri;
const writeIconUri = Image.resolveAssetSource(
  require('../../assets/write-floating.svg'),
).uri;

type HeaderAction = {
  key?: string;
  icon: IconName;
  onPress?: () => void;
};

type Props = {
  title: string;
  actions?: HeaderAction[];
  onPressSearch?: () => void;
  onPressBell?: () => void;
};

export function AppHeader(props: Props) {
  const { title, actions, onPressSearch, onPressBell } = props;
  const { top } = useSafeAreaInsets();
  const [showNoti, setShowNoti] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [query, setQuery] = useState('');
  const [searched, setSearched] = useState(false);

  const notifications = [
    { id: 'n1', text: '경표쭈응님이 좋아요를 눌렀습니다.', time: '지금', unread: true },
    { id: 'n2', text: '경표쭈응님이 댓글을 남겼습니다: 정말 재..', time: '2분 전' },
    { id: 'n3', text: '경표쭈응님이 댓글을 남겼습니다: 정말 재..', time: '2분 전' },
    { id: 'n4', text: '경표쭈응님이 댓글을 남겼습니다: 정말 재..', time: '2분 전' },
    { id: 'n5', text: '경표쭈응님이 댓글을 남겼습니다: 정말 재..', time: '2분 전' },
  ];

  const recommendedBooks = useMemo(
    () =>
      Array.from({ length: 3 }).map((_, idx) => ({
        id: `rec-${idx}`,
        title: '책 제목',
        author: '작가/작가가',
      })),
    [],
  );

  const searchResults = useMemo(
    () =>
      Array.from({ length: 3 }).map((_, idx) => ({
        id: `res-${idx}`,
        title: '어린 왕자',
        author: '김개미, 연수',
        desc: '최대 500(넘어가면 ...으로)',
      })),
    [],
  );

  const handleSearchSubmit = () => {
    setSearched(true);
  };

  const derivedActions: HeaderAction[] =
    Array.isArray(actions) && actions.length > 0
      ? actions
      : [
          { key: 'search', icon: 'search', onPress: onPressSearch },
          { key: 'notifications', icon: 'notifications-none', onPress: onPressBell },
        ];

  return (
    <View style={[styles.container, { paddingTop: top || spacing.md }]}>
      <SvgUri uri={logoUri} width={50} height={26} />
      <Text style={styles.title}>{title}</Text>
      <View style={styles.actions}>
        {derivedActions.map((action, index) => (
          <IconButton
            key={action.key ?? `${action.icon}-${index}`}
            name={action.icon}
            color={colors.white}
            size={24}
            onPress={() => {
              if (action.icon === 'notifications-none') {
                setShowNoti((prev) => !prev);
                setShowSearch(false);
                onPressBell?.();
              } else if (action.icon === 'search') {
                setShowSearch((prev) => !prev);
                setShowNoti(false);
                setSearched(false);
                onPressSearch?.();
              } else {
                action.onPress?.();
              }
            }}
            renderIcon={
              action.icon === 'search' ? (
                <SvgUri uri={searchUri} width={24} height={24} />
              ) : action.icon === 'notifications-none' ? (
                <SvgUri uri={alarmUri} width={24} height={24} />
              ) : undefined
            }
          />
        ))}
      </View>
      {showNoti ? (
        <Pressable style={styles.notiOverlay} onPress={() => setShowNoti(false)}>
          <View style={styles.notiCard}>
            {notifications.slice(0, 5).map((n, idx) => (
              <View key={n.id} style={styles.notiRow}>
                <View style={[styles.notiDot, n.unread ? styles.notiDotActive : null]} />
                <Text style={[styles.notiText, idx > 0 ? styles.notiTextMuted : null]}>
                  {n.text}
                </Text>
                <Text style={styles.notiTime}>{n.time}</Text>
              </View>
            ))}
          </View>
        </Pressable>
      ) : null}
      {showSearch ? (
        <TouchableWithoutFeedback onPress={() => setShowSearch(false)}>
          <View style={styles.searchOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.searchContainer}>
                <View style={styles.searchBar}>
                  <SvgUri uri={searchUri} width={24} height={24} />
                  <TextInput
                    value={query}
                    onChangeText={setQuery}
                    placeholder="책 제목, 작가 이름을 검색해보세요"
                    placeholderTextColor={colors.gray3}
                    style={styles.searchInput}
                    onSubmitEditing={handleSearchSubmit}
                    returnKeyType="search"
                  />
                  {query.length > 0 ? (
                    <IconButton
                      name="close"
                      color={colors.gray4}
                      size={20}
                      onPress={() => {
                        setQuery('');
                        setSearched(false);
                      }}
                    />
                  ) : null}
                </View>
                {searched ? (
                  <ScrollView
                    style={styles.searchResult}
                    contentContainerStyle={styles.searchList}
                    showsVerticalScrollIndicator={false}
                  >
                    <Text style={styles.searchCount}>총 0개의 검색결과가 있습니다.</Text>
                    {searchResults.map((book) => (
                      <View key={book.id} style={styles.resultCard}>
                        <View style={styles.resultThumb} />
                        <View style={styles.resultBody}>
                          <Text style={styles.resultTitle}>{book.title}</Text>
                          <Text style={styles.resultAuthor}>{book.author}</Text>
                          <Text style={styles.resultDesc}>{book.desc}</Text>
                        </View>
                        <SvgUri uri={writeIconUri} width={32} height={32} />
                      </View>
                    ))}
                  </ScrollView>
                ) : (
                  <View style={styles.searchRecommend}>
                    <Text style={styles.recoTitle}>오늘의 추천 책</Text>
                    <View style={styles.recoRow}>
                      {recommendedBooks.map((book) => (
                        <View key={book.id} style={styles.recoCard}>
                          <View style={styles.recoThumb} />
                          <Text style={styles.recoBookTitle}>{book.title}</Text>
                          <Text style={styles.recoAuthor}>{book.author}</Text>
                        </View>
                      ))}
                    </View>
                    <Pressable style={styles.recoLink}>
                      <Text style={styles.recoLinkText}>알라딘 랭킹 더 보러가기</Text>
                    </Pressable>
                  </View>
                )}
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary1,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  brand: {
    ...typography.subhead3,
    color: colors.white,
  },
  title: {
    ...typography.subhead3,
    color: colors.white,
    flex: 1,
    textAlign: 'center',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  notiOverlay: {
    position: 'absolute',
    top: '100%',
    right: spacing.md,
    paddingTop: spacing.xs,
    zIndex: 10,
  },
  notiCard: {
    width: 240,
    backgroundColor: colors.white,
    borderRadius: spacing.md,
    borderWidth: 1,
    borderColor: colors.gray2,
    padding: spacing.sm,
    gap: spacing.xs,
  },
  notiRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  notiDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.gray3,
  },
  notiDotActive: {
    backgroundColor: colors.likeRed,
  },
  notiText: {
    flex: 1,
    ...typography.body2_2,
    color: colors.gray6,
  },
  notiTextMuted: {
    color: colors.gray4,
  },
  notiTime: {
    ...typography.body2_3,
    color: colors.gray4,
  },
  searchOverlay: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  searchContainer: {
    backgroundColor: colors.primary1,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    paddingTop: spacing.md,
    gap: spacing.md,
    zIndex: 9,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray2,
    paddingVertical: spacing.sm,
  },
  searchInput: {
    flex: 1,
    ...typography.subhead4,
    color: colors.white,
  },
  searchResult: {
    maxHeight: 320,
    backgroundColor: colors.background,
    borderRadius: spacing.md,
  },
  searchList: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  searchCount: {
    ...typography.body1_3,
    color: colors.gray5,
  },
  resultCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: spacing.md,
    borderWidth: 1,
    borderColor: colors.subbrown4,
    padding: spacing.md,
    gap: spacing.md,
  },
  resultThumb: {
    width: 60,
    height: 80,
    backgroundColor: colors.gray1,
    borderRadius: spacing.sm,
  },
  resultBody: {
    flex: 1,
    gap: spacing.xs / 2,
  },
  resultTitle: {
    ...typography.subhead4_1,
    color: colors.gray6,
  },
  resultAuthor: {
    ...typography.body2_3,
    color: colors.gray5,
  },
  resultDesc: {
    ...typography.body2_3,
    color: colors.gray5,
  },
  searchRecommend: {
    backgroundColor: colors.primary1,
    gap: spacing.sm,
  },
  recoTitle: {
    ...typography.body1_2,
    color: colors.white,
  },
  recoRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  recoCard: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: spacing.md,
    padding: spacing.sm,
    gap: spacing.xs / 2,
  },
  recoThumb: {
    width: '100%',
    aspectRatio: 2 / 3,
    borderRadius: spacing.sm,
    backgroundColor: colors.gray1,
  },
  recoBookTitle: {
    ...typography.body1_3,
    color: colors.gray6,
  },
  recoAuthor: {
    ...typography.body2_3,
    color: colors.gray5,
  },
  recoLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  recoLinkText: {
    ...typography.body1_3,
    color: colors.white,
  },
});
