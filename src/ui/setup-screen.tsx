import { useEffect, useRef, useState } from 'react';
import { BackHandler, TextInput, View } from 'react-native';
import {
  DEFAULT_SETTINGS,
  validateSetup,
  type Language,
  type Player,
  type Settings,
  type Setup,
  type SessionSetup,
} from '../game/setup';
import { wordBank, unusedWords } from '../game/words';
import { teamName, translator, type Translate } from './copy';
import { Body, Button, Choices, Page, styles } from './notebook';

export function LanguageChoices({
  label,
  value,
  change,
  t,
  rtl,
}: {
  label: string;
  value: Language;
  change: (value: Language) => void;
  t: Translate;
  rtl: boolean;
}) {
  return (
    <Choices
      label={label}
      value={value}
      change={change}
      rtl={rtl}
      options={[
        ['en', t('en')],
        ['ar', t('ar')],
      ]}
    />
  );
}

export function Rules({
  t,
  rtl,
  mode,
  overview,
}: {
  t: Translate;
  rtl: boolean;
  mode?: Setup['mode'];
  overview?: boolean;
}) {
  return (
    <View style={styles.card}>
      {(!mode || overview) && <Body rtl={rtl}>{t('ruleDraw')}</Body>}
      {mode !== 'freeForAll' && <Body rtl={rtl}>{t('ruleTeams')}</Body>}
      {mode !== 'teams' && <Body rtl={rtl}>{t('ruleFreeForAll')}</Body>}
      {(!mode || overview) && (
        <>
          <Body rtl={rtl}>{t('ruleRestrictions')}</Body>
          <Body rtl={rtl}>{t('ruleJudging')}</Body>
        </>
      )}
      {!mode && (
        <>
          <Body rtl={rtl}>{t('ruleResults')}</Body>
          <Body rtl={rtl}>{t('ruleTie')}</Body>
        </>
      )}
    </View>
  );
}

function Order({
  ids,
  title,
  name,
  change,
  t,
  rtl,
}: {
  ids: readonly string[];
  title: string;
  name: (id: string) => string;
  change: (ids: string[]) => void;
  t: Translate;
  rtl: boolean;
}) {
  return (
    <View style={styles.card}>
      <Body rtl={rtl}>{title}</Body>
      {ids.map((id, index) => (
        <View key={id} style={[styles.row, rtl && styles.rtl]}>
          <Body rtl={rtl}>
            {index === 0
              ? t('first', { name: name(id) })
              : t('orderEntry', { number: index + 1, name: name(id) })}
          </Body>
          {index > 0 && (
            <Button
              label={t('earlier', { name: name(id) })}
              onPress={() => {
                const next = [...ids];
                [next[index - 1], next[index]] = [next[index], next[index - 1]];
                change(next);
              }}
            />
          )}
        </View>
      ))}
    </View>
  );
}

export function SetupScreen({
  language,
  setLanguage,
  back,
  start,
  initial,
  groupEditor,
}: {
  language: Language;
  setLanguage: (language: Language) => void;
  back: () => void;
  start?: (setup: SessionSetup) => void;
  initial?: SessionSetup;
  groupEditor?: {
    name: string;
    save: (name: string, setup: SessionSetup) => void;
    busy: boolean;
    failed: boolean;
  };
}) {
  const t = translator(language);
  const rtl = language === 'ar';
  const [mode, setMode] = useState<Setup['mode']>(
    initial?.mode ?? 'freeForAll',
  );
  const [groupName, setGroupName] = useState(groupEditor?.name ?? '');
  const [players, setPlayers] = useState<Player[]>(() =>
    initial
      ? initial.mode === 'freeForAll'
        ? initial.playerOrder.map((id) =>
            initial.players.find((player) => player.id === id)!,
          )
        : [...initial.players]
      : [
          { id: 'p1', name: '' },
          { id: 'p2', name: '' },
          { id: 'p3', name: '' },
        ],
  );
  const serial = useRef(4);
  const [teamCount, setTeamCount] = useState(initial?.teams.length || 2);
  const [members, setMembers] = useState<string[][]>(() => {
    if (initial?.teams.length)
      return Array.from({ length: 4 }, (_, index) => [
        ...(initial.teams[index]?.playerIds ?? []),
      ]);
    const ids = players.map(({ id }) => id);
    return [
      ids.filter((_, index) => index % 2 === 0),
      ids.filter((_, index) => index % 2 === 1),
      [],
      [],
    ];
  });
  const teamIds = Array.from({ length: 4 }, (_, index) => {
    if (initial?.teams[index]) return initial.teams[index].id;
    let id = `t${index + 1}`;
    while (initial?.teams.some((team) => team.id === id)) id += '_';
    return id;
  });
  const [teamOrder, setTeamOrder] = useState(() => [
    ...(initial?.teamOrder ?? []),
    ...teamIds.filter((id) => !initial?.teamOrder.includes(id)),
  ]);
  const [settingsDraft, setSettings] = useState(
    initial?.settings ?? DEFAULT_SETTINGS,
  );
  const [wordLanguage, setWordLanguage] = useState(
    initial?.settings.wordLanguage,
  );
  const settings = {
    ...settingsDraft,
    interfaceLanguage: language,
    wordLanguage: wordLanguage ?? language,
  };
  const [review, setReview] = useState(false);
  useEffect(() => {
    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        if (review) setReview(false);
        else back();
        return true;
      },
    );
    return () => subscription.remove();
  }, [back, review]);
  const [errors, setErrors] = useState<readonly string[]>([]);
  const teamsMode = mode === 'teams';
  const teams = members.slice(0, teamCount).map((playerIds, index) => ({
    id: teamIds[index],
    name: teamName(t, index + 1, initial?.teams[index]?.name),
    playerIds,
  }));
  const name = (id: string) =>
    players.find((player) => player.id === id)?.name.trim() ??
    teams.find((team) => team.id === id)?.name ??
    id;
  const order = teamOrder.filter((id) => teams.some((team) => team.id === id));
  const draft: Setup = {
    mode,
    players,
    teams: teamsMode ? teams : [],
    playerOrder: teamsMode ? [] : players.map((player) => player.id),
    teamOrder: teamsMode ? order : [],
    settings,
  };
  const valid = validateSetup(draft);
  const needed = (teamsMode ? teamCount : players.length) * settings.rounds;
  const available = unusedWords(
    wordBank,
    settings.wordLanguage,
    settings.difficulty,
    [],
  ).length;

  function distribute(count: number, shuffle: boolean) {
    const ids = players.map((player) => player.id);
    if (shuffle) {
      for (let index = ids.length - 1; index > 0; index--) {
        const other = Math.floor(Math.random() * (index + 1));
        [ids[other], ids[index]] = [ids[index], ids[other]];
      }
    }
    const next: string[][] = [[], [], [], []];
    ids.forEach((id, index) => next[index % count].push(id));
    setMembers(next);
  }

  function setSetting<K extends keyof Settings>(key: K, value: Settings[K]) {
    setSettings((previous) => ({ ...previous, [key]: value }));
  }

  if (review)
    return (
      <Page key="order" title={t('order')} rtl={rtl}>
        {teamsMode ? (
          <>
            <Order
              ids={order}
              title={t('teams')}
              name={name}
              t={t}
              rtl={rtl}
              change={(next) =>
                setTeamOrder([
                  ...next,
                  ...teamOrder.filter((id) => !next.includes(id)),
                ])
              }
            />
            {teams.map((team, index) => (
              <Order
                key={team.id}
                ids={team.playerIds}
                title={t('drawerOrder', { name: team.name })}
                name={name}
                t={t}
                rtl={rtl}
                change={(next) =>
                  setMembers((previous) =>
                    previous.map((list, i) => (i === index ? next : list)),
                  )
                }
              />
            ))}
          </>
        ) : (
          <Order
            ids={draft.playerOrder}
            title={t('players')}
            name={name}
            t={t}
            rtl={rtl}
            change={(next) =>
              setPlayers(
                next.map((id) => players.find((player) => player.id === id)!),
              )
            }
          />
        )}
        <View style={styles.card}>
          <Body rtl={rtl}>{t(mode)}</Body>
          {(
            [
              ['rounds', settings.rounds],
              ['timer', settings.timerSeconds],
              ['difficulty', t(settings.difficulty)],
              ['language', t(language)],
              ['wordLanguage', t(settings.wordLanguage)],
              ['sound', t(settings.sound ? 'on' : 'off')],
              ['vibration', t(settings.vibration ? 'on' : 'off')],
            ] as const
          ).map(([key, value]) => (
            <Body key={key} rtl={rtl}>
              {t('settingValue', { name: t(key), value })}
            </Body>
          ))}
        </View>
        <Rules t={t} rtl={rtl} mode={mode} />
        {needed > available && (
          <Body rtl={rtl}>{t('capacity', { needed, available })}</Body>
        )}
        <Button
          label={t('play')}
          testID="start-game"
          primary
          disabled={!valid.ok || needed > available}
          onPress={() => {
            if (valid.ok && needed <= available) start?.(valid.value);
          }}
        />
        <Button label={t('back')} onPress={() => setReview(false)} />
      </Page>
    );

  return (
    <Page
      key="setup"
      title={t(groupEditor ? (initial ? 'editGroup' : 'addGroup') : 'setup')}
      rtl={rtl}
    >
      <Button label={t('back')} onPress={back} disabled={groupEditor?.busy} />
      {groupEditor && (
        <TextInput
          value={groupName}
          onChangeText={setGroupName}
          accessibilityLabel={t('groupName')}
          placeholder={t('groupName')}
          maxLength={60}
          style={[
            styles.button,
            styles.input,
            styles.body,
            rtl ? styles.right : styles.left,
          ]}
        />
      )}
      <Choices
        label={t('mode')}
        options={[
          ['freeForAll', t('freeForAll')],
          ['teams', t('teams')],
        ]}
        value={mode}
        change={setMode}
        rtl={rtl}
      />
      <Rules t={t} rtl={rtl} mode={mode} />
      {teamsMode && (
        <View style={styles.card}>
          <Choices
            label={t('teams')}
            options={[2, 3, 4].map((count) => [count, String(count)] as const)}
            value={teamCount}
            change={(count) => {
              setTeamCount(count);
              distribute(count, false);
            }}
            rtl={rtl}
          />
          <Button
            label={t('shuffle')}
            onPress={() => distribute(teamCount, true)}
          />
        </View>
      )}
      <View style={styles.card}>
        <Body rtl={rtl}>{t('players')}</Body>
        {players.map((player, index) => {
          const label = t('player', { number: index + 1 });
          return (
            <View key={player.id} style={{ gap: 8 }}>
              <TextInput
                value={player.name}
                placeholder={label}
                accessibilityLabel={label}
                testID={`name-${player.id}`}
                autoCorrect={false}
                style={[
                  styles.button,
                  styles.input,
                  styles.body,
                  rtl ? styles.right : styles.left,
                ]}
                onChangeText={(name) =>
                  setPlayers((previous) =>
                    previous.map((item) =>
                      item.id === player.id ? { ...item, name } : item,
                    ),
                  )
                }
              />
              {teamsMode && (
                <Choices
                  label={t('assignment', { name: player.name.trim() || label })}
                  value={teams.findIndex((team) =>
                    team.playerIds.includes(player.id),
                  )}
                  options={teams.map(
                    (team, number) => [number, team.name] as const,
                  )}
                  rtl={rtl}
                  change={(target) =>
                    setMembers((previous) =>
                      previous.map((list, number) => {
                        const others = list.filter((id) => id !== player.id);
                        return number === target
                          ? [...others, player.id]
                          : others;
                      }),
                    )
                  }
                />
              )}
              <Button
                label={t('remove', { number: index + 1 })}
                onPress={() => {
                  setPlayers((previous) =>
                    previous.filter((item) => item.id !== player.id),
                  );
                  setMembers((previous) =>
                    previous.map((list) =>
                      list.filter((id) => id !== player.id),
                    ),
                  );
                }}
              />
            </View>
          );
        })}
        <Button
          label={t('add')}
          disabled={players.length >= (teamsMode ? 24 : 12)}
          onPress={() => {
            let id = `p${serial.current++}`;
            while (players.some((player) => player.id === id))
              id = `p${serial.current++}`;
            const target = members
              .slice(0, teamCount)
              .reduce(
                (smallest, list, index) =>
                  list.length < members[smallest].length ? index : smallest,
                0,
              );
            setPlayers((previous) => [...previous, { id, name: '' }]);
            setMembers((previous) =>
              previous.map((list, index) =>
                index === target ? [...list, id] : list,
              ),
            );
          }}
        />
      </View>
      {!groupEditor && (
        <View style={styles.card}>
          <Choices
            label={t('rounds')}
            testID="rounds"
            options={[1, 2, 3, 4, 5].map(
              (value) => [value, String(value)] as const,
            )}
            value={settings.rounds}
            change={(value) => setSetting('rounds', value)}
            rtl={rtl}
          />
          <Choices
            label={t('timer')}
            testID="timer"
            options={([30, 60, 90, 120] as const).map(
              (value) => [value, String(value)] as const,
            )}
            value={settings.timerSeconds}
            change={(value) => setSetting('timerSeconds', value)}
            rtl={rtl}
          />
          <Choices
            label={t('difficulty')}
            options={(['easy', 'medium', 'mixed'] as const).map(
              (value) => [value, t(value)] as const,
            )}
            value={settings.difficulty}
            change={(value) => setSetting('difficulty', value)}
            rtl={rtl}
          />
          <LanguageChoices
            label={t('language')}
            value={language}
            change={setLanguage}
            t={t}
            rtl={rtl}
          />
          <LanguageChoices
            label={t('wordLanguage')}
            value={settings.wordLanguage}
            change={setWordLanguage}
            t={t}
            rtl={rtl}
          />
          {(['sound', 'vibration'] as const).map((key) => (
            <Choices
              key={key}
              label={t(key)}
              value={settings[key]}
              change={(value) => setSetting(key, value)}
              rtl={rtl}
              options={[
                [true, t('on')],
                [false, t('off')],
              ]}
            />
          ))}
        </View>
      )}
      {errors.length > 0 && (
        <Body rtl={rtl}>
          {t(
            errors.some((key) =>
              ['playerNames', 'playerCount', 'teamSize'].includes(key),
            )
              ? 'rosterError'
              : 'settingsError',
          )}
        </Body>
      )}
      <Button
        label={t(groupEditor ? 'saveGroup' : 'review')}
        testID={groupEditor ? 'save-group' : 'review-order'}
        disabled={groupEditor && (groupEditor.busy || !groupName.trim())}
        primary
        onPress={() => {
          setErrors(valid.ok ? [] : valid.errors);
          if (!valid.ok) return;
          if (groupEditor) groupEditor.save(groupName, valid.value);
          else setReview(true);
        }}
      />
      {groupEditor?.failed && <Body rtl={rtl}>{t('groupFailed')}</Body>}
    </Page>
  );
}
