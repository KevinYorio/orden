# Seguridad y privacidad actuales

- La PC local solo escucha en loopback. Las rutas de datos requieren Bearer, validan Host y origen, y usan cabeceras sin caché. Los secretos administrativos no llegan al navegador.
- Ollama se limita a loopback. La IA está apagada por defecto; no se descarga ningún modelo. Los originales y el texto extraído se procesan localmente.
- Las salidas del modelo se validan con esquemas. El modelo propone; los servicios comprueban y las operaciones financieras/documentales requieren los pasos de confirmación previstos.
- PDF/JPG/PNG/TXT se validan por firma/MIME, tamaño y hash. El OCR no ejecuta contenido ni confirma campos. Las extracciones guardan propuestas y auditoría, no copias del texto completo.
- Los respaldos rutinarios cifran SQLite y originales disponibles con AES-256-GCM. `APP_BACKUP_ENCRYPTION_KEY` es necesaria para restaurar; custodiarla fuera del equipo. Los archivos de traspaso siguen el formato SQLite previo y deben tratarse como datos sensibles.
- La investigación pública externa está desactivada por defecto. Kevin y Luisina aceptan por separado las restricciones de uso de resultados; cada envío exige consentimiento y revocar cualquiera de los acuerdos bloquea el servicio. El panel indica qué consulta se envía, límite de gasto estimado y retención que declara Brave. Consultar [investigación web](ORDEN_4_INVESTIGACION_WEB.md).
- Las consultas de agentes guardan metadatos mínimos. La auditoría evita copiar textos familiares, resultados de búsqueda o hechos privados.
- La autenticación de Telegram usa IDs numéricos, un chat permitido y control de miembros. Telegram es un servicio en la nube y los grupos no son chats secretos cifrados de extremo a extremo.
- Proteger `.env`, tokens, archivos de sesión, base SQLite, originales, snapshots y clave de backup. No pegarlos en conversaciones ni guardarlos en Git.
- El entorno de desarrollo arrastra `picomatch@4.0.7` desde Vite. GitHub clasifica su ReDoS como alta severidad y aún no publica versión corregida; la dependencia no aparece en el árbol de producción. [Aviso GHSA-fc5q-39xc-vjpf](https://github.com/advisories/GHSA-fc5q-39xc-vjpf).

No se ejecutó un análisis de seguridad remoto ni se activaron cuentas externas en esta etapa. La verificación automatizada cubre validación de esquemas, credenciales, orígenes, archivos y restauración sintética. El smoke test de OCR usó una imagen sintética local: un pase produjo una propuesta revisable y otro falló validación; no sustituye una prueba con el comprobante real ni una integración de Telegram.
