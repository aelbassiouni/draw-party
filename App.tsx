import { useEffect, useState } from 'react';
import { BackHandler, View } from 'react-native';
import { translator } from './src/ui/copy';
import { Button, Page, styles } from './src/ui/notebook';
import { PlayScreen } from './src/ui/play-screen';
import { LanguageChoices, Rules, SetupScreen } from './src/ui/setup-screen';
import { SessionController } from './src/game/session';
import type { Language } from './src/game/setup';

export default function App() {
  const [page, setPage] = useState<'home' | 'setup' | 'rules'>('home');
  const [language, setLanguage] = useState<Language>('en');
  const [session, setSession] = useState<SessionController | null>(null);
  const t = translator(language);
  const rtl = language === 'ar';
  useEffect(() => {
    if (page === 'home' || page === 'setup' || session) return;
    const back = BackHandler.addEventListener('hardwareBackPress', () => {
      setPage('home');
      return true;
    });
    return () => back.remove();
  }, [page, session]);

  if (session)
    return (
      <PlayScreen
        controller={session}
        home={() => {
          setSession(null);
          setPage('home');
        }}
      />
    );
  if (page === 'setup')
    return (
      <SetupScreen
        language={language}
        setLanguage={setLanguage}
        back={() => setPage('home')}
        start={(setup) => setSession(new SessionController(setup))}
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
        <Button
          label={t('setup')}
          testID="open-setup"
          primary
          onPress={() => setPage('setup')}
        />
        <Button label={t('groupsLater')} disabled />
        <Button label={t('rules')} onPress={() => setPage('rules')} />
      </View>
      <View style={styles.card}>
        <LanguageChoices
          label={t('language')}
          value={language}
          change={setLanguage}
          t={t}
          rtl={rtl}
        />
      </View>
    </Page>
  );
}
