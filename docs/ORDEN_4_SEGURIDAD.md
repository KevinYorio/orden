# Seguridad y privacidad ORDEN 4.0 (borrador anterior)

> El estado de cifrado y búsqueda pública cambió desde este borrador. Consultar [estado actual](ORDEN_4_ESTADO_ACTUAL.md) e [investigación web](ORDEN_4_INVESTIGACION_WEB.md).

- Telegram autoriza mediante IDs numéricos y un único chat privado. No se usan usernames para autenticación.
- El adaptador exige modo de privacidad configurado para recibir mensajes normales, supervisión de cambios de miembro y frontera temporal. Ante cambio/ID inesperado, pausa antes de exponer datos y requiere revisión local autenticada.
- Long polling es la única modalidad implementada. El código no cambia un webhook existente.
- El token Telegram solo se lee del entorno y no forma parte del dashboard, base, logs ni snapshots.
- El dashboard/API conserva Bearer, validación de origen/Host, límites y autorización existentes.
- IA/OCR local aún no está configurada. No se envía contenido documental ni datos familiares a terceros.
- Los grupos Telegram son chats en la nube, no chats secretos cifrados de extremo a extremo. Evitar publicar datos sensibles innecesarios; la vista de campos delicados requiere controles adicionales.
- La aplicación existente no cifra SQLite ni copias en reposo. El cifrado de backups y su restauración demostrada siguen pendientes; no se declaran cubiertos por el hash de integridad.
- Un propietario/escritor activo, historial de auditoría y operaciones financieras idempotentes siguen siendo invariantes.
