import { CapabilityCard } from './CapabilityCard.js';
import { getJson } from '../api/client.js';

type Activity = {
  type: string;
  minutes: number;
  points: number;
};

async function loadActivities() {
  const data = await getJson<{ activities: Activity[] }>('/api/activities');
  return data.activities;
}

function renderActivity(activity: Activity) {
  return <><strong>{activity.type}</strong> — {activity.minutes} minutes, {activity.points} points</>;
}

export default function Activities() {
  return (
    <CapabilityCard
      title="Activities"
      description="Track student activity minutes and points."
      emptyMessage="No activities yet."
      loadItems={loadActivities}
      renderItem={renderActivity}
    />
  );
}
