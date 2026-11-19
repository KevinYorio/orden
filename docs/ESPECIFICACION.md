# Asistente familiar por WhatsApp: especificación para Codex

Versión 3.0 — 16 de octubre de 2026.
Usuarios: Kevin y Luisina. Idioma: español de Argentina.
Nombre provisional: Asistente Hogar.

Especificación consolidada con las 34 respuestas más recientes. Sustituye las versiones 1.x y 2.x. El grupo exclusivo de WhatsApp permite cargar y consultar gastos, pagos, turnos, tareas y compras. El bot interpreta texto; los archivos se conservan opacos y solo se envían cuando se piden. No hay IA obligatoria, lectura de facturas, audios, consejos ni resúmenes automáticos.

El mismo núcleo puede ejecutarse en Railway Hobby o en la PC. Si el presupuesto remoto no alcanza, se detiene exclusivamente esta app y la PC toma el control mediante un traspaso consistente. Mientras la PC esté apagada y el remoto detenido, no hay un bot disponible. El ERP y los demás proyectos se preservan.

## 0. Instrucciones de implementación para Codex

Construí un proyecto independiente y funcional siguiendo este documento. Implementá dominio, persistencia, conversación, recordatorios, archivos, tablero y operación. Un plan o una maqueta solos no completan el trabajo.

- Trabajá en una carpeta nueva. Leé cualquier AGENTS.md aplicable y preservá el ERP y todos los demás proyectos.
- Seguí las etapas de la sección 22 y conservá progreso verificable entre sesiones. Resolvé decisiones técnicas ordinarias sin repetir el cuestionario al usuario.
- Prepará ejecución en Railway y ejecución local en Windows con el mismo núcleo. Railway puede funcionar con la PC apagada mientras respete el presupuesto; el modo local funciona solamente con la PC encendida, conectada a Internet y con el proceso iniciado.
- Implementá el cambio controlado de Railway a PC por presupuesto; no supongas que una caché vieja es una base válida ni que el servicio apagado mantiene su API disponible.
- Un solo escritor y emisor activo entre ambos entornos. No sincronizar dos SQLite activos copiando archivos.
- Presupuesto: objetivo de ningún aumento, máximo adicional del bot USD 0,50 por ciclo mensual y umbral total de referencia de Railway USD 5,50. Aplicar la política y sus límites reales de la sección 14.
- La función de apagado se dirige exclusivamente al deployment de esta app, mediante identificadores verificados. No tocar ERP, sitios, planes, límites globales, otros volúmenes o proyectos.
- No contratar servicios, crear cuentas externas, introducir APIs pagas, comprar números, ingresar tarjetas ni cambiar planes automáticamente.
- Desarrollá un adaptador simulado y uno real separados. El núcleo puede completarse sin vincular WhatsApp ni desplegar.
- El usuario aceptó el conector no oficial. No pedir esa decisión de nuevo. Verificar la API actual y explicar su carácter no oficial sin prometer ausencia de fallos o bloqueos.
- Interpretar texto. No sumar OCR, visión, lectura semántica de PDF/TXT, transcripción, modelos, APIs de IA, agentes autónomos ni Ollama como dependencias.
- Declarar algo hecho, comprado o pagado permite registrarlo directamente cuando es inequívoco. Una instrucción de recordar crea un pendiente, no una realización.
- Nunca generar resúmenes automáticos, ni siquiera de urgentes o de recuperación. Los recordatorios son individuales. Los resúmenes y consultas agregadas se responden solo cuando se solicitan.
- Los recordatorios no envían archivos automáticamente. Enviar un documento por WhatsApp solo ante un pedido explícito.
- Un adjunto incompleto no se guarda: conservar únicamente el contexto y la referencia necesarios para preguntar; no anunciar almacenamiento hasta tener los datos requeridos y persistir los bytes.
- Ejecutar verificaciones pertinentes y acotadas; repetirlas por cambios relevantes o fallos, no por rutina indefinida.
- Si faltan número, credenciales o una prueba de Railway/WhatsApp real, avanzar con lo independiente y documentar la dependencia exacta. Distinguir implementado, simulado, vinculado, medido y comprobado en producción.
- Entregar instalación, inicio/parada, configuración, cambio de modo, recuperación y respaldos comprobables. Este documento no afirma que exista ya una app desplegada.

## 1. Decisiones confirmadas del usuario

| Aspecto | Decisión |
| --- | --- |
| Proyecto | Nuevo e independiente; sin cambios al ERP u otros proyectos. |
| Personas | Kevin y Luisina, mismos permisos, información y dinero compartidos. |
| Grupo | Exclusivo para cargar y consultar información; sin charla habitual, sin prefijo obligatorio ni mención al bot para cada instrucción. |
| Identidad del bot | Una cuenta adicional en el mismo grupo. El número todavía debe configurarse. |
| Hosting | Railway Hobby ya contratado y compartido con el ERP. |
| Alternativa | Apagar solo esta app en Railway por presupuesto y trabajar desde la PC cuando esté encendida. |
| PC | Tablero completo, consultas, cambios, originales locales y respaldos. Sin publicar la PC ni abrirle puertos de entrada en Internet. |
| Teléfonos | Dos iPhone; WhatsApp es la interfaz móvil. |
| Confirmación | Guardar las declaraciones claras de hechos y responder el resultado. Preguntar tras el plazo de un pendiente si se hizo, o permitir posponer el aviso como una alarma. |
| Dudas | Preguntar por datos decisivos faltantes; guardar las operaciones independientes que sí estén claras. |
| Correcciones | Mediante otro mensaje; ignorar la edición o eliminación de mensajes de WhatsApp a efectos del dominio. |
| Borradores | Una insistencia a las 24 horas; después conservar el borrador sin insistencias indefinidas. |
| Estilo | Concreto, robótico, sin emojis, humor, consejos ni razonamiento visible. |
| Responsables | Kevin, Luisina o ambos; preguntar cuando falte. En un pendiente de ambos basta la realización de uno. |
| Monedas | ARS por defecto; USD explícitos. Totales separados. |
| Gastos | Importa quién lo realizó; cuenta o medio de pago opcional. Conservar también quién lo informó. |
| Cuentas iniciales | Efectivo ARS, efectivo USD, Banco Nación, Mercado Pago y tarjeta por configurar; sin saldos ficticios. |
| Finanzas | Gastos, ingresos, transferencias, saldos declarados, compras/cuotas, resúmenes reales de tarjetas, pagos parciales, presupuestos y metas. |
| Compras | Lista compartida con datos heredados de la lista. Al informar productos comprados, marcarlos y preguntar el importe para registrar el gasto. |
| Consultas temporales | «recordame qué pagos vencen mañana» responde ahora sobre mañana; «mañana recordame...» programa una consulta/aviso futuro. |
| Avisos | Individuales, mencionando a los responsables; no agrupar pendientes diferentes. Repetir según política hasta resolución explícita. |
| Resúmenes | Ninguno automático. Solo pedidos explícitos; en PC hay vistas agregadas con filtros de fecha. |
| Archivos admitidos | PDF, TXT, JPG y PNG opacos. Sin leer, extraer o verificar su contenido. Sin audio ni video. |
| Envío de archivos | Únicamente cuando se pide; nunca adjuntarlos a todos los recordatorios por defecto. |
| Conservación remota | Hasta finalizar el mes de la resolución y siete días adicionales; eliminación desde el día 8 del mes siguiente. |
| Copia a PC | Intentarla cuando esté disponible mediante conexión saliente; la falta de copia no impide borrar al vencer la retención. |
| Límites de archivos | 10 MB por archivo, cinco por registro y 100 MB de originales remotos en total. |
| Respaldo | Automático al usar la PC; últimas siete copias consistentes. Se acepta que no sea continuo. |
| Fallos técnicos | Estado y alertas en el tablero. No añadir correo, mensajes privados u otros canales automáticos. |
| Otras integraciones | Gmail y bancos fuera del alcance actual. No importar datos históricos. |

La prioridad es simplificar la vida familiar. No hay apuro de lanzamiento ni objetivo comercial inicial. No implementar otros hogares, cobros, registro público, marketing o una app móvil nativa.

## 2. Arquitectura, disponibilidad y cambio de responsable de ejecución

### 2.1 Un núcleo y dos ubicaciones posibles

| Componente | Responsabilidad |
| --- | --- |
| Código | Repositorio privado de GitHub si se usa; sin datos, archivos, sesiones o respaldos. GitHub no es el runtime continuo del bot. |
| Servicio de aplicación | Un núcleo Node.js que puede ejecutarse en Railway o en la PC; nunca dos emisores activos. |
| Base activa | SQLite en el volumen de Railway en modo remoto, o en el disco de la PC tras un traspaso validado a modo local. |
| Tablero | React/TypeScript servido en loopback de la PC; usa la API del propietario activo. |
| Programador e inbox/outbox | En la ubicación activa, persistidos junto al dominio. |
| Transporte WhatsApp | Adaptador real o simulado. La sesión pertenece a su instalación; no clonar a ciegas claves mutables entre procesos. |
| Documentos | Volumen remoto limitado o disco local, con estado y disponibilidad explícitos. |
| Control de presupuesto | Dentro del servicio remoto y en el controlador local al arrancar; sin un segundo servidor permanente. |
| Respaldo local | Exportaciones consistentes descargadas por la PC cuando está disponible. |

Estados de ejecución obligatorios:

| Estado | Comportamiento |
| --- | --- |
| railway_active | Railway es el único escritor/emisor. La PC consulta y puede solicitar cambios mediante API autenticada. |
| handoff_to_local | Se detienen admisiones y envíos, se termina el trabajo en curso y se prepara una exportación consistente con generación y cursor. |
| local_ready_remote_stopped | El deployment remoto está detenido; falta iniciar o terminar de preparar la PC. No existe un bot remoto respondiendo. |
| local_active | La PC es el único escritor/emisor. Funciona al iniciar sesión en Windows con Internet y el proceso iniciado. |
| recovery_only | Arranque remoto breve para recuperar datos; no conecta WhatsApp, no aplica intenciones y no envía recordatorios. |
| recovery_required | No se puede probar propiedad o recuperar la base actual; mostrar estado y conservar datos, sin emitir desde una copia vieja. |

Separar estos estados del estado de transporte, que puede estar conectado, desconectado o pendiente de vinculación.

### 2.2 Qué ocurre con la PC apagada

Con railway_active y WhatsApp conectado, se procesan textos y salen recordatorios sin la PC. Un archivo remoto se devuelve si lo piden y está disponible. Nunca se adjunta automáticamente al aviso.

Con el deployment detenido por presupuesto, no hay respuestas ni avisos mientras la PC está apagada. Al iniciar el modo local se recupera el historial disponible y se atienden pendientes según su estado actual. No prometer recuperar todos los mensajes o archivos que el transporte nunca llegó a conservar.

Un archivo que existe solo en el disco de la PC requiere que esa PC esté encendida y conectada para enviarlo al grupo. Ni Railway ni este documento pueden escribir en una PC apagada o sin conexión.

La PC no se publica en Internet: el componente local inicia las conexiones salientes. Una copia física local no significa que pueda realizarse sin comunicación entre origen y destino.

No activar Serverless en el bot remoto mientras deba sostener conexión y planificador. El apagado por presupuesto es un cambio de modo deliberado, no una pausa de pocos segundos ni un proceso dormido que continúa consumiendo RAM.

### 2.3 Traspaso seguro a la PC

Implementar un RuntimeController con exportación/importación del dominio, número de generación, último evento confirmado y propietario de ejecución. Es un control local de esta app, no un sistema de microservicios.

Secuencia exigida:

1. Detectar el umbral preventivo y persistir motivo, ciclo de facturación y solicitud de modo local.
2. Dejar de aceptar nuevas operaciones y recordatorios en el propietario remoto. Terminar o marcar explícitamente lo que esté en vuelo; no perder delivery_unknown.
3. Producir una copia SQLite consistente más manifiesto de versión, integridad, generación y cursor. Incluir jobs, borradores, claves de deduplicación, historial de pagos y estado de entrega. Referenciar documentos por identificadores, no por rutas absolutas de otro sistema.
4. Si la PC está conectada, transferir y validar esa exportación. Si está apagada, dejar una exportación final rotada en el volumen para recuperación posterior.
5. Solicitar a Railway que detenga únicamente el deployment configurado de esta app. Un process.exit aislado no prueba que Railway haya dejado de reiniciarla.
6. La PC verifica el estado detenido y la generación correcta antes de reclamar propiedad. Importa de forma atómica y conserva copia de recuperación; no sobrescribe un dominio local con cambios posteriores.
7. Recuperar mensajes disponibles y aplicar pagos/realizaciones antes de recalcular avisos atrasados. Enviar como máximo el aviso individual vigente por pendiente, sin resúmenes ni una ráfaga por cada repetición perdida.
8. Iniciar un único transporte y planificador locales. Si no puede demostrarse que el remoto no emite, no habilitar un segundo emisor.

No asumir que una API HTTP, SSH o descarga de volumen sigue accesible con el deployment apagado. Verificar la capacidad real de la versión de Railway/CLI usada y documentarla.

Si el acceso al volumen requiere un deployment activo, preparar una recuperación breve recovery_only: usar el mismo servicio y volumen de esta app, autenticación propia y exportación final, sin WhatsApp ni planificador, y detenerlo tras la descarga o timeout. Es una operación de mantenimiento, no reactivar el bot remoto continuo. La reserva de presupuesto debe incluir su cómputo y transferencia. No crear un servidor, bucket o proveedor permanente extra para resolverlo.

Propuesta técnica editable: timeout de recuperación de 120 segundos, una operación por vez y descarga del estado pequeño antes que los documentos. Si no hay margen o la recuperación falla, mostrar recovery_required y la última copia local como desactualizada; no afirmar una sincronización completa. Reintentar de forma deliberada, sin ciclos automáticos de encendido/apagado.

No dar por probado este modo solo con dos bases ficticias: demostrar preservación de datos y parada del remoto antes de validarlo para producción.

### 2.4 Reinicios y regreso a Railway

Guardar el modo local por presupuesto de forma persistente. Un reinicio de Windows, un commit o el inicio de un nuevo mes no deben reactivar automáticamente el bot remoto.

Preparar regreso explícito a Railway tras verificar margen: detener escritor local, exportar la generación más reciente, importar en remoto, confirmar integridad y entonces habilitarlo como propietario único. Nunca restaurar sobre datos actuales una base remota anterior al período local.

Si Railway se inicia accidentalmente con una generación cuyo propietario es la PC, el código de arranque debe impedir que conecte WhatsApp o programe envíos. Desactivar autodeploys del servicio de esta app o implementar una barrera de arranque efectiva y comprobada; no cambiar los del ERP.

## 3. Comparación de conectores y elección inicial

Las siguientes son alternativas de software, no canales oficiales autorizados por WhatsApp:

| Opción | Base técnica | Decisión para este proyecto |
| --- | --- | --- |
| Baileys, del repositorio WhiskeySockets | TypeScript, conexión WebSocket, sin Selenium/Chromium obligatorio. | Primera opción por integración con el backend y ausencia de navegador completo. |
| whatsapp-web.js | Node.js y control de WhatsApp Web mediante Puppeteer. | Alternativa si hay una incompatibilidad concreta; considerar consumo del navegador antes de elegirla. |
| whatsmeow, de tulir | Biblioteca Go para multidevice, con mensajes de grupo y medios. | Alternativa si se justifica un componente Go; requiere integración adicional con el stack propuesto. |

La elección de Baileys es una recomendación de ingeniería, no una medición de memoria del programa ni una garantía de cuenta segura. Comprobar versión mantenida, licencia, cambios incompatibles, grupos, menciones, documentos, identificadores y persistencia de claves al implementar. No copiar ejemplos antiguos como si fueran APIs actuales.

Mantener una interfaz `MessagingAdapter` y exactamente un emisor de producción. No es necesario implementar tres bibliotecas, tres prototipos completos ni ejecutar un benchmark extenso para empezar. Si la primera opción falla en un requisito real, registrar el problema y evaluar la alternativa concreta.

No usar técnicas para ocultar automatización, evadir bloqueos o crear cuentas nuevamente ante sanciones. El usuario aceptó la vía no oficial; los límites de uso y riesgos no desaparecen.

## 4. Stack ligero y ejecución

Base recomendada:

- Node.js LTS compatible, TypeScript y Fastify o servidor equivalente ligero.
- SQLite con migraciones, restricciones y acceso tipado; por ejemplo Drizzle y un driver compatible con desarrollo en Windows y contenedor Linux.
- React, TypeScript, Vite y Tailwind para el tablero.
- Adaptador Baileys y adaptador simulado.
- Parser determinista en español, validación de esquemas y biblioteca de fechas/zona horaria verificada.
- Cola, inbox, outbox y planificador persistidos en SQLite; un único proceso inicial es suficiente.

No sumar PostgreSQL, Redis, n8n, navegadores, Python, FFmpeg, motores OCR o modelos de IA como requisitos. No cargar librerías de procesamiento de documentos que no se utilizan.

Puede usarse un workspace pequeño con `apps/web`, `apps/service` y `packages/domain`. Separar dominio, transporte, persistencia y presentación sin una arquitectura innecesaria de microservicios.

Desarrollo local: servicio y tablero enlazados a loopback. Producción Railway: escuchar en el puerto de entorno según la plataforma, con los controles de autenticación y red correspondientes. La regla de loopback de la PC no debe aplicarse ciegamente a un contenedor que deba recibir conexiones autorizadas.

## 5. Texto natural, confirmaciones y conversación

### 5.1 Interpretación acotada sin modelos

Reconocer patrones habituales de español argentino, alias, acentos omitidos, mayúsculas y errores menores cuando la interpretación sea segura. No prometer comprensión arbitraria de cualquier frase ni modificar números, fechas o personas mediante corrección aproximada.

Familias de intención: gasto, ingreso, transferencia, compra_tarjeta, pago, crear_tarea, crear_turno, crear_obligacion, editar, completar, posponer, agregar_compra, marcar_comprado, consultar_pendientes, consultar_vencimientos, consultar_saldos, consulta_programada, pedir_archivo, pedir_mapa y aclarar.

Validar esquemas y operaciones cerradas. No ejecutar SQL, shell, JavaScript o solicitudes arbitrarias derivados del mensaje. Las fechas requieren pruebas específicas; el soporte parcial de español de una biblioteca no sustituye las reglas de producto.

### 5.2 Hechos declarados y pendientes futuros

| Entrada clara | Acción |
| --- | --- |
| «gasté», «compré», «hice», «ya llamé», «pagué» | Registrar el hecho o completar el candidato inequívoco; no preguntar otra vez si ocurrió. |
| «recordá pagar», «tengo que llamar», «mañana tenemos turno» | Crear un pendiente con datos suficientes; no marcarlo realizado. |
| Pendiente cuyo plazo pasó | Preguntar si se realizó y permitir completar o posponer el aviso. |
| «no», «todavía no» | Mantener pendiente y preguntar próximo aviso si no lo indica; no cambiar vencimiento. |
| «posponé una hora», con referente claro | Cambiar la próxima alarma; confirmar fecha/hora exactas. |
| «más tarde», sin duración ni preferencia definida | Preguntar cuándo; no inventar una duración. |
| «ok», «gracias», «visto» | No completar ni pagar. |

Confirmar el resultado después del commit. No imponer un sí previo universal para cargas claras. Para borrados explícitos destructivos, mostrar qué se eliminará y pedir confirmación; anular un gasto conserva su trazabilidad.

Ejemplos de formato, con datos ficticios:

> Gasto G-0042 registrado. ARS 10.000. Kiosco. Realizado por Kevin. Medio de pago: sin indicar.

> T-0018 pendiente de completar. ¿Responsable: Kevin, Luisina o ambos?

> Turno T-0019 registrado. Pediatra de Liam. 17/10/2026 a las 14:00. Responsables: ambos. Próximo aviso: 16/10 a las 14:00.

> @Kevin F-0007. ¿Pagaste el gas que venció el 25/10? Responder «pagado F-0007» o «posponer F-0007 hasta mañana a las 15».

> Archivo D-0007 guardado y asociado a F-0007. Se enviará cuando lo pidan.

Recibido, pendiente de completar, guardado, recordatorio programado y archivo entregado son resultados distintos. No decir que se leyó una factura o verificó un comprobante.

### 5.3 Consultas ahora y avisos futuros

«recordame qué pagos vencen mañana» pide una respuesta ahora filtrada por vencimiento de mañana. La palabra mañana es el filtro de la consulta, no necesariamente el momento de entrega.

«mañana recordame qué pagos vencen» y «avisame mañana a las 9 qué tengo que pagar» programan una consulta futura solicitada. Si falta hora, usar la preferencia aprobada de tareas sin hora, mostrando el instante resuelto; si falta responsable explícito, preguntar como en cualquier recordatorio.

No convertir todas las frases que empiezan con recordame en consulta: «recordame pagar el gas mañana» crea un pendiente/aviso sobre una acción, no lista inmediatamente los pagos.

Si la posición o la estructura no permiten distinguir filtro temporal y momento de aviso, preguntar. Una consulta programada explícita sí puede entregar una lista de resultados: es un pedido del usuario, no un resumen automático.

### 5.4 Contexto, concurrencia y mensajes editados

- Persistir borradores y preguntas; sobreviven a reinicios y cambios de modo.
- Relacionar respuestas con autor, cita, borrador o identificador. No cruzar respuestas de Kevin y Luisina.
- Ambos pueden completar los datos del otro si el referente es inequívoco.
- Aceptar «eran 25 mil», «para Luisina», «a las 15» o «el viernes» cuando el contexto sea suficiente; si hay candidatos múltiples, preguntar.
- Separar intenciones de un mismo mensaje y conservar un resultado por operación. Las partes claras se guardan; las incompletas quedan pendientes sin duplicarse al responder.
- El autor no se convierte automáticamente en responsable de una tarea. Distinguirlo de la atribución financiera de un gasto en primera persona.
- Una edición o eliminación de WhatsApp no modifica registros de dominio, no aplica texto nuevo, no anula gastos y no dispara otra respuesta de carga. Preservar el registro ya confirmado.
- Las correcciones se hacen por otro mensaje o por el tablero, con auditoría y actualización de recordatorios derivados.
- «Cancelá eso» necesita referente claro; cancelar un diálogo no borra un movimiento.
- Un borrador sin respuesta recibe una única insistencia tras 24 horas, ajustada a la ventana permitida; después queda accesible sin más avisos automáticos. Una respuesta posterior puede reabrirlo.
- No generar resúmenes de borradores, urgentes, gastos o recuperación por iniciativa propia.

## 6. Hogar, grupo y personas autorizadas

Un hogar con Kevin y Luisina, iguales permisos y todo compartido. El tercer participante es la cuenta del bot. El grupo es exclusivo para cargar y consultar, sin prefijo obligatorio.

- Configurar grupo estable e identidades verificadas; no confiar en nombres de perfil.
- Verificar identificadores actuales de la biblioteca, incluidos los no equivalentes a teléfonos. No construir menciones con un formato supuesto.
- Ignorar otros grupos/contactos, mensajes propios del bot y eventos de transporte repetidos. No leer ni conservar historiales ajenos.
- Establecer una frontera inicial de activación para evitar importar el historial previo del grupo como cargas nuevas.
- Responder solo en el grupo autorizado. No mensajes privados, llamadas, correo ni contacto con proveedores o familiares citados.
- Si entra una persona adicional, pausar operaciones con datos del hogar y señalarlo en el tablero; no expulsarla automáticamente.
- Responsables: Kevin, Luisina o ambos. Preguntar si falta y no hay una asignación explícita heredada de una lista o regla ya configurada.
- Mencionar solo a los responsables; todos los integrantes siguen pudiendo leerlo. Una mención no garantiza una alerta del iPhone silenciado.
- En un pendiente compartido para ambos, la realización de uno completa el mismo registro y cancela los avisos. Actividades independientes requieren registros separados.
- Conservar reported_by y performed_by en finanzas. Una persona puede informar un gasto realizado por la otra.
- Los fallos técnicos se ven en PC. Si WhatsApp se desconecta, no prometer que el propio bot podrá avisarlo por esa conexión.

La cuenta/número del asistente aún debe configurarse. Preparar el núcleo sin ella. El costo o disponibilidad de la línea es ajeno al costo del software y no está verificado.

## 7. Dinero, monedas, cuentas y tarjetas

### 7.1 Importes y autoría

- ARS por defecto. USD explícitos; totales separados.
- «10mil», «10 mil» o «10k» expresan escala. «Gasté 20» requiere aclarar si son 20 o 20.000 cuando sea ambiguo; no agregar ceros por costumbre.
- Interpretar separadores argentinos y preguntar por formatos ambiguos.
- Importes en unidades menores enteras con moneda; no flotantes monetarios. Validar rangos, redondeo y serialización.
- No cotizaciones automáticas. Una conversión requiere importes o cotización escritos, conservando las dos patas.
- El dato procede del texto, nunca del nombre o contenido de un archivo.
- Registrar quién informó y quién realizó. En «gasté» se atribuye a su autor; «Luisina gastó...» atribuye a Luisina. «Gastamos...» puede atribuir a ambos sin dividir el gasto.
- Si la autoría real es incierta, conservar quién informó y pedir aclaración cuando sea necesaria; no falsificar que informante y pagador siempre son la misma persona.

### 7.2 Cuentas opcionales

Catálogo inicial editable: efectivo ARS, efectivo USD, Banco Nación ARS, Mercado Pago ARS y una tarjeta ARS pendiente de configurar. No inventar número de tarjeta, saldo, límite, cierre o vencimiento. Permitir agregar otras cuentas y monedas admitidas después.

La carga de un gasto no exige cuenta o medio de pago. Mostrar realizado por y registrado por. Si no hay cuenta, cuenta en gastos conocidos pero no descuenta una cuenta arbitraria. Asociar la cuenta después actualiza el mismo movimiento.

Saldo inicial y fecha son opcionales; sin ellos mostrar saldo no configurado o saldo según registros con base incompleta, nunca cero confirmado. No conectar bancos.

### 7.3 Efectos financieros y pagos

| Situación | Efecto |
| --- | --- |
| Gasto informado | Un gasto realizado; salida de una cuenta solo si está indicada. |
| Factura recibida | Obligación, no gasto pagado. |
| «Pagué el gas» con una factura clara e importe conocido | Pago completo por el saldo pendiente registrado, sin pedir otra confirmación de realización. |
| Factura sin importe y «ya pagué» | Marcar resuelta, cancelar avisos de deuda y preguntar cuánto fue para completar el movimiento. |
| Importe del pago desconocido | Registro pendiente de importe, excluido de sumas monetarias; no representa cero. |
| Pago parcial explícito | Registrar lo pagado y conservar saldo/avisos de lo pendiente conocido. |
| Pago dividido | Partes relacionadas con sus medios si se informan; total contado una vez. |
| Transferencia propia | Cambio de cuentas, sin ingreso/gasto nuevo del hogar. |
| Compra a crédito | Compra y deuda, sin salida inmediata de efectivo. |
| Pago de tarjeta | Salida de cuenta y reducción de deuda, sin otra compra. |
| Reserva para meta | Dinero reservado, no gasto ni transferencia automática. |
| Devolución o ajuste | Operación diferenciada, trazable y relacionada si corresponde. |

Si la factura tenía importe pero se informa otro, no sobrescribirla ni resolver diferencias sin preguntar si es parcial, total con ajuste o corrección. Un importe mayor que el saldo requiere aclarar diferencia/saldo a favor; no inventar intereses.

Un comprobante posterior se asocia al pago existente. No verificarlo contra un banco ni volver a contabilizarlo. Si el usuario completa más tarde un importe desconocido, actualizar el mismo pago; no duplicar la salida ni reabrir automáticamente la obligación.

No repartir deudas entre Kevin y Luisina ni calcular mitades. El dinero es compartido.

### 7.4 Tarjetas y cuotas: control de resumen real

Registrar compras, total, cuotas, cierres y vencimientos conocidos. El redondeo debe reconciliar exactamente el total. Admitir pagos completos/parciales del resumen y sus diferencias explícitas.

Controlar el resumen mensual real mediante datos escritos por los usuarios: período, importe, vencimiento, cargos informados y pagos. El PDF se conserva opaco. Las cuotas estimadas no sustituyen el resumen real ni permiten inventar tasas o impuestos.

Separar compras por fecha, compromisos por vencimiento/cuota y dinero efectivamente pagado. No sumar compra completa y sus cuotas como gastos duplicados ni contar el pago del resumen como otra compra. Reconciliar resumen real con estimación solo por datos informados.

### 7.5 Presupuestos y metas

Categorías iniciales editables: alimentación, kiosco, bebidas, salud, vivienda, servicios, transporte, educación, seguros, impuestos, ocio, suscripciones y sin clasificar.

Presupuestos por moneda y categoría/general; declarar base de cálculo. Metas como vivienda y vacaciones con objetivo, aportes, moneda y fecha opcional. En el tablero se pueden filtrar períodos y ver datos agregados.

«Reservé 100 mil para vacaciones» crea una asignación, no un gasto. «Guardé 100 mil para vacaciones en efectivo» admite ubicación/cuenta si está clara. Una nota de dónde se guardó el dinero no prueba una transferencia: preguntar origen/destino si se desea modificar saldos y faltan.

No reservar dos veces el mismo dinero por moverlo entre lugares. Mostrar reservado y disponible según datos conocidos. No mandar consejos, reportes, alertas de presupuesto o metas por iniciativa propia. Un aviso de una meta se crea solo si se pide como recordatorio.

## 8. Facturas, pagos y obligaciones recurrentes

Guardar concepto/proveedor, período o referencia escritos, moneda, importe opcional, vencimiento, responsables, estado y documentos asociados. Una fecha de aviso no equivale al vencimiento de la factura.

Si llega un PDF con datos incompletos, preguntar antes de guardar el original. Puede mantenerse un borrador de texto y referencia temporal del transporte. La falta de importe no impide programar un aviso con concepto, fecha/hora resuelta y responsables suficientes.

- Separar emisión, recepción esperada, vencimiento y horario del aviso.
- Permitir varios vencimientos/condiciones solo si se informan; preguntar por ambigüedad.
- ID del mensaje deduplica transporte; hash deduplica bytes. Ni importe/fecha iguales ni un documento repetido bastan para fusionar deudas legítimas diferentes.
- Usar proveedor/período/referencia escritos para señalar posibles duplicados y preguntar.
- «Pagué el gas» necesita una obligación inequívoca. Si hay varias, preguntar cuál.
- La realización/pago se acepta como declaración de los usuarios. No conciliar con un banco o un comprobante leído.
- Pago completo cancela avisos de la obligación, aunque quede por informar el importe financiero.
- Pago parcial conserva el pendiente restante; no inicia retención de borrado del documento de una obligación activa.
- Guardar trazabilidad aunque se elimine un archivo.

### 8.1 Recurrencias y facturas que faltan

Plantilla separada de ocurrencias: frecuencia, responsables, fecha esperada de llegada, fecha de vencimiento conocida y reglas de aviso. Categorías ampliables sin cambiar código.

Se aprobó recordar la falta de una factura cuando se configuró su llegada esperada. Ejemplo: avisar que falta cargar gas del período, sin crear un gasto ni inventar cuánto vence. Si no se configuró esa fecha, pedirla al activar la regla.

Cuando llega la factura con texto suficiente, asociarla a su ocurrencia pendiente y cancelar el aviso de falta de recepción. No generar dos facturas por completar un borrador de llegada esperada.

Un pago de este mes no completa meses futuros. Una deuda pasada permanece independiente de la nueva ocurrencia; no acumular saldos sin mostrar origen. El importe futuro queda por confirmar salvo que la regla indique explícitamente monto fijo.

Día 29/30/31 inexistente: usar último día del mes; conservar el día de la regla original para el mes siguiente. Una edición de regla distingue cambios futuros de ocurrencias ya creadas.

## 9. Tareas, turnos y compras

Cada pendiente tiene título, tipo/categoría, responsables, fecha límite o evento, lugar si se conoce, estado y avisos. Fecha de evento, vencimiento y próximo recordatorio son campos diferentes.

- Crear, editar, asignar, posponer, reprogramar, completar, cancelar, repetir y consultar.
- Si falta fecha suficiente o responsable, preguntar y conservar borrador de texto. No afirmar que el aviso está activo.
- «Tenemos turno» puede expresar ambos. «Turno de Liam» es el sujeto del turno; no convierte a Liam en destinatario ni elige al adulto sin datos.
- Liam, Karina u otros nombres pueden figurar en notas/títulos; el bot no los contacta.
- «Ya llamé a mamá» completa el candidato claro. «Ok» no lo completa.
- Posponer mueve el próximo aviso, no el turno ni el vencimiento real. Reprogramar el evento es una operación explícita diferente.
- Para ambos, basta que uno informe realización. Para dos obligaciones personales separadas, crear dos registros.

Lista inicial compartida, con ambos como responsables una vez configurada. La lista puede tener fecha objetivo y recordatorio; los productos heredan esos datos. Si la lista no tiene fecha y se pide avisar, preguntar una vez por la lista; no inventar un aviso.

«Agregá harina» agrega un producto pendiente. «Compré harina, papa, queso fresco y frutilla» informa productos ya comprados: completar coincidencias claras o conservar compra informada, no crear cuatro productos pendientes.

Tras informar productos comprados, preguntar el importe total para poder registrar un gasto; se toma literalmente el sí del usuario al punto 24. La pregunta no bloquea el marcado de productos. No registrar precio cero ni inventado. Permitir «no lo registres», «no sé» o completar el monto después.

Si el mensaje ya incluye el total, no volver a preguntarlo. Si un mensaje independiente ya registró el gasto de esa compra, vincularlo cuando sea inequívoco; no crear otro por responder la pregunta. La cuenta es opcional y la persona que compró se registra según la sección 7.

Compras parciales no completan cantidades mayores silenciosamente. Usar alias de productos seguros, unidades y notas; preguntar si dos coincidencias podrían ser diferentes.

## 10. Fechas, horarios y precedencia

Zona del hogar: America/Argentina/Buenos_Aires. Fechas de calendario DD/MM/AAAA; horas de 24 horas.

- Resolver hoy, mañana, pasado mañana y días de semana desde la fecha original del mensaje, no desde el procesamiento posterior.
- Conservar fecha de calendario y zona; no convertirla incorrectamente a medianoche UTC.
- Una hora sin fecha puede proponerse para hoy si es futura y el contexto es claro; si ya pasó o hay ambigüedad, preguntar.
- «A las 2 de la tarde» significa 14:00. Una hora sin tramo que pueda ser mañana/tarde requiere aclaración.
- «Antes del lunes», sin mayor precisión, se resuelve como domingo anterior a las 18:00; mostrar la fecha/hora exactas y permitir corregir. Si no se sabe qué lunes se referencia, preguntar.
- Para una tarea con día pero sin hora de aviso, usar 09:00 y mostrarlo. No transformar esa hora de aviso en el horario de un turno o en un vencimiento bancario.
- Servicios: recordatorios a las 15:00 de lunes a viernes, antes de las 16:00. Si un aviso calculado cae en fin de semana, adelantar al día hábil de semana anterior. No calcular feriados sin un calendario configurado.
- No mover el vencimiento real ni un turno para satisfacer la ventana del recordatorio.
- Las horas expresas prevalecen sobre defaults; si contradicen una regla obligatoria, preguntar. Un pedido explícito a las 22:00 no se posterga por silencio general sin informar.
- Distinguir momento de aviso y filtro temporal de una consulta como exige la sección 5.3.

Una fecha sin hora de vencimiento conserva semántica de día; mostrar vencido al comenzar el día siguiente en la zona del hogar. El aviso de las 09:00 o 15:00 no acorta ese vencimiento. Un evento con hora sí tiene un instante propio.

## 11. Recordatorios, confirmación de realización y entrega

### 11.1 Valores iniciales aceptados y editables

| Tipo | Política |
| --- | --- |
| Facturas/pagos | Tres días antes, un día antes y día del vencimiento. Servicios dentro de la ventana lunes-viernes a las 15:00. |
| Turnos | 24 horas y 2 horas antes del evento. |
| Tarea con fecha sin hora de aviso | A las 09:00 del día indicado. |
| Pendiente vencido no resuelto | Una pregunta diaria de realización en horario permitido; servicio a las 15:00 de día de semana, demás a las 09:00. |
| Silencio general | 22:00–08:00, excepto horario expresamente pedido y confirmado. |
| Borrador sin respuesta | Una sola insistencia a las 24 horas, ajustada a la ventana permitida. |
| Resúmenes automáticos | Desactivados y fuera de la conducta por defecto; solo entregar si se solicitan. |
| Coincidencia de avisos | Mensajes individuales por pendiente; no agrupar registros distintos. |
| Archivos con el aviso | Ninguno por defecto; solo enviar al pedirlo. |

Si varios offsets de la misma obligación terminan en el mismo instante al adelantar por fin de semana, fusionar solo esas ocurrencias redundantes de ese registro. No fusionar obligaciones diferentes.

Si un aviso anticipado ya pasó al crear el registro, programar el próximo vigente, no enviar todas las anticipaciones perdidas. Para un turno que ya pasó, preguntar si se realizó o debe reprogramarse. No afirmar que un plazo pasado equivale a un hecho completado.

### 11.2 Ciclo de alarma

Antes del plazo, recordar la acción. Tras vencer, preguntar al responsable si se hizo. Si no responde, conservar pendiente y repetir una vez al día conforme a su categoría. Si responde hecho/pagado, completar inmediatamente el candidato claro y cancelar avisos pendientes.

Si responde que no, permitir posponer indicando fecha/duración. Mientras está pospuesto, no disparar la repetición ordinaria antes de ese instante. Conservar vencimiento/evento original y atraso real.

Una realización para ambos completa el registro compartido. Un pago parcial mantiene avisos por el saldo pendiente. Un pago completo con importe desconocido detiene la deuda y pregunta monto mediante un borrador financiero independiente.

Ejemplos ficticios de mensajes individuales:

> @Luisina T-0021. Turno con pediatra de Liam. Hoy 14:00. Aviso: dos horas antes.

> @Kevin F-0007. Pagar gas. Vence 25/10/2026. Responder «pagado F-0007» o «posponer F-0007 hasta mañana a las 15».

> @Kevin F-0007. ¿Pagaste el gas? Vencimiento: 25/10/2026. Indicar realizado o cuándo volver a avisar.

No adjuntar automáticamente PDF, texto, foto o comprobante. Los enlaces de pago/mapa configurados sí pueden incluirse como accesos de texto pertinentes, sin ejecutar pagos ni consultar navegación.

### 11.3 Persistencia, recuperación e incertidumbre de entrega

- Inbox, borradores, jobs y outbox persistidos; temporizadores en memoria solo optimizan.
- Claves de idempotencia por mensaje, operación y ocurrencia; cambios y confirmaciones coordinados transaccionalmente.
- Un propietario activo con generación y cierre ordenado. El traspaso a PC conserva las claves de deduplicación y los estados de entrega.
- Antes de enviar, revalidar estado/versión del registro. Pagado/completado/reprogramado invalida los trabajos obsoletos.
- Reintentos acotados y backoff; sesión revocada pide vinculación, sin tormenta de reconexiones.
- Tras una caída: recuperar historial disponible, deduplicar y aplicar pagos/realizaciones anteriores a decidir avisos atrasados.
- Recuperación: como máximo un aviso individual vigente por pendiente. No resumen de recuperación, ni agrupación, ni cada repetición perdida.
- No prometer exactamente una vez ante caída entre envío y acuse. Usar delivery_unknown, buscar evidencia disponible y evitar reenvíos ciegos.
- Lectura, entrega o «ok» no completan pendientes.
- Un error de documento solicitado no justifica volver a mandar un recordatorio ya entregado; pedidos de archivo y avisos tienen resultados propios.

## 12. Archivos opacos, carga completa y conservación

### 12.1 Tipos y momento de guardar

Admitir PDF, TXT, JPG y PNG como originales opacos. No audios ni videos. No extracción de texto, OCR, visión, resúmenes, lectura de comprobantes, previsualizaciones procesadas o miniaturas obligatorias.

Validar extensión/tipo coherente, tamaño, nombre seguro e integridad; hash para deduplicar bytes. No ejecutar ni interpretar el contenido.

Datos mínimos para guardar un archivo: tipo/tamaño aceptados, propósito/concepto y un registro destino inequívoco con la información necesaria para su función. En un recordatorio: fecha/hora resuelta y responsables. El importe de una factura puede seguir desconocido; no es un requisito artificial para recordar.

Un archivo sin esos datos provoca una pregunta. No guardar el original en disco, base, caché permanente o volumen hasta completarlos. Se permite conservar un borrador de texto y la referencia del transporte. No confundir bytes transitorios inevitables del protocolo con un original disponible y persistido.

Si la referencia caducó al completar los datos, pedir reenvío. No prometer recuperar el medio desde WhatsApp indefinidamente. Nunca responder «archivo guardado» antes de persistirlo y comprobar integridad.

Caption, cita o ID pueden asociar el archivo a un registro ya completo. Si hay varias opciones, preguntar; no elegir el último pendiente de otra persona.

### 12.2 Ubicación y límites

| Modo | Conducta |
| --- | --- |
| bounded_remote | Originales en volumen de esta app mientras Railway esté activo, dentro del presupuesto y cuota. Permite devolverlos a pedido sin la PC. |
| local_only | Originales en disco de la PC. Guardado/envío requieren PC disponible; no afirmar copia local mientras esté apagada. |

Elegir producción según medición; implementar ambos modos. No duplicar datos originales por cada aviso o pedido.

Límites aceptados y editables: 10.000.000 bytes por archivo, cinco documentos por registro y 100.000.000 bytes de originales remotos únicos. La cuota no incluye ni oculta base, sesión, logs, manifiestos, respaldos u overhead, que también tienen costo y límites operativos.

Cuota llena: informar y rechazar la persistencia nueva; mantener las funciones de texto. No ampliar volumen ni borrar documentos de pendientes activos silenciosamente. Los archivos idénticos pueden compartir bytes con referencias independientes.

### 12.3 Retención por fin de mes más siete días

Mientras el pendiente está activo, conservar sus originales dentro de la cuota. Un pago parcial no inicia limpieza del documento de la obligación todavía activa.

Tras pago completo, realización o cancelación, conservar hasta terminar ese mes local y siete días completos adicionales. Elegir la fecha de resolución efectiva del registro; una declaración retroactiva debe mostrar qué fecha se registró.

Regla exacta: deleteAfter = inicioDelMesSiguiente(resolvedAt en Buenos Aires) + 7 días. Se puede borrar a partir de ese instante, no al cumplirse siete días desde el pago.

| Resolución local | Conservación inclusiva | Elegible para borrado |
| --- | --- | --- |
| 16/10/2026 | Hasta 07/11/2026 23:59:59... | 08/11/2026 00:00 |
| 31/10/2026 | Hasta 07/11/2026 23:59:59... | 08/11/2026 00:00 |
| 28/02/2027 | Hasta 07/03/2027 23:59:59... | 08/03/2027 00:00 |
| 31/12/2026 | Hasta 07/01/2027 23:59:59... | 08/01/2027 00:00 |

Si un archivo sirve a varios registros, no borrarlo mientras uno esté activo; cuando todos estén resueltos, respetar la retención más larga aplicable. Reabrir antes del borrado cancela su elegibilidad; reabrir después exige reenvío si se necesita.

### 12.4 Copia física local y eliminación

Intentar copia verificada al disco de la PC cuando esté disponible y configurada. La conexión se inicia desde la PC; no publicar su disco ni abrir puertos de entrada. No se puede copiar desde Railway a una PC apagada o sin Internet.

La ausencia de copia local no bloquea el borrado remoto al vencer deleteAfter: el usuario eligió borrar igualmente. No prolongar indefinidamente la retención esperando la PC. Mostrar si se copió o si el original se eliminó sin copia.

Una copia de archivo histórico en la PC puede conservarse hasta que el usuario la elimine; no cuenta en la cuota remota. No prometerla si nunca se completó.

Limpieza periódica transaccional respecto de referencias y envíos activos. Si el proceso que aloja el volumen está detenido, no prometer limpieza a la hora exacta: ejecutar lo pendiente en el próximo mantenimiento/arranque y contabilizar almacenamiento retenido. Evitar un servidor adicional solo para limpiar.

Eliminar original no elimina registro financiero, pago, tarea o auditoría. Tampoco borra copias de WhatsApp, teléfonos o respaldos anteriores. Rotar respaldos y no generar duplicados indefinidos.

### 12.5 Pedidos y descargas

«Pasame la factura del gas» selecciona una referencia inequívoca y devuelve el original al grupo si existe y está accesible. Varias facturas: preguntar cuál. Un archivo eliminado o no disponible requiere explicación, no una entrega ficticia.

Enviar documentos por WhatsApp solo a pedido explícito. Una copia/descarga local para el tablero o respaldo es una operación diferente y no autoriza publicar el archivo en el chat.

Si el archivo solo está en PC apagada, informar que requiere encenderla. Si el bot local necesita un original de un volumen detenido, usar la recuperación acotada autorizada por la política de costos o informar su indisponibilidad; no mantener el remoto activo para esperar pedidos.

No enviar rutas Windows, file:// o localhost como enlaces utilizables por el iPhone ni publicar documentos en un alojamiento abierto.

## 13. Portales de pago y mapas

Guardar enlaces aportados por el usuario o configurados para un proveedor. Los documentos no se inspeccionan para extraer URLs. Si falta un acceso de pago, pedirlo o dejarlo sin configurar.

- Mostrar dominio y procedencia. Una URL válida no equivale a un comercio verificado.
- Validar HTTPS, rechazar esquemas ejecutables o credenciales embebidas y evitar destinos locales sensibles.
- No abrir ni rastrear todos los enlaces en el servidor. No seguir instrucciones incluidas en documentos ni descargar URLs arbitrarias.
- No guardar tarjetas, claves bancarias, automatizar home banking o realizar pagos. El usuario toca el acceso y completa su operación.

Para mapas, usar la dirección o coordenadas escritas/compartidas por el usuario. Si falta ubicación suficiente, preguntar; no inventar el consultorio del pediatra. Construir la URL escapando parámetros, por ejemplo:

```text
https://www.google.com/maps/dir/?api=1&destination=<destino_codificado>
```

Es un enlace que el usuario toca en WhatsApp; no necesita una API de geocodificación ni abre aplicaciones remotamente. No calcular tiempos de viaje o ubicación actual no disponible.

## 14. Presupuesto, apagado de esta app y protección del ERP

### 14.1 Dos condiciones de presupuesto

Railway Hobby está contratado y el ERP ya existe. No se verificaron métricas, ciclo vigente, factura real, credenciales, permisos o margen disponible.

Objetivo prioritario: USD 0,00 adicionales. Máximo adicional confirmado atribuible al bot: USD 0,50 por ciclo mensual, solo si es necesario y se explica. En la última respuesta, Kevin además pidió apagar esta app si el total de referencia de Railway supera los USD 5 del Hobby más USD 0,50. Configurar por ello un umbral total de referencia de USD 5,50, además del máximo incremental.

No reinterpretar esto como permiso para gastar USD 0,50 en cada recurso o añadir USD 0,50 sobre cualquier factura existente. Si el ERP por sí solo ya supera USD 5,50, mantener el bot remoto detenido y ofrecer ejecución local. Apagar el bot no limita el crecimiento del ERP ni garantiza la factura total.

La referencia es el ciclo de facturación real de Railway, no necesariamente el mes calendario. La retención de archivos sí usa meses de calendario de Buenos Aires. Impuestos, tipo de cambio bancario y cargos ajenos al consumo no son controlables por el bot; no prometer un total final exacto debitado en tarjeta.

Para Hobby estándar, si E es consumo de los servicios existentes y B el del bot, la factura base de recursos es max(5, E+B) y el incremento atribuible al bot es max(5,E+B)-max(5,E), en USD. Incluir CPU, RAM, volumen, egreso, exportaciones y mantenimiento. No asignar otros USD 5 por proyecto.

Ejemplos hipotéticos: E=2 y B=2 conserva USD 5; E=4,80 y B=2 produce USD 6,80 y no cumple. No afirmar que USD 0,50 alcanza holgadamente sin medir.

### 14.2 Referencias de costos

Tarifas de contenedor consultadas el 16/10/2026: RAM USD 10/GB-mes, CPU USD 20/vCPU-mes, volumen USD 0,15/GB-mes y egreso USD 0,05/GB. Verificar al desplegar.

100 MB originales aproximados como 0,10 GB representan USD 0,015/mes solo de esos bytes. No incluyen base, sesión, overhead, snapshots o transferencia. Una media hipotética de 0,25 GB de RAM durante el mes representa USD 2,50 solo de memoria; no es una medición del bot.

Detener el deployment elimina su cómputo activo, pero el volumen persistente y otros recursos retenidos pueden seguir facturándose. No borrar volúmenes o datos automáticamente para intentar cumplir una cifra. Medir la parte residual y explicar si impide operar remotamente.

### 14.3 Control preventivo y credenciales

Implementar CostGuard y RailwayControlAdapter con simulador. Verificar API/CLI actuales; no inventar endpoints, nombres de mutación, permisos ni disponibilidad de métricas.

Consultar consumo actual, proyección del ciclo, costo de esta app y fecha de medición. Los datos deben distinguir uso de recursos, factura mínima incluida y estimación mensual; el heap de Node no sustituye RAM real del contenedor.

Condiciones para mantener railway_active: margen conocido, proyección total dentro del umbral y proyección incremental dentro de USD 0,50, incluyendo persistencia y margen operativo. Si no se puede justificar el costo, no afirmar que es cero.

Defaults técnicos preventivos, editables y sujetos a verificación:

- Consulta de costos al arrancar y cada 15 minutos; evitar sondeo por cada mensaje.
- Reserva operativa de USD 0,10 dentro del máximo, para demora de métricas, cierre y eventual recuperación breve.
- Actuar al proyectar superar USD 5,40 totales o USD 0,40 adicionales; los máximos del usuario siguen siendo USD 5,50 y USD 0,50.
- Métricas de más de 60 minutos, error sostenido o credenciales inválidas: impedir un inicio remoto nuevo y comenzar cierre conservador del bot remoto existente. No mantenerlo indefinidamente por desconocimiento del gasto.
- No presentar estas cifras como un hard limit contractual o instantáneo de Railway. El consumo puede actualizarse con demora y variar por los otros servicios.

Credenciales distintas para la API de la app y para administrar Railway. Elegir permisos mínimos reales: lectura de uso donde esté disponible y control de deployment acotado al proyecto/entorno de esta app. Un token de proyecto puede no permitir leer facturación global; comprobarlo en lugar de asumirlo.

Las operaciones de escritura del adaptador de plataforma se limitan a este servicio y su deployment verificados mediante IDs configurados; ninguna entrada del chat puede proporcionar un ID de recurso, una mutación o un comando arbitrario. No imprimir secretos ni exponer credenciales de Railway en el navegador.

Si faltan permisos de medición o de apagado, el sistema no está listo para operación remota con control automático: mantener el desarrollo y modo PC, informar la configuración pendiente y no fingir un corte comprobado. No hace falta preguntar de nuevo el máximo económico.

### 14.4 Apagado y continuación local

La preferencia de apagar solo esta app por presupuesto ya está confirmada. Implementar la secuencia de la sección 2: cerrar escrituras/envíos, persistir exportación final y modo local, detener deployment y verificar estado desde el controlador cuando sea posible.

Si el bot puede avisar antes de cerrar, enviar una sola notificación operativa breve al grupo: «Modo local por presupuesto. El asistente funcionará cuando la PC esté encendida». No es un resumen de pendientes. La falta de entrega de ese mensaje no impide el cierre.

No confundir bajar concurrencia, pausar recordatorios, dormir JavaScript o terminar un proceso reiniciable con apagar el servicio facturable. Reintentar el control de plataforma con límites; si no se confirma el apagado, registrar fallo y no declararlo exitoso.

No reactivar el bot remoto continuo automáticamente al cambiar el mes, recibir un mensaje, abrir el tablero o hacer un commit. La recuperación breve de datos tiene modo aislado, tiempo máximo y costo incluido; no puede convertirse en un remoto activo encubierto.

No usar un hard limit global del workspace para limitar este bot: puede afectar ERP y sitios. No usar límites de Railway Agent como si fueran límites del contenedor del asistente.

### 14.5 Aislamiento y medición

- Proyecto/servicio separados; preservar variables, dominios, planes, autodeploys, recursos y límites del ERP.
- Una réplica del servicio de esta app y un propietario activo entre remoto/local.
- Medir reposo, tráfico familiar representativo y picos de vinculación/arranque. Definir límites de servicio después; un límite demasiado bajo provoca fallos.
- Medir exportación, volumen y recuperación, no solo mensajes de texto.
- Mantener dependencias ligeras, sin modelos, navegador completo inicial, base separada, Redis o procesadores de archivos.
- Colas, logs, snapshots y reintentos acotados. No ampliar recursos por comodidad.
- Si existe consumo inevitable que no cabe, informar la limitación y usar modo PC; no gastar más por suposición ni modificar otros servicios.

## 15. Persistencia y modelo de datos

SQLite de la ubicación propietaria activa es la fuente de verdad. En Railway usar volumen persistente montado antes de migrar; en PC, disco de datos fuera del repositorio. La otra ubicación solo conserva caché/exportación hasta completar un traspaso.

| Entidad | Responsabilidad |
| --- | --- |
| people, settings | Identidades, grupo, zona, moneda, horarios y políticas. |
| inbox_messages | ID del transporte, autor, fecha original, texto útil y procesamiento; no aplicar ediciones/eliminaciones como operaciones. |
| drafts | Intención, campos faltantes, contexto, único seguimiento a 24 horas y estado. |
| pending_attachment_refs | Referencias/metadata pendientes, sin bytes originales guardados antes de completar datos. |
| tasks, recurrence_rules | Pendientes, turnos, responsables, ocurrencias y fechas. |
| bills, providers | Datos escritos, períodos, llegada esperada, vencimientos y pagos. |
| accounts, financial_transactions | Movimientos y saldos declarados, reported_by, performed_by, moneda y relaciones. |
| payments, payment_allocations | Pagos completos/parciales, monto pendiente de informar y partes por medio sin doble conteo. |
| credit_cards, installments, card_statements | Compras, cuotas previstas, resúmenes reales y conciliación manual. |
| budgets, savings_goals, goal_allocations | Metas y reservas diferenciadas de movimientos reales. |
| shopping_lists, shopping_items | Productos, cantidades, datos heredados y relación con gasto informado. |
| documents, document_links | Original opaco, hash, tamaño, ubicación, referencias activas, resolved_at, delete_after y estado de copia/borrado. |
| reminder_jobs, scheduled_queries, outbox_messages | Recordatorios individuales, consultas futuras solicitadas, idempotencia y entrega por operación. |
| runtime_control, handoff_snapshots | Propietario, generación, cursores, manifiesto, modo local y resultado de traspasos. |
| cost_samples, budget_state | Ciclo, consumo/proyección, frescura de métrica, reserva y apagado solicitado/confirmado. |
| audit_events | Autor, fuente, cambios, anulaciones y eliminación de originales. |

Los nombres son orientativos; mantener las responsabilidades con un modelo pequeño y consistente, sin una tabla por cada palabra de esta lista si no hace falta.

Invariantes:

1. Un evento de transporte repetido no aplica otra vez la operación.
2. Una factura pagada o tarea completada no envía avisos obsoletos.
3. Transferencias, pagos de tarjeta, cuotas y comprobantes no duplican gastos.
4. ARS y USD no se suman sin conversión explícita.
5. Una cuenta asociada después no crea otro gasto; un importe completado después no crea otro pago.
6. Monto desconocido es null/estado pendiente, no cero.
7. Un borrador sin datos suficientes no es recordatorio activo ni archivo guardado.
8. La fecha relativa conserva la fecha original del mensaje.
9. Guardado anunciado requiere commit; original anunciado requiere persistencia e integridad.
10. Un archivo no se borra si una referencia activa lo necesita.
11. Eliminar documento no elimina historial financiero.
12. No hay resumen automático ni archivo adjuntado automáticamente al aviso.
13. Editar/borrar WhatsApp no altera el dominio.
14. Nunca hay dos escritores/emisores por un traspaso de modo.
15. La generación más nueva no se sobrescribe con una caché anterior.
16. Una instancia detenida no conserva una API accesible por definición.
17. Una acción de plataforma no puede afectar otro servicio, volumen o workspace.

Usar claves foráneas, índices, transacciones y migraciones versionadas. Considerar WAL y bloqueo. La exportación debe ser consistente; no copiar únicamente un archivo SQLite activo olvidando su WAL.

## 16. Tablero en PC y conexión autenticada

Diseño sobrio, legible, español argentino y verde como acento. Usar navegador local con acceso cómodo desde Windows; no es necesario Electron ni una app nativa móvil.

Vistas:

1. Inicio: pendientes de hoy/vencidos, próximos pagos/turnos, cargas incompletas, modo de ejecución y conexión.
2. Agenda/tareas: lista y calendario con persona, categoría, estado y fechas.
3. Facturas: recepción esperada, períodos, vencimientos, pagos, saldo pendiente, enlaces y documentos disponibles.
4. Dinero: movimientos, autoría, cuentas opcionales, saldos según registros, tarjetas, cuotas, resumen real, presupuestos y metas.
5. Compras: lista compartida, productos, cantidades, completados y preguntas de importe pendientes.
6. Documentos: estado local/remoto, disponibilidad, elegibilidad de borrado y descargas.
7. Conversación: mensajes relevantes de este grupo, correcciones, aclaraciones y errores.
8. Configuración/operación: horarios, personas, grupo, límites, retención, copias, costo estimado, cambio de modo y fallos técnicos.
9. Simulador: texto, Kevin/Luisina, reloj y adjuntos opacos ficticios, sin cuenta real.

En las vistas económicas incluir filtros por rango de fechas, moneda, categoría, persona y cuenta, con fecha de operación/vencimiento claramente diferenciadas. Mostrar compras, cuotas previstas y pagos en bloques que eviten sumarlos como un único gasto duplicado.

Estos agregados del tablero no se envían espontáneamente por WhatsApp. Una consulta explícita sí puede devolver un resultado resumido.

Estados vacíos sin datos ficticios, accesibilidad básica, errores concretos y procedencia del dato. Ediciones desde tablero usan las mismas operaciones que el chat.

En railway_active, el componente local usa una API HTTPS autenticada propia; puede conservar caché con fecha visible, sin sobrescribir la fuente remota. En local_active, usa la API de loopback y base local propietaria.

No publicar un tablero web abierto. Proteger endpoints remotos y documentos antes de exponer una URL; no confundir interfaz privada con ausencia de autenticación en la API.

Preferir credencial del canal remoto guardada por el componente local con permisos del usuario, fuera del frontend. No usar un token general de Railway como token de la aplicación.

Mostrar la última sincronización/backup y si la copia es solo lectura o fuente activa. Un error de sincronización no se presenta como datos actuales. El estado de WhatsApp desconectado se ve aquí; no agregar correo u otro canal técnico.

## 17. Seguridad y privacidad

- Solo Kevin y Luisina en el grupo verificado; no leer otros chats por tener una sesión.
- Sesiones, claves, datos, documentos, copias, credenciales y .env real fuera de Git, build público y logs.
- Autorización en backend; rechazar operaciones de otros autores/grupos y solicitudes anónimas.
- API local limitada a loopback y protegida contra orígenes extraños, CORS abierto, CSRF cuando aplique, host inesperado y configuración inicial expuesta.
- Canal PC/Railway iniciado desde PC, con HTTPS/autenticación o mecanismo privado equivalente. No publicar carpetas ni abrir puertos en el router.
- RailwayControlAdapter con IDs verificados y operaciones cerradas. Un nombre de servicio en el chat no puede detener infraestructura.
- Diferenciar credenciales de dominio, administración de plataforma y sesiones de transporte.
- Servir documentos por IDs autorizados y rutas controladas; no path traversal, macros o ejecución de adjuntos.
- No descargar URLs arbitrarias del texto; recibir solo el adjunto autorizado mediante transporte y límites.
- Recursos de frontend locales; sin telemetría, publicidad, CDNs o fuentes remotas obligatorias.
- Logs con rotación y mínima información personal. El usuario acepta respaldos simples, pero eso no autoriza exponer datos ni secretos.
- No claves bancarias, lectura de Gmail, contactos externos o apertura automática de home banking.
- No prometer cifrado en reposo si no se implementó. WhatsApp y Railway procesan los datos según su servicio; una PC privada no elimina esa infraestructura.
- Corpus de pruebas saneado y separado de producción; no importar chats antiguos, datos privados recuperados o otras aplicaciones de Kevin.

## 18. Instalación, inicio y operación

Detectar entorno en lectura; Windows es habitual, verificarlo. No preguntar por GPU o elegir Ollama: no hay modelos en este alcance.

Preparar instalación, migración, compilación, inicio y parada con comandos probados. Acceso de escritorio y controlador local cómodos. Datos bajo el perfil del usuario, por ejemplo %LOCALAPPDATA%\AsistenteHogar, con ruta configurable y fuera de Git.

Configuración:

1. Kevin y Luisina con iguales permisos, grupo e identidades verificadas.
2. Buenos Aires, ARS, horarios aceptados y lista compartida para ambos.
3. Catálogo inicial de cuentas; saldos, tarjeta, cierres y vencimientos desconocidos se completan cuando se usen.
4. Ubicación de datos/copias locales, almacenamiento remoto limitado y retención por fin de mes más siete días.
5. Cuenta del bot y sesión de cada instalación que vaya a usarse. No clonar un estado criptográfico viejo entre dos clientes. Comprobar conector y estrategia de vinculación local/remota.
6. Credenciales separadas para la API de la app y el control de plataforma; métricas, permisos, IDs de servicio y recuperación verificados.
7. Estado visible de transporte, datos, cuota, costos y propietario. Ningún campo faltante se rellena con una conexión ficticia.
8. Prueba con datos ficticios aislados, sin cargar demostraciones en la base real.

El modo PC debe poder iniciarse automáticamente al iniciar sesión en Windows, con mecanismo por usuario y opción visible de desactivar. La disponibilidad comienza con ese proceso iniciado e Internet; encender el hardware sin sesión/proceso no demuestra que el bot funciona.

No exigir VS Code o una pestaña del tablero abierta para el bot local. Cerrar el tablero no debe cerrar inadvertidamente el proceso local; mostrar cómo detenerlo.

No modificar suspensión/hibernación de Windows, instalar servicios administrativos o alterar políticas globales. El bot local no funciona mientras la PC duerme, está apagada o sin Internet; el remoto solo mientras esté activo y dentro de la política.

Si cambian a modo local por presupuesto, conservarlo entre reinicios. No reactivar Railway en cada arranque de PC ni automáticamente al comenzar otro ciclo. El controlador solo puede usar recuperación breve verificada para datos faltantes conforme a las secciones 2 y 14.

No borrar una sesión remota para registrar la local ni asumir que las bibliotecas permiten compartir claves concurrentes; validar vinculación y un único emisor.

## 19. Respaldos y limpieza

Respaldar SQLite con método consistente para su modo WAL/escritura. Conservar manifiesto de fecha, versión, generación e integridad y restaurar una vez con datos de prueba.

Al usar la PC, descargar/crear automáticamente una copia si cambió el estado y no hay copia válida del día; conservar las últimas siete copias válidas. No producir una copia por cada mensaje ni rotar siete idénticas en un minuto.

El usuario acepta que el último respaldo independiente tenga la antigüedad de la última oportunidad con PC disponible. No añadir un servidor de backup, proveedor pago o correo para compensarlo.

La exportación final de traspaso no es un respaldo histórico cualquiera: debe cubrir la última generación remota antes de que la PC escriba. Esa condición de consistencia sigue siendo obligatoria aunque se acepten pocos respaldos.

Los originales aún dentro de retención pueden copiarse localmente; conservar por hash una sola copia física y referenciarla en respaldos, sin duplicar cada PDF siete veces innecesariamente.

La falta de copia local no impide eliminar un original remoto cuando vence su retención. Los registros financieros y de tareas se conservan; los respaldos viejos pueden contener versiones previas hasta rotar.

No incluir por defecto sesiones de WhatsApp y tokens administrativos en copias ordinarias. La restauración puede requerir nueva vinculación. Un snapshot en el mismo volumen ayuda al traspaso, pero no sustituye respaldo fuera de ese volumen.

Mantener una exportación final y rotación mínima de mantenimiento remoto; contabilizar sus bytes. No activar backups pagos de plataforma ni conservación remota indefinida sin evaluación dentro del máximo.

## 20. Casos de aceptación

Reloj base: 16/10/2026 a las 09:00 de Buenos Aires, salvo fecha explícita del escenario. Datos ficticios aislados; nunca sembrarlos en producción. Las variantes pueden agruparse en pruebas parametrizadas.

| ID | Entrada o escenario | Resultado requerido |
| --- | --- | --- |
| A01 | gaste 10mil en kiosco | ARS 10.000, fecha correcta, realizado por autor, cuenta opcional y respuesta tras commit. |
| A02 | gaste 20 en bebida | Aclarar escala ambigua; no convertir arbitrariamente a 20.000. |
| A03 | compre harina, papa, queso fresco y frutilla | Productos comprados, coincidencias claras completadas y pregunta por importe; sin gasto inventado ni productos pendientes nuevos. |
| A04 | mañana a las 2 de la tarde tenemos turno con pediatra de liam | 17/10/2026 14:00 local, ambos, lugar no inventado y próximo aviso vigente. |
| A05 | llamar a mama karina a las 22 | Fecha/responsable suficientes o pregunta; no contactar a Karina ni desplazar la hora expresada por silencio general. |
| A06 | recordame que pagos vencen mañana | Consulta ahora por vencimientos del 17/10; no programar entrega futura por la sola palabra mañana. |
| A07 | A04 procesado tras desconexión | Conservar fecha relativa original: 17/10, no día siguiente al procesamiento. |
| A08 | Dos borradores; respuesta para Luisina | Resolver por autor/cita/ID inequívoco; no cruzar borradores de las dos personas. |
| A09 | Gas para Kevin; vencimiento 25/10; aviso a las 15; PDF | Persistir archivo solo con asociación completa, sin leerlo y sin adjuntarlo automáticamente a los avisos. |
| A10 | PDF sin concepto/fecha/responsable suficientes | Preguntar y conservar referencia/metadata; no persistir original ni anunciar archivo guardado. |
| A11 | PDF/TXT contiene otro importe o instrucciones | No leer, interpretar o ejecutar contenido; solo datos escritos en el chat. |
| A12 | Repetición de ID de mensaje o bytes de archivo | No duplicar intención; deduplicar bytes sin fusionar obligaciones legítimas distintas. |
| A13 | Ya pagué el gas; luego comprobante | Un pago y evidencia opaca asociada; no verificación bancaria ni gasto nuevo por el comprobante. |
| A14 | Varias facturas de gas candidatas | Preguntar cuál antes de marcar pagado. |
| A15 | Completar antes de envío encolado | Invalidar aviso obsoleto antes de emitir. |
| A16 | Aviso de servicio calculado en sábado | Adelantar al día permitido anterior; conservar vencimiento real. |
| A17 | Reinicio con avisos perdidos | Procesar estado/historial; un aviso individual vigente por pendiente, sin resumen automático ni ráfaga de repeticiones. |
| A18 | Pagado recibido durante desconexión | Aplicarlo antes de decidir el aviso atrasado correspondiente. |
| A19 | Caída tras enviar y antes de acuse | delivery_unknown y recuperación cauta, sin prometer exactamente una vez ni repetir ciegamente. |
| A20 | Transferencia entre cuentas propias | Saldos coherentes; no ingreso y gasto duplicados del hogar. |
| A21 | Compra con tarjeta y pago de resumen | Compra una vez, deuda/cuotas/pago diferenciados y salida de cuenta solo cuando corresponde. |
| A22 | ARS 10.000 y USD 20 | Dos totales por moneda; sin conversión implícita. |
| A23 | Comprar harina antes del lunes | Proponer domingo 18/10/2026 a las 18:00, mostrarlo y completar responsable si no se heredó. |
| A24 | Pasame la factura del gas | Elegir registro inequívoco y adjuntar original solo a este pedido, si disponible. |
| A25 | Pedir mapa sin destino | Pedir lugar; con destino escrito construir enlace escapado, sin inventar dirección. |
| A26 | Mensaje de otro grupo o autor ajeno | Sin operaciones, descarga de adjuntos o salida de datos del hogar. |
| A27 | Error de base/disco al guardar | No afirmar guardado; reintento sin duplicar operaciones confirmadas. |
| A28 | Ok después de aviso | No completar automáticamente. |
| A29 | Compra de 1.000 en tres cuotas | Sumas exactas reconciliadas y sin sumar compra más cuotas como dos gastos. |
| A30 | Reprogramar con avisos antiguos en outbox | Invalidar versión anterior; solo trabajos vigentes. |
| A31 | Archivo mayor a 10 MB, sexto adjunto o cuota llena | Rechazar persistencia del archivo; mantener carga de texto, sin ampliar recursos. |
| A32 | Pago completo el 16/10/2026 | Retención hasta fin del 07/11; borrado elegible desde 08/11 00:00 Buenos Aires. |
| A33 | Archivo asociado a dos pendientes; uno activo | No borrarlo por haberse pagado el otro. |
| A34 | Reabrir después de eliminar original | Conservar dominio; pedir reenvío si se necesita, sin recuperación ficticia. |
| A35 | Falla envío de archivo pedido | Informar/reintentar ese pedido con límites; no repetir un recordatorio anterior. |
| A36 | PC apagada y railway_active | Textos y avisos disponibles; original remoto se envía únicamente si lo piden. |
| A37 | railway_active y archivo solo en PC apagada | Recordatorio de texto normal; al pedir archivo, informar necesidad de PC sin falsa entrega. |
| A38 | Redeploy remoto legítimo | Volumen conserva datos/sesión y respeta propietario; no crea base vacía ni activa generación vieja. |
| A39 | Tablero con copia antigua | Mostrar antigüedad; no sobrescribir fuente activa ni afirmar sincronización actual. |
| A40 | Audio recibido | Pedir texto, sin transcribir ni conservar original por defecto. |
| A41 | JPG/PNG y metadatos completos | Archivo opaco con límites; no OCR ni extracción. |
| A42 | Primer inicio sin saldos | Catálogo editable y estados vacíos; saldo desconocido, sin operaciones o deuda ficticias. |
| A43 | Pedido de apagar un servicio ajeno al bot | Rechazar operación de plataforma; no modificar ERP, variables o límites globales. |
| A44 | Margen Hobby no verificado | No afirmar costo adicional cero ni iniciar remoto continuo por suposición. |
| A45 | Declaración inequívoca hice/pagué/compré | Registrar realización clara sin otro sí previo; confirmar resultado guardado. |
| A46 | Recordá pagar esto | Crear pendiente al completar datos; no registrar un pago realizado. |
| A47 | Posponer F-0007 una hora | Mover próxima alarma; conservar vencimiento y suprimir repetición previa al instante pospuesto. |
| A48 | Pendiente para ambos; Luisina dice hecho | Completar un registro compartido y cancelar avisos de ambos. |
| A49 | Gasto claro y tarea sin fecha en un mensaje | Gasto guardado, tarea en borrador y pregunta; responder luego no vuelve a crear el gasto. |
| A50 | Edición o eliminación del mensaje de gasto | Ignorar para dominio. Una corrección nueva sí actualiza y deja auditoría. |
| A51 | Borrador sin respuesta durante 72 horas | Una sola insistencia tras 24 horas permitidas, no tres avisos diarios ni eliminación silenciosa. |
| A52 | Mañana a las 9 recordame para Kevin qué pagos vencen | Consulta futura explícita para 17/10 a las 09:00, no entrega inmediata como única acción. |
| A53 | Hay urgentes o vencidos pero nadie pidió resumen | Solo avisos individuales configurados; no resumen diario, urgente, financiero o de recuperación. |
| A54 | Dos pendientes diferentes a la misma hora | Dos mensajes separados, con destinatarios y IDs correctos. |
| A55 | Dos offsets del mismo pago se adelantan al mismo instante | Un aviso de esa ocurrencia, sin duplicar por offsets equivalentes. |
| A56 | Regla día 31 aplicada a febrero y luego marzo | Último día de febrero; recuperar 31 en marzo, no transformar permanentemente en día 28. |
| A57 | Gasto con importe sin moneda | ARS por defecto; USD solo explícitos. |
| A58 | Kevin informa Luisina gastó 10mil | reported_by Kevin, performed_by Luisina; no exigir cuenta ni atribuirlo a Kevin. |
| A59 | Consultar saldo sin base inicial | Mostrar base incompleta/desconocida; no saldo cero certificado. |
| A60 | Pagué factura con saldo pendiente conocido de 40.000 | Pago completo de 40.000 y deuda resuelta; sin nueva confirmación universal. |
| A61 | Pagué factura de importe desconocido; luego 40mil | Resolver deuda y preguntar monto; completar el mismo pago al responder, sin cero ni doble gasto. |
| A62 | Pagué 30mil de una deuda de 50mil | Pago de 30.000 y saldo 20.000 con recordatorios vigentes, sin limpiar archivo de obligación activa. |
| A63 | Pago con 20mil efectivo y 30mil transferencia | Total 50.000 una vez; partes y cuentas si conocidas. |
| A64 | Resumen real de tarjeta distinto de cuotas previstas | Conservar diferencias y datos escritos; no extraer PDF ni sustituir resumen por una estimación. |
| A65 | Factura esperada no llegó; luego llega con datos | Aviso de recepción pendiente y luego misma ocurrencia completada, sin duplicar deuda ni inventar importe. |
| A66 | Reservé 100mil para vacaciones, guardado en efectivo | Asignación/ubicación, no gasto; no transferencia con origen inventado. |
| A67 | Productos comprados y total ya informado | Marcar productos y registrar/vincular un gasto, sin preguntar total nuevamente ni duplicarlo al aclarar. |
| A68 | Medio de un adjunto incompleto caduca antes de aclarar | Pedir reenvío; no afirmar que el original estaba guardado. |
| A69 | Resolución el 31/12 o fin de febrero | Borrado desde 08/01 o 08/03 respectivamente, con zona y año correctos. |
| A70 | Vence retención sin copia local por PC apagada | Eliminar remoto en el próximo proceso disponible y conservar metadata; no esperar indefinidamente una copia. |
| A71 | Aviso de factura con documento asociado | Solo texto/enlaces pertinentes. Archivo no enviado hasta pedido explícito. |
| A72 | Ocho días con cambios y respaldos disponibles en PC | Últimas siete copias válidas; no duplicar originales en cada copia ni exigir backup remoto pago. |
| A73 | Sesión de WhatsApp revocada | Estado técnico en tablero; no correo ni mensaje privado automático. |
| A74 | Proyección total de USD 5,60 o adicional mayor al máximo | Cierre preventivo y solicitud de parada únicamente de este deployment; transición local con datos preservados. |
| A75 | Deployment detenido pero volumen conservado | Costo residual contabilizado; no declarar factura cero ni borrar datos para ocultarlo. |
| A76 | Traspaso con PC ya conectada | Exportación final válida, parada remota comprobada y un solo emisor local con deduplicación preservada. |
| A77 | Cierre remoto con PC apagada; PC enciende después | Recuperar exportación final mediante capacidad real verificada; si hace falta, recovery_only breve sin bot remoto. |
| A78 | Snapshot antiguo, corrupto o con generación incompatible | Rechazar importación/propiedad; mostrar recovery_required, sin sobrescribir datos nuevos. |
| A79 | Comienza otro ciclo o hay commit estando en modo local | No reactivar remoto continuo. Regreso explícito usa la base local más reciente. |
| A80 | Recuperación remota de datos | Tiempo acotado, autenticada, sin transporte ni planificador; detener tras descarga/timeout y contar costo. |
| A81 | Métricas de costo viejas o permisos ausentes | Impedir inicio remoto nuevo o iniciar cierre conservador; no suponer margen gratis. |
| A82 | No puede probarse parada remota | No habilitar segundo emisor ni declarar parada exitosa; conservar estado de fallo visible. |
| A83 | Falla el comando de plataforma al detener | Reintentos acotados y fallo explícito; no usar process.exit reiniciable como prueba de apagado facturable. |
| A84 | Regreso autorizado de PC a Railway tras uso local | Exportar última generación local, importar consistentemente y habilitar solo el nuevo propietario remoto. |

## 21. Verificación proporcionada al cambio

Ejecutar tipado, compilación, migraciones y pruebas pertinentes del dominio. Usar transporte, reloj y plataforma simulados. Agrupar variantes en casos parametrizados; no escribir tests que solo reproduzcan la implementación.

Priorizar fechas, dinero, pago completo/parcial/desconocido, pregunta de importe, separación de avisos, ausencia de resúmenes automáticos, no persistencia prematura de archivos y retención por calendario.

Verificar una vez el tablero, filtros, descarga, copia/restauración y traspaso consistente. La propiedad única, generación, parada real del remoto y recuperación con PC inicialmente apagada necesitan comprobación específica antes de dar por válido el modo presupuestario.

Comprobar dependencias ligeras, secretos fuera de Git, autenticación, ausencia de datos ficticios y exclusión de modelos/análisis de documentos.

No repetir pruebas por rutina ni enviar decenas de mensajes al grupo real. Repetir por cambios relevantes, fallos o dudas concretas. No medir exhaustivamente tres conectores si el primero satisface los requisitos.

Registrar comandos y resultados, costo de las validaciones remotas si existió y límites: implementado, simulado, vinculado, medido y probado en Railway son estados diferentes.

## 22. Etapas y entregables

1. Entorno y proyecto independiente; estructura, SQLite, migraciones, configuración y datos vacíos.
2. Dominio y simulador: texto, autoría, borradores, datos faltantes y correcciones por nuevos mensajes.
3. Recordatorios individuales, confirmación de realización, posposición, consultas ahora/futuras, inbox/outbox e idempotencia.
4. Prueba acotada del diseño remoto/local: exportación consistente, propietario único, persistencia de modo y simulación de control de presupuesto. Resolver temprano la viabilidad de recuperar el volumen detenido.
5. Facturas/recurrencias, recepción esperada, pagos parciales/desconocidos y archivos opacos con carga completa y retención correcta.
6. Finanzas, tarjetas/resumen real, metas, lista de compras y enlaces de pago/mapa.
7. Tablero local, filtros, API autenticada, descarga/copia y proceso de Windows.
8. Adaptador real, grupo/identidades, sesiones y límites de historial; sin desplegar si falta cuenta.
9. Configuración de Railway, medición real, permisos de CostGuard, apagado exclusivo y prueba de cambio de modo cuando el entorno lo permita.
10. Verificaciones restantes pertinentes, restauración y documentación fiel al resultado.

Continuar con lo autorizado y posible; no entregar solo la primera etapa como el proyecto completo. Credenciales y métricas reales faltantes no bloquean núcleo ni simulación, pero sí impiden afirmar validado el presupuesto o la conexión.

Archivos esperados: README.md, AGENTS.md específico si ayuda a mantener estas restricciones, .env.example sin secretos, scripts de instalación/build/inicio/parada, migraciones, pruebas críticas, docs/ARQUITECTURA.md, docs/WHATSAPP.md, docs/ARCHIVOS_Y_RETENCION.md, docs/RAILWAY_Y_COSTOS.md, docs/MODO_LOCAL_Y_RECUPERACION.md y docs/PROGRESO.md.

Mantener un checklist de requisitos y casos. Documentar limitaciones concretas y decisiones técnicas, evitando reabrir preguntas ya contestadas. No considerar completa la etapa remota/local con una etiqueta o un botón sin persistencia y traspaso reales.

## 23. Configuración inicial consolidada

Valores de producto aceptados, más parámetros técnicos preventivos editables. No son credenciales ni límites que Railway haya aplicado.

```json
{
  "timezone": "America/Argentina/Buenos_Aires",
  "defaultCurrency": "ARS",
  "preferredRuntime": "railway",
  "messagingAdapter": "baileys",
  "storageMode": "pending_budget_check",
  "conversation": {
    "dedicatedGroup": true,
    "requireCommandPrefix": false,
    "clearFactsSaveImmediately": true,
    "acknowledgeAfterCommit": true,
    "confirmDestructiveDeletion": true,
    "ignoreWhatsAppEdits": true,
    "ignoreWhatsAppDeletions": true,
    "incompleteDraftFollowupHours": 24,
    "maxIncompleteDraftFollowups": 1
  },
  "interpretation": {
    "text": true,
    "audio": false,
    "imageContent": false,
    "documentContent": false,
    "llmRequired": false,
    "immediateQueryUnlessDeliveryTimeExplicit": true
  },
  "finance": {
    "accountRequiredForExpense": false,
    "captureReportedByAndPerformedBy": true,
    "fullPaymentUsesKnownOutstandingAmount": true,
    "allowPaidWithoutKnownAmount": true,
    "askAmountWhenPaidWithoutKnownAmount": true,
    "partialPaymentsEnabled": true,
    "realCardStatementsEnabled": true,
    "automaticFinancialReports": false
  },
  "shopping": {
    "sharedListDefaultAssignees": ["kevin", "luisina"],
    "inheritListSchedule": true,
    "askPurchaseTotalWhenMissing": true,
    "markProductsBeforeAmountAnswer": true
  },
  "attachments": {
    "allowedExtensions": ["pdf", "txt", "jpg", "jpeg", "png"],
    "maxFileBytes": 10000000,
    "maxRemoteOriginalBytes": 100000000,
    "maxFilesPerRecord": 5,
    "requireCompleteAssociationBeforePersisting": true,
    "sendWithReminder": false,
    "sendOnlyOnExplicitRequest": true,
    "retentionPolicy": "resolution_calendar_month_end_plus_7_days",
    "localArchiveEnabled": true,
    "localCopyBestEffort": true,
    "blockRemoteDeletionUntilLocalCopy": false
  },
  "notifications": {
    "mentionAssignees": true,
    "completeSharedItemWhenEitherConfirms": true,
    "repeatUntilResolved": true,
    "repeatOverdueOncePerDay": true,
    "groupDifferentReminders": false,
    "automaticSummaryEnabled": false,
    "automaticUrgentSummaryEnabled": false,
    "automaticRecoverySummaryEnabled": false,
    "servicePaymentWeekdaysOnly": true,
    "servicePaymentPreferredTime": "15:00",
    "billLeadDays": [3, 1, 0],
    "appointmentLeadHours": [24, 2],
    "dateOnlyTaskReminderTime": "09:00",
    "otherOverdueReminderTime": "09:00",
    "quietHoursStart": "22:00",
    "quietHoursEnd": "08:00",
    "beforeMondayDefaultWeekday": "sunday",
    "beforeMondayDefaultTime": "18:00",
    "monthlyMissingDayPolicy": "last_day_of_month",
    "missingBillReminderEnabledWhenConfigured": true
  },
  "costPolicy": {
    "targetAdditionalMonthlyUsd": "0.00",
    "maxAdditionalMonthlyUsd": "0.50",
    "referenceWorkspaceMonthlyBillCeilingUsd": "5.50",
    "operationalReserveUsd": "0.10",
    "requireCostJustification": true,
    "allowAutomaticScaling": false,
    "checkIntervalMinutes": 15,
    "maxCostSampleAgeMinutes": 60,
    "onBudgetRisk": "stop_only_this_railway_deployment_then_local",
    "modifyWorkspaceHardLimit": false,
    "autoResumeRemoteNextBillingCycle": false
  },
  "runtime": {
    "singleActiveWriterAndSender": true,
    "requireVerifiedHandoff": true,
    "localStartAtWindowsSignIn": true,
    "remoteRecoveryMode": "bounded_export_only",
    "remoteRecoveryTimeoutSeconds": 120
  },
  "backup": {
    "localAutomaticWhenAvailable": true,
    "maxValidLocalSnapshots": 7,
    "atMostOneRoutineSnapshotPerDayIfChanged": true,
    "includeWhatsAppSecretsInRoutineCopies": false
  },
  "technicalAlerts": {
    "dashboard": true,
    "email": false,
    "privateMessages": false
  }
}
```

Las ventanas y cuotas pueden editarse desde configuración; respetar las restricciones explícitas mientras no las cambien. No activar resúmenes o adjuntos automáticos por interpretar que son una mejora. Los IDs, credenciales, saldos y fechas de tarjetas aún desconocidos no se inventan.

## 24. Decisiones cerradas y dependencias reales

Las 34 respuestas del 16/10/2026 están incorporadas y tienen trazabilidad en la sección 27. No repetir esas preguntas. Se aplazaron ejemplos nuevos de ingresos/cuotas/correcciones/posposición/pagos; no son un bloqueo.

Pendientes operativos para producción: cuenta/número del bot, grupo e identidades, sistema real, sesiones locales/remotas, acceso de lectura a costos, permiso acotado de parada, IDs de esta app, medición y prueba del traspaso. Son configuración/validación, no requisitos de producto por inventar.

No pedir contraseñas, documentos bancarios, datos médicos u otros datos privados para programar. Saldos, nombres reales de tarjetas y fechas de cierre/vencimiento se completan al usar esas funciones.

Revisar mensajes disponibles para estudiar el estilo no autoriza importar el historial de Kevin a la app ni convertir ejemplos en gastos reales. El contexto recuperado no aportó cinco ejemplos auténticos nuevos de las intenciones aplazadas; usar las frases originales disponibles y fixtures sintéticos identificados.

Esta versión 3.0 sustituye las reglas incompatibles de versiones anteriores: nada de resúmenes automáticos, adjuntos enviados en cada aviso, guardado de originales incompletos, retención de solo siete días desde el pago, dependencia exclusiva de Railway o copia local garantizada con PC apagada.

## 25. Fuentes primarias

Consultadas el 16/10/2026. Verificar versiones y permisos al instalar. No sustituir las restricciones del usuario por funcionalidades pagas.

- [Baileys: repositorio del mantenedor](https://github.com/WhiskeySockets/Baileys).
- [Baileys: conexión sin navegador y funciones](https://github.com/WhiskeySockets/Baileys/blob/master/README.md).
- [whatsapp-web.js: arquitectura y carácter no oficial](https://wwebjs.dev/guide/).
- [whatsmeow: biblioteca Go y funciones](https://github.com/tulir/whatsmeow).
- [Railway: tarifas y uso incluido](https://docs.railway.com/pricing/plans).
- [Railway: almacenamiento persistente](https://docs.railway.com/volumes).
- [Railway: límites y comportamiento de volúmenes](https://docs.railway.com/volumes/reference).
- [Railway: uso por proyecto y proyección](https://docs.railway.com/projects/project-usage).
- [Railway: CLI de uso; distingue límites de compute y Railway Agent](https://docs.railway.com/cli/usage).
- [Railway: detener/remover un deployment](https://docs.railway.com/deployments/deployment-actions).
- [Railway: referencia de estados de deployment](https://docs.railway.com/deployments/reference).
- [Railway: API pública y autenticación](https://docs.railway.com/integrations/api).
- [Railway: control de deployments con la API](https://docs.railway.com/integrations/api/manage-deployments).
- [Railway: archivos de volumen mediante CLI](https://docs.railway.com/cli/volume).
- [Railway: SSH/SFTP llega al contenedor en ejecución](https://docs.railway.com/cli/ssh).
- [Railway: control de autodeploys](https://docs.railway.com/deployments/github-autodeploys).
- [Railway: suspensión Serverless](https://docs.railway.com/deployments/serverless).
- [Chrono: soporte parcial de fechas en español](https://github.com/wanasit/chrono).
- [Google Maps: enlaces para destino y rutas](https://developers.google.com/maps/documentation/urls/get-started).

La existencia de un comando de descarga de volumen no prueba que funcione con el deployment detenido. Verificarlo en el entorno concreto; el procedimiento alternativo recovery_only es diseño de esta app, no una capacidad prometida por Railway.

## 26. Corpus de lenguaje y procedencia

### 26.1 Frases auténticas aportadas para este proyecto

Conservar estas entradas como fixtures de parser, incluidos acentos omitidos y minúsculas; no son operaciones reales para insertar en la base.

| Frase original | Tratamiento |
| --- | --- |
| «gaste 20 en bebida» | Aclarar escala ambigua; no inferir miles por costumbre. |
| «gaste 10mil en kiosco» | Gasto ARS 10.000 con autoría y cuenta opcional. |
| «compre harina, papa, queso fresco y frutilla» | Compra realizada; marcar productos y preguntar importe si falta. |
| «mañana a las 2 de la tarde tenemos turno con pediatra de liam» | Evento mañana 14:00, ambos, sin lugar inventado. |
| «llamar a mama karina a las 22» | Tarea, fecha/responsable suficientes o aclaración; no contactar a Karina. |
| «recordame que pagos vencen mañana» | Consulta inmediata filtrada por mañana. |

La instrucción reciente «si dice recordame es ahora, si dice mañana recordama es mañana» aporta la distinción semántica y una variante de tipeo. Admitir recordama como alias contextual seguro de recordame cuando la intención sea clara; no corregir por similitud personas, cifras o fechas.

La revisión de contexto personal muestra escritura directa, español rioplatense, acentos omitidos y errores menores. No aportó cinco ejemplos auténticos nuevos de ingresos/cuotas/correcciones/posposición/pagos. No presentar formulaciones del asistente como si fueran citas de Kevin ni incorporar detalles ajenos de su historial.

### 26.2 Fixtures sintéticos, no citas del usuario

Ejemplos diseñados para comprobar las intenciones pendientes, sin exigir que Kevin escriba ahora otros cinco:

- «cobre 800mil de sueldo»: ingreso conocido en ARS; cuenta opcional.
- «compre una heladera por 600mil en 6 cuotas»: total 600.000, no seis pagos de 600.000; pedir tarjeta/primer vencimiento si se necesitan y faltan.
- «eran 12mil, corregi el gasto del kiosco»: actualizar candidato inequívoco y movimientos relacionados, sin crear otro gasto.
- «pospone F-0007 una hora»: cambiar próxima alarma sin alterar vencimiento.
- «ya pague F-0007»: aceptar pago completo por saldo conocido; si falta importe, resolver y preguntar.
- «mañana a las 9 recordame para Kevin que pagos vencen»: consulta futura explícita, diferente del filtro de mañana de una consulta inmediata.

El parser debe pedir reformulación cuando no alcance; la combinación de reglas no equivale a un modelo general de lenguaje. Mantener fixtures separados de los datos reales y ampliar con mensajes expresamente usados en esta app, sin importar chats externos.

## 27. Trazabilidad de las 34 respuestas del usuario

Respuestas del 16/10/2026. Esta tabla es una referencia de decisiones consolidadas, no otro cuestionario.

| Respuesta | Regla aplicada | Secciones |
| --- | --- | --- |
| R01 | Realizaciones claras se registran; los pendientes piden confirmar al pasar el plazo o permiten posponer. | 5, 11 |
| R02 | Grupo exclusivo de cargas y consultas; sin prefijo obligatorio. | 1, 6 |
| R03 | Una realización resuelve el pendiente compartido para ambos. | 6, 9, 11 |
| R04 | Separar operaciones y preguntar solo por las partes incompletas. | 5 |
| R05 | Corregir por mensaje nuevo; ignorar ediciones y borrados de WhatsApp. | 5, 15 |
| R06 | Una insistencia a las 24 horas para borradores sin respuesta. | 5, 11 |
| R07 | Horarios/anticipaciones aceptados, editables después. | 10, 11, 23 |
| R08 | Consulta ahora salvo momento futuro de aviso explícito. | 5, 20, 26 |
| R09 | Antes del lunes: domingo a las 18:00, mostrando fecha resuelta. | 10 |
| R10 | Ningún resumen automático, incluidos urgentes. | 11, 16, 23 |
| R11 | Avisos separados por pendiente. | 11 |
| R12 | Día mensual inexistente: último día del mes. | 8 |
| R13 | ARS por defecto. | 7 |
| R14 | Catálogo de cuentas propuesto aceptado, sin saldos ficticios. | 7 |
| R15 | Cuenta no obligatoria; registrar quién realizó el gasto. | 7 |
| R16 | Pago completo usa saldo conocido de factura inequívoca. | 7, 8 |
| R17 | Pago sin importe permitido; preguntar cuánto para completar el mismo movimiento. | 7 |
| R18 | Admitir parciales; mantener saldo pendiente y sus avisos. | 7, 8 |
| R19 | Tarjetas con resumen mensual real informado por texto. | 7 |
| R20 | Sin reportes espontáneos por chat; tablero con filtros de fechas. | 7, 16 |
| R21 | Recordar facturas no recibidas cuando su llegada esperada está configurada. | 8 |
| R22 | Metas con reservas y lugar/cuenta informado, sin transferencia ficticia. | 7 |
| R23 | Lista de compras compartida con fecha/responsables heredados. | 9 |
| R24 | Preguntar importe después de informar productos comprados; no bloquear productos ni inventar gasto. | 9 |
| R25 | PDF/TXT/JPG/PNG opacos; sin audio/video o interpretación. | 12 |
| R26 | 10 MB por archivo, cinco por registro y 100 MB originales remotos. | 12 |
| R27 | Retención hasta fin del mes de resolución más siete días; borrar desde día 8. | 12 |
| R28 | Copia local física si PC disponible, sin publicar disco; si no, borrar igual al vencer retención. | 12 |
| R29 | Enviar archivo únicamente cuando se pida. | 11, 12 |
| R30 | Adjunto incompleto: preguntar y no persistir original hasta completar datos. | 12 |
| R31 | Respaldo local automático oportunista; últimas siete copias válidas. | 19 |
| R32 | Fallo de WhatsApp visible en tablero, sin correo técnico. | 6, 16 |
| R33 | Corte preventivo solo de esta app cerca de USD 5,50 totales/0,50 adicionales; continuidad local al iniciar PC. | 2, 14 |
| R34 | Ejemplos nuevos aplazados; usar lenguaje real disponible y fixtures sintéticos identificados. | 24, 26 |
