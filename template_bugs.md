Auditoría de drift modelo–migración Alembic

Backend: /Users/nelsonborrego/Desktop/CO/ng2/trainerGM/backend
se corre con poetry -> poetry run alembic ....

**Estado: COMPLETADA** ✅ (2026-03-17)

**Hallazgos y correcciones:**

1. **env.py incompleto** — Solo importaba 10 de 17 modelos. Se añadieron los 7 faltantes:
   `Exercise`, `ExerciseEvidence`, `ExerciseFavorite`, `MonthlyReport`, `Photo`, `UserConfig`, `WeeklyCheckin`

2. **Campos TEXT vs VARCHAR** — Modelos usaban `str` plano (→ VARCHAR), pero la DB tenía TEXT.
   Se corrigió con `sa_column=Column(Text)` en: `attendance.notes`, `clients.goals`,
   `exercises.description`, `metrics.notes`, `progress_entries.notes`, `training_logs.notes`,
   `users.password_hash`, `weekly_checkins.notes`

3. **Constraints compuestos faltantes en modelos** — Existían en migraciones pero no en modelos.
   Se añadieron `__table_args__` con UniqueConstraint en:
   - `ExerciseEvidence`: (training_log_id, exercise_id)
   - `MealLog`: (client_id, date, meal_key)
   - `TrainingLog`: (client_id, date)
   - `WeeklyCheckin`: (client_id, week_start)

4. **Constraints nombrados** — `clients_user_id_key` y `users_email_key` no coincidían
   con los auto-generados por SQLModel. Se añadieron `__table_args__` explícitos.

5. **assigned_at timezone** — `NutritionPlan.assigned_at` y `TrainingPlan.assigned_at`
   usaban `datetime` plano pero la DB tenía `TIMESTAMP WITH TIME ZONE`.
   Corregido con `sa_column=Column(DateTime(timezone=True))`.

6. **ExerciseFavorite FKs** — La DB tenía `ON DELETE CASCADE`, el modelo no. Corregido.

7. **exercise.external_id** — DB lo tenía como `unique`, modelo no. Corregido.
   `exercise.name` — DB tenía índice, modelo no. Corregido.

8. **Migración generada** — `fe94bf80af0c_fix_model_drift.py` (014):
   - Añade `ix_attendance_trainer_id`
   - Añade `ix_training_logs_trainer_id`
   - Amplía `meal_logs.type` VARCHAR(20) → VARCHAR(50)
   - Elimina `ix_exercise_favorites_exercise_id` (redundante, PK)

**Criterio de aceptación:** `alembic check` → "No new upgrade operations detected." ✅
