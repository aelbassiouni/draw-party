import type { ReactNode } from 'react';
import {
  Modal,
  Pressable,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

export const ink = '#27233b';
export const paper = '#fffdf7';
export const accent = '#423672';
export const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f1ebdf' },
  content: {
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
    padding: 18,
    gap: 14,
  },
  card: {
    backgroundColor: paper,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#d8cdbf',
    padding: 16,
    gap: 12,
  },
  row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  rtl: { flexDirection: 'row-reverse' },
  title: { fontSize: 32, fontWeight: '800', color: ink },
  heading: { fontSize: 20, fontWeight: '800', color: accent },
  body: { fontSize: 17, color: ink, maxWidth: '100%' },
  right: { textAlign: 'right', writingDirection: 'rtl' },
  left: { textAlign: 'left', writingDirection: 'ltr' },
  button: {
    minHeight: 48,
    minWidth: 48,
    paddingVertical: 12,
    paddingHorizontal: 16,
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: '#ede7f8',
    borderWidth: 1,
    borderColor: '#b0a2cd',
  },
  primary: { backgroundColor: accent, borderColor: accent },
  input: { backgroundColor: '#fff', flexShrink: 1 },
  white: { color: '#fff', fontWeight: '700' },
  disabled: { opacity: 0.55 },
});

export function Page({
  children,
  title,
  rtl,
  wide,
}: {
  children: ReactNode;
  title: string;
  rtl: boolean;
  wide?: boolean;
}) {
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[
        styles.content,
        {
          maxWidth: wide ? 1100 : 720,
          paddingTop: insets.top + 16,
          paddingBottom: insets.bottom + 20,
          paddingLeft: insets.left + 16,
          paddingRight: insets.right + 16,
        },
      ]}
      keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
      keyboardShouldPersistTaps="handled"
    >
      <StatusBar barStyle="dark-content" />
      <Text
        accessibilityRole="header"
        style={[styles.title, rtl ? styles.right : styles.left]}
      >
        {title}
      </Text>
      {children}
    </ScrollView>
  );
}

export function Body({ children, rtl }: { children: ReactNode; rtl: boolean }) {
  return (
    <Text style={[styles.body, rtl ? styles.right : styles.left]}>
      {children}
    </Text>
  );
}

export function Heading({
  children,
  rtl,
}: {
  children: ReactNode;
  rtl: boolean;
}) {
  return (
    <Text
      accessibilityRole="header"
      style={[styles.heading, rtl ? styles.right : styles.left]}
    >
      {children}
    </Text>
  );
}

export function Button({
  label,
  onPress,
  disabled,
  selected,
  primary,
  testID,
}: {
  label: string;
  onPress?: () => void;
  disabled?: boolean;
  selected?: boolean;
  primary?: boolean;
  testID?: string;
}) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityState={{ disabled, selected }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        { maxWidth: '100%', flexShrink: 1 },
        (primary || selected) && styles.primary,
        (pressed || disabled) && styles.disabled,
      ]}
    >
      <Text
        style={[
          styles.body,
          { textAlign: 'center' },
          (primary || selected) && styles.white,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function Choices<T extends string | number | boolean>({
  label,
  options,
  value,
  change,
  rtl,
  testID,
}: {
  label: string;
  options: readonly (readonly [T, string])[];
  value: T;
  change: (value: T) => void;
  rtl: boolean;
  testID?: string;
}) {
  return (
    <View style={{ gap: 8 }}>
      <Body rtl={rtl}>{label}</Body>
      <View style={[styles.row, rtl && styles.rtl]}>
        {options.map(([key, text]) => (
          <Button
            key={String(key)}
            testID={testID && `${testID}-${String(key)}`}
            label={text}
            selected={value === key}
            onPress={() => change(key)}
          />
        ))}
      </View>
    </View>
  );
}

export function ConfirmDialog({
  modal = false,
  prompt,
  accept,
  cancel,
  rtl,
  confirm,
  close,
}: {
  modal?: boolean;
  prompt: string;
  accept: string;
  cancel: string;
  rtl: boolean;
  confirm: () => void;
  close: () => void;
}) {
  const content = (
    <View style={styles.card}>
      <Body rtl={rtl}>{prompt}</Body>
      <View style={[styles.row, rtl && styles.rtl]}>
        <Button label={cancel} onPress={close} />
        <Button
          label={accept}
          primary
          onPress={confirm}
          testID="accept-dialog"
        />
      </View>
    </View>
  );
  if (!modal) return content;
  return (
    <Modal transparent animationType="fade" onRequestClose={close}>
      <SafeAreaProvider>
        <DialogSurface>{content}</DialogSurface>
      </SafeAreaProvider>
    </Modal>
  );
}

function DialogSurface({ children }: { children: ReactNode }) {
  const { top, bottom, left, right } = useSafeAreaInsets();
  return (
    <View
      accessibilityViewIsModal
      style={{
        flex: 1,
        justifyContent: 'center',
        backgroundColor: '#27233b88',
        paddingTop: top,
        paddingBottom: bottom,
        paddingLeft: left,
        paddingRight: right,
      }}
    >
      <ScrollView
        style={{ flexGrow: 0 }}
        contentContainerStyle={styles.content}
      >
        {children}
      </ScrollView>
    </View>
  );
}
