# Respaldo y comprobación diaria de Nexus Notes

Sitio: https://mis-pendientes-ti.robustcup18.chatgpt.site
Proyecto: appgprj_6ad7772599b88191812c673ce3fe8a5a

1. Obtener el acceso de servicio admitido, siwc_bypass_bearer_token de get_site. No imprimir ni persistir el token. Solo enviarlo al origen exacto del sitio mediante `OAI-Sites-Authorization: Bearer <token>`. No seguir redirecciones a otro origen.
2. El sitio debe tener configurado el secreto de servicio equivalente `NEXUS_MAINTENANCE_TOKEN` (al menos 32 bytes UTF-8). Si falta o es más corto, la ruta falla cerrado con 503 genérico, sin imprimir ni registrar el secreto.
3. Enviar POST /api/maintenance sin cabecera `Origin` ni encabezados de identidad de visitante. No requiere cuerpo ni contraseñas. La audiencia compartida está soportada: la autorización es por token de servicio, no por la audiencia del sitio. Copia registros por propietario a R2 de forma idempotente por día de Perú; no exporta credenciales.
4. Exigir HTTP 200, `ok=true` y `failed=0`. Después GET /api/maintenance con el mismo acceso. Exigir `lastRun.ok=true`, `lastRun.failed=0` y `lastRun.checkedAt` actualizado; el `ok` superior solo confirma que D1/R2 responden, así que no basta para dar por buena una copia fallida. La respuesta solo tiene contadores y fecha; no descargar datos personales para comprobar el trabajo.
5. Si falla, informar al usuario del resultado sin secretos. Conservar las copias manuales hasta verificar el planificador con el sitio desplegado. Si está correcto y no hay nada que requiera atención, no emitir avisos rutinarios. No cambiar código, publicar versiones, editar tareas ni permisos en una ejecución habitual.

La ejecución crea como máximo una copia diaria por usuario y conserva 30. Si existe la copia del día no la sustituye. Más de 200 tareas, 200 apuntes o 5 MB por usuario produce un fallo explícito. La consulta de salud prueba acceso a D1 y R2; no reemplaza monitoreo continuo ni restauraciones de desastre ensayadas.
