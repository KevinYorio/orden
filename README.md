# Asistente Hogar

Proyecto independiente para Kevin y Luisina. Conserva el núcleo de la [especificación v3.0](docs/ESPECIFICACION.md) y comienza su evolución a ORDEN 4.0 / KEVIN OS: Node/TypeScript, SQLite, tablero React y adaptadores simulado, Baileys y Telegram Bot API.

El modo local y el transporte simulado no requieren cuentas externas. Telegram, WhatsApp y Railway **no están vinculados ni desplegados**. Telegram y la memoria estructurada ya tienen código, pero no deben considerarse conectados ni probados con usuarios reales. Consultar [PROGRESO](docs/PROGRESO.md) y [estado ORDEN 4.0](docs/ORDEN_4_ESTADO.md): implementación, simulación y prueba externa se registran por separado.

## Instalar e iniciar en Windows

Requiere Node 24 LTS. Desde esta carpeta, en PowerShell:

```powershell
npm.cmd ci --no-audit --no-fund
npm.cmd run build
npm.cmd run setup
npm.cmd start
```

Abrir `http://127.0.0.1:4317`. `setup` informa dónde leer la credencial local; no la publica. La primera ejecución crea únicamente cuentas sin saldos y una lista compartida vacía. Empieza con transporte simulado. El simulador guarda lo que se ingresa: usar otra carpeta de datos para ejemplos.

Alternativa de instalación: `powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\Instalar.ps1`. El bypass corresponde a esa invocación; no modifica políticas globales.

Para iniciar oculto, detener y configurar el inicio al iniciar sesión:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\Iniciar.ps1
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\Detener.ps1
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\InicioWindows.ps1
# Desactivar el inicio automático de esta app:
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\InicioWindows.ps1 -Desactivar
```

El inicio automático no se instaló durante el desarrollo. Cerrar el navegador no detiene el bot. La PC debe estar encendida, con sesión iniciada, proceso e Internet; suspensión o apagado interrumpen el modo local.

## Configuración y datos

Usar `.env.example` como referencia; `setup` genera un `.env` local mínimo si no existe, incluida la clave de cifrado de copias. Guardar esa clave en un gestor seguro: sin ella no se pueden restaurar los respaldos cifrados. Datos por defecto en `%LOCALAPPDATA%\AsistenteHogar`, fuera del código. `APP_DATA_DIR` permite otra ubicación. No compartir `.env`, `api-token`, `session/`, SQLite, originales o copias.

Para Kevin y Luisina, el modo recomendado es `APP_LOCATION=local`, `MESSAGING_ADAPTER=telegram` y `STORAGE_MODE=local_only`; WhatsApp queda sin configurar y no hace falta Railway. Telegram usa long polling saliente, así que no se abre un puerto público ni se configura el router. Preparar el bot e identificar IDs con `npm.cmd run telegram:identify`; ver [guía Telegram](docs/ORDEN_4_TELEGRAM.md).

La credencial local, el token de la API remota, la sesión de WhatsApp, la credencial de parada y la de lectura de costos tienen funciones distintas. El controlador PC guarda el token remoto en su entorno, nunca en el frontend. No hay contraseñas bancarias ni integración con bancos/Gmail.

## Uso

- Hechos claros se registran sin un sí previo. Los pendientes requieren fecha y responsables. Los borradores se completan con su ID, autor o cita; una insistencia a las 24 horas.
- `gaste 10mil en kiosco`, `compre harina`, `mañana a las 2 de la tarde tenemos turno con pediatra de liam`, `recordame que pagos vencen mañana`, `ya pague F-0001`, `pospone F-0001 una hora` son patrones admitidos. Son ejemplos, no cargas iniciales.
- `gaste 20` pide escala. `ARS 20` o `20mil` la hacen explícita. El parser es acotado; ante dudas se pregunta o se usa el formulario.
- El tablero ofrece cargas/ediciones, agenda, facturas, pagos completos/parciales/divididos, compras, transferencias, cuotas, resúmenes reales, presupuestos, metas, archivos y operación. Los formularios cubren datos que el parser no reconoce libremente.
- Los pagos sin importe no son cero. Completar su borrador actualiza el mismo movimiento. El pago de un resumen no es otra compra.
- Ningún resumen automático. Recordatorios separados por pendiente, con responsables. Los originales sólo se envían por Telegram si alguien los pide explícitamente.

## Verificar

```powershell
npm.cmd run check
npm.cmd run whatsapp:verify
node scripts/check-ui.mjs
```

`check` ejecuta tipado, pruebas y compilación. La comprobación de interfaz usa un Chrome ya instalado y una base temporal; se puede indicar `TEST_BROWSER_PATH`. Chrome no es requisito del runtime del bot. No hacen falta navegador automatizado, Python, OCR, modelos, Redis ni otro servidor.

El Dockerfile prepara Linux/Railway; construirlo no despliega. La operación remota está bloqueada sin base transferida, costos calibrados actuales y permiso acotado de parada. No se promete que esta app entre en USD 0,50 adicionales sin medir.

## Operación y documentación

- [Arquitectura y seguridad](docs/ARQUITECTURA.md)
- [Conversación y WhatsApp](docs/WHATSAPP.md)
- [Archivos y retención](docs/ARCHIVOS_Y_RETENCION.md)
- [Railway y costos](docs/RAILWAY_Y_COSTOS.md)
- [Modo local, traspaso, recuperación y copias](docs/MODO_LOCAL_Y_RECUPERACION.md)
- [API y formularios](docs/API.md)
- [Casos y evidencia](docs/ACEPTACION.md)
- [Progreso y dependencias exactas](docs/PROGRESO.md)
- [Auditoría ORDEN 4.0](docs/ORDEN_4_AUDITORIA.md)
- [Arquitectura KEVIN OS](docs/ORDEN_4_ARQUITECTURA.md)
- [Guía de Telegram](docs/ORDEN_4_TELEGRAM.md)
- [Memoria familiar](docs/ORDEN_4_MEMORIA.md)
- [Agentes (borrador anterior)](docs/ORDEN_4_AGENTES.md)
- [Agentes KEVIN OS actuales](docs/ORDEN_4_AGENTES_ACTUAL.md) · [Compras actuales](docs/ORDEN_4_COMPRAS_ACTUAL.md) · [Investigación web](docs/ORDEN_4_INVESTIGACION_WEB.md)
- [Estado completo y validación](docs/ORDEN_4_ESTADO_ACTUAL.md)
- [Finanzas](docs/ORDEN_4_FINANZAS.md) · [Compras (borrador anterior)](docs/ORDEN_4_COMPRAS.md) · [Seguridad actual](docs/ORDEN_4_SEGURIDAD_ACTUAL.md)
- [Operación ORDEN 4.0 (borrador)](docs/ORDEN_4_OPERACION.md) · [Estado inicial histórico](docs/ORDEN_4_ESTADO.md) · [Estado actual](docs/ORDEN_4_ESTADO_ACTUAL.md)

No iniciar dos instalaciones por copiar una SQLite o una sesión. Usar el procedimiento de traspaso; una caché del tablero no otorga propiedad.
