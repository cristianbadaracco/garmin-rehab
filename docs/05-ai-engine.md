# Motor de inteligencia artificial

## Objetivo

Analizar los datos del reloj + perfil médico + sesiones manuales para generar insights contextualizados que un dashboard de métricas por sí solo no puede ofrecer.

## Sistema de detección de sobreentrenamiento

### Señales primarias (automáticas del reloj)

| Señal              | Umbral de alerta            | Prioridad | Fuente                 |
|--------------------|-----------------------------|-----------|------------------------|
| HRV                | Caída >15% vs media 7 días  | Alta      | daily_metrics.hrv      |
| FC en reposo       | Subida >5 bpm vs baseline   | Alta      | daily_metrics.resting_hr |
| Calidad de sueño   | Score <60 por 3+ noches     | Media     | daily_metrics.sleep_score |
| Training readiness | Score <30 persistente        | Media     | daily_metrics.training_readiness |
| Body battery       | No recupera >50 al despertar| Media     | daily_metrics.body_battery_morning |
| Estrés promedio    | Media >50 por 5+ días       | Baja      | daily_metrics.avg_stress |

### Señales del perfil médico (específicas para LCA)

| Señal                    | Umbral de alerta                     | Fuente                     |
|--------------------------|--------------------------------------|-----------------------------|
| Dolor reportado (rodilla)| ≥6/10 post actividad                 | pain_logs.pain_level        |
| Dolor en bloque saltos   | ≥4/10 durante saltos                 | session_blocks.pain_during  |
| Asimetría de carrera     | Ground contact balance >52/48        | activities.ground_contact_balance |
| Dolor creciente          | Tendencia ascendente en últimas 2 sem| pain_logs (serie temporal)  |

### Score compuesto de fatiga

El sistema combina todas las señales en un score de 0 a 100:

```
fatigue_score =
    hrv_drop_pct       × 0.25 +
    rhr_rise_pct        × 0.20 +
    sleep_deficit       × 0.15 +
    training_load_ratio × 0.15 +
    pain_score          × 0.15 +
    stress_level        × 0.10
```

**Niveles de alerta:**

| Score  | Nivel      | Acción                              |
|--------|------------|-------------------------------------|
| 0-40   | OK         | Entrenamiento normal                |
| 40-70  | Precaución | Reducir intensidad, monitorear      |
| 70-100 | Parar      | Solo movilidad/recuperación activa  |

**Ajuste dinámico por fase de recuperación:**

Los pesos de la fórmula se ajustan según la fase:

- Fases tempranas (immobilization, mobility): peso de dolor = 0.30, training_load = 0.05.
- Fases intermedias (strength_base, strength_stability): pesos balanceados como arriba.
- Fases avanzadas (running, full_sport): peso de training_load = 0.25, dolor = 0.10.

## Integración con Claude API

### Arquitectura del prompt

Cada análisis envía a Claude un contexto estructurado:

```
[PERFIL MÉDICO]
- Lesión: Reconstrucción LCA rodilla derecha
- Fecha cirugía: 15 de enero 2026
- Fase actual: strength_stability (mes 4)
- Tiempo estimado de recuperación: 12 meses

[LESIONES SECUNDARIAS ACTIVAS]
- Dedo pie derecho: lesionado semana 3-5 por compensación de pisada

[MÉTRICAS HOY]
- FC reposo: 61 bpm (baseline 56, +5)
- HRV: 41 (media 7d: 52, -21%)
- Sueño: 5.8h, score 55
- Body battery mañana: 42
- Estrés promedio: 48

[MÉTRICAS SEMANA]
- Tendencia HRV: bajando desde miércoles
- FC reposo: subiendo 3 días consecutivos
- Sueño: <6h las últimas 3 noches

[SESIÓN DE HOY]
- Kine + carrera (mixed, 80 min)
- Bloque fuerza: 40 min, sin dolor
- Bloque estabilidad: 20 min, dolor 3/10
- Bloque saltos: 10 min, dolor 5/10, tirón al caer
- Carrera: 12 min, 2.1 km, FC prom 148

[DOLOR HOY]
- Post-sesión: 5/10, hinchazón presente

[PATRONES DETECTADOS]
- Últimas 3 sesiones con saltos: dolor promedio 5.3/10
- Semana 3-5: lesión dedo por compensación pisada,
  coincidió con cadencia asimétrica (ahora vuelve a aparecer)

[PAIN LOG ÚLTIMAS 2 SEMANAS]
- Tendencia: estable-ascendente (3→4→5)

[FATIGUE SCORE]
- Actual: 68/100 (precaución)

[INSTRUCCIÓN]
Sos un coach de rehabilitación deportiva especializado.
Analizá los datos y generá:
1. Evaluación del estado actual del usuario
2. Alertas si detectás patrones preocupantes
3. Recomendación concreta para mañana
4. Si detectás un patrón recurrente, mencionalo explícitamente
```

### Tipos de análisis

| Tipo             | Trigger                        | Output esperado                                    |
|------------------|--------------------------------|----------------------------------------------------|
| Post-sesión      | Después de registrar una sesión| Evaluación inmediata + sugerencia para próxima      |
| Diario           | Cron diario (mañana)           | Resumen del día anterior + plan para hoy            |
| Semanal          | Cron semanal (lunes)           | Análisis de tendencias + progreso vs semana anterior|
| Alerta           | Fatigue score >70 o patrón     | Alerta prioritaria con acción recomendada           |
| Patrón detectado | Análisis periódico de historial| Correlaciones que el usuario no ve                  |

### Detección de patrones

El motor de IA puede detectar correlaciones que el usuario no percibe:

**Ejemplo real del caso LCA:**

> "Tu problema del dedo (semana 3-5) coincidió con un aumento de cadencia asimétrica. Ahora veo la misma tendencia de cadencia + dolor en rodilla. Podrías estar compensando otra vez la pisada. ¿Querés que arme un resumen para mostrarle a tu kinesiólogo?"

**Otros patrones detectables:**

- Dolor post-saltos recurrente → sugerir reducir altura/progresión.
- HRV baja + sueño malo → fatiga acumulada, no solo muscular.
- Body battery que no recupera en fines de semana → posible estrés no relacionado al entrenamiento.
- Mejora sostenida de FC en reposo → indicador positivo de adaptación cardiovascular.
- Cadencia asimétrica creciente → compensación de la pierna sana.

### Contexto médico: por qué importa

Sin el contexto médico, una IA vería:
- "FC en reposo subió 5 bpm" → posible sobreentrenamiento.

Con el contexto médico, la IA ve:
- "FC en reposo subió 5 bpm + dolor 5/10 post-saltos + fase strength_stability de LCA + historial de compensación de pisada" → "Estás exigiendo demasiado la rodilla en los saltos. El cuerpo está respondiendo con inflamación (dolor, hinchazón) y estrés fisiológico (FC elevada). Recomiendo: hablar con tu kinesiólogo sobre reducir la progresión de saltos, y mañana hacer solo movilidad."

Esta contextualización es el diferencial del producto.

## Implementación técnica

### Servicio ai_engine.py

```python
# Pseudocódigo del flujo
async def generate_post_session_analysis(user_id, session_id):
    # 1. Obtener contexto
    user = await get_user_with_injuries(user_id)
    session = await get_session_with_blocks(session_id)
    today_metrics = await get_daily_metrics(user_id, today)
    week_metrics = await get_daily_metrics(user_id, last_7_days)
    recent_pain = await get_pain_logs(user_id, last_14_days)
    patterns = await detect_patterns(user_id)
    fatigue = calculate_fatigue_score(today_metrics, recent_pain)

    # 2. Construir prompt con contexto
    prompt = build_analysis_prompt(
        user=user,
        session=session,
        metrics_today=today_metrics,
        metrics_week=week_metrics,
        pain_logs=recent_pain,
        patterns=patterns,
        fatigue_score=fatigue,
    )

    # 3. Llamar a Claude
    response = await anthropic_client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=1000,
        messages=[{"role": "user", "content": prompt}],
    )

    # 4. Parsear y almacenar insight
    insight = parse_ai_response(response)
    await save_insight(user_id, insight)
    return insight
```

### Costos estimados de Claude API

| Análisis       | Tokens input aprox. | Tokens output aprox. | Frecuencia       |
|----------------|---------------------|----------------------|------------------|
| Post-sesión    | ~800                | ~400                 | 3-5x por semana  |
| Diario         | ~600                | ~300                 | 1x por día       |
| Semanal        | ~1500               | ~800                 | 1x por semana    |
| Alerta         | ~500                | ~200                 | Según necesidad  |

Para un usuario individual, el costo estimado es mínimo (menos de $1 USD/mes con Claude Sonnet).
