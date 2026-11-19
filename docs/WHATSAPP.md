# WhatsApp y conversación

Baileys instalado: **7.0.0-rc14, MIT**, versión consultada en npm el 19/10/2026. Se verificó su importación y los símbolos usados en Windows; no se vinculó una cuenta. Es una versión preliminar: conservar el lockfile y revisar migraciones al actualizar. El mantenedor documenta cambios incompatibles desde v7 y su carácter no oficial. No se garantiza ausencia de fallos o bloqueos. [Repositorio del mantenedor](https://github.com/WhiskeySockets/Baileys).

El adaptador real y el simulado son clases separadas. Baileys se importa sólo al usar el transporte real; el núcleo no necesita vinculación. No usa Chromium. Hay dependencias transitivas multimedia de Baileys, pero la app no invoca lectura de contenido, OCR, transcripción, miniaturas, audio o video.

Para vincular, completar en la instalación que vaya a ser propietaria:

1. `MESSAGING_ADAPTER=baileys` y grupo estable en `WHATSAPP_GROUP_ID`.
2. IDs verificados de Kevin/Luisina y del bot en sus variables, separados por comas si hay alias PN/LID confirmados. No construirlos a partir de nombres ni suponer que un LID es un teléfono.
3. `WHATSAPP_ACTIVATED_AT` como ISO con zona: frontera explícita que excluye cargas anteriores. No importa chats históricos ajenos.
4. Iniciar el servicio propietario y abrir Operación. El QR privado aparece en el tablero autenticado. Escanear desde la cuenta adicional del bot.
5. Verificar que hay exactamente los dos adultos y el bot. El adaptador comprueba metadatos reales y construye menciones con IDs de participantes. Una persona adicional pausa operaciones y aparece en el tablero.

Las claves Signal y credenciales se persisten en `session/auth.sqlite`, separada de la base exportable. Cada instalación mantiene su sesión; no se exportan sesiones ni tokens en copias normales. La estrategia de vinculación entre ambas instalaciones y la disponibilidad real de historial deben comprobarse con la cuenta elegida. No se clona un estado criptográfico viejo.

Al conectar se recupera el historial que entregue la biblioteca y se aplican operaciones antes del planificador. Si no llega un cierre de historial, el transporte mantiene bloqueados los avisos; el operador puede confirmar en el tablero que revisó el historial disponible. Ese botón no afirma que WhatsApp recuperó todos los mensajes. La sesión revocada se muestra como tal y requiere volver a vincular; hay tres intentos acotados de reconexión por ejecución.

Sólo se procesa el grupo/autor configurado, ignorando mensajes propios, otros chats, eventos editados o eliminados y protocolos. Los únicos destinatarios son el grupo autorizado y sus responsables. No se contacta a Liam, Karina ni personas mencionadas en títulos. Una mención no garantiza alerta de un iPhone silenciado.

El parser es determinista. Admite las frases originales de la sección 26 de la especificación y patrones acotados de tareas, turnos, obligaciones, gastos/ingresos, transferencias entre cuentas reconocidas, compras, pagos, cambios, consultas, mapa y archivo. Los formularios permiten completar tarjetas/cuotas, presupuestos, metas, cuentas, recurrencias, diferencias y partes de pago. No se promete comprensión libre de cualquier texto.

`recordame qué pagos vencen mañana` consulta ahora; `mañana a las 9 recordame para Kevin qué pagos vencen` programa una consulta pedida. `recordame pagar...` crea un pendiente. El autor de una tarea no se asigna automáticamente. Un hecho en primera persona sí identifica al realizador financiero.

Los borradores sobreviven a reinicios y traspasos. Responder con su ID, una cita al mensaje del bot o contexto inequívoco del mismo autor. Ambos pueden completar un borrador identificado. `ok`, lectura o entrega no resuelven pendientes. Borrar/anular exige confirmación; los movimientos conservan auditoría.

No hay resúmenes espontáneos, ni urgentes, diarios o de recuperación. Los avisos son individuales y no llevan originales. Un pedido de archivo produce su propio resultado/outbox; si falla, no reenvía recordatorios ya entregados. `delivery_unknown` requiere evidencia concreta antes de cerrar la incertidumbre.
