# Integración con Garmin

## Dispositivo soportado

Garmin Forerunner 165 (MVP). La arquitectura soporta cualquier Garmin con Garmin Connect.

## Librería: garminconnect (Python)

Wrapper open source que accede a los mismos datos que la app Garmin Connect. Disponible en PyPI como `garminconnect` (repo: `cyberjunky/python-garminconnect`).

### Autenticación

La librería se autentica con las credenciales de Garmin Connect del usuario (email + password). Internamente maneja tokens OAuth que se refrescan automáticamente. Los tokens se almacenan encriptados en la tabla `users.garmin_tokens`.

```python
from garminconnect import Garmin

client = Garmin("email@ejemplo.com", "password")
client.login()

# Guardar tokens para no re-autenticar cada vez
tokens = client.session_data
# → almacenar en users.garmin_tokens (encriptado)

# Restaurar sesión desde tokens guardados
client = Garmin()
client.login(tokens)
```

### Datos disponibles y mapeo a la base de datos

#### Métricas diarias → daily_metrics

| Dato               | Método garminconnect             | Campo en DB              |
|--------------------|----------------------------------|--------------------------|
| FC en reposo       | `get_resting_heart_rate(date)`   | resting_hr               |
| FC promedio/máx    | `get_heart_rates(date)`          | avg_hr, max_hr           |
| HRV                | `get_hrv_data(date)`             | hrv_weekly_avg, hrv_last_night |
| Sueño              | `get_sleep_data(date)`           | sleep_score, sleep_hours, deep/light/rem |
| Estrés             | `get_stress_data(date)`          | avg_stress               |
| Body battery       | `get_body_battery(date)`         | body_battery_morning/end |
| Training readiness | `get_training_readiness(date)`   | training_readiness       |
| VO2 max            | `get_max_metrics(date)`          | vo2_max                  |
| Pasos              | `get_steps_data(date)`           | steps                    |
| Calorías           | `get_stats(date)`                | active_calories          |

#### Actividades → activities

```python
activities = client.get_activities(start=0, limit=10)
# Retorna lista de actividades con: activityId, activityType,
# duration, distance, averageHR, maxHR, calories, etc.

# Detalle de una actividad específica
detail = client.get_activity(activity_id)
# Incluye running dynamics: groundContactTime, groundContactBalanceLeft,
# strideLength, verticalOscillation
```

#### Datos especialmente relevantes para rehabilitación de LCA

1. **Ground Contact Balance (L/R %)**: Indica si el corredor apoya más peso en una pierna que en otra. Una asimetría creciente sugiere compensación por dolor o debilidad en la pierna operada.

2. **Cadencia**: Una cadencia anormalmente baja o asimétrica puede indicar que el usuario está favoreciendo la pierna sana.

3. **HRV + FC en reposo**: La combinación de HRV bajando y FC en reposo subiendo es un indicador clásico de sobreentrenamiento o estrés fisiológico excesivo.

4. **Body battery al despertar**: Si no recupera >50 al despertar consistentemente, el cuerpo no está descansando lo suficiente para soportar la rehabilitación.

### Flujo de sincronización

```
1. Usuario conecta su cuenta Garmin (una vez)
   └── Almacena tokens encriptados en DB

2. Sync periódico (cada hora vía APScheduler, o manual con `make sync`)
   ├── Restaurar sesión desde tokens guardados
   ├── Obtener métricas del día → upsert en daily_metrics
   ├── Obtener actividades nuevas → insert en activities (dedup por garmin_activity_id)
   └── Si hay actividades nuevas → disparar análisis de IA

3. Backfill inicial (primera conexión)
   └── Obtener últimos 30-90 días de datos para tener baseline
```

### Limitaciones conocidas

- **Rate limiting**: Garmin no documenta límites oficiales pero la librería puede ser bloqueada si se hacen demasiadas requests. Implementar backoff exponencial.
- **Auth tokens expiran**: Los tokens de sesión expiran periódicamente. El service debe manejar re-login automático.
- **Running dynamics**: Solo disponibles si el usuario tiene un pod de running dynamics o un reloj que lo soporte nativamente (el Forerunner 165 tiene métricas básicas de carrera pero no todas las running dynamics avanzadas).

## Migración a API oficial

Cuando el producto escale a múltiples usuarios, se debe migrar a la API oficial de Garmin:

### Garmin Connect Developer Program

- **Costo**: gratuito.
- **Proceso**: aplicar en developer.garmin.com, revisión en ~2 días hábiles.
- **Requisito**: uso comercial (no se aprueba para proyectos personales).
- **Beneficios**: webhooks (push en vez de poll), OAuth2 estándar, sin riesgo de bloqueo.

### APIs oficiales disponibles

| API               | Descripción                                     |
|-------------------|-------------------------------------------------|
| Health API        | Métricas diarias: FC, sueño, estrés, pasos      |
| Activity API      | Actividades completas con datos detallados       |
| Training API      | Enviar entrenamientos al reloj                   |
| Activity File API | Archivos FIT crudos                              |

### Plan de migración

1. MVP con `garminconnect` (uso personal, sin aprobación).
2. Cuando haya usuarios beta → aplicar al Developer Program.
3. Implementar OAuth2 flow (el usuario autoriza desde Garmin Connect).
4. Reemplazar `garmin_client.py` manteniendo la misma interfaz interna.
5. Agregar webhooks para sync en tiempo real (en vez de polling cada hora).
