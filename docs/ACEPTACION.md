# Casos y evidencia

Los 84 casos de la especificación se conservan como checklist. **S** = componentes/casos relacionados comprobados localmente con datos o transporte simulados; **I** = implementado, sin prueba específica completa del escenario; **E** = necesita cuenta/plataforma real. Una S no significa aprobación end-to-end en WhatsApp/Railway. Los nombres de tests agrupan familias; esta tabla conserva los límites particulares.

Evidencia automatizada: `tests/domain.test.ts`, `api.test.ts`, `operations.test.ts`, `return.test.ts` y `transport.test.ts`. Se comprueban transacciones, dinero/fechas, pagos, conversación, archivos, API, copias, stager y propiedad con plataforma simulada. La biblioteca real se importa sin enlazar una cuenta; sus eventos se inyectan con identidades sintéticas. No se enviaron mensajes al grupo real.

| Caso | Escenario | Estado / límite |
| --- | --- | --- |
| A01 | gaste 10mil en kiosco | S — alcance local/simulado |
| A02 | gaste 20 en bebida | S — alcance local/simulado |
| A03 | compre harina, papa, queso fresco y frutilla | S — alcance local/simulado |
| A04 | mañana a las 2 de la tarde tenemos turno con pediatra de liam | S — alcance local/simulado |
| A05 | llamar a mama karina a las 22 | S — alcance local/simulado |
| A06 | recordame que pagos vencen mañana | S — alcance local/simulado |
| A07 | A04 procesado tras desconexión | S — alcance local/simulado |
| A08 | Dos borradores; respuesta para Luisina | S — alcance local/simulado |
| A09 | Gas para Kevin; vencimiento 25/10; aviso a las 15; PDF | I — revisar escenario específico |
| A10 | PDF sin concepto/fecha/responsable suficientes | S — alcance local/simulado |
| A11 | PDF/TXT contiene otro importe o instrucciones | S — alcance local/simulado |
| A12 | Repetición de ID de mensaje o bytes de archivo | S — alcance local/simulado |
| A13 | Ya pagué el gas; luego comprobante | I — revisar escenario específico |
| A14 | Varias facturas de gas candidatas | I — revisar escenario específico |
| A15 | Completar antes de envío encolado | S — alcance local/simulado |
| A16 | Aviso de servicio calculado en sábado | S — alcance local/simulado |
| A17 | Reinicio con avisos perdidos | S — alcance local/simulado |
| A18 | Pagado recibido durante desconexión | I — revisar escenario específico |
| A19 | Caída tras enviar y antes de acuse | S — alcance local/simulado |
| A20 | Transferencia entre cuentas propias | S — alcance local/simulado |
| A21 | Compra con tarjeta y pago de resumen | S — alcance local/simulado |
| A22 | ARS 10.000 y USD 20 | S — alcance local/simulado |
| A23 | Comprar harina antes del lunes | S — alcance local/simulado |
| A24 | Pasame la factura del gas | I — revisar escenario específico |
| A25 | Pedir mapa sin destino | S — alcance local/simulado; URLs seguras y construcción de enlaces |
| A26 | Mensaje de otro grupo o autor ajeno | S — alcance local/simulado |
| A27 | Error de base/disco al guardar | I — revisar escenario específico |
| A28 | Ok después de aviso | S — alcance local/simulado |
| A29 | Compra de 1.000 en tres cuotas | S — alcance local/simulado |
| A30 | Reprogramar con avisos antiguos en outbox | I — revisar escenario específico |
| A31 | Archivo mayor a 10 MB, sexto adjunto o cuota llena | S — alcance local/simulado; tamaño y sexto archivo probados, cuota total implementada |
| A32 | Pago completo el 16/10/2026 | S — alcance local/simulado |
| A33 | Archivo asociado a dos pendientes; uno activo | S — alcance local/simulado |
| A34 | Reabrir después de eliminar original | I — revisar escenario específico |
| A35 | Falla envío de archivo pedido | I — revisar escenario específico |
| A36 | PC apagada y railway_active | E — requiere entorno real |
| A37 | railway_active y archivo solo en PC apagada | E — requiere entorno real |
| A38 | Redeploy remoto legítimo | E — requiere entorno real |
| A39 | Tablero con copia antigua | I — revisar escenario específico |
| A40 | Audio recibido | I — revisar escenario específico |
| A41 | JPG/PNG y metadatos completos | I — revisar escenario específico |
| A42 | Primer inicio sin saldos | S — alcance local/simulado |
| A43 | Pedido de apagar un servicio ajeno al bot | S — alcance local/simulado |
| A44 | Margen Hobby no verificado | S — alcance local/simulado |
| A45 | Declaración inequívoca hice/pagué/compré | S — alcance local/simulado |
| A46 | Recordá pagar esto | S — alcance local/simulado |
| A47 | Posponer F-0007 una hora | S — alcance local/simulado |
| A48 | Pendiente para ambos; Luisina dice hecho | S — alcance local/simulado |
| A49 | Gasto claro y tarea sin fecha en un mensaje | S — alcance local/simulado |
| A50 | Edición o eliminación del mensaje de gasto | S — alcance local/simulado |
| A51 | Borrador sin respuesta durante 72 horas | S — alcance local/simulado |
| A52 | Mañana a las 9 recordame para Kevin qué pagos vencen | S — alcance local/simulado |
| A53 | Hay urgentes o vencidos pero nadie pidió resumen | S — alcance local/simulado |
| A54 | Dos pendientes diferentes a la misma hora | S — alcance local/simulado |
| A55 | Dos offsets del mismo pago se adelantan al mismo instante | S — alcance local/simulado |
| A56 | Regla día 31 aplicada a febrero y luego marzo | S — alcance local/simulado |
| A57 | Gasto con importe sin moneda | S — alcance local/simulado |
| A58 | Kevin informa Luisina gastó 10mil | S — alcance local/simulado |
| A59 | Consultar saldo sin base inicial | S — alcance local/simulado |
| A60 | Pagué factura con saldo pendiente conocido de 40.000 | S — alcance local/simulado |
| A61 | Pagué factura de importe desconocido; luego 40mil | S — alcance local/simulado |
| A62 | Pagué 30mil de una deuda de 50mil | S — alcance local/simulado |
| A63 | Pago con 20mil efectivo y 30mil transferencia | S — alcance local/simulado |
| A64 | Resumen real de tarjeta distinto de cuotas previstas | S — alcance local/simulado; resumen/estimación y diferencias declaradas, sin PDF |
| A65 | Factura esperada no llegó; luego llega con datos | S — alcance local/simulado |
| A66 | Reservé 100mil para vacaciones, guardado en efectivo | S — alcance local/simulado |
| A67 | Productos comprados y total ya informado | S — alcance local/simulado |
| A68 | Medio de un adjunto incompleto caduca antes de aclarar | I — revisar escenario específico |
| A69 | Resolución el 31/12 o fin de febrero | S — alcance local/simulado |
| A70 | Vence retención sin copia local por PC apagada | S — alcance local/simulado |
| A71 | Aviso de factura con documento asociado | S — alcance local/simulado |
| A72 | Ocho días con cambios y respaldos disponibles en PC | S — alcance local/simulado |
| A73 | Sesión de WhatsApp revocada | E — requiere entorno real |
| A74 | Proyección total de USD 5,60 o adicional mayor al máximo | S — alcance local/simulado; producción pendiente |
| A75 | Deployment detenido pero volumen conservado | S — alcance local/simulado; producción pendiente |
| A76 | Traspaso con PC ya conectada | S — alcance local/simulado; producción pendiente |
| A77 | Cierre remoto con PC apagada; PC enciende después | E — requiere entorno real |
| A78 | Snapshot antiguo, corrupto o con generación incompatible | S — alcance local/simulado |
| A79 | Comienza otro ciclo o hay commit estando en modo local | S — alcance local/simulado; producción pendiente |
| A80 | Recuperación remota de datos | E — requiere entorno real |
| A81 | Métricas de costo viejas o permisos ausentes | S — alcance local/simulado |
| A82 | No puede probarse parada remota | S — alcance local/simulado; producción pendiente |
| A83 | Falla el comando de plataforma al detener | S — alcance local/simulado; producción pendiente |
| A84 | Regreso autorizado de PC a Railway tras uso local | S — alcance local/simulado; producción pendiente |

Pruebas pendientes de infraestructura: lectura/calibración de costos actuales, estados reales de parada, volumen detenido, sesión remota/local, límite de historial, PC inicialmente apagada y regreso a Railway con última generación. No se sustituyen por las dos bases de prueba.

El tablero se recorrió en Chrome con una base vacía aislada: login, nueve vistas, escritorio/móvil y cero excepciones JavaScript. Descarga/filtros/edición se comprueban por API; las capturas están en `docs/evidencia/`. El código de revisión de UI es opcional y no instala un navegador como dependencia del bot.
