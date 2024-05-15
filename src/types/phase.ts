type Phase = 'waiting' | 'planning' | 'ban' | 'pick' | 'done';
type Team = 'A' | 'B';

interface Turn {
  phase: Phase;
  team?: Team; // Optional because not all phases need a team
  picks?: number; // Optional because not all phases involve picking
}

export const turnSequence: Turn[] = [
  { phase: 'waiting' },
  { phase: 'planning' },
  // Ban Phase
  { phase: 'ban', team: 'A' },
  { phase: 'ban', team: 'B' },
  { phase: 'ban', team: 'A' },
  { phase: 'ban', team: 'B' },
  { phase: 'ban', team: 'A' },
  { phase: 'ban', team: 'B' },
  // Pick Phase
  { phase: 'pick', team: 'A', picks: 1 },
  { phase: 'pick', team: 'B', picks: 2 },
  { phase: 'pick', team: 'A', picks: 2 },
  { phase: 'pick', team: 'B', picks: 2 },
  { phase: 'pick', team: 'A', picks: 2 },
  { phase: 'pick', team: 'B', picks: 1 },
  { phase: 'done' },
];
