# Finanzas ORDEN 4.0

El módulo de finanzas existente se conserva: importes enteros en unidades menores, ARS/USD separados, `null` distinto de cero, pagos parciales, cuotas, cuentas, transferencias, resúmenes reales, presupuestos y metas. Las operaciones se validan en `Engine`; los agentes/modelos no persisten movimientos por su cuenta.

Telegram y KevinOS enrutan consultas/operaciones al mismo dominio. La carga y análisis automático de facturas, conciliación externa y correlaciones semánticas quedan pendientes. Una extracción OCR futura será una propuesta con referencia al documento y confirmación antes del asiento.

No hay acceso bancario ni ejecución de pagos. No se crean movimientos desde un resumen o una cuota de manera que duplique la compra original.
