# Investigación pública en Internet

El proveedor opcional es Brave Search API (`GET /res/v1/web/search`), con región Argentina, idioma español, búsqueda segura y hasta cinco fuentes HTTPS. El tablero muestra título, enlace, fragmento y metadatos de fecha disponibles. No descarga ni almacena páginas completas.

La aplicación viene con `RESEARCH_PROVIDER=none`. Para habilitarlo, la familia debe crear/configurar una cuenta, activar un plan, revisar las condiciones actuales del proveedor y guardar `BRAVE_SEARCH_API_KEY` en `.env` fuera del chat. Antes de habilitar consultas, Kevin y Luisina deben registrar por separado su acuerdo personal de uso de resultados en el tablero; cada persona puede revocarlo y la revocación vuelve a bloquear la búsqueda. Luego, el panel exige consentimiento para cada consulta y avisa que el texto sale de la PC.

Se rechazan correos, números telefónicos, términos personales/familiares comunes y nombres/alias encontrados en la memoria local. Es un filtro preventivo, no una garantía de que cualquier texto sea anónimo: el usuario debe escribir solo consultas públicas y generales. Las consultas y respuestas no se guardan en la base de la aplicación; el conteo mensual y el estado de ejecución sí.

El acuerdo familiar obliga a no guardar, cachear ni crear una base de datos de resultados, no redistribuirlos y no usarlos para entrenar, evaluar o mejorar modelos. La aplicación guarda en SQLite la versión, actor y fecha de aceptación/revocación, nunca las consultas ni los resultados. El registro identifica el perfil seleccionado en el tablero y no verifica identidad fuera de la sesión compartida. El titular de la cuenta API debe comprobar que el acuerdo familiar satisface las condiciones vigentes y las obligaciones legales aplicables antes de enviar consultas.

Hay un límite local de 100 llamadas al mes. El control se calculó con el precio publicado consultado de USD 5 por 1.000 solicitudes, hasta USD 0,50 por mes; la cifra no garantiza el precio final ni sustituye los límites de facturación del proveedor. Brave requiere activar un plan y registrar un medio de pago. No se configuró una cuenta, no se enviaron consultas y ningún gasto externo se autorizó.

Brave indica retención de consultas de hasta 90 días y exige que el servicio consumidor cumpla sus términos y avisos de privacidad. Revisar las páginas oficiales antes de activarlo:

- [Referencia de búsqueda web de Brave](https://api-dashboard.search.brave.com/api-reference/web/search/get)
- [Inicio rápido y activación de cuenta](https://api-dashboard.search.brave.com/documentation/quickstart)
- [Precios y preguntas frecuentes](https://api.search.brave.com/app/documentation/resources/help-feedback)
- [Aviso de privacidad](https://api-dashboard.search.brave.com/documentation/resources/privacy-notice)
- [Términos de servicio](https://api-dashboard.search.brave.com/documentation/resources/terms-of-service)
