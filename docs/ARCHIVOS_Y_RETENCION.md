# Archivos y retención

> Los originales también admiten extracción local revisable desde [Documentos](ORDEN_4_COMPRAS_ACTUAL.md). El archivo original no cambia y ninguna propuesta se registra sin confirmación.

PDF, TXT, JPG/JPEG y PNG se guardan como bytes originales. Se comprueban nombre, extensión/MIME declarado, firma básica, tamaño e integridad por SHA-256. Eso no certifica que un comprobante sea auténtico. El procesamiento opcional lee hasta cinco páginas de un PDF y propone campos con IA local; no extrae enlaces ejecutables ni escribe operaciones automáticamente.

Un original necesita propósito y registro destino inequívoco; para pendientes, fecha y responsables completos. Sin esos datos sólo se persiste referencia/metadata del transporte, nunca el original. Al completar la asociación se descarga con límite, guarda y verifica hash. Si la referencia caducó, debe reenviarse. Una carga rechazada mantiene la operación de texto clara que hubiera llegado con ella.

La API local exige todos los campos antes de `POST /api/files`. La pantalla Documentos tiene selección de registro y propósito. Las referencias incompletas de WhatsApp pueden recuperarse desde el mismo tablero. El nombre no es una ruta; se rechazan separadores, controles y caracteres peligrosos.

Dos modos:

- `bounded_remote`: originales en el volumen de ESTA app mientras corresponda, sujetos a costos y cuota.
- `local_only`: se guardan/envían desde PC. El remoto no promete escribir en una PC apagada.

Límites iniciales: 10.000.000 bytes por archivo, cinco documentos por registro y 100.000.000 bytes de originales únicos remotos. El hash comparte bytes, con documentos y vínculos independientes; no fusiona facturas. La cuota no incluye SQLite, sesiones, snapshots, logs u overhead. No hay ampliación automática ni eliminación de documentos activos para liberar espacio.

Los originales se ubican en `originals/<sha256>` bajo el directorio de datos, sin rutas absolutas de otro equipo en el dominio. Los snapshots referencian ID/hash; no duplican archivos en cada copia. Una copia física en PC sólo se confirma después de descargar y comprobar bytes.

La retención remota se calcula en Buenos Aires:

```text
deleteAfter = inicio del mes siguiente a resolvedAt + 7 días
```

Resolución 16/10/2026 o 31/10/2026: borrar desde 08/11/2026 00:00. Resolución 31/12: desde 08/01; febrero: desde 08/03. Un parcial no inicia retención. Si un hash sirve a varios registros, todos deben estar resueltos y se aplica la fecha más larga. Reabrir antes de borrar conserva el original; después, requiere reenvío.

La limpieza se ejecuta cuando el proceso está disponible. Espera envíos activos/inciertos de esos documentos, conserva metadata/auditoría y no depende de una copia local. No garantiza el instante exacto con el deployment apagado, ni borra copias de WhatsApp, teléfonos o respaldos anteriores.

El controlador PC usa conexiones salientes para descargar copias verificadas por hash mientras el remoto responde. El respaldo consistente tiene prioridad; los documentos pueden quedar no disponibles y se muestran así. El volumen detenido no tiene una API por definición. Recuperación: [procedimiento](MODO_LOCAL_Y_RECUPERACION.md).

Los originales históricos locales no se limpian automáticamente por esta regla remota. Las descargas de tablero son privadas; nunca autorizan enviar un documento al grupo. En el chat, sólo un pedido explícito lo encola como archivo. No se envían rutas Windows, localhost ni URLs públicas de documentos a los iPhone.
