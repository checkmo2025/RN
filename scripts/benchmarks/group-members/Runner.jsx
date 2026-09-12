import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { AppState, Dimensions, Platform, StyleSheet, Text, View } from 'react-native';

const SIZES = [20, 100, 500];
const WARMUPS = 5;
const RUNS = 30;
const OBSERVE_MS = 250;
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
  useLayoutEffect(() => {
    trial.metrics.firstCommitMs = performance.now() - trial.started;
    trial.metrics.cardsAtFirstCommit = trial.metrics.mountedIds.size;
    const timer = setTimeout(done, OBSERVE_MS);
    return () => clearTimeout(timer);
  }, [done, trial]);
  return (
    <View style={styles.scene}>
      <Component members={trial.members} metrics={trial.metrics} started={trial.started} />
    </View>
  );
}

export default function Runner({ Before, After, metadata, writeResult }) {
  const [trial, setTrial] = useState(null);
  const [status, setStatus] = useState('예열 준비');
  const finish = useRef(() => {});
  const done = useRef(() => finish.current()).current;

  useEffect(() => {
    let cancelled = false;
    const samples = [];
    let sequence = 0;
    const runOne = async (variant, size, round, warmup) => {
      if (cancelled || AppState.currentState !== 'active') throw new Error('App must remain active');
      const members = Array.from({ length: size }, (_, index) => ({
        id: `member-${index}`,
        nickname: `독서회원 ${index + 1}`,
        name: `이름 ${index + 1}`,
        email: `member${index + 1}@example.com`,
        joinedAt: `2026-09-${String((index % 28) + 1).padStart(2, '0')}`,
        role: index === 0 ? '개설자' : index % 7 === 0 ? '운영진' : '회원',
        profileImageUrl: index % 2 ? `profile-${index}` : undefined,
      }));
      const metrics = { cardRenders: 0, mountedIds: new Set() };
      const frameGaps = [];
      let raf;
      let last;
      const sampleFrame = () => {
        const now = performance.now();
        frameGaps.push(now - last);
        last = now;
        raf = requestAnimationFrame(sampleFrame);
      };
      setStatus(`${warmup ? '예열' : '측정'} ${round + 1} · ${size}명 · ${variant}`);
      await frame();
      await frame();
      const started = performance.now();
      last = started;
      raf = requestAnimationFrame(sampleFrame);
      await new Promise((resolve) => {
        finish.current = resolve;
        setTrial({ id: ++sequence, variant, size, members, metrics, started });
      });
      cancelAnimationFrame(raf);
      if (frameGaps.length === 0) throw new Error('Missing frame observations');
      samples.push({
        sequence,
        variant,
        size,
        round,
        warmup,
        firstCommitMs: metrics.firstCommitMs,
        firstContentLayoutMs: metrics.firstLayoutMs ?? null,
        cardsAtFirstCommit: metrics.cardsAtFirstCommit,
        cardsAt250Ms: metrics.mountedIds.size,
        cardRenders: metrics.cardRenders,
        frameGaps,
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
            cardsAtFirstCommitMedian: get('cardsAtFirstCommit', 0.5),
            cardsAt250MsMedian: get('cardsAt250Ms', 0.5),
            cardRendersMedian: get('cardRenders', 0.5),
            maxFrameGapP95Ms: quantile(
              group.map((sample) => Math.max(...sample.frameGaps)),
              0.95,
            ),
            longFramesTotal: group.reduce(
              (sum, sample) => sum + sample.frameGaps.filter((ms) => ms > 20).length,
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
      {trial ? (
        <Probe key={trial.id} trial={trial} Before={Before} After={After} done={done} />
      ) : (
        <View style={styles.scene} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingTop: 60, paddingBottom: 34, backgroundColor: '#fff' },
  status: { height: 32, textAlign: 'center', fontSize: 13, color: '#444' },
  scene: { flex: 1 },
});
