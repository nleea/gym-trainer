// ui-types.ts (o dentro del view)
export type UiSet = {
  reps: number;
  weight: number;
  completed: boolean;
};

export type UiExercise = {
  source: "plan" | "extra";
  planExerciseId?: string; // si viene del plan
  exerciseId: string;      // id local

  name: string;

  setsCount: number;
  reps: number;
  weight: number;
  rest: number;
  notes: string;

  sets: UiSet[] 
};
