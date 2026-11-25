import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import {
  AccessibilityInfo,
  AppState,
  BackHandler,
  Dimensions,
  Pressable,
  Text,
  useWindowDimensions,
  Vibration,
  View,
} from 'react-native';
import { setAudioModeAsync, useAudioPlayer } from 'expo-audio';
import { useKeepAwake } from 'expo-keep-awake';
import {
  correctionContext,
  editableResult,
  eligibleGuessers,
  remainingAt,
  scores,
  scoreBreakdown,
  visibleWord,
  type Action,
} from '../game/engine';
import {
  CHECKPOINT_INTERVAL_MS,
  type SessionController,
} from '../game/session';
import type { Language } from '../game/setup';
import { translator } from './copy';
import { Body, Button, ConfirmDialog, Heading, Page, styles } from './notebook';

function Wake() {
  useKeepAwake('draw-party-drawing');
  return null;
}

export function PlayScreen({
  controller,
  language,
  home,
  newGame,
}: {
  controller: SessionController;
  language: Language;
  home: () => void;
  newGame: () => void;
}) {
  const { game, status, frozenMs } = useSyncExternalStore(
    controller.subscribe,
    controller.readView,
  );
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
  const [correcting, setCorrecting] = useState(false);
  const [dialog, setDialog] = useState<
    'end' | 'exit' | 'reader' | 'restart' | 'endGame' | null
  >(null);
  const audio = useAudioPlayer(require('../../assets/timeout-buzzer.wav'), {
    downloadFirst: true,
  });
  const feedbackGeneration = useRef(0);
  const soundReady = useRef(false);
  const feedbackTurn = useRef(
    game.turn?.phase.kind === 'result' &&
      game.turn.phase.outcome.kind === 'timeout'
      ? game.turn.id
      : null,
  );
  const t = translator(language);
  const rtl = language === 'ar';
  const { width, height, fontScale } = useWindowDimensions();
  const turn = game.turn;
  const phase = turn?.phase;
  const phaseKind = phase?.kind;
  const running = phaseKind === 'drawing' && status === 'ready';
  const showDrawingScores = running && width >= 640;
  const wideDrawing =
    showDrawingScores && width >= 640 * Math.max(1, fontScale);
  const deadline =
    phase?.kind === 'drawing' ? phase.startedAt + phase.remainingMs : null;
  const timeout = phase?.kind === 'result' && phase.outcome.kind === 'timeout';
  const turnId = turn?.id;

  const hideHold = useCallback(() => {
    touching.current = false;
    setHeld(false);
  }, []);

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
      controller.interrupt(at);
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
    const resize = Dimensions.addEventListener('change', hideHold);
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
      resize.remove();
      reader.remove();
    };
  }, [audio, controller, hideHold]);

  useEffect(() => {
    const back = BackHandler.addEventListener('hardwareBackPress', () => {
      if (controller.readView().status !== 'ready') return true;
      if (dialog) {
        setDialog(null);
        return true;
      }
      if (correcting) {
        setCorrecting(false);
        return true;
      }
      if (!controller.read().turn) {
        controller.leave(home);
        return true;
      }
      setPrivateReveal(false);
      setReaderWord(false);
      hideHold();
      controller.interrupt(controller.now());
      setDialog('exit');
      return true;
    });
    return () => back.remove();
  }, [controller, correcting, dialog, hideHold, home]);

  useEffect(() => {
    if (!running || deadline === null || !foreground) return;
    let timer: ReturnType<typeof setTimeout>;
    function tick() {
      if (
        !active.current ||
        controller.read() !== game ||
        controller.readView().status !== 'ready'
      )
        return;
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
  }, [controller, deadline, foreground, game, hideHold, running]);

  useEffect(() => {
    if (!running || !foreground) return;
    let timer: ReturnType<typeof setTimeout>;
    function checkpoint() {
      if (active.current) controller.checkpoint(controller.now());
      // Native timers can catch up after a resize. Space out checkpoint attempts.
      timer = setTimeout(checkpoint, CHECKPOINT_INTERVAL_MS);
    }
    timer = setTimeout(checkpoint, CHECKPOINT_INTERVAL_MS);
    return () => clearTimeout(timer);
  }, [controller, foreground, game, running]);

  const { sound, vibration } = game.setup.settings;
  useEffect(() => {
    if (
      status !== 'ready' ||
      !timeout ||
      !foreground ||
      !turnId ||
      feedbackTurn.current === turnId
    )
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
  }, [
    audio,
    controller,
    foreground,
    sound,
    status,
    timeout,
    turnId,
    vibration,
  ]);

  useEffect(
    () =>
      controller.subscribe(() => {
        if (controller.readView().status !== 'ready') hideHold();
      }),
    [controller, hideHold],
  );

  const name = (id: string) =>
    game.setup.players.find((player) => player.id === id)?.name ??
    game.setup.teams.find((team) => team.id === id)?.name ??
    id;
  const board = (withHeading = false) => (
    <View style={styles.card} testID="score-panel">
      {withHeading && <Heading rtl={rtl}>{t('scoreboard')}</Heading>}
      {Object.entries(scores(game)).map(([id, number]) => (
        <Body key={id} rtl={rtl}>
          {t('points', { name: name(id), number })}
        </Body>
      ))}
    </View>
  );

  function send(action: Action) {
    if (
      !active.current ||
      !foreground ||
      controller.read() !== game ||
      controller.readView().status !== 'ready'
    )
      return;
    hideHold();
    setPrivateReveal(action.kind === 'reveal');
    setReaderWord(false);
    setSelection([]);
    if ('at' in action) setNow(action.at);
    controller.dispatch(game, action);
  }
  const timed = (kind: 'start' | 'resume' | 'pause' | 'guess') =>
    send({ kind, at: controller.now() });

  if (status !== 'ready')
    return (
      <Page title={t(status === 'retry' ? 'saveFailed' : 'saving')} rtl={rtl}>
        {frozenMs !== undefined && (
          <Body rtl={rtl}>
            {t('seconds', { number: Math.ceil(frozenMs / 1000) })}
          </Body>
        )}
        {status === 'retry' && (
          <Button
            label={t('retrySave')}
            testID="retry-save"
            onPress={() => controller.retry()}
          />
        )}
      </Page>
    );

  const target = editableResult(game);
  const editContext = correctionContext(game);
  function openCorrection() {
    const outcome = target?.phase;
    setSelection(
      outcome && 'outcome' in outcome && outcome.outcome.kind === 'correct'
        ? eligibleGuessers(editContext).filter(
            (id) =>
              outcome.outcome.kind === 'correct' &&
              outcome.outcome.creditedIds.includes(id),
          )
        : [],
    );
    setCorrecting(true);
  }

  if (correcting && target) {
    const team = target.slot.teamId;
    const correct = (ids: readonly string[] | null) => {
      controller.correct(game, ids);
      setCorrecting(false);
      setSelection([]);
    };
    return (
      <Page
        title={t(game.completion ? 'correctFinal' : 'editResult')}
        rtl={rtl}
      >
        <View style={styles.card}>
          <Body rtl={rtl}>{name(target.slot.drawerId)}</Body>
          <Body rtl={game.setup.settings.wordLanguage === 'ar'}>
            {target.word.text}
          </Body>
        </View>
        {team === null ? (
          <>
            <Body rtl={rtl}>{t('pick')}</Body>
            {eligibleGuessers(editContext).map((id) => (
              <Button
                key={id}
                testID={`final-guesser-${id}`}
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
          </>
        ) : (
          <Body rtl={rtl}>{t('teamGuess', { name: name(team) })}</Body>
        )}
        <Button
          label={t('confirm')}
          testID="save-final-correction"
          disabled={team === null && selection.length === 0}
          onPress={() => correct(selection)}
        />
        <Button
          label={t('saveNoPoints')}
          testID="final-no-points"
          onPress={() => correct(null)}
        />
        <Button label={t('cancel')} onPress={() => setCorrecting(false)} />
      </Page>
    );
  }

  if (!turn || !phase) {
    return (
      <Page
        title={t(game.completion === 'exhausted' ? 'exhausted' : 'complete')}
        rtl={rtl}
      >
        <View testID="final-results" style={styles.card}>
          {game.winners.length === 1 && (
            <Body rtl={rtl}>
              {t('winner', { name: name(game.winners[0]) })}
            </Body>
          )}
          {game.winners.length > 1 && (
            <>
              <Body rtl={rtl}>{t('sharedWinners')}</Body>
              {game.winners.map((id) => (
                <Body key={id} rtl={rtl}>
                  {name(id)}
                </Body>
              ))}
            </>
          )}
          {game.tiebreaker && (
            <Body rtl={rtl}>
              {t('extra', { number: game.tiebreaker.round })}
            </Body>
          )}
          {Object.entries(scoreBreakdown(game)).map(([id, row]) => (
            <View key={id} testID={`final-score-${id}`}>
              <Body rtl={rtl}>{name(id)}</Body>
              <Body rtl={rtl}>{t('breakdown', row)}</Body>
            </View>
          ))}
        </View>
        {game.finalTurn && (
          <Button
            label={t('correctFinal')}
            testID="correct-final"
            onPress={openCorrection}
          />
        )}
        <Button
          label={t('playAgain')}
          testID="play-again"
          primary
          onPress={() => controller.restart(game)}
        />
        <Button
          label={t('newGame')}
          testID="new-game"
          onPress={() => controller.leave(newGame)}
        />
        <Button label={t('home')} onPress={() => controller.leave(home)} />
      </Page>
    );
  }

  if (dialog) {
    const [accept, prompt] = (
      {
        reader: ['readerWord', 'readerPrompt'],
        exit: ['saveHome', 'exitPrompt'],
        restart: ['restart', 'restartPrompt'],
        endGame: ['endGame', 'endGamePrompt'],
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
            if (dialog === 'exit') controller.suspend(home);
            else if (dialog === 'restart') controller.restart(game);
            else if (dialog === 'endGame') controller.leave(home);
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
  const round = (
    <Body rtl={rtl}>
      {game.tiebreaker
        ? t('extra', { number: game.tiebreaker.round })
        : t('round', { number: turn.slot.round })}
    </Body>
  );

  return (
    <Page key={phase.kind} title={title} rtl={rtl} wide={wideDrawing}>
      {running && foreground && <Wake />}
      {!showDrawingScores && round}
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
        <View
          style={{
            flexDirection: wideDrawing
              ? rtl
                ? 'row-reverse'
                : 'row'
              : 'column',
            alignItems: wideDrawing ? 'flex-start' : 'stretch',
            gap: 14,
          }}
        >
          <View style={[styles.card, wideDrawing && { flex: 3, minWidth: 0 }]}>
            <Text
              testID="countdown"
              accessibilityLabel={t('seconds', { number: seconds })}
              style={[
                styles.title,
                {
                  fontSize: height < 500 || fontScale > 1.3 ? 52 : 68,
                  textAlign: 'center',
                  fontVariant: ['tabular-nums'],
                },
              ]}
            >
              {seconds}
            </Text>
            <View
              style={wideDrawing ? [styles.row, rtl && styles.rtl] : { gap: 8 }}
            >
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
            </View>
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
          </View>
          {showDrawingScores && (
            <View style={[{ gap: 8 }, wideDrawing && { flex: 2, minWidth: 0 }]}>
              {round}
              {board(true)}
            </View>
          )}
        </View>
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
          <Button label={t('restart')} onPress={() => setDialog('restart')} />
          <Button label={t('endGame')} onPress={() => setDialog('endGame')} />
          <Button label={t('saveHome')} onPress={() => setDialog('exit')} />
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
          {board()}
          <Button
            label={t('next')}
            testID="next-turn"
            primary
            onPress={() => send({ kind: 'advance' })}
          />
        </>
      )}
      {target && (
        <Button
          label={t(phase.kind === 'result' ? 'editResult' : 'undoResult')}
          testID="edit-result"
          onPress={openCorrection}
        />
      )}
    </Page>
  );
}
