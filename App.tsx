import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, BackHandler, Modal, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { translator } from './src/ui/copy';
import { Body, Button, ConfirmDialog, Page, styles } from './src/ui/notebook';
import { PlayScreen } from './src/ui/play-screen';
import { GroupsScreen } from './src/ui/groups-screen';
import { LanguageChoices, Rules, SetupScreen } from './src/ui/setup-screen';
import { SessionController } from './src/game/session';
import { wordBank } from './src/game/words';
import type { Game } from './src/game/engine';
import type { Language, SessionSetup } from './src/game/setup';
import {
  openSessionStore,
  sessionStorage,
} from './src/platform/open-session-store';

type Recovery =
  | { kind: 'loading' | 'failed' | 'empty' }
  | { kind: 'damaged'; key: string }
  | { kind: 'available'; game: Game; key: string };

async function inspectSave(): Promise<Recovery> {
  try {
    return await (await openSessionStore()).inspect();
  } catch {
    return { kind: 'failed' };
  }
}

export default function App() {
  return (
    <SafeAreaProvider>
      <NotebookApp />
    </SafeAreaProvider>
  );
}

function NotebookApp() {
  const [page, setPage] = useState<'home' | 'setup' | 'rules' | 'groups'>(
    'home',
  );
  const [language, setLanguage] = useState<Language>('en');
  const [preferencesReady, setPreferencesReady] = useState(false);
  const [session, setSession] = useState<SessionController | null>(null);
  const [recovery, setRecovery] = useState<Recovery>({ kind: 'loading' });
  const [initialSetup, setInitialSetup] = useState<SessionSetup>();
  const [replacement, setReplacement] = useState<{
    setup: SessionSetup;
    key: string;
  }>();
  const [guide, setGuide] = useState<{
    setup: SessionSetup;
    key: string | null;
  }>();
  const starting = useRef(false);
  const guideSaving = useRef(false);
  const languageWrite = useRef(Promise.resolve());
  const t = translator(language);
  const rtl = language === 'ar';

  const refresh = useCallback(async () => {
    setRecovery({ kind: 'loading' });
    setRecovery(await inspectSave());
  }, []);

  useEffect(() => {
    let mounted = true;
    void inspectSave().then((saved) => {
      if (mounted) setRecovery(saved);
    });
    void openSessionStore()
      .then((store) => store.loadInterfaceLanguage())
      .then((saved) => {
        if (mounted && saved) setLanguage(saved);
      })
      .catch(() => {
        if (mounted) Alert.alert(translator('en')('loadFailed'));
      })
      .finally(() => {
        if (mounted) setPreferencesReady(true);
      });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (page !== 'rules') return;
    const back = BackHandler.addEventListener('hardwareBackPress', () => {
      setPage('home');
      return true;
    });
    return () => back.remove();
  }, [page]);

  function changeLanguage(value: Language) {
    setLanguage(value);
    languageWrite.current = languageWrite.current.then(async () => {
      try {
        await (await openSessionStore()).saveInterfaceLanguage(value);
      } catch {
        Alert.alert(translator(value)('preferenceFailed'));
      }
    });
  }

  async function begin(setup: SessionSetup, key: string | null) {
    try {
      const recent = await (
        await openSessionStore()
      ).loadRecentWords(setup.settings.wordLanguage);
      setSession(
        new SessionController(
          setup,
          sessionStorage,
          wordBank,
          undefined,
          undefined,
          undefined,
          { key, recent },
        ),
      );
    } catch {
      Alert.alert(t('loadFailed'));
    } finally {
      starting.current = false;
    }
  }

  async function prepareGame(setup: SessionSetup, key: string | null) {
    try {
      await languageWrite.current;
      if (!(await (await openSessionStore()).hasSeenFirstGameGuide())) {
        setGuide({ setup, key });
        return;
      }
      await begin(setup, key);
    } catch {
      starting.current = false;
      Alert.alert(t('loadFailed'));
    }
  }

  async function dismissGuide() {
    if (!guide || guideSaving.current) return;
    guideSaving.current = true;
    try {
      await (await openSessionStore()).markFirstGameGuideSeen();
      setGuide(undefined);
      await begin(guide.setup, guide.key);
    } catch {
      Alert.alert(t('preferenceFailed'));
    } finally {
      guideSaving.current = false;
    }
  }

  function start(setup: SessionSetup) {
    if (starting.current) return;
    starting.current = true;
    if (recovery.kind === 'available' || recovery.kind === 'damaged') {
      setReplacement({ setup, key: recovery.key });
    } else if (recovery.kind === 'empty') void prepareGame(setup, null);
    else {
      starting.current = false;
      Alert.alert(t('loadFailed'));
    }
  }

  async function resume(saved: Extract<Recovery, { kind: 'available' }>) {
    if (starting.current) return;
    starting.current = true;
    try {
      await languageWrite.current;
      const { game, key } = saved;
      const recent = await (
        await openSessionStore()
      ).loadRecentWords(game.setup.settings.wordLanguage);
      setSession(
        new SessionController(
          game.setup,
          sessionStorage,
          wordBank,
          undefined,
          undefined,
          undefined,
          {
            game: { ...game, recent },
            key,
          },
        ),
      );
    } catch {
      Alert.alert(t('loadFailed'));
    } finally {
      starting.current = false;
    }
  }

  function showSetup(setup?: SessionSetup) {
    setInitialSetup(setup);
    setPage('setup');
  }

  if (!preferencesReady)
    return (
      <Page title={t('title')} rtl={rtl}>
        {null}
      </Page>
    );

  if (session)
    return (
      <PlayScreen
        controller={session}
        language={language}
        newGame={() => {
          setSession(null);
          setRecovery({ kind: 'empty' });
          showSetup();
        }}
        home={() => {
          setSession(null);
          setPage('home');
          void refresh();
        }}
      />
    );
  if (page === 'setup')
    return (
      <>
        <SetupScreen
          initial={initialSetup}
          language={language}
          setLanguage={changeLanguage}
          back={() => setPage(initialSetup ? 'groups' : 'home')}
          start={start}
        />
        {replacement && (
          <ConfirmDialog
            modal
            rtl={rtl}
            prompt={t('replacePrompt')}
            accept={t('replace')}
            cancel={t('cancel')}
            close={() => {
              setReplacement(undefined);
              starting.current = false;
            }}
            confirm={() => {
              setReplacement(undefined);
              void prepareGame(replacement.setup, replacement.key);
            }}
          />
        )}
        {guide && (
          <Modal
            onRequestClose={() => {
              if (guideSaving.current) return;
              setGuide(undefined);
              starting.current = false;
            }}
          >
            <SafeAreaProvider>
              <Page title={t('firstGameGuide')} rtl={rtl}>
                <Rules t={t} rtl={rtl} mode={guide.setup.mode} overview />
                <Button
                  label={t('play')}
                  testID="guide-play"
                  primary
                  onPress={() => void dismissGuide()}
                />
                <Button
                  label={t('skipGuide')}
                  testID="guide-skip"
                  onPress={() => void dismissGuide()}
                />
              </Page>
            </SafeAreaProvider>
          </Modal>
        )}
      </>
    );
  if (page === 'groups')
    return (
      <GroupsScreen
        language={language}
        back={() => setPage('home')}
        loadGroup={showSetup}
      />
    );
  if (page === 'rules')
    return (
      <Page title={t('rules')} rtl={rtl}>
        <Rules t={t} rtl={rtl} />
        <Button label={t('back')} onPress={() => setPage('home')} />
      </Page>
    );
  return (
    <Page title={t('title')} rtl={rtl}>
      <View style={styles.card}>
        {recovery.kind === 'available' && (
          <Button
            label={t(recovery.game.completion ? 'resumeResults' : 'resumeGame')}
            testID="resume-game"
            primary
            onPress={() => void resume(recovery)}
          />
        )}
        {(recovery.kind === 'failed' || recovery.kind === 'damaged') && (
          <>
            <Body rtl={rtl}>
              {t(recovery.kind === 'failed' ? 'loadFailed' : 'unreadable')}
            </Body>
            <Button label={t('retry')} onPress={() => void refresh()} />
          </>
        )}
        <Button
          label={t('setup')}
          testID="open-setup"
          primary={recovery.kind !== 'available'}
          disabled={recovery.kind === 'loading' || recovery.kind === 'failed'}
          onPress={() => showSetup()}
        />
        <Button
          label={t('groups')}
          testID="open-groups"
          onPress={() => setPage('groups')}
        />
        <Button label={t('rules')} onPress={() => setPage('rules')} />
      </View>
      <View style={styles.card}>
        <LanguageChoices
          label={t('language')}
          value={language}
          change={changeLanguage}
          t={t}
          rtl={rtl}
        />
      </View>
    </Page>
  );
}
