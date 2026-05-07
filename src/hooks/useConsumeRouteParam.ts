import { useEffect, useRef } from 'react';
import type { NavigationProp, ParamListBase } from '@react-navigation/native';

/**
 * one-shot 라우트 파라미터를 소비하고 초기화하는 훅.
 * paramValue가 parse를 통과하면 onConsumed를 실행하고 resetKey 파라미터를 undefined로 지운다.
 */
export function useConsumeRouteParam<T>(
  paramValue: unknown,
  parse: (raw: unknown) => T | null | undefined,
  onConsumed: (parsed: T) => void,
  navigation: NavigationProp<ParamListBase>,
  resetKey: string,
): void {
  const parseRef = useRef(parse);
  parseRef.current = parse;
  const onConsumedRef = useRef(onConsumed);
  onConsumedRef.current = onConsumed;

  useEffect(() => {
    const parsed = parseRef.current(paramValue);
    if (parsed == null) return;
    onConsumedRef.current(parsed);
    navigation.setParams({ [resetKey]: undefined });
  }, [navigation, paramValue, resetKey]);
}
