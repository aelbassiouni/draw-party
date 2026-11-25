import type { SessionSetup } from './setup';

export type RegularTurn = Readonly<{
  index: number;
  round: number;
  drawerId: string;
  teamId: string | null;
}>;

/** Returns null once the configured regular rounds are complete. */
export function regularTurnAt(
  setup: SessionSetup,
  index: number,
): RegularTurn | null {
  const order = setup.mode === 'teams' ? setup.teamOrder : setup.playerOrder;
  if (
    !Number.isInteger(index) ||
    index < 0 ||
    index >= order.length * setup.settings.rounds
  )
    return null;

  const roundIndex = Math.floor(index / order.length);
  const participantId = order[index % order.length];
  const team = setup.teams.find(({ id }) => id === participantId);

  return {
    index,
    round: roundIndex + 1,
    drawerId: team
      ? team.playerIds[roundIndex % team.playerIds.length]
      : participantId,
    teamId: team?.id ?? null,
  };
}
