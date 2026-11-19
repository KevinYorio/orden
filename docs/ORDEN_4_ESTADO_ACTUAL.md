# Estado actual de ORDEN 4.0 / KEVIN OS

Actualizado: 18/11/2026. Este documento sustituye las clasificaciones antiguas en `ORDEN_4_ESTADO.md` y los primeros borradores de agentes, compras y operación.

## Trabajo completado

- Se agregaron las migraciones 004 y 005 para hechos con confirmación y confianza, extracción de documentos, comercios, catálogo, compras, promociones, mediciones por línea y ejecuciones acotadas.
- Ollama es un proveedor opcional de loopback. La aplicación no descarga modelos y arranca con `AI_PROVIDER=none`. Una imagen de ticket sintética produjo una propuesta `review_required` con comercio, total y una línea, conservando el original; un segundo pase falló validación. No se usaron documentos familiares. La variabilidad observada confirma que las propuestas requieren revisión y que a veces habrá que reintentar.
- PDF, imágenes y texto se conservan como originales y se procesan localmente. Los campos extraídos quedan en revisión. La confirmación explícita crea una compra o una obligación; las compras son idempotentes.
- El historial compara precios observados por comercio, fecha, cantidad y unidad compatibles. Un alias requiere una asociación explícita; no convierte gramos en mililitros ni presenta precios registrados como precios actuales.
- KEVIN OS expone ocho módulos, una consulta local de solo lectura con un máximo de tres pasos y auditoría mínima. No ejecuta órdenes generadas libremente ni afirma haber buscado en Internet cuando no lo hizo.
- La búsqueda pública opcional usa Brave Search. Está apagada por defecto; requiere aceptación individual de Kevin y Luisina, además del consentimiento por envío. Aplica filtros locales de datos personales, no conserva consulta ni resultados en SQLite y limita el uso local a 100 búsquedas mensuales.
- Los respaldos rutinarios usan AES-256-GCM y una clave derivada con scrypt. Incluyen SQLite y los originales disponibles. La restauración valida clave, hash, integridad SQLite y archivos. `setup` crea la clave en `.env` si falta.
- Los adjuntos recibidos por Telegram se conservan en la cola local de extracción. El procesamiento se reintenta cuando el proveedor local está disponible y sigue requiriendo revisión humana.

## Evidencia de esta ejecución

- `npm.cmd run typecheck`: correcto.
- Suite automatizada: 37/37 pruebas pasan con datos sintéticos. Se usó un preload temporal para el fallo de `os.userInfo()` de este entorno y `--test-force-exit` porque queda un handle abierto al terminar la suite; el preload no se guardó en el proyecto.
- TypeScript de producción y Vite compilaron a una carpeta temporal fuera del proyecto. Vite transformó 77 módulos. El `npm.cmd run build` normal no pudo escribir en el `dist` preexistente por permisos de Windows. No se borró ni reemplazó ese contenido.
- La revisión visual automatizada de Chrome no se volvió a ejecutar en esta etapa. El script debe usar el build escribible en esta máquina para producir sus capturas.
- No se usaron credenciales reales, no se mandaron consultas al proveedor de búsqueda y no se conectó Telegram, WhatsApp ni Railway.

## Dependencias reales para activar servicios

- Telegram real requiere que Kevin configure el bot, el grupo privado y los IDs numéricos de Kevin y Luisina en `.env`, siguiendo [ORDEN_4_TELEGRAM.md](ORDEN_4_TELEGRAM.md). No pegar el token en el chat.
- La preferencia operativa confirmada para este hogar es PC local + Telegram; WhatsApp queda desactivado y Railway no se necesita mientras la PC permanezca despierta, con sesión iniciada e Internet.
- Investigación web requiere que la familia habilite una cuenta y clave de Brave, acepte sus condiciones y complete `BRAVE_SEARCH_API_KEY` y `RESEARCH_PROVIDER=brave`. El control local permite hasta USD 0,50 por mes al precio publicado consultado; el proveedor puede cambiar sus precios y condiciones.
- El modo local de IA/OCR no envía documentos a terceros. Para activarlo, completar `AI_PROVIDER=ollama` después de instalar y verificar Ollama localmente. `setup` no descarga modelos.
- Railway sigue sin desplegar. El traspaso requiere configuración real de costos, parada comprobable y autorización de operación.

## Límites conocidos

- Los respaldos rutinarios están cifrados; las exportaciones de traspaso siguen usando el formato de SQLite existente para mantener compatible el protocolo de traspaso. Conservarlas como datos sensibles.
- No hay integración con supermercados, bancos, Gmail ni lectura de precios en vivo. La búsqueda pública sirve para fuentes generales; una oferta solo se registra con URL y vigencia revisadas.
- Un proveedor desactivado o sin clave no ejecuta búsquedas. Los resultados aparecen en el navegador solo después de una acción explícita y no se guardan en la base.
- Riesgo de herramientas de desarrollo: el lockfile incluye `picomatch@4.0.7` mediante Vite. GitHub publica para esa versión un aviso de alta severidad ReDoS y al momento no indica una versión corregida. `npm ls picomatch --omit=dev` no encuentra una copia de producción; no se aplicó un override inseguro ni se reemplazó el compilador. Revaluar cuando el proveedor publique una versión corregida.
