import mongoose from 'mongoose';
import { Activity, Team, User, Workout } from '../models/index.js';

type ServiceError = Error & { status: number };
type ActivityInput = {
  userId: string;
  teamId: string;
  type: string;
  minutes: number;
};
type TeamInput = {
  name: string;
  mascot: string;
  members: string[];
};

function badRequest(message: string): ServiceError {
  return Object.assign(new Error(message), { status: 400 });
}

function notFound(message: string): ServiceError {
  return Object.assign(new Error(message), { status: 404 });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function requiredString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw badRequest(`${field} is required`);
  }
  return value.trim();
}

function objectId(value: unknown, field: string): string {
  if (typeof value !== 'string' || !/^[\da-f]{24}$/i.test(value)) {
    throw badRequest(`${field} must be a valid ID`);
  }
  return value;
}

function parseActivityInput(input: unknown): ActivityInput {
  if (!isRecord(input)) throw badRequest('Activity body must be an object');
  const userId = objectId(input.userId, 'userId');
  const teamId = objectId(input.teamId, 'teamId');
  const type = requiredString(input.type, 'type');
  if (typeof input.minutes !== 'number' || !Number.isFinite(input.minutes) || input.minutes <= 0) {
    throw badRequest('minutes must be a positive number');
  }
  return { userId, teamId, type, minutes: input.minutes };
}

function parseTeamInput(input: unknown): TeamInput {
  if (!isRecord(input)) throw badRequest('Team body must be an object');
  const name = requiredString(input.name, 'name');
  const mascot = requiredString(input.mascot, 'mascot');
  const members = input.members === undefined ? [] : input.members;
  if (!Array.isArray(members)) throw badRequest('members must be an array of user IDs');
  return {
    name,
    mascot,
    members: members.map((member) => objectId(member, 'member ID')),
  };
}

export async function listActivities() {
  return Activity.find().sort({ occurredAt: -1 }).lean();
}

export async function createActivity(input: unknown) {
  const { userId, teamId, type, minutes } = parseActivityInput(input);
  const [user, team] = await Promise.all([
    User.findById(userId).select('_id'),
    Team.findById(teamId).select('_id'),
  ]);
  if (!user) throw notFound('User not found');
  if (!team) throw notFound('Team not found');

  return Activity.create({
    user: user._id,
    team: team._id,
    type,
    minutes,
    points: minutes,
    occurredAt: new Date(),
  });
}

export async function listTeams() {
  return Team.find().sort({ name: 1 }).lean();
}

export async function createTeam(input: unknown) {
  const { name, mascot, members } = parseTeamInput(input);
  if (members.length > 0) {
    const existingMembers = await User.countDocuments({ _id: { $in: members } });
    if (existingMembers !== new Set(members).size) {
      throw notFound('One or more team members were not found');
    }
  }
  return Team.create({ name, mascot, members });
}

export async function getLeaderboard() {
  const teams = await Team.aggregate<{
    _id: mongoose.Types.ObjectId;
    name: string;
    totalPoints: number;
  }>([
    {
      $lookup: {
        from: Activity.collection.name,
        localField: '_id',
        foreignField: 'team',
        as: 'activities',
      },
    },
    {
      $addFields: {
        totalPoints: { $sum: '$activities.points' },
      },
    },
    { $sort: { totalPoints: -1, name: 1 } },
    { $project: { name: 1, totalPoints: 1 } },
  ]);

  return teams.map((team, index) => ({
    teamName: team.name,
    totalPoints: team.totalPoints,
    rank: index + 1,
  }));
}

function workoutFocusForActivity(type: string): string {
  const normalizedType = type.toLowerCase();
  if (['run', 'running', 'cycle', 'cycling', 'swim', 'swimming'].includes(normalizedType)) {
    return 'endurance';
  }
  if (['strength', 'weights', 'weightlifting'].includes(normalizedType)) return 'strength';
  if (['yoga', 'stretch', 'stretching', 'walk', 'walking'].includes(normalizedType)) return 'mobility';
  return normalizedType;
}

export async function suggestWorkouts(userEmail: string) {
  const email = userEmail.trim().toLowerCase();
  if (!email) throw badRequest('userEmail is required');

  const user = await User.findOne({ email }).select('_id fitnessGoal');
  if (!user) throw notFound('User not found');

  const [activities, workouts] = await Promise.all([
    Activity.find({ user: user._id }).sort({ occurredAt: -1 }).limit(10).select('type').lean(),
    Workout.find().sort({ title: 1 }).lean(),
  ]);

  const activityFocuses = activities.map(({ type }) => workoutFocusForActivity(type));
  const targetFocuses = [user.fitnessGoal.toLowerCase(), ...activityFocuses];
  const reasonForFocus = (focus: string) => {
    if (focus.toLowerCase() === user.fitnessGoal.toLowerCase()) {
      return `This matches your ${user.fitnessGoal} fitness goal.`;
    }
    const activityIndex = activityFocuses.findIndex((activityFocus) => activityFocus === focus.toLowerCase());
    if (activityIndex >= 0) {
      return `This supports your recent ${activities[activityIndex].type} activity.`;
    }
    return `This is a workout suggestion for your ${user.fitnessGoal} fitness goal.`;
  };

  return workouts
    .map((workout) => ({
      ...workout,
      reason: reasonForFocus(workout.focus),
      relevance: targetFocuses.findIndex((focus) => focus === workout.focus.toLowerCase()),
    }))
    .sort((left, right) => {
      const leftRelevance = left.relevance < 0 ? Number.MAX_SAFE_INTEGER : left.relevance;
      const rightRelevance = right.relevance < 0 ? Number.MAX_SAFE_INTEGER : right.relevance;
      return leftRelevance - rightRelevance || left.title.localeCompare(right.title);
    })
    .map(({ relevance: _relevance, ...workout }) => workout);
}

export { User };
