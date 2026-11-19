# Memoria familiar ORDEN 4.0

## Modelo implementado

La migración `003_memory.sql` agrega entidades, hechos y relaciones a la misma SQLite. Cada entidad tiene tipo, nombre normalizado, alias, atributos, autoría, fechas y versión. Cada hecho tiene sujeto, predicado estable, valor JSON estructurado, origen (mensaje o nota), autor, fechas y estado. Una corrección reemplaza el hecho activo y conserva el anterior como `superseded`. Las relaciones guardan sujetos, tipo, origen, autor y fecha; los duplicados se evitan con un índice único activo.

La API autenticada expone lectura en `/api/state` y `/api/memory/search`, además de escrituras para entidades, hechos y relaciones. Los mensajes Telegram se integran mediante `KevinOSOrchestrator`; no duplican la base ni la autoría.

## Conversación disponible

El parser determinista entiende por ahora cumpleaños, relación de hermanos, teléfono, correo y dirección en formas acotadas. Ejemplos cubiertos por el módulo:

- «Guardá que Carlos cumple años el 18 de marzo.»
- «¿Cuándo cumple Carlos?»
- «Guardá que Carlos es hermano de Luisina.»
- «¿Qué familiares de Luisina tenemos registrados?»
- «El teléfono del electricista es 11-5555-0101.»
- «Actualizá el teléfono del electricista a 11-5555-0202.»

Todos los miembros autorizados comparten esta memoria. Se registra la fuente de cada hecho. No se adivinan relaciones, nombres ni valores; un dato que no coincide con estas formas todavía requiere el tablero/API o una formulación más concreta.

## Pendiente

No existe aún una vista de memoria con formularios/edición en el tablero, una taxonomía completa de hechos, resolución avanzada de entidades, búsqueda semántica ni OCR. La lectura de valores sensibles por Telegram debe limitarse para direcciones y otros datos delicados antes de ampliar su uso.
