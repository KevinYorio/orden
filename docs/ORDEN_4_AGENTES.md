# Agentes KEVIN OS (borrador anterior)

> Los estados de este borrador quedaron desactualizados. Consultar [agentes actuales](ORDEN_4_AGENTES_ACTUAL.md) y el [estado completo](ORDEN_4_ESTADO_ACTUAL.md).

`KevinOSOrchestrator` y `AgentRegistry` viven en el proceso existente. Los IDs son estables y las listas de herramientas son explícitas. Los módulos llaman al `Engine`, `MemoryService` o lectura documental permitidos; no ejecutan acciones arbitrarias generadas por IA.

| ID | Especialidad | Estado actual |
| --- | --- | --- |
| `orden.agenda` | Tareas, turnos, obligaciones y recordatorios | Parcial: reutiliza Engine y scheduler existentes. |
| `orden.memory` | Personas, hechos y relaciones | Parcial: migración y patrones de cumpleaños, teléfonos, correos, direcciones y hermanos. |
| `orden.shopping` | Lista y compras compartidas | Parcial: lista existente; catálogo comparable y tickets pendientes. |
| `orden.documents` | Asociación y recuperación de documentos | Parcial: conservación opaca existente; extracción/OCR pendiente. |
| `orden.finance` | Gastos, pagos, cuotas, cuentas y presupuestos | Parcial: dominio financiero existente; extracción documental y análisis avanzado pendientes. |
| `orden.research` | Investigación web con fuentes | Pendiente: no hay proveedor conectado; solicitudes no se presentan como consultadas. |
| `orden.correlation` | Consultas cruzadas | Parcial: búsqueda textual de próximos registros y documentos relacionados. |
| `orden.security` | Autorización y límites de herramientas | Implementado en el borde Telegram/API; el registry no permite despachar identidad sin validar. |

No se crea una base por agente ni un proceso/modelo activo por especialista. Los especialistas que hoy están parciales reutilizan servicios actuales; los contratos de entrada/salida y permisos se ampliarán al habilitar nuevas operaciones.

No está configurado un proveedor de IA local. Las capacidades esenciales siguen deterministas y el procesamiento avanzado no se declara terminado.
