import React from 'react';

import BookStoryFeedCard from '../bookstory/BookStoryFeedCard';

export type HomePost = {
  id: string;
  author: string;
  profileImageUrl?: string;
  timeAgo: string;
  views: number;
  title: string;
  body: string;
  likes: number;
  comments: number;
  liked: boolean;
  subscribed: boolean;
  mine: boolean;
  image?: string;
};

type Props = {
  post: HomePost;
  viewerIsLoggedIn?: boolean;
  onToggleLike: (id: string) => void;
  onToggleSubscribe: (id: string) => void;
  onPress?: (id: string) => void;
  onPressAuthor?: (nickname: string) => void;
};

export default function HomePostCard({
  post,
  viewerIsLoggedIn = false,
  onToggleLike,
  onToggleSubscribe,
  onPress,
  onPressAuthor,
}: Props) {
  const isMineForViewer = viewerIsLoggedIn && post.mine;

  return (
    <BookStoryFeedCard
      authorName={post.author}
      profileImgSrc={post.profileImageUrl}
      timeAgo={post.timeAgo}
      viewCount={post.views}
      title={post.title}
      content={post.body}
      likeCount={post.likes}
      commentCount={post.comments}
      liked={post.liked}
      isAuthor={isMineForViewer}
      subscribed={isMineForViewer ? undefined : post.subscribed}
      coverImgSrc={post.image}
      onPress={onPress ? () => onPress(post.id) : undefined}
      onToggleLike={() => onToggleLike(post.id)}
      onToggleSubscribe={isMineForViewer ? undefined : () => onToggleSubscribe(post.id)}
      onPressAuthor={onPressAuthor ? () => onPressAuthor(post.author) : undefined}
    />
  );
}
