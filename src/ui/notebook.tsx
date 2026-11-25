import type { ReactNode } from 'react';
import {
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';

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
    paddingTop: (StatusBar.currentHeight ?? 0) + 20,
    paddingBottom: 48,
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
  body: { fontSize: 17, color: ink },
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
  white: { color: '#fff', fontWeight: '700' },
  disabled: { opacity: 0.55 },
});

export function Page({
  children,
  title,
  rtl,
}: {
  children: ReactNode;
  title: string;
  rtl: boolean;
}) {
  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
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
}: {
  label: string;
  options: readonly (readonly [T, string])[];
  value: T;
  change: (value: T) => void;
  rtl: boolean;
}) {
  return (
    <View style={{ gap: 8 }}>
      <Body rtl={rtl}>{label}</Body>
      <View style={[styles.row, rtl && styles.rtl]}>
        {options.map(([key, text]) => (
          <Button
            key={String(key)}
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
  prompt,
  accept,
  cancel,
  rtl,
  confirm,
  close,
}: {
  prompt: string;
  accept: string;
  cancel: string;
  rtl: boolean;
  confirm: () => void;
  close: () => void;
}) {
  return (
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
}
