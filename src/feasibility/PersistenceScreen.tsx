import { useEffect, useState } from 'react';
import { Button, ScrollView, StatusBar, StyleSheet, Text } from 'react-native';
import {
  SampleSnapshot,
  SampleSnapshotStore,
} from '../platform/sample-snapshot';

export default function PersistenceScreen() {
  const [store, setStore] = useState<SampleSnapshotStore | null>(null);
  const [snapshot, setSnapshot] = useState<SampleSnapshot | null>(null);
  const [message, setMessage] = useState('Opening SQLite…');

  useEffect(() => {
    let active = true;
    let opened: SampleSnapshotStore | null = null;
    void SampleSnapshotStore.open()
      .then(async (value) => {
        opened = value;
        const saved = await value.read();
        if (active) {
          setStore(value);
          setSnapshot(saved);
          setMessage(saved ? 'Restored saved snapshot' : 'No saved snapshot');
        }
      })
      .catch((error: unknown) => {
        if (active) setMessage(`Open/read failed: ${String(error)}`);
      });
    return () => {
      active = false;
      if (opened) void opened.close();
    };
  }, []);

  async function write(failAfterWrite: boolean) {
    if (!store) return;
    const next: SampleSnapshot = {
      version: 1,
      revision: (snapshot?.revision ?? 0) + 1,
      player: 'Ada / آدا',
      remainingMs: 30000 - ((snapshot?.revision ?? 0) % 20) * 1000,
    };
    try {
      await store.save(next, failAfterWrite);
      setMessage('Transaction committed');
    } catch (error) {
      setMessage(`Transaction failed: ${String(error)}`);
    }
    try {
      setSnapshot(await store.read());
    } catch (error) {
      setMessage(`Read failed: ${String(error)}`);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.page}>
      <StatusBar barStyle="dark-content" />
      <Text style={styles.title}>SQLite persistence check</Text>
      <Text testID="storage-message">{message}</Text>
      <Text testID="snapshot-value">
        {snapshot ? JSON.stringify(snapshot) : 'Empty'}
      </Text>
      <Button
        title="Save next snapshot"
        disabled={!store}
        onPress={() => void write(false)}
      />
      <Button
        title="Inject failed transaction"
        disabled={!store}
        onPress={() => void write(true)}
      />
      <Button
        title="Read again"
        disabled={!store}
        onPress={() => {
          if (store)
            void store
              .read()
              .then(setSnapshot)
              .catch((error: unknown) => setMessage(String(error)));
        }}
      />
      <Text>
        Save, force stop and relaunch, then inject failure. The revision must
        survive relaunch and remain unchanged after failure.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: {
    flexGrow: 1,
    padding: 24,
    paddingTop: (StatusBar.currentHeight ?? 0) + 24,
    gap: 20,
    backgroundColor: '#fff8e9',
  },
  title: { fontSize: 28, fontWeight: '700' },
});
