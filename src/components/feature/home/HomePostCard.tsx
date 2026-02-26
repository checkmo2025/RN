import React from 'react';

import { BookStoryCard } from '../bookstory/BookStoryCard';

export type HomePost = {
  id: string;
  author: string;
  timeAgo: string;
  views: number;
  title: string;
  body: string;
  likes: number;
  comments: number;
  liked: boolean;
  subscribed: boolean;
  image?: string;
};

type Props = {
  post: HomePost;
  onToggleLike: (id: string) => void;
  onToggleSubscribe: (id: string) => void;
  onPressAuthor?: (nickname: string) => void;
};

export default function HomePostCard({
  post,
  onToggleLike,
  onToggleSubscribe,
  onPressAuthor,
}: Props) {
  return (
    <BookStoryCard
      author={post.author}
      timeAgo={post.timeAgo}
      views={post.views}
      title={post.title}
      body={post.body}
      likes={post.likes}
      comments={post.comments}
      liked={post.liked}
      subscribed={post.subscribed}
      image={post.image}
      onToggleLike={() => onToggleLike(post.id)}
      onToggleSubscribe={() => onToggleSubscribe(post.id)}
      onPressAuthor={() => onPressAuthor?.(post.author)}
    />
  );
}
