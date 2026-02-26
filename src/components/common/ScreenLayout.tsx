import React from 'react';
import { View, StyleSheet, ScrollViewProps } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors } from '../../theme';
import { AppHeader } from './AppHeader';

type Props = {
  title: string;
  children: React.ReactNode;
  scrollable?: boolean;
  contentStyle?: ScrollViewProps['contentContainerStyle'];
  onPressLogo?: () => void;
};

export function ScreenLayout({ title, children, scrollable, contentStyle, onPressLogo }: Props) {
  const body = scrollable ? (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <AppHeader title={title} onPressLogo={onPressLogo} />
      <View style={[styles.content, contentStyle]}>{children}</View>
    </SafeAreaView>
  ) : (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <AppHeader title={title} onPressLogo={onPressLogo} />
      <View style={[styles.content, contentStyle]}>{children}</View>
    </SafeAreaView>
  );
  return body;
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
  },
});
