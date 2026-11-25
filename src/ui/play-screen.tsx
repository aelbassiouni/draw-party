import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import {
  AccessibilityInfo,
  AppState,
  BackHandler,
  Pressable,
  Text,
  Vibration,
  View,
} from 'react-native';
import { setAudioModeAsync, useAudioPlayer } from 'expo-audio';
import { useKeepAwake } from 'expo-keep-awake';
import {
  eligibleGuessers,
  remainingAt,
  scores,
  visibleWord,
  type Action,
} from '../game/engine';
import type { SessionController } from '../game/session';
import { translator } from './copy';
import { Body, Button, ConfirmDialog, Page, styles } from './notebook';

function Wake() {
  useKeepAwake('draw-party-drawing');
  return null;
}

export function PlayScreen({
  controller,
  home,
}: {
  controller: SessionController;
  home: () => void;
}) {
  const game = useSyncExternalStore(controller.subscribe, controller.read);
  const [now, setNow] = useState(controller.now);
  const [foreground, setForeground] = useState(
    () => AppState.currentState === 'active',
  );
  const active = useRef(foreground);
  const [privateReveal, setPrivateReveal] = useState(false);
  const [readerEnabled, setReaderEnabled] = useState(false);
  const [readerWord, setReaderWord] = useState(false);
  const [held, setHeld] = useState(false);
  const touching = useRef(false);
  const bounds = useRef({ width: 0, height: 0 });
  const [selection, setSelection] = useState<readonly string[]>([]);
  const [dialog, setDialog] = useState<'end' | 'exit' | 'reader' | null>(null);
  const audio = useAudioPlayer(require('../../assets/timeout-buzzer.wav'), {
    downloadFirst: true,
  });
  const feedbackGeneration = useRef(0);
  const soundReady = useRef(false);
  const feedbackTurn = useRef<string | null>(null);
  const t = translator(game.setup.settings.interfaceLanguage);
  const rtl = game.setup.settings.interfaceLanguage === 'ar';
  const turn = game.turn;
  const phase = turn?.phase;
  const phaseKind = phase?.kind;
  const running = phaseKind === 'drawing';
  const deadline =
    phase?.kind === 'drawing' ? phase.startedAt + phase.remainingMs : null;
  const timeout = phase?.kind === 'result' && phase.outcome.kind === 'timeout';
  const turnId = turn?.id;

  function hideHold() {
    touching.current = false;
    setHeld(false);
  }

  useEffect(() => {
    let mounted = true;
    void setAudioModeAsync({
      playsInSilentMode: false,
      allowsRecording: false,
      allowsBackgroundRecording: false,
      shouldPlayInBackground: false,
      interruptionMode: 'mixWithOthers',
    })
      .then(() => {
        if (mounted) soundReady.current = true;
      })
      .catch(() => {});
    const invalidateFeedback = () => {
      feedbackGeneration.current++;
    };
    const interrupt = () => {
      const at = controller.now();
      active.current = false;
      setForeground(false);
      setPrivateReveal(false);
      setReaderWord(false);
      hideHold();
      invalidateFeedback();
      audio.pause();
      Vibration.cancel();
      controller.dispatch(controller.read(), { kind: 'pause', at });
    };
    const focus = () => {
      active.current = AppState.currentState === 'active';
      setForeground(active.current);
    };
    const change = AppState.addEventListener('change', (state) => {
      if (state === 'active') focus();
      else interrupt();
    });
    const blur = AppState.addEventListener('blur', interrupt);
    const focused = AppState.addEventListener('focus', focus);
    const reader = AccessibilityInfo.addEventListener(
      'screenReaderChanged',
      (enabled) => {
        setReaderEnabled(enabled);
        setPrivateReveal(false);
        setReaderWord(false);
        hideHold();
      },
    );
    void AccessibilityInfo.isScreenReaderEnabled().then((enabled) => {
      if (mounted) setReaderEnabled(enabled);
    });
    focus();
    return () => {
      mounted = false;
      invalidateFeedback();
      Vibration.cancel();
      change.remove();
      blur.remove();
      focused.remove();
      reader.remove();
    };
  }, [audio, controller]);

  useEffect(() => {
    const back = BackHandler.addEventListener('hardwareBackPress', () => {
      if (dialog) {
        setDialog(null);
        return true;
      }
      if (!controller.read().turn) {
        home();
        return true;
      }
      setPrivateReveal(false);
      setReaderWord(false);
      hideHold();
      controller.dispatch(controller.read(), {
        kind: 'pause',
        at: controller.now(),
      });
      setDialog('exit');
      return true;
    });
    return () => back.remove();
  }, [controller, dialog, home]);

  useEffect(() => {
    if (deadline === null || !foreground) return;
    let timer: ReturnType<typeof setTimeout>;
    function tick() {
      if (!active.current || controller.read() !== game) return;
      const at = controller.now();
      setNow(at);
      const remaining = remainingAt(game, at);
      if (remaining === 0) {
        hideHold();
        controller.dispatch(game, { kind: 'expire', at });
      } else {
        timer = setTimeout(tick, remaining % 1000 || 1000);
      }
    }
    tick();
    return () => clearTimeout(timer);
  }, [controller, deadline, foreground, game]);

  const { sound, vibration } = game.setup.settings;
  useEffect(() => {
    if (!timeout || !foreground || !turnId || feedbackTurn.current === turnId)
      return;
    feedbackTurn.current = turnId;
    if (vibration) Vibration.vibrate(450);
    if (!sound || !soundReady.current) return;
    const token = feedbackGeneration.current;
    void audio
      .seekTo(0)
      .then(() => {
        if (
          active.current &&
          token === feedbackGeneration.current &&
          controller.read().turn?.id === turnId
        )
          audio.play();
      })
      .catch(() => {});
  }, [audio, controller, foreground, sound, timeout, turnId, vibration]);

  const name = (id: string) =>
    game.setup.players.find((player) => player.id === id)?.name ??
    game.setup.teams.find((team) => team.id === id)?.name ??
    id;
  const board = (
    <View style={styles.card}>
      {Object.entries(scores(game)).map(([id, number]) => (
        <Body key={id} rtl={rtl}>
          {t('points', { name: name(id), number })}
        </Body>
      ))}
    </View>
  );

  function send(action: Action) {
    if (!active.current || !foreground || controller.read() !== game) return;
    hideHold();
    setPrivateReveal(action.kind === 'reveal');
    setReaderWord(false);
    setSelection([]);
    if ('at' in action) setNow(action.at);
    controller.dispatch(game, action);
  }
  const timed = (kind: 'start' | 'resume' | 'pause' | 'guess') =>
    send({ kind, at: controller.now() });

  if (!turn || !phase)
    return (
      <Page
        title={t(game.completion === 'exhausted' ? 'exhausted' : 'complete')}
        rtl={rtl}
      >
        {board}
        {game.completion !== 'exhausted' && (
          <Body rtl={rtl}>{t('finishedLater')}</Body>
        )}
        <Button label={t('home')} onPress={home} />
      </Page>
    );

  if (dialog) {
    const [accept, prompt] = (
      {
        reader: ['readerWord', 'readerPrompt'],
        exit: ['home', 'exitPrompt'],
        end: ['noPoints', 'noPointsPrompt'],
      } as const
    )[dialog];
    return (
      <Page key="confirmation" title={t(accept)} rtl={rtl}>
        <ConfirmDialog
          rtl={rtl}
          prompt={t(prompt)}
          cancel={t('cancel')}
          accept={t(accept)}
          close={() => setDialog(null)}
          confirm={() => {
            setDialog(null);
            if (dialog === 'exit') home();
            else if (dialog === 'reader') {
              if (active.current && privateReveal && readerEnabled)
                setReaderWord(true);
            } else send({ kind: 'endWithoutPoints' });
          }}
        />
      </Page>
    );
  }

  const seconds = Math.ceil(remainingAt(game, now) / 1000);
  const team = turn.slot.teamId;
  const canConfirm = team !== null || selection.length > 0;
  const word = foreground
    ? visibleWord(
        game,
        (phase.kind === 'reveal' && privateReveal) ||
          (held && remainingAt(game, controller.now()) > 0),
      )
    : null;
  const title = {
    handoff: t('pass', { name: name(turn.slot.drawerId) }),
    reveal: t('pass', { name: name(turn.slot.drawerId) }),
    drawing: name(turn.slot.drawerId),
    paused: t('paused'),
    pending: t('pending'),
    result: 'outcome' in phase ? t(phase.outcome.kind) : '',
    between: t('scoreboard'),
  }[phase.kind];
  const guessers =
    team === null ? (
      <View style={styles.card}>
        <Body rtl={rtl}>{t('pick')}</Body>
        {eligibleGuessers(game).map((id) => (
          <Button
            key={id}
            testID={`guesser-${id}`}
            label={name(id)}
            selected={selection.includes(id)}
            onPress={() =>
              setSelection((previous) =>
                previous.includes(id)
                  ? previous.filter((value) => value !== id)
                  : [...previous, id],
              )
            }
          />
        ))}
      </View>
    ) : (
      <Body rtl={rtl}>{t('teamGuess', { name: name(team) })}</Body>
    );

  return (
    <Page key={phase.kind} title={title} rtl={rtl}>
      {running && foreground && <Wake />}
      <Body rtl={rtl}>
        {game.tiebreaker
          ? t('extra', { number: game.tiebreaker.round })
          : t('round', { number: turn.slot.round })}
      </Body>
      {(phase.kind === 'handoff' || phase.kind === 'reveal') && (
        <>
          <Body rtl={rtl}>{t('shield')}</Body>
          {phase.kind === 'handoff' || !privateReveal ? (
            <Button
              label={t('reveal')}
              testID="reveal-word"
              primary
              onPress={() => {
                if (!active.current) return;
                if (phase.kind === 'reveal') setPrivateReveal(true);
                else send({ kind: 'reveal' });
              }}
            />
          ) : (
            <Button
              label={t('start')}
              testID="start-drawing"
              primary
              onPress={() => timed('start')}
            />
          )}
        </>
      )}
      {phase.kind === 'reveal' &&
        privateReveal &&
        readerEnabled &&
        !readerWord && (
          <Button label={t('readerWord')} onPress={() => setDialog('reader')} />
        )}
      {running && (
        <>
          <Text
            testID="countdown"
            accessibilityLabel={t('seconds', { number: seconds })}
            style={[
              styles.title,
              {
                fontSize: 68,
                textAlign: 'center',
                fontVariant: ['tabular-nums'],
              },
            ]}
          >
            {seconds}
          </Text>
          <Button
            label={t('guessed')}
            testID="guessed"
            primary
            onPress={() => timed('guess')}
          />
          <Button
            label={t('pause')}
            testID="pause"
            onPress={() => timed('pause')}
          />
          <Pressable
            testID="hold-word"
            accessibilityRole="button"
            accessibilityLabel={t('hold')}
            accessibilityHint={t('holdHint')}
            onPress={() => {}}
            onLongPress={() => {}}
            onLayout={(event) => {
              bounds.current = event.nativeEvent.layout;
            }}
            onTouchStart={() => {
              if (
                !active.current ||
                controller.read() !== game ||
                remainingAt(game, controller.now()) === 0
              )
                return;
              touching.current = true;
              setHeld(true);
            }}
            onTouchMove={(event) => {
              const { locationX, locationY } = event.nativeEvent;
              if (
                touching.current &&
                (locationX < 0 ||
                  locationY < 0 ||
                  locationX > bounds.current.width ||
                  locationY > bounds.current.height)
              )
                hideHold();
            }}
            onTouchEnd={hideHold}
            onPressOut={hideHold}
            onTouchCancel={hideHold}
            style={styles.button}
          >
            <View
              pointerEvents="none"
              importantForAccessibility="no-hide-descendants"
            >
              {word === null ? (
                <Body rtl={rtl}>{t('hold')}</Body>
              ) : (
                <Body rtl={game.setup.settings.wordLanguage === 'ar'}>
                  {word}
                </Body>
              )}
            </View>
          </Pressable>
        </>
      )}
      {!running && word !== null && (
        <View
          testID="word-surface"
          style={styles.card}
          importantForAccessibility={
            phase.kind === 'result' || (phase.kind === 'reveal' && readerWord)
              ? 'auto'
              : 'no-hide-descendants'
          }
        >
          <Body rtl={game.setup.settings.wordLanguage === 'ar'}>{word}</Body>
        </View>
      )}
      {phase.kind === 'paused' && (
        <>
          <Body rtl={rtl}>{t('seconds', { number: seconds })}</Body>
          <Button
            label={t('resume')}
            testID="resume"
            primary
            onPress={() => timed('resume')}
          />
          <Button
            label={t('noPoints')}
            testID="end-without-points"
            onPress={() => setDialog('end')}
          />
        </>
      )}
      {phase.kind === 'pending' && (
        <>
          {guessers}
          <Button
            label={t('confirm')}
            testID="confirm-guess"
            disabled={!canConfirm}
            primary
            onPress={() => send({ kind: 'confirm', guesserIds: selection })}
          />
          <Button
            label={t('resume')}
            testID="resume"
            onPress={() => timed('resume')}
          />
        </>
      )}
      {phase.kind === 'result' && (
        <>
          {phase.outcome.kind === 'correct' &&
            phase.outcome.creditedIds.map((id) => (
              <Body key={id} rtl={rtl}>
                {t('awarded', { name: name(id) })}
              </Body>
            ))}
          {timeout && (
            <>
              {guessers}
              <Button
                label={t('corrected')}
                testID="last-second"
                disabled={!canConfirm}
                onPress={() =>
                  send({ kind: 'lastSecond', guesserIds: selection })
                }
              />
            </>
          )}
          <Button
            label={t('continue')}
            testID="show-scoreboard"
            primary
            onPress={() => send({ kind: 'continue' })}
          />
        </>
      )}
      {phase.kind === 'between' && (
        <>
          {board}
          <Button
            label={t('next')}
            testID="next-turn"
            primary
            onPress={() => send({ kind: 'advance' })}
          />
        </>
      )}
    </Page>
  );
}
