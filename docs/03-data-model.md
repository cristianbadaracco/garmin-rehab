# Modelo de datos

## Diagrama de relaciones

```
┌──────────┐
│   User   │
└────┬─────┘
     │ 1:N
     ├──────────────► Injury ◄──── PainLog
     │                  │              ▲
     │                  │ 1:N          │
     │                  └──────────────┘
     │
     ├──────────────► DailyMetrics
     │
     ├──────────────► Activity ◄─────┐
     │                               │ FK opcional
     ├──────────────► Session ───────┘
     │                  │
     │                  │ 1:N
     │                  └──► SessionBlock
     │
     └──────────────► AIInsight
```

## Tablas

### users

Cuenta del usuario. Almacena los tokens de Garmin Connect (encriptados) para la sincronización automática.

| Campo            | Tipo         | Descripción                              |
|------------------|--------------|------------------------------------------|
| id               | UUID (PK)    | Identificador único                      |
| email            | VARCHAR(255) | Email, único, indexado                    |
| hashed_password  | VARCHAR(255) | Password hasheado con bcrypt             |
| name             | VARCHAR(100) | Nombre del usuario                       |
| garmin_tokens    | JSONB        | Tokens de auth de Garmin Connect         |
| created_at       | TIMESTAMP    | Fecha de registro                        |

### injuries

Lesión o cirugía del usuario. Soporta múltiples lesiones activas simultáneamente.

| Campo                      | Tipo         | Descripción                                        |
|----------------------------|--------------|----------------------------------------------------|
| id                         | UUID (PK)    |                                                    |
| user_id                    | UUID (FK)    | → users.id                                         |
| name                       | VARCHAR(200) | "Reconstrucción LCA rodilla derecha"               |
| injury_type                | VARCHAR(50)  | surgery, fracture, sprain, tendinopathy            |
| body_part                  | VARCHAR(50)  | knee_right, knee_left, ankle_right, etc.           |
| date_occurred              | DATE         | Fecha de la lesión original                        |
| surgery_date               | DATE         | Fecha de cirugía (si aplica)                       |
| estimated_recovery_months  | INTEGER      | Tiempo estimado de recuperación                    |
| current_phase              | VARCHAR(50)  | Fase actual (ver sección "Fases de recuperación")  |
| notes                      | TEXT         | Notas libres                                       |
| is_active                  | BOOLEAN      | Si la lesión está activa                           |
| created_at                 | TIMESTAMP    |                                                    |

**Fases de recuperación (current_phase):**

Para una reconstrucción de LCA, las fases típicas son:

| Fase                  | Meses aprox. | Descripción                                    |
|-----------------------|--------------|------------------------------------------------|
| immobilization        | 0-1          | Post-cirugía, inmovilización                   |
| mobility              | 1-2          | Recuperar rango de movimiento                  |
| strength_base         | 2-3          | Fuerza básica, ejercicios isométricos          |
| strength_stability    | 3-6          | Fuerza + estabilidad + propiocepción           |
| running               | 6-9          | Carrera progresiva, pliometría                 |
| full_sport            | 9-12         | Deporte completo con restricciones             |
| discharged            | 12+          | Alta deportiva                                 |

Estas fases son configurables por lesión. El usuario las actualiza manualmente (o la IA sugiere un cambio cuando los datos lo respaldan).

### pain_logs

Registro diario de dolor asociado a una lesión. Permite trackear la evolución del dolor en el tiempo y correlacionarlo con entrenamientos.

| Campo      | Tipo         | Descripción                                        |
|------------|--------------|----------------------------------------------------|
| id         | UUID (PK)    |                                                    |
| user_id    | UUID (FK)    | → users.id                                         |
| injury_id  | UUID (FK)    | → injuries.id                                      |
| date       | DATE         |                                                    |
| pain_level | INTEGER      | 0 (sin dolor) a 10 (máximo)                       |
| context    | VARCHAR(50)  | rest, activity, post_activity, morning             |
| swelling   | BOOLEAN      | Si hay hinchazón                                   |
| stiffness  | BOOLEAN      | Si hay rigidez                                     |
| notes      | TEXT         | "Dolor al caer del salto progresivo"               |
| created_at | TIMESTAMP    |                                                    |

### daily_metrics

Métricas diarias de salud extraídas del Garmin. Un registro por día.

| Campo                | Tipo    | Descripción                          | Endpoint garminconnect            |
|----------------------|---------|--------------------------------------|-----------------------------------|
| id                   | UUID    |                                      |                                   |
| user_id              | UUID    | → users.id                           |                                   |
| date                 | DATE    | Indexado                             |                                   |
| resting_hr           | INTEGER | FC en reposo                         | get_resting_heart_rate()          |
| max_hr               | INTEGER | FC máxima del día                    | get_heart_rates()                 |
| avg_hr               | INTEGER | FC promedio del día                  | get_heart_rates()                 |
| hrv_weekly_avg       | FLOAT   | HRV promedio semanal                 | get_hrv_data()                    |
| hrv_last_night       | FLOAT   | HRV de la última noche               | get_hrv_data()                    |
| sleep_score          | INTEGER | Score de sueño (0-100)               | get_sleep_data()                  |
| sleep_hours          | FLOAT   | Horas totales de sueño               | get_sleep_data()                  |
| deep_sleep_hours     | FLOAT   | Horas de sueño profundo              | get_sleep_data()                  |
| light_sleep_hours    | FLOAT   | Horas de sueño liviano               | get_sleep_data()                  |
| rem_sleep_hours      | FLOAT   | Horas de sueño REM                   | get_sleep_data()                  |
| avg_stress           | INTEGER | Nivel de estrés promedio (0-100)     | get_stress_data()                 |
| body_battery_morning | INTEGER | Body battery al despertar            | get_body_battery()                |
| body_battery_end     | INTEGER | Body battery al final del día        | get_body_battery()                |
| training_readiness   | INTEGER | Training readiness score             | get_training_readiness()          |
| vo2_max              | FLOAT   | VO2 máximo estimado                  | get_max_metrics()                 |
| steps                | INTEGER | Pasos del día                        | get_steps_data()                  |
| active_calories      | INTEGER | Calorías activas                     | get_stats()                       |
| raw_data             | JSONB   | JSON crudo de Garmin (backup)        |                                   |

### activities

Actividades individuales trackeadas por el Garmin (carreras, caminatas, ciclismo, etc.).

| Campo                    | Tipo         | Descripción                                         |
|--------------------------|--------------|-----------------------------------------------------|
| id                       | UUID (PK)    |                                                     |
| user_id                  | UUID (FK)    | → users.id                                          |
| garmin_activity_id       | VARCHAR(50)  | ID original de Garmin, único                        |
| date                     | DATE         | Indexado                                            |
| activity_type            | VARCHAR(50)  | running, walking, cycling, strength, etc.           |
| name                     | VARCHAR(200) | Nombre de la actividad en Garmin                    |
| duration_seconds         | INTEGER      | Duración total                                      |
| distance_meters          | FLOAT        | Distancia                                           |
| avg_hr                   | INTEGER      | FC promedio                                         |
| max_hr                   | INTEGER      | FC máxima                                           |
| calories                 | INTEGER      | Calorías quemadas                                   |
| avg_pace                 | FLOAT        | Ritmo promedio (min/km)                             |
| cadence                  | INTEGER      | Cadencia promedio                                   |
| ground_contact_time      | FLOAT        | Tiempo de contacto con suelo (ms)                   |
| ground_contact_balance   | FLOAT        | Balance izq/der (%) — clave para rehab LCA          |
| stride_length            | FLOAT        | Longitud de zancada (m)                             |
| vertical_oscillation     | FLOAT        | Oscilación vertical (cm)                            |
| raw_data                 | JSONB        | JSON crudo                                          |

**Nota sobre running dynamics:** Los campos `ground_contact_balance`, `stride_length` y `vertical_oscillation` son especialmente relevantes para rehabilitación de LCA. Una asimetría en el balance de contacto con el suelo indica compensación con la pierna sana, lo cual es un indicador temprano de problemas.

### sessions

Sesión de entrenamiento. Puede ser:

- **tracked**: 100% medida con el Garmin (se linkea a una activity).
- **manual**: no se midió nada (ej: sesión de kine completa sin reloj).
- **mixed**: parte trackeada, parte manual (ej: kine donde solo se trackeó la carrera final).

| Campo                  | Tipo         | Descripción                                  |
|------------------------|--------------|----------------------------------------------|
| id                     | UUID (PK)    |                                              |
| user_id                | UUID (FK)    | → users.id                                   |
| date                   | DATE         | Indexado                                     |
| session_type           | VARCHAR(30)  | tracked, manual, mixed                       |
| title                  | VARCHAR(200) | "Kine + carrera"                             |
| total_duration_minutes | INTEGER      | Duración total estimada                      |
| overall_rpe            | INTEGER      | Esfuerzo percibido global (1-10)             |
| overall_pain           | INTEGER      | Dolor general post-sesión (0-10)             |
| notes                  | TEXT         | "Saltos costaron. Rodilla hinchada post."    |
| activity_id            | UUID (FK)    | → activities.id (opcional, para tracked/mixed)|
| created_at             | TIMESTAMP    |                                              |

### session_blocks

Bloques dentro de una sesión. Modela la estructura real de una sesión de kinesiología:

| Campo            | Tipo         | Descripción                                   |
|------------------|--------------|-----------------------------------------------|
| id               | UUID (PK)    |                                               |
| session_id       | UUID (FK)    | → sessions.id                                 |
| order            | INTEGER      | Orden del bloque (1, 2, 3...)                 |
| block_type       | VARCHAR(50)  | strength, stability, mobility, jumps, running |
| duration_minutes | INTEGER      | Duración estimada del bloque                  |
| exercises        | TEXT         | "sentadillas, prensa, isquios"                |
| pain_during      | INTEGER      | Dolor durante este bloque específico (0-10)   |
| notes            | TEXT         | "Tirón leve al caer del último progresivo"    |

**Ejemplo real de una sesión de kine:**

```
Session: "Kine martes" (mixed, 80 min, RPE 7, dolor 5/10)
├── Block 1: strength    (40 min) — "sentadillas, prensa, isquios"
├── Block 2: stability   (20 min) — "bosu, propiocepción" — dolor 3/10
├── Block 3: jumps       (10 min) — "progresivos" — dolor 5/10 — "tirón al caer"
└── Block 4: running     (12 min) — linked to Activity (Garmin tracked)
```

### ai_insights

Insights generados por el motor de IA (Claude API).

| Campo            | Tipo         | Descripción                                            |
|------------------|--------------|--------------------------------------------------------|
| id               | UUID (PK)    |                                                        |
| user_id          | UUID (FK)    | → users.id                                             |
| date             | DATE         | Indexado                                               |
| insight_type     | VARCHAR(30)  | recommendation, alert, weekly_summary, pattern         |
| severity         | VARCHAR(20)  | info, warning, danger                                  |
| title            | VARCHAR(300) | "Patrón detectado: dolor post-saltos recurrente"       |
| content          | TEXT         | Texto completo del insight                             |
| related_metrics  | JSONB        | Datos que dispararon el insight                        |
| is_read          | BOOLEAN      | Si el usuario lo leyó                                  |
| is_dismissed     | BOOLEAN      | Si el usuario lo descartó                              |
| created_at       | TIMESTAMP    |                                                        |

**Tipos de insight:**

- **recommendation**: sugerencia proactiva ("Hoy priorizá movilidad y core, evitá impacto").
- **alert**: alerta por datos preocupantes ("Tu HRV bajó 15% y reportaste dolor 6/10").
- **weekly_summary**: resumen semanal con tendencias y progreso.
- **pattern**: patrón detectado a lo largo del tiempo ("Las últimas 3 sesiones con saltos terminaron con dolor >5/10").
