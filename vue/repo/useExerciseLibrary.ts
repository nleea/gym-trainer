import { computed, ref } from "vue";
import { api } from "../api";

export type MuscleGroup =
  | "Piernas" | "Pecho" | "Espalda" | "Hombros" | "Brazos" | "Core" | "Cardio";

export type Exercise = {
  id: string;
  name: string;
  muscleGroup: MuscleGroup;
  equipment?: string;
  notes?: string;
  description?: string;
  active: boolean;
  createdAt?: any;
  updatedAt?: any;
};

// Mapeo de snake_case (backend) a camelCase (frontend)
function mapExercise(raw: any): Exercise {
  return {
    id: raw.id,
    name: raw.name,
    muscleGroup: (raw.muscle_group ?? "Core") as MuscleGroup,
    description: raw.description ?? undefined,
    active: true,
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
  };
}

export function useExerciseLibrary(_coachId?: string) {
  const library = ref<Exercise[]>([]);
  const loading = ref(false);

  async function start() {
    loading.value = true;
    try {
      const data = await api.get<any[]>("/exercises");
      library.value = data.map(mapExercise);
    } catch {
      library.value = [];
    } finally {
      loading.value = false;
    }
  }

  function stop() {}

  async function createExercise(payload: Omit<Exercise, "id" | "createdAt" | "updatedAt">) {
    const raw = await api.post<any>("/exercises", {
      name: payload.name,
      muscle_group: payload.muscleGroup,
      description: payload.description ?? payload.notes ?? null,
    });
    const newEx = mapExercise(raw);
    library.value = [...library.value, newEx];
    return newEx;
  }

  async function updateExercise(exerciseId: string, patch: Partial<Exercise>) {
    const raw = await api.put<any>(`/exercises/${exerciseId}`, {
      name: patch.name,
      muscle_group: patch.muscleGroup,
      description: patch.description ?? patch.notes ?? undefined,
    });
    const updated = mapExercise(raw);
    library.value = library.value.map((e) => (e.id === exerciseId ? updated : e));
    return updated;
  }

  async function deleteExercise(exerciseId: string) {
    await api.delete(`/exercises/${exerciseId}`);
    library.value = library.value.filter((e) => e.id !== exerciseId);
  }

  return {
    library: computed(() => library.value),
    loading,
    start,
    stop,
    createExercise,
    updateExercise,
    deleteExercise,
  };
}
