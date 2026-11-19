# Compras ORDEN 4.0

## Captura y revisión

El original se conserva y se puede procesar localmente como PDF, imagen o texto. El OCR/extractor puede proponer comercio, fecha, moneda, total, descuentos, líneas y presentación. La propuesta incluye advertencias y queda en `review_required`; no cambia compras ni finanzas hasta que una persona corrija y confirme.

La confirmación de un ticket crea una compra idempotente vinculada al documento. La confirmación de una factura crea una obligación solo cuando importe, moneda, proveedor, vencimiento y responsables están completos. Repetir una confirmación no duplica la compra.

## Catálogo e historial

El catálogo empieza vacío. Productos tienen marca, variante, GTIN opcional, tamaño base y alias revisables. Una línea solo se asocia automáticamente si la unidad y la presentación son compatibles; por ejemplo, gramos y mililitros no se consideran intercambiables.

La comparación muestra precios registrados con tienda, sucursal, fecha y cantidad. Los importes no representan precios actuales ni ajustan inflación. Si falta una medida verificable, no se calcula un precio unitario.

## Ofertas

Las promociones requieren fuente HTTPS, período de vigencia y estado (`unverified` o revisada por la familia). Solo una promoción verificada y dentro de su período se presenta como vigente; una revisión antigua se vuelve a marcar como no confirmada.

No hay integración de precios con comercios. Para investigación pública, consulta [ORDEN_4_INVESTIGACION_WEB.md](ORDEN_4_INVESTIGACION_WEB.md). La búsqueda externa permanece apagada salvo configuración y consentimiento por consulta.
