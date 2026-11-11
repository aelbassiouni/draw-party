import { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  AppState,
  Button,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useKeepAwake } from 'expo-keep-awake';
import { TurnProbe } from '../platform/turn-probe';
function RunningWake() {
  useKeepAwake('draw-party-turn-probe');
  return null;
}
export default function InterruptionScreen() {
  const [turn] = useState(() => new TurnProbe(() => performance.now()));
  const [state, setState] = useState(() => turn.read());
  const [reader, setReader] = useState(false);
  const bounds = useRef({ width: 0, height: 0 });
  const refresh = () => setState(turn.read());
  useEffect(() => {
    if (!state.running) return;
    const timeout = setTimeout(
      () => setState(turn.read()),
      turn.read().remaining,
    );
    return () => clearTimeout(timeout);
  }, [state.running, turn]);
  useEffect(() => {
    const update = () => setState(turn.read());
    const interrupt = () => {
      turn.interrupt();
      update();
    };
    const foreground = () => {
      turn.foreground();
      update();
    };
    const change = AppState.addEventListener('change', (value) => {
      if (value === 'active') foreground();
      else interrupt();
    });
    const blur = AppState.addEventListener('blur', interrupt);
    const focus = AppState.addEventListener('focus', foreground);
    if (AppState.currentState === 'active') foreground();
    let mounted = true;
    void AccessibilityInfo.isScreenReaderEnabled().then((value) => {
      if (mounted) setReader(value);
    });
    const accessibility = AccessibilityInfo.addEventListener(
      'screenReaderChanged',
      (value) => {
        setReader(value);
        turn.hide();
        update();
      },
    );
    const interval = setInterval(update, 1500);
    return () => {
      mounted = false;
      clearInterval(interval);
      change.remove();
      blur.remove();
      focus.remove();
      accessibility.remove();
      turn.interrupt();
    };
  }, [turn]);
  function hide() {
    turn.hide();
    refresh();
  }
  return (
    <ScrollView contentContainerStyle={styles.page}>
      <StatusBar barStyle="dark-content" />
      {state.running && <RunningWake />}
      <Text style={styles.title}>Interruption check</Text>
      <Text>Development probe · same word, 30 second timer</Text>
      <Text testID="turn-state">{state.running ? 'Running' : 'Paused'}</Text>
      <Text testID="privacy-state">
        {state.visible ? 'Word visible' : 'Word hidden'}
      </Text>
      <Text testID="remaining-ms">
        {state.running
          ? Math.ceil(state.remaining / 1000) * 1000
          : Math.round(state.remaining)}
      </Text>
      <Text testID="reader-state">
        {reader ? 'TalkBack on' : 'TalkBack off'}
      </Text>
      <Button
        title="Start / Resume"
        accessibilityLabel="resume-turn"
        disabled={state.running || !state.focused || state.remaining <= 0}
        onPress={() => {
          turn.start();
          refresh();
        }}
      />
      <Button
        title="Pause"
        accessibilityLabel="pause-turn"
        onPress={() => {
          turn.pause();
          refresh();
        }}
      />
      <Pressable
        testID="hold-word"
        accessible
        disabled={!state.running}
        onPress={() => {}}
        onLongPress={() => {}}
        accessibilityRole="button"
        accessibilityLabel="Hold to show word"
        accessibilityHint="Shield the screen. Double tap and hold with TalkBack. Release or move away to hide. The word is not spoken aloud."
        accessibilityState={{ disabled: !state.running }}
        onLayout={(event) => {
          bounds.current = event.nativeEvent.layout;
        }}
        onTouchStart={() => {
          turn.beginHold();
          refresh();
        }}
        onTouchMove={(event) => {
          const { locationX: x, locationY: y } = event.nativeEvent;
          turn.moveInside(
            x >= 0 &&
              y >= 0 &&
              x <= bounds.current.width &&
              y <= bounds.current.height,
          );
          refresh();
        }}
        onTouchEnd={hide}
        onPressOut={hide}
        onTouchCancel={hide}
        style={[styles.hold, !state.running && styles.disabled]}
      >
        <View pointerEvents="none">
          <Text style={styles.holdText}>Hold to show word</Text>
        </View>
      </Pressable>
      <View
        testID="private-surface"
        accessible={false}
        importantForAccessibility="no-hide-descendants"
        style={styles.secret}
      >
        <Text testID="secret-word" style={styles.word}>
          {state.visible ? 'Bicycle · عجلة' : 'Word hidden'}
        </Text>
      </View>
      <Text>Release, leave the control, pause, or switch away to hide.</Text>
      <Button
        title="Reset probe"
        accessibilityLabel="reset-turn"
        onPress={() => {
          turn.reset();
          refresh();
        }}
      />
    </ScrollView>
  );
}
const styles = StyleSheet.create({
  page: {
    flexGrow: 1,
    padding: 24,
    paddingTop: (StatusBar.currentHeight ?? 0) + 24,
    gap: 16,
    backgroundColor: '#fff8e9',
  },
  title: { fontSize: 28, fontWeight: '700' },
  hold: {
    minHeight: 100,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#334155',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#dcebe4',
  },
  holdText: { fontSize: 22 },
  disabled: { opacity: 0.5 },
  secret: { minHeight: 90, justifyContent: 'center' },
  word: { fontSize: 30, textAlign: 'center' },
});
