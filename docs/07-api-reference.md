# Referencia de API

Base URL: `http://localhost:8000/api`

Documentación interactiva (Swagger): `http://localhost:8000/docs`

Todos los endpoints (excepto auth) requieren un header `Authorization: Bearer <jwt_token>`.

## Auth

| Método | Ruta               | Descripción                        |
|--------|--------------------|------------------------------------|
| POST   | `/auth/register`   | Registrar nuevo usuario            |
| POST   | `/auth/login`      | Login, devuelve JWT                |

## Garmin

| Método | Ruta                  | Descripción                               | Params                              |
|--------|-----------------------|-------------------------------------------|--------------------------------------|
| POST   | `/garmin/sync`        | Disparar sync manual con Garmin           | —                                    |
| GET    | `/garmin/metrics`     | Métricas diarias para un rango            | `start_date`, `end_date` (required)  |
| GET    | `/garmin/activities`  | Actividades trackeadas para un rango      | `start_date`, `end_date` (required)  |

### Ejemplo: obtener métricas de la última semana

```
GET /api/garmin/metrics?start_date=2026-05-08&end_date=2026-05-15
```

Respuesta: array de `DailyMetricsResponse` con FC, HRV, sueño, estrés, body battery, etc.

## Medical

| Método | Ruta                                | Descripción                          | Params / Body                         |
|--------|-------------------------------------|--------------------------------------|---------------------------------------|
| POST   | `/medical/injuries`                 | Registrar lesión/cirugía             | `InjuryCreate` (body)                 |
| GET    | `/medical/injuries`                 | Listar lesiones                      | `active_only` (query, default true)   |
| PATCH  | `/medical/injuries/{id}/phase`      | Actualizar fase de recuperación      | `InjuryUpdatePhase` (body)            |
| POST   | `/medical/pain-logs`                | Registrar dolor                      | `PainLogCreate` (body)                |
| GET    | `/medical/pain-logs`                | Listar registros de dolor            | `start_date`, `end_date`, `injury_id` |

### Ejemplo: registrar una lesión de LCA

```json
POST /api/medical/injuries
{
    "name": "Reconstrucción LCA rodilla derecha",
    "injury_type": "surgery",
    "body_part": "knee_right",
    "date_occurred": "2025-12-01",
    "surgery_date": "2026-01-15",
    "estimated_recovery_months": 12,
    "current_phase": "strength_stability",
    "notes": "Injerto de isquiotibiales. Kine 2x por semana."
}
```

### Ejemplo: registrar dolor post-sesión

```json
POST /api/medical/pain-logs
{
    "injury_id": "uuid-de-la-lesion",
    "pain_level": 5,
    "context": "post_activity",
    "swelling": true,
    "stiffness": false,
    "notes": "Hinchazón después de saltos progresivos"
}
```

## Sessions

| Método | Ruta            | Descripción                               | Params / Body                        |
|--------|-----------------|-------------------------------------------|--------------------------------------|
| POST   | `/sessions/`    | Registrar sesión con bloques              | `SessionCreate` (body)               |
| GET    | `/sessions/`    | Listar sesiones en un rango               | `start_date`, `end_date` (required)  |

### Ejemplo: registrar sesión de kine mixta

```json
POST /api/sessions/
{
    "session_type": "mixed",
    "title": "Kine martes",
    "total_duration_minutes": 80,
    "overall_rpe": 7,
    "overall_pain": 5,
    "notes": "Saltos costaron. Rodilla hinchada post.",
    "activity_id": "uuid-de-actividad-garmin-carrera",
    "blocks": [
        {
            "block_type": "strength",
            "duration_minutes": 40,
            "exercises": "sentadillas, prensa, isquios",
            "pain_during": null,
            "notes": null
        },
        {
            "block_type": "stability",
            "duration_minutes": 20,
            "exercises": "bosu, propiocepción",
            "pain_during": 3,
            "notes": null
        },
        {
            "block_type": "jumps",
            "duration_minutes": 10,
            "exercises": "progresivos",
            "pain_during": 5,
            "notes": "Tirón leve al caer del último progresivo"
        },
        {
            "block_type": "running",
            "duration_minutes": 12,
            "exercises": null,
            "pain_during": 2,
            "notes": "Trackeada con Garmin"
        }
    ]
}
```

## Analysis

| Método | Ruta                          | Descripción                               | Params                                   |
|--------|-------------------------------|-------------------------------------------|------------------------------------------|
| GET    | `/analysis/insights`          | Obtener insights de IA                    | `start_date`, `end_date`, `insight_type` |
| POST   | `/analysis/generate-daily`    | Disparar análisis diario de IA            | —                                        |
| GET    | `/analysis/recovery-progress` | Resumen de progreso de recuperación       | —                                        |

### Tipos de insight (insight_type)

- `recommendation`: sugerencia proactiva.
- `alert`: alerta por datos preocupantes.
- `weekly_summary`: resumen semanal.
- `pattern`: patrón detectado en el historial.

### Severidades

- `info`: informativo, sin acción urgente.
- `warning`: precaución, considerar ajustes.
- `danger`: parar, riesgo de lesión o regresión.

## Health check

```
GET /api/health
→ {"status": "ok"}
```

## Generación de tipos TypeScript

FastAPI genera automáticamente un schema OpenAPI en `/openapi.json`. Para generar los tipos de TypeScript del frontend:

```bash
make generate-types
```

Esto crea `frontend/src/types/api.generated.ts` con todas las interfaces tipadas.
