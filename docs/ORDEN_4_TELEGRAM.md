# Telegram ORDEN 4.0

## Estado

Adaptador Bot API oficial implementado con long polling, configuración segura por variables, lista numérica de autores, chat permitido, frontera de activación, deduplicación, cursor persistente y recepción opaca de documentos/fotos. La conexión real no está configurada ni probada: no hay token ni IDs reales.

Se eligió polling porque la aplicación también debe correr en una PC local sin abrir puertos públicos. Telegram no permite `getUpdates` mientras haya webhook activo. El servicio comprueba `getWebhookInfo` y falla sin borrar ni cambiar un webhook ajeno.

## Seguridad y operación

- Solo se acepta el `chat_id` configurado y los IDs numéricos configurados para Kevin/Luisina. Nombre, alias y username no autorizan operaciones.
- Se ignoran mensajes previos a `TELEGRAM_ACTIVATED_AT`; no se importan conversaciones históricas.
- Cada `update_id` se confirma después de aplicar su operación; `telegram_cursor.next_offset` se guarda en SQLite. El ID de mensaje deduplica una repetición si el proceso cae después del commit y antes de mover el offset.
- El bot debe tener el modo de privacidad desactivado y volver a agregarse al grupo para recibir mensajes normales. Debe ser administrador para recibir updates `chat_member`; no se solicitan derechos de moderación. El servicio espera exactamente a Kevin, Luisina y el bot.
- Un ingreso, salida, migración, mensaje de un ID no autorizado o grupo diferente pausa las operaciones privadas. El operador revisa el grupo en **Operación → Revisar miembros del grupo**.
- Se rechazan mensajes propios del bot y autores no asociados. Un grupo pausado no procesa mensajes familiares hasta la revisión explícita.
- Long polling pide `message`, `callback_query`, `chat_member` y `my_chat_member`. La cola serial y la barrera de propietario existentes siguen controlando escrituras y envíos.
- Fotos/documentos admitidos por el dominio se descargan solo al completar una asociación válida. El dominio mantiene el máximo local actual de 10.000.000 bytes; la documentación vigente de Bot API limita `getFile` a 20 MB. Se aplica primero el límite más estricto. El límite de envío familiar sigue siendo el de ORDEN.
- Los envíos se separan para respetar el ritmo del grupo; un error de red puede dejar una entrega incierta y no se reenvía a ciegas.

## Configuración manual

1. Crear un bot con `@BotFather` y guardar el token únicamente en el `.env` local o las variables secretas del runtime. No pegarlo en Telegram ni en Git.
2. Crear un grupo privado exclusivo para Kevin y Luisina; agregar el bot.
3. Desactivar el modo de privacidad en BotFather y volver a agregar el bot al grupo.
4. Darle al bot administración sin permisos de moderación, necesaria para recibir `chat_member`.
5. Detener Asistente Hogar y ejecutar `npm.cmd run telegram:identify`. Enviar en el grupo privado los dos códigos temporales que muestra; el helper consulta solo IDs, no muestra ni guarda el texto y no avanza el cursor de Telegram. No se debe ejecutar mientras otro cliente esté haciendo polling. Copiar los tres IDs numéricos que imprime.
6. Configurar `MESSAGING_ADAPTER=telegram`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_ALLOWED_CHAT_ID`, `TELEGRAM_KEVIN_USER_ID`, `TELEGRAM_LUISINA_USER_ID` y `TELEGRAM_ACTIVATED_AT` (ISO con zona horaria posterior a la prueba de identificación).
7. Si el bot ya tiene webhook, retirar ese webhook deliberadamente antes de iniciar esta instalación; ORDEN no lo modifica automáticamente.
8. Iniciar la aplicación y verificar `getMe`, grupo, tres miembros, transporte conectado y cursor en el panel. Probar primero texto, después recordatorio y archivo pequeño.

Sin esos datos el sistema queda en simulador. Comandos `/start`, `/help` y `/settings` son accesos complementarios; se admite texto normal.

## Referencias oficiales

- [Telegram Bot API](https://core.telegram.org/bots/api)
- [Bot features y modo de privacidad](https://core.telegram.org/bots/features)
- [Bot FAQ: polling, archivos y límites de mensajes](https://core.telegram.org/bots/faq)
