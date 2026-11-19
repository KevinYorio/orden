# Railway y costos

No hay despliegue, vinculación, medición de RAM/CPU, factura ni permisos comprobados en Railway. La imagen Linux local no demuestra viabilidad económica. Las pruebas usan plataforma y valores sintéticos identificados.

El objetivo sigue siendo USD 0 adicionales; máximo incremental USD 0,50/ciclo y referencia total USD 5,50. Se cierra preventivamente por encima de USD 5,40 totales o USD 0,40 incrementales para reservar USD 0,10. El ciclo es el de facturación real; no se confunde con la retención por mes calendario.

Con E = recursos existentes proyectados y B = recursos del bot, incluyendo persistencia/mantenimiento:

```text
factura de referencia = max(5, E + B)
incremento = max(5, E + B) - max(5, E)
```

El mínimo incluido de Hobby se aplica al conjunto. Apagar esta app no limita consumo del ERP ni impuestos/cargos externos. [Planes e inclusión de uso de Railway](https://docs.railway.com/pricing/plans).

CostGuard opera con enteros de microUSD. Rechaza muestras de más de 60 minutos, futuras, fuera del ciclo o incompletas; exige justificar un incremento positivo. Incluye costo residual y reserva. Se consulta al arrancar y cada 15 minutos, no por mensaje. Si la lectura falla o hay riesgo: revocar escrituras/emisión, snapshot final, solicitud de modo local y parada de este deployment. Sin muestras/permisos no arranca remoto continuo ni recuperación.

`RailwayCostReader` usa las consultas oficiales `usage` y `estimatedUsage`; introspecta los valores admitidos de `MetricMeasurement`. El token de lectura usa Bearer y se configura como `RAILWAY_COST_TOKEN`, separado del token de proyecto para parar. La fecha del sample es la recopilación de la API, no una medición propia de RAM. La API puede tener demora; la reserva no es un hard limit contractual.

Es obligatorio completar `RAILWAY_COST_CALIBRATION_FILE` con ciclo, workspace/proyecto bot, mediciones, unidades y tarifas verificadas. No se supone que `estimatedValue` esté en USD. Por medición se guarda el factor racional `microusdNumerator / unitDenominator`, aplicado a la unidad que realmente devuelve Railway. Se redondea hacia arriba. El archivo exige `verifiedCalibration: true` y evidencia; **no se entregan tarifas/unidades ficticias como calibración utilizable**. La muestra manual `RAILWAY_COST_SAMPLE_FILE` sirve para evaluación o mantenimiento deliberados y caduca; no reemplaza una fuente periódica en producción. Ver el esquema en `cost-reader.ts` y `platform.ts`.

Se necesita un proyecto separado para que la proyección de ese proyecto represente al bot. El lector consulta el workspace en lectura y resta la proyección del bot para obtener E. Deben estar incluidos CPU, memoria, volumen y egreso, también recursos retenidos/eliminados que facturen. Si las unidades, proyecciones o permisos no coinciden, falla cerrado. La calibración y el alcance real sólo pueden verificarse con acceso a la cuenta. [Colección enlazada por la documentación oficial](https://docs.railway.com/integrations/api).

`RailwayPlatform` fija el endpoint público documentado y sólo permite una mutación: `deploymentStop(id)`. Antes comprueba el token de proyecto/entorno, que el servicio del proyecto se llame exactamente **asistente-hogar**, y que el deployment pertenezca al servicio configurado. No acepta IDs de infraestructura desde el chat. No crea/elimina servicios, cambia planes, variables, límites globales, volúmenes, autodeploys del ERP ni límites de Railway Agent. [API y autenticación](https://docs.railway.com/integrations/api), [servicios](https://docs.railway.com/integrations/api/manage-services), [parada de deployments](https://docs.railway.com/integrations/api/manage-deployments).

El controlador sólo considera detenidos los estados terminales conservadores implementados; `CRASHED`, `SLEEPING`, en cola o un estado desconocido no prueban parada. Rechaza listados de 100 deployments si necesita paginación adicional. Un proveedor con estados/permisos distintos queda como dependencia de integración; no se amplía la interpretación para habilitar otro emisor. Hay tres intentos acotados de control y error persistido. Un `process.exit` no se presenta como prueba de apagado facturable.

Preparación de producción pendiente:

1. Crear/configurar únicamente proyecto, servicio `asistente-hogar` y volumen de esta app. Una réplica, volumen `/data` montado antes de migrar, sin Serverless. El Dockerfile y `railway.json` fijan arranque y política de reinicio `NEVER`; verificar esa configuración real y autodeploys de ESTA app.
2. Configurar las credenciales de aplicación, identidades y tokens distintos, sin exponerlos al navegador. Verificar permisos de lectura global y parada acotada; un token de proyecto no acredita acceso a facturación global.
3. Medir reposo, arranque/vinculación, tráfico familiar, exportación y recuperación. Incluir base/sesión/snapshots/volumen/transferencia; no usar heap de Node como RAM facturada del contenedor.
4. Calibrar consultas/unidades contra el uso/factura real y comprobar que E+B entra en ambos umbrales. Si no entra, continuar en PC.
5. Probar la parada externa y conservación del volumen, con PC conectada y apagada, además del regreso usando la última generación local.

La CLI oficial documenta `railway volume files download`, pero no establece que un deployment detenido mantenga acceso a su API o que el comando funcione aquí con el volumen detenido. La CLI no está instalada/verificada en este entorno. Se implementó `recovery_only`, limitado a 120 segundos, como alternativa de esta app; su activación real, costo y descarga siguen pendientes. [Volúmenes por CLI](https://docs.railway.com/cli/volume), [SSH del contenedor](https://docs.railway.com/cli/ssh).

No se contrataron servicios ni se alteró infraestructura durante el desarrollo. No se promete factura cero: el volumen detenido puede facturar. No se borran datos automáticamente para ocultar ese costo.
