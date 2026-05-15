# Roadmap

## Fase 1 — MVP: Dashboard + datos Garmin (2-3 semanas)

Objetivo: ver los datos del reloj organizados en una interfaz propia.

### Tareas

- [ ] `garmin_client.py`: autenticación, token refresh, backfill inicial (30 días).
- [ ] `sync_service.py`: sync periódico (APScheduler cada hora).
- [ ] Endpoints de métricas y actividades funcionando.
- [ ] Dashboard con gráficos:
  - FC en reposo (línea, 7/30 días).
  - HRV (línea con media móvil).
  - Sueño (barras apiladas: deep/light/rem/awake).
  - Body battery (área).
  - Estrés (línea).
  - Training readiness (gauge o indicador).
  - Lista de actividades recientes.
- [ ] Auth básico (login/registro con JWT).

### Resultado

Un dashboard funcional que muestra los datos reales del Forerunner 165.

---

## Fase 2 — Perfil médico + pain tracking (1-2 semanas)

Objetivo: registrar la lesión, la fase de recuperación, y trackear dolor diario.

### Tareas

- [ ] Formulario de registro de lesión (nombre, tipo, body part, fecha cirugía, fase actual).
- [ ] Timeline visual de recuperación (fases con indicador de posición actual).
- [ ] Slider de dolor diario (0-10) con contexto (reposo/actividad/post-actividad).
- [ ] Checkboxes de hinchazón y rigidez.
- [ ] Gráfico de evolución de dolor (línea, últimas 12 semanas).
- [ ] Radar chart de estado general (fuerza, movilidad, estabilidad, resistencia, propiocepción, potencia) — input manual inicial.
- [ ] Página de perfil médico completa.

### Resultado

El usuario puede registrar su operación de LCA, indicar que está en fase strength_stability, y loguear dolor diario.

---

## Fase 3 — Sesiones manuales + mixtas (1-2 semanas)

Objetivo: registrar entrenamientos que el reloj no mide.

### Tareas

- [ ] Formulario de sesión con bloques dinámicos (agregar/quitar bloques).
- [ ] Cada bloque: tipo, duración, ejercicios (texto libre), dolor durante, notas.
- [ ] Selector de tipo de sesión: tracked / manual / mixed.
- [ ] Si mixed: linkear a actividad de Garmin del mismo día.
- [ ] RPE y dolor global post-sesión.
- [ ] Lista de sesiones con filtros (fecha, tipo).
- [ ] Vista de detalle de sesión con bloques.

### Resultado

El usuario puede registrar su sesión de kine completa con los 4 bloques (fuerza, estabilidad, saltos, carrera) y el dolor en cada uno.

---

## Fase 4 — Motor de IA + insights (2-3 semanas)

Objetivo: la IA analiza los datos y genera recomendaciones contextualizadas.

### Tareas

- [ ] `ai_engine.py`: construcción de prompts con contexto completo.
- [ ] `analysis_engine.py`: cálculo de fatigue score, detección de patrones básicos.
- [ ] Análisis post-sesión automático.
- [ ] Análisis diario (cron matutino).
- [ ] Resumen semanal.
- [ ] Alertas cuando fatigue_score > 70.
- [ ] Card de insights en el dashboard (con severity: info/warning/danger).
- [ ] Página de progreso con:
  - Timeline de recuperación con hitos.
  - Tendencias de dolor vs actividad.
  - Insights acumulados.
  - Comparación semana actual vs anterior.
- [ ] Generación de resumen para compartir con kinesiólogo.

### Resultado

La IA detecta que los saltos progresivos causan dolor recurrente, que la cadencia asimétrica está volviendo, y sugiere ajustar el plan con el kinesiólogo.

---

## Fase 5 (futura) — Chat conversacional

Objetivo: interacción libre con la IA sobre el proceso de rehabilitación.

### Tareas

- [ ] Interfaz de chat en la app.
- [ ] La IA tiene acceso al historial completo como contexto.
- [ ] El usuario puede contarle cómo se siente y la IA registra datos automáticamente.
- [ ] Extracción de información de mensajes libres ("hoy me dolió bastante la rodilla" → pain_log: 7/10).
- [ ] Preguntas sobre el progreso ("¿cómo vengo esta semana?").
- [ ] Integración bidireccional: el chat alimenta los datos y los datos alimentan el chat.

---

## Fase 6 (futura) — Escalar a producto

- [ ] Migrar a API oficial de Garmin (Developer Program).
- [ ] Soporte multi-usuario con onboarding guiado.
- [ ] Soporte para otros wearables (Apple Watch, Fitbit) vía Terra API.
- [ ] Rol de kinesiólogo/fisioterapeuta: dashboard de pacientes.
- [ ] Planes de rehabilitación por tipo de lesión (templates).
- [ ] Modelo de suscripción (freemium: datos gratis, IA paga).
