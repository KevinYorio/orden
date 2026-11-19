# Agentes actuales de KEVIN OS

El coordinador reutiliza el proceso, la API y SQLite existentes. Los módulos no son ocho servidores ni ocho modelos independientes.

| Agente | Trabajo disponible | Límites |
| --- | --- | --- |
| `orden.agenda` | Consulta local de tareas, turnos y vencimientos | No crea ni modifica registros desde la consulta coordinada. |
| `orden.memory` | Lee entidades, hechos y relaciones declarados | No inventa hechos ni actualiza memoria por inferencia. |
| `orden.shopping` | Lista e historial de compras, productos y precios observados | No consulta precios actuales de tiendas. |
| `orden.documents` | Busca referencias documentales y crea extracciones para revisión | El original se conserva; ningún dato extraído se confirma solo. |
| `orden.finance` | Consulta obligaciones, pagos y totales existentes | No reemplaza el motor contable ni convierte monedas. |
| `orden.research` | Búsqueda pública con fuentes, si Brave está configurado y el usuario consiente | Deshabilitado por defecto; proveedor externo, cuota limitada y sin persistencia local de consulta/respuesta. |
| `orden.correlation` | Devuelve registros y documentos vinculados por términos explícitos | Correlación textual determinista, no razonamiento semántico completo. |
| `orden.security` | Autenticación y límites en API/transporte | Permisos comprobados en la frontera; sin herramientas arbitrarias para un modelo. |

La consulta coordinada actual es de solo lectura y permite hasta tres pasos por solicitud. El clasificador determinista puede marcar una búsqueda pública como parcial cuando el proveedor no está habilitado. El endpoint de investigación independiente exige una casilla de consentimiento en el tablero. Cada ejecución persiste agente, estado, actor e IDs/conteos; no duplica texto privado ni resultados web.

La interpretación opcional de texto usa Ollama local y entrega una propuesta validada por esquema. Los cambios financieros, de memoria, agenda y documentos siguen pasando por los servicios deterministas y, cuando corresponde, confirmación humana.
