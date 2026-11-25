import { useEffect, useRef, useState } from 'react';
import { BackHandler, View } from 'react-native';
import type { Language, SessionSetup } from '../game/setup';
import { openSessionStore } from '../platform/open-session-store';
import type { SqliteSessionStore } from '../platform/session-store';
import { directionalName, translator } from './copy';
import { Body, Button, ConfirmDialog, Page, styles } from './notebook';
import { SetupScreen } from './setup-screen';

type Group = Awaited<ReturnType<SqliteSessionStore['loadGroups']>>[number];

export function GroupsScreen({
  language,
  back,
  loadGroup,
}: {
  language: Language;
  back: () => void;
  loadGroup: (setup: SessionSetup) => void;
}) {
  const t = translator(language);
  const rtl = language === 'ar';
  const [groups, setGroups] = useState<Group[]>();
  const [editor, setEditor] = useState<Group | 'new' | null>(null);
  const [deleting, setDeleting] = useState<Group | null>(null);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const locked = useRef(false);
  const newGroupId = useRef('');

  useEffect(() => {
    let mounted = true;
    void openSessionStore()
      .then((store) => store.loadGroups())
      .then((loaded) => {
        if (mounted) setGroups(loaded);
      })
      .catch(() => {
        if (mounted) setFailed(true);
      });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (editor) return;
    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        if (!locked.current) back();
        return true;
      },
    );
    return () => subscription.remove();
  }, [back, editor]);

  async function update(
    change?: (store: SqliteSessionStore) => Promise<void>,
    close = false,
  ) {
    if (locked.current) return;
    locked.current = true;
    setBusy(true);
    setFailed(false);
    try {
      const store = await openSessionStore();
      await change?.(store);
      setGroups(await store.loadGroups());
      if (close) setEditor(null);
    } catch {
      setFailed(true);
    } finally {
      locked.current = false;
      setBusy(false);
    }
  }

  if (editor) {
    const group = editor === 'new' ? undefined : editor;
    return (
      <SetupScreen
        language={language}
        setLanguage={() => {}}
        initial={group?.setup}
        back={() => {
          if (locked.current) return;
          setFailed(false);
          setEditor(null);
        }}
        groupEditor={{
          name: group?.name ?? '',
          busy,
          failed,
          save: (name, setup) => {
            const id = group?.id ?? newGroupId.current;
            void update((store) => store.saveGroup(id, setup, name), true);
          },
        }}
      />
    );
  }

  return (
    <Page title={t('groups')} rtl={rtl}>
      <Button label={t('back')} onPress={back} disabled={busy} />
      <Button
        label={t('addGroup')}
        onPress={() => {
          setFailed(false);
          newGroupId.current = `group-${Date.now()}-${Math.random().toString(36).slice(2)}`;
          setEditor('new');
        }}
        disabled={busy || !groups}
        primary
      />
      {groups?.length === 0 && <Body rtl={rtl}>{t('noGroups')}</Body>}
      {failed && (
        <>
          <Body rtl={rtl}>{t('groupFailed')}</Body>
          <Button
            label={t('retry')}
            onPress={() => void update()}
            disabled={busy}
          />
        </>
      )}
      {groups?.map((group) => {
        const name = group.name ?? group.id;
        return (
          <View key={group.id} style={styles.card}>
            <Body rtl={rtl}>{name}</Body>
            <Body rtl={rtl}>
              {group.setup.players
                .map((player) => directionalName(player.name, language))
                .join(rtl ? '، ' : ', ')}
            </Body>
            <Button
              label={t('loadGroup')}
              disabled={busy}
              onPress={() => loadGroup(group.setup)}
            />
            <Button
              label={t('editGroup')}
              disabled={busy}
              onPress={() => {
                setFailed(false);
                setEditor(group);
              }}
            />
            <Button
              label={t('deleteGroup')}
              disabled={busy}
              onPress={() => setDeleting(group)}
            />
          </View>
        );
      })}
      {deleting && (
        <ConfirmDialog
          modal
          rtl={rtl}
          prompt={t('deleteGroupPrompt', {
            name: deleting.name ?? deleting.id,
          })}
          accept={t('deleteGroup')}
          cancel={t('cancel')}
          close={() => setDeleting(null)}
          confirm={() => {
            setDeleting(null);
            void update((store) => store.deleteGroup(deleting.id));
          }}
        />
      )}
    </Page>
  );
}
