import { CapabilityCard } from './CapabilityCard.js';
import { getJson } from '../api/client.js';

type Workout = {
  title: string;
  focus?: string;
  minutes?: number;
  difficulty?: string;
  reason?: string;
};

async function loadSuggestions() {
  const userEmail = 'mona@example.com';
  const data = await getJson<{ suggestions: Workout[] }>(
    `/api/workouts/suggestions/${encodeURIComponent(userEmail)}`,
  );
  return data.suggestions;
}

function renderWorkout(workout: Workout) {
  return (
    <>
      <strong>{workout.title}</strong>
      {workout.focus ? ` — ${workout.focus}` : ''}
      {workout.minutes !== undefined ? `, ${workout.minutes} minutes` : ''}
      {workout.difficulty ? ` (${workout.difficulty})` : ''}
      {workout.reason ? <p className="mb-0 mt-1">{workout.reason}</p> : null}
    </>
  );
}

export default function Workouts() {
  return (
    <CapabilityCard
      title="Workout suggestions"
      description="Recommend workouts from activity patterns."
      emptyMessage="No workout suggestions are available."
      loadItems={loadSuggestions}
      renderItem={renderWorkout}
    />
  );
}
