import { CapabilityCard } from './CapabilityCard.js';
import { getJson } from '../api/client.js';

type Entry = {
  teamName: string;
  totalPoints: number;
  rank: number;
};

async function loadLeaderboard() {
  const data = await getJson<{ leaderboard: Entry[] }>('/api/leaderboard');
  return data.leaderboard;
}

function renderEntry(entry: Entry) {
  return <><strong>#{entry.rank} {entry.teamName}</strong> — {entry.totalPoints} points</>;
}

export default function Leaderboard() {
  return (
    <CapabilityCard
      title="Leaderboard"
      description="Compare team point totals."
      emptyMessage="No leaderboard rankings yet."
      loadItems={loadLeaderboard}
      renderItem={renderEntry}
    />
  );
}
