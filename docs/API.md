# API privada

Base PC: `http://127.0.0.1:4317/api`. Railway: HTTPS propio, API sin tablero público. Todas las rutas de datos exigen `Authorization: Bearer <token de app>`. No usar un token de Railway en ese encabezado. El frontend no recibe los secretos administrativos. `GET /health` sólo indica que el proceso HTTP responde; no confirma propiedad, conexión o presupuesto.

| Ruta | Función |
| --- | --- |
| GET /status | Propietario/generación, transporte, QR privado, fallos, costos y última copia |
| GET /state | Registros, pagos, documentos, borradores, auditoría y agregados explícitos del tablero |
| GET /agents | Catálogo de ocho módulos y ejecuciones recientes |
| POST /agents/query | Consulta local coordinada de solo lectura, máximo tres pasos |
| GET /research/status | Proveedor opcional, cuota local y consentimiento requerido |
| POST /research/agreement | Registrar o revocar el acuerdo local del perfil Kevin/Luisina; no llama al proveedor |
| POST /research/search | Consulta pública; requiere `confirmPublicQuery: true` y devuelve hasta cinco fuentes |
| POST /messages | Texto/autor; ID idempotente opcional, cita; reloj original sólo con simulador |
| POST /records | Carga estructurada validada por Engine |
| PATCH /records/:id | Cambios con versión optimista; mismo movimiento y auditoría |
| POST /records/:id/pay | Pago declarado completo/parcial; cuentas/partes y diferencias explícitas |
| POST /accounts | Cuenta y saldo/fecha declarados; no conexión bancaria |
| POST /shopping-list | Fecha y responsables heredados por productos pendientes |
| GET, POST /policy | Horarios y anticipaciones; recalcula jobs e invalida versiones antiguas |
| POST /files | Bytes octet-stream; query id, name, mime, size, targetId, purpose |
| POST /documents/:id/extract | Solicitar OCR/extracción local; la respuesta requiere revisión |
| GET /extractions | Propuestas y estado de revisión |
| PATCH /extractions/:id | Guardar campos revisados, sin registrar la operación |
| POST /extractions/:id/confirm | Confirmación explícita para registrar compra o factura |
| POST /extractions/:id/reject | Rechazar propuesta y conservar el original |
| GET, POST /shopping/merchants | Comercios del historial local |
| GET, POST /shopping/products | Catálogo de productos y presentaciones |
| POST /shopping/products/:id/aliases | Asociación explícita de alias a producto |
| GET, POST /shopping/purchases | Historial de compras confirmadas o declaradas manualmente |
| GET /shopping/compare?q=... | Comparación histórica por precio y unidad compatible |
| POST /shopping/promotions | Registrar promoción con fuente HTTPS y vigencia |
| POST /attachments/:id/retrieve | Completar referencia autorizada del transporte con destino y propósito |
| GET /documents/:id | Original privado como attachment; sin lectura o envío al grupo |
| POST /documents/:id/local-copy | Confirmación de copia por hash después de verificar bytes |
| POST /backup | Copia rutinaria local si corresponde |
| POST /export | Exportación consistente para copia de PC; no transfiere propiedad |
| GET /final | Manifiesto/ID de exportación final del traspaso |
| GET /snapshots/:id/:file | Snapshot registrado; backup cifrado usa `backup.enc` y `manifest.json` |
| POST /handoff | Preparar cierre/exportación al otro entorno; sin activar automáticamente destino |
| POST /history/continue | Confirmación explícita del límite de historial recuperado |
| POST /outbox/:id/evidence | Registrar evidencia de un delivery_unknown; sin reenvío automático |
| POST /simulator/clock | Fijar/resetear reloj; sólo transporte simulado local |
| POST /stop | Cierre local ordenado; no se presenta como apagado remoto facturable |
| POST /recovery/finish | Solicitar parada del deployment durante recuperación |
| POST /return/manifest | Recovery: ticket de PC liberada y manifiesto para regreso |
| PUT /return/:id/state | Recovery: SQLite final con checksum y cuota validados |
| PUT /return/:id/original/:hash | Recovery: original referenciado, limitado y verificado |
| POST /return/:id/commit | Recovery: aceptar importación tras cierre; comprobar resultado luego |

Filtros de `/state`: from/to por fecha de operación en Buenos Aires, currency, person, category, account. El vencimiento se muestra aparte. Los presupuestos mensuales declaran `period: AAAA-MM`, moneda y categoría/general; base: gastos conocidos por fecha de operación, con compra de tarjeta una vez y pago de resumen excluido. Metas/reservas y comparación de resumen real frente a cuotas se muestran separadamente.

Los tipos estructurados admitidos son los de `createSchema` en `engine.ts`. Dinero siempre en unidades menores enteras: 1.000 ARS = 100000. Importe desconocido: `null`. Para tarjetas: `accountId`, `data.count`, `data.firstDue`; el resumen real usa `period`, importe/vencimiento y `data.charges` escrito por el usuario. Para recurrencias mensuales: `data.day`, `data.expectedDay` opcional, responsables y `data.fixedAmount` explícito si el importe es fijo.

Un pago dividido incluye `parts: [{amount,accountId?}]`, cuya suma debe ser el importe total. Las partes no son gastos independientes. Si difiere del saldo se exige `partial: true`, o `settlement: adjust_total` con motivo, o `settlement: credit` para un exceso declarado como saldo a favor. Sin indicación se conserva el pendiente y se pregunta.

La recuperación no acepta intenciones ni crea exportaciones rutinarias nuevas. Sus rutas permiten descargar una exportación final, originales y, para un regreso explícito, recibir el estado cerrado de PC. Los respaldos locales requieren `APP_BACKUP_ENCRYPTION_KEY`; perderla impide restaurarlos. El timeout se mantiene acotado; no hay un servidor de mantenimiento permanente.
