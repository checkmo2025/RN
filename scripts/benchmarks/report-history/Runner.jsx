import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { AppState, Dimensions, Platform, StyleSheet, Text, View } from 'react-native';

const SIZES = [7, 19, 100, 500];
const WARMUPS = 5;
const RUNS = 30;
const OBSERVE_MS = 250;
const SCROLL_STEPS = 60;
const SCROLL_DISTANCE = 1000;
const frame = () => new Promise((resolve) => requestAnimationFrame(resolve));
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const quantile = (values, p) => {
  const sorted = [...values].sort((a, b) => a - b);
  return p === 0.5
    ? (sorted[(sorted.length - 1) >> 1] + sorted[sorted.length >> 1]) / 2
    : sorted[Math.ceil(sorted.length * p) - 1];
};

function Probe({ trial, Before, After, done }) {
  const Component = trial.variant === 'before' ? Before : After;
  const listRef = useRef(null);
  useLayoutEffect(() => {
    trial.metrics.firstCommitMs = performance.now() - trial.started;
    trial.metrics.rowsAtFirstCommit = trial.metrics.mountedIds.size;
    const timer = setTimeout(() => done(listRef.current), OBSERVE_MS);
    return () => clearTimeout(timer);
  }, [done, trial]);
  return (
    <View style={styles.scene}>
      <Component ref={listRef} reportHistory={trial.reports} metrics={trial.metrics} />
    </View>
  );
}

export default function Runner({ Before, After, metadata, writeResult }) {
  const [trial, setTrial] = useState(null);
  const [status, setStatus] = useState('예열 준비');
  const finish = useRef(() => {});
  const done = useRef((controller) => finish.current(controller)).current;

  useEffect(() => {
    let cancelled = false;
    const samples = [];
    let sequence = 0;
    const runOne = async (variant, size, round, warmup) => {
      if (cancelled || AppState.currentState !== 'active') throw new Error('App must remain active');
      const reports = Array.from({ length: size }, (_, index) => ({
        id: `report-${index}`,
        reportType: index % 2 ? '부적절한 콘텐츠' : '스팸',
        targetTypeLabel: index % 3 ? '책이야기' : '회원',
        targetImageUrl: index % 2 ? `profile-${index}` : undefined,
        targetDisplayName: `신고 대상 ${index + 1}`,
        createdAtLabel: `2026.09.${String((index % 28) + 1).padStart(2, '0')}`,
        content: `신고 사유 ${index + 1} · 같은 길이의 렌더링 부하를 유지합니다.`,
      }));
      const metrics = {
        rowRenders: 0,
        mountedIds: new Set(),
        contentHeight: 0,
        viewportHeight: 0,
        scrollEvents: 0,
        scrollTargetOffset: 0,
      };
      setStatus(`${warmup ? '예열' : '측정'} ${round + 1} · ${size}개 · ${variant}`);
      await frame();
      await frame();
      const started = performance.now();
      const controller = await new Promise((resolve) => {
        finish.current = resolve;
        setTrial({ id: ++sequence, variant, size, reports, metrics, started });
      });
      if (!controller || metrics.viewportHeight <= 0 || metrics.contentHeight <= 0) {
        throw new Error('Missing scroll measurements');
      }
      const rowsAt250Ms = metrics.mountedIds.size;
      const frameGaps = [];
      let last = performance.now();
      for (let step = 1; step <= SCROLL_STEPS; step += 1) {
        await frame();
        const now = performance.now();
        frameGaps.push(now - last);
        last = now;
        controller.scrollToProgress(step / SCROLL_STEPS);
      }
      samples.push({
        sequence,
        variant,
        size,
        round,
        warmup,
        firstCommitMs: metrics.firstCommitMs,
        rowsAtFirstCommit: metrics.rowsAtFirstCommit,
        rowsAt250Ms,
        uniqueRowsAfterScroll: metrics.mountedIds.size,
        rowRenders: metrics.rowRenders,
        contentHeight: metrics.contentHeight,
        viewportHeight: metrics.viewportHeight,
        scrollEvents: metrics.scrollEvents,
        scrollTargetOffset: metrics.scrollTargetOffset,
        scrollFps: (frameGaps.length * 1000) / frameGaps.reduce((sum, gap) => sum + gap, 0),
        scrollFrameGaps: frameGaps,
      });
      setTrial(null);
      await frame();
      await frame();
    };
    const run = async () => {
      if (__DEV__ || !globalThis.HermesInternal) throw new Error('Release/Hermes build required');
      await pause(1500);
      for (const warmup of [true, false]) {
        for (let round = 0; round < (warmup ? WARMUPS : RUNS); round += 1) {
          const sizes = SIZES.map((_, index) => SIZES[(index + round) % SIZES.length]);
          if (round % 2) sizes.reverse();
          for (const size of sizes) {
            for (const variant of round % 2 ? ['after', 'before'] : ['before', 'after']) {
              await runOne(variant, size, round, warmup);
            }
          }
        }
      }
      const results = SIZES.flatMap((size) =>
        ['before', 'after'].map((variant) => {
          const group = samples.filter(
            (sample) => !sample.warmup && sample.size === size && sample.variant === variant,
          );
          const get = (key, p) => quantile(group.map((sample) => sample[key]), p);
          return {
            size,
            variant,
            samples: group.length,
            firstCommitMedianMs: get('firstCommitMs', 0.5),
            firstCommitP95Ms: get('firstCommitMs', 0.95),
            rowsAtFirstCommitMedian: get('rowsAtFirstCommit', 0.5),
            rowsAt250MsMedian: get('rowsAt250Ms', 0.5),
            scrollFpsMedian: get('scrollFps', 0.5),
            scrollFpsP5: get('scrollFps', 0.05),
            scrollMaxFrameGapP95Ms: quantile(
              group.map((sample) => Math.max(...sample.scrollFrameGaps)),
              0.95,
            ),
            scrollLongFramesTotal: group.reduce(
              (sum, sample) =>
                sum + sample.scrollFrameGaps.filter((milliseconds) => milliseconds > 20).length,
              0,
            ),
          };
        }),
      );
      writeResult({
        completedAt: new Date().toISOString(),
        platform: Platform.OS,
        osVersion: Platform.Version,
        dimensions: Dimensions.get('window'),
        release: !__DEV__,
        hermes: Boolean(globalThis.HermesInternal),
        warmups: WARMUPS,
        measuredRuns: RUNS,
        observeMs: OBSERVE_MS,
        scrollSteps: SCROLL_STEPS,
        scrollDistance: SCROLL_DISTANCE,
        metadata,
        results,
        samples,
      });
      setStatus('완료 · 결과 JSON 저장됨');
    };
    run().catch((error) => {
      writeResult({ error: String(error), samples });
      setStatus(`오류: ${String(error)}`);
    });
    return () => {
      cancelled = true;
    };
  }, [After, Before, done, metadata, writeResult]);

  return (
    <View style={styles.root}>
      <Text style={styles.status}>{status}</Text>
      {trial ? <Probe key={trial.id} trial={trial} Before={Before} After={After} done={done} /> : <View style={styles.scene} />}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingTop: 60, paddingBottom: 34, backgroundColor: '#fff' },
  status: { height: 32, textAlign: 'center', fontSize: 13, color: '#444' },
  scene: { flex: 1 },
});
