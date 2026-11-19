# Auditoría de ORDEN 4.0

Fecha: 18/11/2026  
Alcance: inspección de `asistente-hogar/` antes de implementar cambios. No se inspeccionaron ni modificaron el ERP u otros proyectos.

## Resumen

El workspace contiene una aplicación familiar v3.0 funcional por código y comprobaciones locales previamente documentadas. No es un proyecto vacío ni una maqueta: ya incluye un núcleo TypeScript, persistencia SQLite, conversación determinista, agenda y recordatorios, finanzas, compras, archivos opacos, API privada, tablero React, adaptador simulado, adaptador WhatsApp no oficial y controles de ejecución local/Railway.

ORDEN 4.0 debe evolucionar ese núcleo. Los cambios de mayor impacto son incorporar Telegram Bot API, una memoria estructurada para personas/hechos/relaciones y una capa de orquestación modular. Se debe ampliar mediante migraciones aditivas y conservar los límites de finanzas, auditoría, deduplicación y propietario único existentes.

## Arquitectura encontrada

- **Runtime:** Node.js 24 y TypeScript ESM. `package.json` define `typecheck`, pruebas con `node:test`, build y scripts de operación.
- **Dominio:** `packages/domain/src/` contiene tipos, parser acotado de español rioplatense, importes enteros en unidades menores, fechas y zona horaria `America/Argentina/Buenos_Aires`.
- **Servicio:** `apps/service/src/` integra Engine, Store, archivos, adaptadores, API, proxy y controlador de ejecución. Un proceso es propietario de la base, el planificador y el emisor.
- **Persistencia:** SQLite integrado mediante `node:sqlite`, WAL, claves foráneas y transacciones `BEGIN IMMEDIATE`. La migración instalada es `001.sql`; el instalador de migraciones está cableado actualmente a una única versión.
- **Interfaz:** React/TypeScript con nueve vistas documentadas, API privada y ejecución local en loopback.
- **Despliegue preparado:** Dockerfile y `railway.json` existen. El propio progreso aclara que Railway no está vinculado ni desplegado.
- **Repositorio Git:** la carpeta inspeccionada no contiene `.git`; no se pudo verificar un estado de cambios con `git status`.

## Inventario funcional

| Componente | Estado encontrado | Evidencia y límite |
| --- | --- | --- |
| Conversación | Implementado; parser determinista | `packages/domain/src/parser.ts`, `apps/service/src/engine.ts`; no interpreta lenguaje libre general. |
| Agenda y recordatorios | Implementados con jobs versionados y outbox persistente | `Engine.tick`, tablas `jobs`/`outbox`; reinicios convierten envíos interrumpidos en `delivery_unknown`. |
| Finanzas | Implementadas para ARS/USD, pagos parciales, cuotas, transferencias, presupuestos y metas | `engine.ts`, `money.ts`, esquema `001.sql`; no hay conexión bancaria ni conciliación automática. |
| Compras | Lista compartida, productos y gastos vinculados | Engine y tablero; no hay histórico normalizado de precios por presentación ni OCR de tickets. |
| Documentos | Almacenamiento opaco PDF/TXT/JPG/PNG con hash, cuotas, vínculos y retención | `apps/service/src/files.ts`; no lee el contenido ni extrae datos. |
| Memoria familiar | Parcial/no implementada como modelo propio | No hay entidades de personas, hechos ni relaciones confirmadas; datos libres quedan en títulos/notas de registros. |
| Dashboard | Implementado como panel local de operación y gestión | `apps/web/src/main.tsx`; no hay una vista de segundo cerebro ni analítica OCR/compra avanzada. |
| Transporte simulado | Implementado | `SimulatedMessaging` permite desarrollo sin cuenta externa. |
| WhatsApp | Implementado mediante Baileys, no oficial y no enlazado | `BaileysMessaging`; configuración y enlace reales están pendientes según `docs/WHATSAPP.md`. |
| Telegram | No implementado | No hay token, lista de IDs numéricos, cursor de updates ni adaptador Bot API. |
| Coordinador/agentes | No implementados como contratos y registro | Actualmente el Engine es el punto central determinista. |
| IA local, OCR y extracción | No implementados | Sin proveedor, modelo, OCR, procesamiento de documentos o configuración de privacidad para esas funciones. |
| Webhooks Telegram | No implementados | No hay endpoint ni verificación de `X-Telegram-Bot-Api-Secret-Token`. |
| Long polling Telegram | No implementado | No hay offset persistido, gestión de `getUpdates` ni exclusión específica del consumidor. |
| Seguridad de grupo | Implementada parcialmente para WhatsApp; inexistente para Telegram | WhatsApp verifica grupo/autores y pausa ante miembros adicionales; Telegram requiere IDs numéricos, chat único y vigilancia de miembros. |
| Copias/traspaso | Implementados localmente y simulados | Snapshots `VACUUM INTO`, manifiesto/hash, barrera/generación, rotación y validación; control Railway real pendiente. |
| Cifrado de copias | No implementado | `docs/ARQUITECTURA.md` declara que no hay cifrado en reposo; no hay clave/procedimiento de cifrado de backups. |
| Railway y costos | Código preparado con simulador y guardas | No hay credenciales, muestra calibrada ni prueba de parada/volumen en Railway. No se afirma operación remota. |

## Funcionalidades y componentes reutilizables

- `MessagingAdapter`, `Dispatcher`, `Incoming` y `Outgoing` separan el contrato común del transporte.
- `Store`, `Engine`, `Files`, `RuntimeController` y la cola serial son reutilizables para un nuevo transporte sin duplicar dominio o base de datos.
- Inbox con clave primaria por ID y outbox persistente evitan repetir operaciones; los envíos inciertos no se reintentan a ciegas.
- El reloj de dominio y `luxon` respetan la zona de Buenos Aires; el parser/formularios ya soportan sin IA las operaciones existentes.
- Validación Zod, comparación de token en tiempo constante, API con Bearer, límite de cuerpos y API de recuperación autenticada proporcionan base de seguridad.
- Suite actual: `tests/domain.test.ts`, `api.test.ts`, `operations.test.ts`, `return.test.ts` y `transport.test.ts`. `docs/PROGRESO.md` registra 25 pruebas exitosas anteriores; esa cifra es evidencia histórica del documento, no una ejecución realizada en esta auditoría.

## Riesgos de modificación

1. **Migraciones:** `Store` solo aplica la versión 1 de forma explícita. Antes de agregar memoria o cursor Telegram se necesita un runner incremental; las tablas nuevas deben crearse sin descartar ni reescribir registros actuales.
2. **Un solo consumidor/emisor:** Telegram no debe iniciarse junto a Baileys ni junto a otro long poller. El lock local no coordina por sí solo dos instalaciones; debe respetarse la barrera persistente de propietario y la identidad de deployment.
3. **Autorización Telegram:** no confiar en nombre, username ni nombres visibles. Asociar los IDs numéricos confirmados a Kevin/Luisina y verificar chat y remitente en cada update. Un miembro ajeno debe pausar las operaciones privadas.
4. **Updates históricos y duplicación:** la API considera confirmado un update cuando el siguiente `getUpdates` usa un offset mayor. Hay que persistir cursor después del procesamiento y deduplicar por update/mensaje para tolerar caídas entre commit y confirmación.
5. **Archivos:** el límite documentado actual de la API para descarga vía `getFile` es 20 MB; la política del dominio admite 10.000.000 bytes por original. Aplicar el menor límite antes de descargar/guardar y conservar bytes originales, no enviarlos a IA sin una política explícita.
6. **Privacidad de grupo:** los mensajes ordinarios requieren desactivar el modo de privacidad de BotFather o dar privilegios de administrador; el bot debe seguir rechazando chats y autores ajenos.
7. **Operación remota:** el código de parada/recuperación no prueba el comportamiento real de Railway, la persistencia del volumen o el regreso con la PC apagada.
8. **Respaldo:** una copia íntegra local no equivale a una copia cifrada ni a una restauración comprobada con datos operativos. No tocar archivos únicos si su política de copia no está completa.
9. **Datos financieros:** preservar `null` como desconocido, importes enteros, movimientos no duplicados y confirmaciones explícitas; la IA debe proponer datos y delegar persistencia a validadores deterministas.
10. **Alcance anterior:** `AGENTS.md` y la especificación v3.0 excluyen IA/OCR/lectura documental. El nuevo encargo de ORDEN 4.0 los solicita expresamente. La autorización nueva amplía ese alcance para ORDEN; hay que actualizar esas reglas y mantener sus controles de privacidad y sin operaciones arbitrarias.

## Migraciones y dependencias

- **Migración necesaria:** versión 2, aditiva, para cursor/deduplicación de updates Telegram. Las entidades de memoria requieren una migración separada con hechos estructurados, relaciones, procedencia y auditoría.
- **Dependencia externa ausente:** token de Telegram Bot API; los IDs del grupo y usuarios tampoco están configurados. Desarrollo y pruebas deben usar cliente simulado.
- **Dependencias de IA/OCR:** no hay proveedor local instalado ni librería OCR. Diseñar adaptadores opcionales sin requerir un modelo para agenda, finanzas, autorizaciones ni consultas deterministas. La extracción no se considera implementada hasta tener procesamiento y verificación humana probados.
- **Operación externa:** BotFather, grupo, modo de privacidad, IDs y prueba real necesitan intervención/configuración del usuario; no se crean cuentas ni se solicitan secretos por el chat.
- **Git:** sin `.git` en el directorio del proyecto no se puede documentar rama/commit ni asegurar la procedencia del estado de archivos.

## Plan de implementación progresivo

1. **Auditoría y estado:** registrar hallazgos y actualizar instrucciones v3 para el nuevo alcance, dejando los límites de seguridad y finanzas vigentes.
2. **Telegram:** migración aditiva, adaptador Bot API oficial, long polling como opción compatible con ejecución local, cursor durable, allowlist numérica, pausa por miembros ajenos, manejo opaco de archivos y configuración simulada por defecto.
3. **Memoria central:** tablas de entidades/hechos/relaciones con procedencia y audit log; consultas y correcciones explícitas compartiendo el mismo Store.
4. **KEVIN OS:** contratos, registro de módulos y coordinador con límite de herramientas; inicializar ocho especialistas deterministas y dejar proveedores de IA opcionales.
5. **Documentos y OCR:** preservar originales; extraer a borrador estructurado con fuente/confianza y confirmación del usuario antes de contabilizar.
6. **Compras y finanzas ampliadas:** normalización comparable de producto/presentación y documentos financieros relacionados, sin doble contabilización.
7. **Investigación/correlaciones/dashboard:** datos web trazables y consultas cruzadas solo cuando exista proveedor y permisos configurados; extender vistas sin sustituir el tablero actual.
8. **Operación y seguridad:** pruebas de restauración con datos ficticios, cifrado de backups, instrucciones, guía Telegram y diferenciación de estados local/simulado/externo.

## Estado al cierre de la auditoría

- Auditoría del repositorio: **completada**.
- Implementación ORDEN 4.0: **no iniciada al escribir este documento**.
- Telegram real: **pendiente de token, IDs y configuración BotFather**.
- Telegram simulado y ejecución local: **implementables sin datos externos**.
- WhatsApp/Railway reales: **no vinculados ni verificados**, según la documentación existente.
- Pruebas ejecutadas durante la auditoría: **ninguna**.
