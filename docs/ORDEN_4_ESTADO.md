# Estado ORDEN 4.0 (referencia historica)

> Esta tabla conserva un corte anterior. Para el estado vigente de IA/OCR, compras, KEVIN OS, investigacion publica, backups cifrados y validacion, consultar [ORDEN_4_ESTADO_ACTUAL.md](ORDEN_4_ESTADO_ACTUAL.md).

Actualizado: 18/11/2026. Estado de esta etapa, separado de la evidencia histórica v3 de `docs/PROGRESO.md`.

Validación local de esta etapa: `npm.cmd run typecheck` y `npm.cmd run build` pasan; 30 pruebas automatizadas pasan con datos sintéticos; `node scripts/check-ui.mjs` verifica diez vistas, alta de memoria, escritorio y móvil sin excepciones. El test runner estándar del entorno falla al consultar `os.userInfo()`; la suite se ejecutó con un preload temporal de entorno que ya fue retirado. No se hicieron llamadas a Telegram, WhatsApp ni Railway.

| Función | Clasificación |
| --- | --- |
| Auditoría del proyecto existente | Implementada; inspección documental/código completada. |
| Migraciones incrementales | Implementadas; incluidas en build, respaldos, restauración y regreso remoto; suite automatizada aprobada. |
| Telegram long polling | Implementado y aprobado con cliente API simulado; integración Bot API real pendiente. |
| Identidad numérica/chat/frontera de activación | Implementada en adaptador; requiere IDs/token reales para operación. |
| Detección de miembros y pausa | Implementada y probada con actualizaciones simuladas; requiere configuración BotFather, rol administrador y grupo real. |
| Recepción/descarga de documentos Telegram | Implementada y probada con cliente simulado hasta límites del dominio; integración real pendiente. |
| Memoria estructurada | Implementada: entidades, cumpleaños, relaciones, teléfonos, correos y direcciones; lenguaje reconocido por patrones explícitos. |
| API de entidades/hechos/relaciones | Implementada y autenticada; tablero permite alta y consulta. |
| KevinOS / registro de ocho agentes | Implementado parcialmente; agentes avanzados aún reutilizan Engine o están pendientes. |
| Correlaciones | Parcial, búsqueda textual local; no equivale a comprensión semántica. |
| IA local/OCR | Pendientes por proveedor/modelo/biblioteca y validación de privacidad. |
| Investigación web/precios | Pendiente; no se consultan fuentes externas desde el producto. |
| Cifrado de backups/restauración | Pendiente. |
| WhatsApp heredado | Conservado; suite de regresión del transporte aprobada. |
| Railway | Preparado/documentado, no desplegado ni verificado en producción. |

Dependencia del usuario: crear bot y grupo, obtener token e IDs numéricos, y establecer la configuración descrita en `ORDEN_4_TELEGRAM.md`. No pegar el token en el chat.
