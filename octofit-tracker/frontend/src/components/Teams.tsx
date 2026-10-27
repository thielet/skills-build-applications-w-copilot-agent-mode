import { CapabilityCard } from './CapabilityCard.js';
import { getJson } from '../api/client.js';

type Team = {
  name: string;
  mascot?: string;
  members?: unknown[];
};

async function loadTeams() {
  const data = await getJson<{ teams: Team[] }>('/api/teams');
  return data.teams;
}

function renderTeam(team: Team) {
  const memberCount = team.members?.length ?? 0;
  return <><strong>{team.name}</strong>{team.mascot ? ` — ${team.mascot}` : ''} ({memberCount} {memberCount === 1 ? 'member' : 'members'})</>;
}

export default function Teams() {
  return (
    <CapabilityCard
      title="Teams"
      description="Manage teams and members."
      emptyMessage="No teams yet."
      loadItems={loadTeams}
      renderItem={renderTeam}
    />
  );
}
