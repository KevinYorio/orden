# Progreso

Actualizado: **19/10/2026**. Se leyó completa la especificación consolidada v3.0 (1078 líneas), conservada en docs/ESPECIFICACION.md. No hubo AGENTS.md en C:\, C:\proyectos o la carpeta de trabajo inicial, que estaba vacía; se agregó el AGENTS.md de este proyecto.

Carpeta independiente: **C:\proyectos\Ordenkevin\asistente-hogar**. No se modificó el ERP ni otros proyectos. No se crearon cuentas externas, contrataron servicios, desplegó, vinculó WhatsApp ni enviaron mensajes reales. Las bases de prueba fueron temporales y sintéticas; no hay una base operativa con demostraciones.

## Etapas

| Etapa de la especificación | Implementación | Validación y límite |
| --- | --- | --- |
| 1. Entorno, proyecto, SQLite y configuración | Implementada | Node 24.19.0 Windows; migración, base vacía y setup idempotente comprobados |
| 2. Dominio, parser, autoría, borradores y correcciones | Implementada | Corpus original y fixtures sintéticos; operaciones independientes, contexto por autor/ID/cita; parser acotado |
| 3. Recordatorios, consultas, inbox/outbox e idempotencia | Implementada | Jobs/versiones persistentes, avisos individuales y delivery_unknown comprobados localmente |
| 4. Propiedad, snapshots, cambio y presupuesto | Implementada y simulada | SQLite consistente, cursor/hash/fence, importación y rechazo de ramas/propietarios; parada REAL y PC apagada pendientes |
| 5. Facturas, recurrencias, pagos y archivos | Implementada | Parcial/completo/desconocido, mismo pago al aclarar, recepción esperada, opacidad, límites y retención comprobados localmente |
| 6. Finanzas, tarjetas, presupuestos, metas y compras | Implementada | Cuentas sin saldos ficticios, transferencias, cuotas exactas, resumen real, diferencias explícitas, reservas y compra/gasto vinculados |
| 7. Tablero, API y Windows | Implementada | Nueve vistas, filtros/edición/descarga por API, Chrome escritorio/móvil, instalación temporal y sintaxis PowerShell comprobadas |
| 8. Adaptador real y simulado | Implementados | Baileys importado Windows/Linux y eventos sintéticos; QR/sesiones/identidades preparados; cuenta/enlace reales pendientes |
| 9. Railway, medición y parada exclusiva | Código y contenedor preparados | Consultas oficiales verificadas documentalmente, lector con calibración racional y control simulado; sin cuenta/permisos/calibración/deployment real |
| 10. Verificaciones, copias y documentación | Comprobación local realizada | 25 pruebas pasan, tipado/build, restauración, setup, UI y servicio Linux comprobados; checklist de 84 casos conserva sus límites |

Implementada no significa vinculada o medida en producción. La etapa 9 y los escenarios remotos de la 4 **no están validados para operar en Railway**. [Checklist A01–A84](ACEPTACION.md).

## Comprobaciones realizadas

| Comando / comprobación | Resultado observado |
| --- | --- |
| npm.cmd run check | TypeScript, **25 pruebas**, Vite y copia de migración compilada correctos |
| node scripts/check-setup.mjs | Base inicial vacía y segunda instalación que preserva datos/credencial, en carpeta temporal |
| node scripts/check-ui.mjs | Login, nueve vistas, estado vacío, escritorio 1440 y móvil 390, sin desborde ni excepciones JS |
| npm.cmd run whatsapp:verify | Baileys **7.0.0-rc14**, MIT, importación correcta; linked:false y productionVerified:false |
| Parser PowerShell de scripts | Sintaxis válida en Instalar, Iniciar, Detener e InicioWindows; no se instaló inicio automático durante desarrollo |
| docker build --tag asistente-hogar:local-check . | Imagen Linux compilada con dependencias de producción y migración; no despliega |
| docker run --rm --network none con check-linux.mjs | **Linux Node 24.22.0**: Baileys importa; migración, inicio, carga HTTP, estado y cierre correctos, sin red externa |
| npm.cmd audit --omit=dev | **0 vulnerabilidades reportadas** después de corregir @fastify/static a 10.1.6; no es garantía absoluta |
| Restauración/rotación y transferencias de prueba | Siete copias válidas, checksum/generación, preservación de dominio y regreso con originales por hash simulados |

Capturas de base vacía: docs/evidencia/tablero-desktop.png y tablero-movil.png. El navegador ya instalado se usa sólo para revisar UI; no es dependencia del bot.

Se repitieron controles por fallos concretos o cambios relevantes: contexto de conversación, query de tamaño de archivo, operación/traspaso y una dependencia estática vulnerable. No hubo ciclos de pruebas reales contra WhatsApp/Railway ni validaciones remotas facturables. Tamaños/tiempos de build e imagen local no se presentan como medición del consumo del bot.

## Dependencias exactas para producción

1. Cuenta/número adicional del bot, grupo exclusivo y IDs PN/LID verificados de los tres participantes. Configurar frontera de activación, sesión propia de cada instalación y probar menciones/documentos e historial con pocas operaciones aisladas.
2. Proyecto, servicio llamado asistente-hogar, entorno, deployment y volumen de ESTA app en Railway, separados del ERP. No se inventaron IDs, URLs o secretos.
3. Token de proyecto/entorno para verificar/detener ese deployment; comprobar permisos y estados terminales reales. Token distinto de lectura de costos del workspace. Ninguna entrada del chat configura infraestructura.
4. Ciclo y calibración de usage/estimatedUsage: mediciones, unidades, tarifas, evidencia, costos existentes/bot, residual, egreso y recuperación. Sin ellos se rechaza el arranque remoto; no se afirmó costo cero ni suficiencia de USD 0,50.
5. Verificar la CLI y descarga del volumen detenido. Si no funciona, ejecutar recuperación breve autenticada sobre el mismo servicio/volumen, sin bot/planificador, con timeout y reserva. Una API apagada no responde por suposición.
6. Probar parada externa, generación, un solo escritor/emisor, PC inicialmente apagada y regreso con última base local. Commit aceptado no reemplaza verificar generación/integridad en el siguiente arranque.
7. Saldos, tarjetas y sus fechas se configuran cuando se usen. El inicio automático Windows se habilita con el script por usuario después de elegir la instalación operativa. No se modifica suspensión, políticas globales ni servicios administrativos.

No hace falta repetir decisiones confirmadas ni aportar datos bancarios privados para programar. Configurar credenciales fuera del chat/código al habilitar las integraciones.

## Límites concretos

El parser reconoce patrones, no español arbitrario; los formularios cubren finanzas avanzadas y aclaraciones complejas. Las cuotas estimadas no reemplazan resúmenes reales. No se calculan feriados sin calendario. El historial de WhatsApp puede ser incompleto; si no termina su recuperación, los avisos esperan revisión explícita.

No se promete entrega exactamente una vez. Los envíos inciertos requieren evidencia y no se repiten ciegamente. Un adjunto incompleto no se guarda. Copia PC es oportunista, no garantizada con PC apagada. El borrado remoto vencido no espera copia y se ejecuta cuando haya proceso disponible.

La transferencia HTTP de SQLite está acotada a 14 MB y recovery a 120 segundos. Una base mayor o sin margen requiere mantenimiento deliberado. Los originales conservan 10 MB/archivo, cinco por registro y 100 MB remotos. El regreso no se automatiza al cambiar de ciclo o reiniciar.

No hay resúmenes/archivos automáticos, modelos, OCR, transcripción, APIs de IA, Gmail, bancos, otros hogares, cobros ni app móvil nativa. Frontend local sin telemetría. No se implementó cifrado en reposo.

## Evolución solicitada a ORDEN 4.0 (18/11/2026)

Se inició la ampliación desde la aplicación existente. La auditoría previa a cambios está en [ORDEN_4_AUDITORIA.md](ORDEN_4_AUDITORIA.md). Este bloque registra el trabajo nuevo; las validaciones v3 de arriba son evidencia histórica y no se atribuyen a esta sesión.

| Capacidad | Estado nuevo | Límite actual |
| --- | --- | --- |
| Migraciones incrementales | Implementadas | Deben pasar build/pruebas en esta sesión. |
| Telegram Bot API | Adaptador long polling implementado | No hay token ni IDs reales; prueba externa pendiente. |
| Seguridad Telegram | IDs numéricos, chat, activación, pausa de grupo, cursor y deduplicación implementados | Requiere privacidad desactivada, rol administrador y grupo real configurado. |
| Memoria central | Migración, servicio, consulta y registro por tablero implementados | Patrones acotados, no semántica libre; el tablero conserva actor, origen y auditoría. |
| KEVIN OS | Registro de ocho módulos y coordinador implementados parcialmente | La mayoría reusa el Engine; investigación externa y agentes avanzados pendientes. |
| Tests nuevos | Añadidos para polling, seguridad, archivos, memoria y autorización | 30 pruebas automatizadas pasan con datos sintéticos; ver runner temporal indicado abajo. |
| OCR/IA local | No implementados | No se configuró modelo ni librería; sin datos enviados a proveedores. |
| Cifrado de copias | Pendiente | La auditoría confirmó que la versión existente no cifra backups. |

La nueva instrucción ORDEN 4.0 amplía el alcance anterior que prohibía IA/OCR. Se actualizaron las reglas locales para permitir IA local opcional y OCR progresivo, manteniendo privacidad, confirmación humana, no transcripción, no resúmenes espontáneos y no acciones arbitrarias. Consultar [estado actual](ORDEN_4_ESTADO.md) y las guías Telegram, memoria y agentes antes de habilitar dependencias reales.

### Validación inicial de ORDEN 4.0 (superada por el addendum final)

Actualizado: **18/11/2026**. La compilación de producción y el chequeo de TypeScript pasan. Las **30 pruebas automatizadas** pasan usando datos sintéticos; la suite incluye Telegram simulado, memoria, API, restauración y regresión del dominio existente. `node scripts/check-ui.mjs` verifica login, diez vistas, alta de una entidad de memoria, escritorio y móvil sin excepciones de JavaScript. El runner estándar de Node de este entorno falla en `os.userInfo()`; para la ejecución se usó y luego retiró un preload temporal, sin modificar la configuración de producción. No se usaron credenciales reales ni se conectó con Bot API, WhatsApp o Railway.

El estado funcional y sus límites externos están detallados en [ORDEN_4_ESTADO.md](ORDEN_4_ESTADO.md). La integración real de Telegram y las pruebas con un grupo configurado quedan pendientes de token e IDs numéricos; OCR/IA local, investigación web y cifrado de respaldos siguen pendientes.

### Addendum final: estado actualizado

La evaluación anterior quedó superada: ahora hay extracción local revisable, comparación del historial de compras, KEVIN OS con consultas acotadas, búsqueda pública opcional y respaldos cifrados. Consultar [estado actual](ORDEN_4_ESTADO_ACTUAL.md), [agentes actuales](ORDEN_4_AGENTES_ACTUAL.md), [compras](ORDEN_4_COMPRAS_ACTUAL.md) e [investigación web](ORDEN_4_INVESTIGACION_WEB.md).

Validación final de esta ejecución: 37/37 pruebas pasan con datos sintéticos; `npm.cmd run typecheck` pasa; TypeScript y Vite compilaron en una carpeta temporal junto a las cinco migraciones. `npm.cmd run build` no pudo escribir el `dist` preexistente por permisos de Windows y la revisión visual de Chrome no se volvió a correr. Para la suite se usó un preload temporal por `os.userInfo()` y `--test-force-exit` por un handle abierto al cierre. No se usaron credenciales reales, no se consultó al proveedor externo ni se conectaron Telegram, WhatsApp o Railway.
