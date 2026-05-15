# Garmin Rehab Coach — Documentación del proyecto

## Visión

Una aplicación web que conecta con relojes Garmin para analizar datos de salud y entrenamiento con inteligencia artificial, enfocada en personas que están atravesando procesos de rehabilitación por lesiones o cirugías.

No es solo un dashboard de métricas — es un compañero inteligente de recuperación que entiende el contexto médico del usuario.

## Problema

Quien se recupera de una lesión (como una reconstrucción de LCA) enfrenta un escenario complejo:

- El reloj mide muchas cosas pero no sabe que estás en rehabilitación.
- Las sesiones de kinesiología incluyen bloques variados (fuerza, estabilidad, saltos, carrera) que no se trackean con el reloj.
- Señales sutiles como compensación de pisada, dolor creciente post-saltos, o un dedo lastimado por mal movimiento afectan el progreso pero nadie las conecta entre sí.
- No existe una herramienta que cruce datos del wearable con el contexto médico y de entrenamiento manual.

## Diferencial

La capa médica integrada con IA. Ninguna app del mercado combina:

1. Datos automáticos del reloj (FC, HRV, sueño, estrés, body battery, running dynamics).
2. Registro de lesiones/cirugías con fases de recuperación.
3. Seguimiento de dolor y síntomas.
4. Sesiones de entrenamiento mixtas (trackeadas + manuales).
5. Un motor de IA que cruza todo esto y genera insights contextualizados.

## Caso de uso inicial

Usuario con Garmin Forerunner 165, operado de LCA, que actualmente realiza 2 sesiones semanales de kinesiología con bloques de fuerza, estabilidad, movilidad, saltos y carrera. Necesita:

- Ver sus datos del reloj organizados.
- Registrar su lesión y fase de recuperación.
- Loguear sesiones que no trackea (kine completa) o que trackea parcialmente (solo la carrera del final).
- Recibir análisis de progreso y alertas cuando los datos sugieren sobreentrenamiento o regresión.

## Proyección a negocio

El MVP es personal, pero la arquitectura está pensada para escalar:

- Agregar soporte para otros wearables (Apple Watch, Fitbit) vía servicios como Terra API.
- Modelo SaaS para fisioterapeutas/kinesiólogos que quieran monitorear pacientes remotamente.
- Marketplace de planes de rehabilitación por tipo de lesión.
