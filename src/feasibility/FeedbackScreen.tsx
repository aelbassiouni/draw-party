import { useEffect, useRef, useState } from 'react';
import {
  AppState,
  Button,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  Vibration,
  View,
} from 'react-native';
import {
  setAudioModeAsync,
  useAudioPlayer,
  useAudioPlayerStatus,
} from 'expo-audio';
import { useKeepAwake } from 'expo-keep-awake';

function RunningWake() {
  useKeepAwake('draw-party-timer');
  return null;
}

export default function FeedbackScreen() {
  const player = useAudioPlayer(require('../../assets/timeout-buzzer.wav'), {
    downloadFirst: true,
  });
  const status = useAudioPlayerStatus(player);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [sound, setSound] = useState(true);
  const [vibration, setVibration] = useState(true);
  const [running, setRunning] = useState(false);
  const [remaining, setRemaining] = useState(5000);
  const [message, setMessage] = useState('Ready');
  const [playbackStarts, setPlaybackStarts] = useState(0);
  const remainingRef = useRef(5000);
  const deadline = useRef(0);
  const runningRef = useRef(false);
  const generation = useRef(0);
  const options = useRef({ sound, vibration });
  useEffect(() => {
    let wasPlaying = false;
    const subscription = player.addListener('playbackStatusUpdate', (event) => {
      if (event.playing && !wasPlaying) setPlaybackStarts((count) => count + 1);
      wasPlaying = event.playing;
    });
    return () => subscription.remove();
  }, [player]);
  useEffect(() => {
    options.current = { sound, vibration };
  }, [sound, vibration]);

  useEffect(() => {
    let mounted = true;
    const invalidatePlayback = () => generation.current++;
    setAudioModeAsync({
      playsInSilentMode: false,
      allowsRecording: false,
      allowsBackgroundRecording: false,
      shouldPlayInBackground: false,
      interruptionMode: 'mixWithOthers',
    })
      .then(() => {
        if (mounted) setReady(true);
      })
      .catch((e) => {
        if (mounted) setError(String(e));
      });
    function suspend() {
      invalidatePlayback();
      if (runningRef.current) {
        remainingRef.current = Math.max(
          0,
          deadline.current - performance.now(),
        );
        setRemaining(remainingRef.current);
      }
      runningRef.current = false;
      setRunning(false);
      player.pause();
      Vibration.cancel();
      setMessage('Paused by interruption');
    }
    const change = AppState.addEventListener('change', (state) => {
      if (state !== 'active') suspend();
    });
    const blur = AppState.addEventListener('blur', suspend);
    return () => {
      mounted = false;
      invalidatePlayback();
      change.remove();
      blur.remove();
      Vibration.cancel();
    };
  }, [player]);

  useEffect(() => {
    if (!running) return;
    const interval = setInterval(() => {
      const time = Math.max(0, deadline.current - performance.now());
      remainingRef.current = time;
      setRemaining(time);
      if (time > 0 || !runningRef.current) return;
      runningRef.current = false;
      setRunning(false);
      setMessage("Time's up");
      const token = generation.current;
      if (options.current.vibration) Vibration.vibrate(450);
      if (options.current.sound) {
        void player
          .seekTo(0)
          .then(() => {
            if (
              token === generation.current &&
              AppState.currentState === 'active' &&
              options.current.sound
            )
              player.play();
          })
          .catch((e) => setError(String(e)));
      }
    }, 50);
    return () => clearInterval(interval);
  }, [running, player]);

  function pause() {
    generation.current++;
    if (runningRef.current)
      remainingRef.current = Math.max(0, deadline.current - performance.now());
    runningRef.current = false;
    setRemaining(remainingRef.current);
    setRunning(false);
    player.pause();
    Vibration.cancel();
    setMessage('Paused');
  }
  function start() {
    if (
      !ready ||
      !status.isLoaded ||
      runningRef.current ||
      AppState.currentState !== 'active'
    )
      return;
    generation.current++;
    if (remainingRef.current <= 0) remainingRef.current = 5000;
    deadline.current = performance.now() + remainingRef.current;
    runningRef.current = true;
    setRunning(true);
    setMessage('Running');
  }
  return (
    <ScrollView contentContainerStyle={styles.page}>
      <StatusBar barStyle="dark-content" />
      {running && <RunningWake />}
      <Text style={styles.title}>Feedback check</Text>
      <Text>Development probe · 5 second timer</Text>
      <View style={styles.row}>
        <Text>Sound</Text>
        <Switch
          accessibilityLabel="sound-switch"
          value={sound}
          onValueChange={(value) => {
            setSound(value);
            if (!value) {
              generation.current++;
              player.pause();
            }
          }}
        />
      </View>
      <View style={styles.row}>
        <Text>Vibration</Text>
        <Switch
          accessibilityLabel="vibration-switch"
          value={vibration}
          onValueChange={(value) => {
            setVibration(value);
            if (!value) Vibration.cancel();
          }}
        />
      </View>
      <Text testID="timer" style={styles.timer}>
        {(remaining / 1000).toFixed(1)}
      </Text>
      <Text testID="feedback-state">{message}</Text>
      <Text testID="playback-starts">Playback starts: {playbackStarts}</Text>
      <Text testID="audio-ready">
        {ready && status.isLoaded ? 'Audio ready' : 'Preparing audio'}
      </Text>
      <Text testID="audio-playing">
        {status.playing ? 'Playing' : 'Not playing'}
      </Text>
      <Button
        title="Start / Resume"
        accessibilityLabel="start-timer"
        onPress={start}
        disabled={!ready || !status.isLoaded || running}
      />
      <Button title="Pause" accessibilityLabel="pause-timer" onPress={pause} />
      <Button
        title="Reset"
        accessibilityLabel="reset-timer"
        onPress={() => {
          pause();
          remainingRef.current = 5000;
          setRemaining(5000);
          setMessage('Ready');
        }}
      />
      <Text accessibilityRole="alert">{error}</Text>
    </ScrollView>
  );
}
const styles = StyleSheet.create({
  page: {
    flexGrow: 1,
    padding: 24,
    paddingTop: (StatusBar.currentHeight ?? 0) + 24,
    gap: 18,
    backgroundColor: '#fff8e9',
  },
  title: { fontSize: 28, fontWeight: '700' },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timer: { fontSize: 72, textAlign: 'center' },
});
