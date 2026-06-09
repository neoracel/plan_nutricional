# Plan Nutricional — Railway

App nutricional para dos personas. Menú semanal, lista del súper compartida, registro de progreso y generación de menús con IA.

## Deploy en Railway

### Variables de entorno requeridas

| Variable | Descripción |
|---|---|
| `ANTHROPIC_API_KEY` | Tu API key de Anthropic (para la pestaña IA) |
| `REDIS_URL` | URL de tu Redis en Railway (para datos compartidos) |

### Pasos

1. Sube este folder a un repo de GitHub (puede ser privado)
2. En Railway → New Project → Deploy from GitHub repo
3. Agrega las variables de entorno arriba
4. Railway genera la URL automáticamente

### Sin Redis

Si no agregas `REDIS_URL`, la app funciona igual pero los datos (palomeos del súper, registros de progreso) se pierden al reiniciar el servidor. Para uso permanente, agrega un servicio Redis en Railway y copia el `REDIS_URL` que genera.
