# Modo local, traspaso y recuperación

Los comandos se ejecutan desde la raíz de este proyecto, con el proceso destino detenido. `control` lee `.env`. Nunca copiar una SQLite que escribe olvidando su WAL. Los snapshots usan `VACUUM INTO`, `integrity_check`, claves foráneas, SHA-256, versión, generación y cursor. No incluyen sesiones ni tokens administrativos.

| Estado | Disponibilidad |
| --- | --- |
| railway_active | Único propietario remoto; PC consulta/cambia por API autenticada |
| handoff_to_local | Admisiones y emisor cerrados; exportación consistente |
| local_ready_remote_stopped | Se comprobó parada; falta preparar/iniciar PC |
| local_active | Único propietario PC; depende de proceso, sesión e Internet |
| recovery_only | Mantenimiento breve, sin transporte ni planificador |
| recovery_required | Datos preservados, propiedad o recuperación no demostrada |

El estado de WhatsApp es independiente. El modo local por presupuesto persiste en SQLite y en `runtime-fence.json`. Reiniciar Windows, cambiar de ciclo o hacer commits no reactiva Railway. La generación anterior se bloquea tanto en envíos como en escrituras API.

## PC como controlador del remoto

Configurar en PC `REMOTE_APP_URL=https://...` y `REMOTE_APP_TOKEN` de la API de esta app, además de la credencial LOCAL del tablero. Iniciar normalmente. El proxy escucha en loopback e inicia todas las conexiones. El navegador no recibe el token remoto. No se abre ningún puerto del router.

La caché tiene fecha visible, es sólo lectura cuando falla el remoto y no puede convertirse en base activa. El proxy descarga oportunistamente una exportación si hubo cambios y no existe copia del día; conserva siete válidas. Los originales se copian una vez por hash y se confirman después de verificar bytes.

## Railway a PC

1. Por umbral o pedido explícito, el servicio detiene el transporte, termina trabajo en curso en la cola serial y revoca su propietario. Los envíos inciertos conservan `delivery_unknown`.
2. Incrementa generación, persiste motivo/ciclo/modo local y fence; produce el snapshot final en `snapshots/handoff-...`. Guarda uno final rotado. No es una caché histórica.
3. Solicita la parada sólo del deployment configurado. Si falla, conserva exportación y `recovery_required`. No habilita un segundo emisor.
4. Si PC recibió la exportación, validarla. Si no, intentar la descarga disponible real. La app apagada no mantiene `/api/final` accesible.
5. Cuando requiera proceso activo, iniciar **deliberadamente** el mismo servicio/volumen con `APP_RECOVERY_ONLY=true`, margen/costo y permisos verificados. No conecta WhatsApp ni acepta intenciones. Tiene un timeout de 120 segundos y solicita parada tras mantenimiento.
6. Desde PC, con URL/token de app: `npm.cmd run control -- pull-final`. Descarga primero SQLite/manifiesto, valida y luego intenta originales por hasta 90 segundos. Informa faltantes. Solicitar `POST /api/recovery/finish` autenticado o dejar actuar el timeout; comprobar parada desde Railway.
7. Con el proceso PC detenido: `npm.cmd run control -- import "<carpeta incoming/handoff-...>"`. El comando vuelve a consultar la plataforma real antes de reclamar propiedad. No admite el simulador como evidencia de producción.
8. Iniciar PC, vincular su sesión propia si falta y recuperar el historial disponible. El planificador se habilita después de aplicar pagos/realizaciones y, si falta señal de final de historial, de una revisión explícita. No hay resúmenes ni ráfagas de repeticiones perdidas.

El importador rechaza checksum/cursor/generación incompatibles, historia divergente, base destino activa o cambios posteriores y fences más nuevos. Conserva una copia consistente de recuperación del destino y reemplaza el archivo preparado de manera atómica. Los originales se encuentran por hash; si no están, se muestran no disponibles, sin afirmar sincronización completa.

No se ha demostrado en Railway esta secuencia con PC apagada. Sin acceso al volumen/margen o sin prueba de parada, el resultado correcto es `recovery_required`, conservando la caché como desactualizada. No hay ciclos automáticos de encendido/apagado para intentar recuperarla.

## Regreso explícito a Railway

1. Verificar margen y configuración del remoto. Iniciar una recuperación breve con `APP_RECOVERY_ONLY=true`, sin bot, con los mismos IDs/volumen y permisos. No reactivar una base antigua como propietaria.
2. En Operación de la PC, preparar destino Railway con muestra de costo actual. El servicio PC cierra emisor, revoca propietario y exporta la generación más reciente. Si falla la precondición económica, no cierra el transporte.
3. Detener el proceso PC y ejecutar `npm.cmd run control -- return-remote "<snapshot final local>"`. El controlador verifica estado/cursor de su base cerrada y obtiene `process.lock`; un emisor local no puede arrancar durante la transferencia.
4. Usa HTTPS/Bearer de la app para enviar manifiesto/ticket de liberación local, SQLite y originales por hash a la recuperación remota. No supone que un volumen Railway pueda montarse directamente en Windows. La API admite una transferencia a la vez y una SQLite de hasta 14 MB; excederlo exige mantenimiento explícito, nunca copiar una base activa.
5. El remoto verifica integridad y cuota, cierra su API, importa con barrera y conserva recuperación previa; solicita su parada. La respuesta de commit indica **aceptado**, no confirma por sí sola que la importación terminó. El controlador comprueba la parada; si falla, conserva estado de revisión sin declarar éxito.
6. Verificar la generación importada en el siguiente arranque deliberado y quitar `APP_RECOVERY_ONLY` sólo para habilitar la ejecución normal con costos actuales. La barrera impide emitir desde una generación antigua cuyo propietario siga siendo PC. Confirmar propiedad, integridad, sesión y datos antes de dar por validado el regreso real.

Las cargas remotas temporales y el reinicio de mantenimiento consumen recursos. Un error puede dejar ambos emisores detenidos; no reclamar propiedad desde una copia vieja para salvar disponibilidad. La prueba completa de este procedimiento contra Railway sigue pendiente.

## Copias y restauración

En PC propietaria se crea como máximo una copia rutinaria por día con cambios, automáticamente al usar el proceso. Las últimas siete válidas quedan en `snapshots/`; no se rotan siete idénticas en un minuto. El proxy conserva sus copias independientes en `remote-cache/snapshots/`. Un snapshot final del mismo volumen remoto ayuda al traspaso, pero no reemplaza una copia fuera de ese volumen.

```powershell
# Con el proceso detenido:
npm.cmd run control -- backup
npm.cmd run control -- validate "<snapshot>"
# Restaurar a una carpeta de datos nueva, sin sobrescribir el propietario actual:
$env:APP_DATA_DIR = 'C:\ruta\nueva\AsistenteHogar-recuperado'
npm.cmd run control -- restore "<snapshot>"
```

La restauración conserva `recovery_required`, sin emitir ni reclamar propiedad. Su propósito es revisar/recuperar datos; una copia histórica no acredita ser la última base. El traspaso válido debe resolver la propiedad antes de volver a emitir. Los originales archivados se copian por hash desde su carpeta si están disponibles; las sesiones requieren vinculación aparte.

No se modifica suspensión/hibernación ni se instalan servicios administrativos. Los scripts de inicio por usuario están preparados; instalación de accesos e inicio automático no se ejecutó durante las pruebas para no dejar un bot simulado permanente.
