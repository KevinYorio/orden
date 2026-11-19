# Operación ORDEN 4.0 (borrador anterior)

> Consultar [estado y validación actuales](ORDEN_4_ESTADO_ACTUAL.md), [búsqueda pública](ORDEN_4_INVESTIGACION_WEB.md) y [seguridad actualizada](ORDEN_4_SEGURIDAD.md).

## Modo simulado

El transporte por defecto sigue siendo `simulated`; no se necesitan token, cuenta, navegador, modelo ni proveedor externo. Configuración de Telegram en `.env.example` sin valores reales.

## Activar Telegram

Usar `MESSAGING_ADAPTER=telegram` y cargar las cinco variables de Telegram enumeradas en [la guía](ORDEN_4_TELEGRAM.md). La aplicación valida configuración, identidad del bot, webhook vacío, grupo, modo de privacidad, administrador y tres miembros. Sin un dato real falla cerrado y el panel conserva el estado/alerta.

## Verificación local

Desde la carpeta del proyecto:

```powershell
npm.cmd run typecheck
npm.cmd test
npm.cmd run build
```

La conexión real requiere una prueba manual con el grupo propio. No se configuró, inició ni desplegó Telegram durante esta etapa. Railway y WhatsApp continúan en los estados previos documentados.
