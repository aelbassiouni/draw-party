import { useEffect, useState } from 'react';
import {
  Alert,
  BackHandler,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

const strings = {
  en: {
    title: 'Language check',
    interface: 'Interface language',
    words: 'Word language',
    name: 'Player name',
    reveal: 'Reveal word',
    hide: 'Hide word',
    next: 'Next screen',
    back: 'Back',
    details: 'Player details',
    dialog: 'Open native dialog',
    message: 'Keep this player?',
    cancel: 'Cancel',
    confirm: 'Confirm',
    count: 'Confirmations',
  },
  ar: {
    title: 'تجربة اللغة',
    interface: 'لغة التطبيق',
    words: 'لغة الكلمات',
    name: 'اسم اللاعب',
    reveal: 'ورّيني الكلمة',
    hide: 'خبّي الكلمة',
    next: 'الشاشة اللي بعدها',
    back: 'رجوع',
    details: 'بيانات اللاعب',
    dialog: 'افتح رسالة التأكيد',
    message: 'نخلّي اللاعب ده؟',
    cancel: 'إلغاء',
    confirm: 'تأكيد',
    count: 'عدد التأكيدات',
  },
};

// Development feasibility probe; not the production game or persistence model.
export default function LanguageScreen() {
  const [language, setLanguage] = useState<'en' | 'ar'>('en');
  const [wordLanguage, setWordLanguage] = useState<'en' | 'ar'>('en');
  const [name, setName] = useState('نور Alex ٢');
  const [revealed, setRevealed] = useState(false);
  const [details, setDetails] = useState(false);
  const [confirmations, setConfirmations] = useState(0);
  const t = strings[language];
  const rtl = language === 'ar';
  const textStyle = {
    writingDirection: rtl ? ('rtl' as const) : ('ltr' as const),
    textAlign: rtl ? ('right' as const) : ('left' as const),
  };
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (!details) return false;
      setDetails(false);
      return true;
    });
    return () => sub.remove();
  }, [details]);
  function button(
    label: string,
    id: string,
    action: () => void,
    selected = false,
  ) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={id}
        accessibilityState={{ selected }}
        testID={id}
        onPress={action}
        style={[styles.button, selected && styles.selected]}
      >
        <Text style={[styles.buttonText, textStyle]}>{label}</Text>
      </Pressable>
    );
  }
  return (
    <ScrollView
      style={styles.page}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <View style={{ direction: 'ltr', gap: 12 }}>
        <Text style={[styles.title, textStyle]}>{t.title}</Text>
        <Text style={textStyle}>{t.interface}</Text>
        <View
          style={[styles.row, { flexDirection: rtl ? 'row-reverse' : 'row' }]}
        >
          {button('English', 'interface-en', () => setLanguage('en'), !rtl)}
          {button('مصري', 'interface-ar', () => setLanguage('ar'), rtl)}
        </View>
        <Text style={textStyle}>{t.words}</Text>
        <View
          style={[styles.row, { flexDirection: rtl ? 'row-reverse' : 'row' }]}
        >
          {button(
            'English',
            'words-en',
            () => setWordLanguage('en'),
            wordLanguage === 'en',
          )}
          {button(
            'مصري',
            'words-ar',
            () => setWordLanguage('ar'),
            wordLanguage === 'ar',
          )}
        </View>
        <Text style={textStyle}>{details ? t.details : t.name}</Text>
        {details ? (
          <Text
            testID="saved-name"
            style={[styles.name, { writingDirection: 'auto' }]}
          >
            {name}
          </Text>
        ) : (
          <TextInput
            accessibilityLabel="player-name"
            testID="player-name"
            value={name}
            onChangeText={setName}
            style={[
              styles.input,
              { textAlign: rtl ? 'right' : 'left', writingDirection: 'auto' },
            ]}
          />
        )}
        {button(revealed ? t.hide : t.reveal, 'toggle-word', () =>
          setRevealed(!revealed),
        )}
        {revealed && (
          <Text
            testID="secret-word"
            style={[
              styles.word,
              { writingDirection: wordLanguage === 'ar' ? 'rtl' : 'ltr' },
            ]}
          >
            {wordLanguage === 'ar' ? 'عجلة' : 'Bicycle'}
          </Text>
        )}
        {button(details ? t.back : t.next, 'navigate', () =>
          setDetails(!details),
        )}
        {button(t.dialog, 'native-dialog', () =>
          Alert.alert(t.message, name, [
            { text: t.cancel, style: 'cancel' },
            {
              text: t.confirm,
              onPress: () => setConfirmations((value) => value + 1),
            },
          ]),
        )}
        <Text testID="confirmation-count" style={textStyle}>
          {t.count}: {confirmations}
        </Text>
      </View>
    </ScrollView>
  );
}
const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#fff8e9' },
  content: {
    padding: 24,
    paddingTop: (StatusBar.currentHeight ?? 0) + 24,
    paddingBottom: 48,
  },
  title: { fontSize: 28, fontWeight: '700', color: '#252b36' },
  row: { flexDirection: 'row', gap: 12 },
  button: {
    minHeight: 48,
    padding: 12,
    borderWidth: 1,
    borderColor: '#475569',
    borderRadius: 10,
    justifyContent: 'center',
  },
  selected: { backgroundColor: '#dcebe4', borderWidth: 2 },
  buttonText: { fontSize: 17, color: '#252b36' },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 20,
  },
  name: { fontSize: 20 },
  word: { fontSize: 32, textAlign: 'center', padding: 12 },
});
