# Configuración de Google Gemini AI

Este documento explica cómo configurar Google Gemini AI para la generación automática de contenido para redes sociales.

⚠️ **IMPORTANTE**: Para análisis de video multimodal, se requiere OAuth2 con Service Account. **Las API Keys simples NO funcionan con video.**

👉 **[Consulta la guía completa de OAuth2 aquí](GEMINI_OAUTH2_SETUP.md)** (REQUERIDO para video)

## 📋 Requisitos Previos

- Una cuenta de Google Cloud Platform
- Acceso al proyecto `drive-navegatime` (o crear uno nuevo)
- Permisos para crear y gestionar API Keys

## 🚀 Pasos de Configuración

### 1. Acceder a Google Cloud Console

1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Inicia sesión con tu cuenta de Google
3. Selecciona o crea el proyecto `drive-navegatime`

### 2. Habilitar la API de Gemini

1. En el menú lateral, ve a **APIs y Servicios > Biblioteca**
2. Busca "Generative Language API" o "Gemini API"
3. Haz clic en la API y presiona **Habilitar**
4. Espera a que la API se habilite (puede tomar unos segundos)

### 3. Crear una API Key

1. Ve a **APIs y Servicios > Credenciales**
2. Haz clic en **+ CREAR CREDENCIALES**
3. Selecciona **Clave de API**
4. Se generará una nueva API Key
5. **IMPORTANTE**: Copia la API Key inmediatamente (no la compartas públicamente)

### 4. Configurar Restricciones de Seguridad (Recomendado)

Para proteger tu API Key:

1. Haz clic en el nombre de la API Key que acabas de crear
2. En **Restricciones de aplicación**, selecciona una de las siguientes opciones:
   - **Sitios web**: Agrega los dominios permitidos (ej: `localhost:3000`, tu dominio de producción)
   - **Direcciones IP**: Restringe el uso a IPs específicas
3. En **Restricciones de API**, selecciona **Restringir clave**
4. Marca solo "Generative Language API"
5. Guarda los cambios

### 5. Configurar la Variable de Entorno

#### Opción A: Archivo .env (Desarrollo Local)

Crea o edita el archivo `.env` en la raíz del proyecto. Puedes usar cualquiera de estas variables:

```env
# Opción 1 (Recomendada para backend)
GOOGLE_CLOUD_API_KEY=tu_api_key_aqui

# Opción 2 (Compatible con Vite)
VITE_GOOGLE_CLOUD_API_KEY=tu_api_key_aqui

# El sistema buscará automáticamente en ambas
```

**Nota**: Asegúrate de que el archivo `.env` esté en `.gitignore` para no subirlo al repositorio.

#### Opción B: Variables de Entorno del Sistema

En Windows (PowerShell):
```powershell
$env:VITE_GOOGLE_CLOUD_API_KEY="tu_api_key_aqui"
```

En Linux/macOS:
```bash
export VITE_GOOGLE_CLOUD_API_KEY="tu_api_key_aqui"
```

#### Opción C: Docker Compose

Agrega la variable en tu `docker-compose.yml`:

```yaml
services:
  app:
    environment:
      - VITE_GOOGLE_CLOUD_API_KEY=${VITE_GOOGLE_CLOUD_API_KEY}
```

Y luego crea un archivo `.env` en la raíz con:
```env
VITE_GOOGLE_CLOUD_API_KEY=tu_api_key_aqui
```

### 6. Verificar la Configuración

1. Reinicia la aplicación
2. Ve al modal de publicación en redes sociales
3. Verifica que aparezca el botón **"Generar con IA"**
4. Selecciona al menos una red social
5. Haz clic en **"Generar con IA"**
6. Completa los campos del formulario
7. Haz clic en **"Generar Contenido"**

Si todo está configurado correctamente, verás el contenido generado automáticamente.

## ⚙️ Configuración del Modelo

El sistema utiliza el modelo `gemini-1.5-flash` con el paquete `@google/generative-ai`. Puedes modificar la configuración en `src/routes/gemini.ts`:

```typescript
const model = 'gemini-1.5-flash'; // Modelo actual (compatible con API keys)

const generationConfig = {
  maxOutputTokens: 8192,    // Máximo de tokens en la respuesta
  temperature: 1,            // Creatividad (0-2, mayor = más creativo)
  topP: 0.95,               // Diversidad de respuestas
};
```

### Modelos Disponibles con OAuth2

- `gemini-2.5-flash-preview-09-2025` - Modelo más reciente con análisis de video avanzado **(ACTUAL)**
- `gemini-1.5-pro` - Más potente pero más lento
- `gemini-1.5-pro-latest` - Última versión de pro

### Capacidades de Gemini 2.5 Flash Preview

- ✅ Análisis de video multimodal avanzado (visual + audio)
- ✅ Hasta 8,192 tokens de salida (suficiente para posts detallados)
- ✅ Procesamiento muy rápido y eficiente
- ✅ Requiere OAuth2 con Service Account
- ✅ Análisis profundo de contenido visual y movimientos
- ✅ Comprensión avanzada de audio y texto en video
- ✅ Modelo preview con capacidades mejoradas

**Nota**: Gemini 2.5 Flash Preview es el modelo más reciente disponible con OAuth2 en la API v1beta, perfecto para análisis de video avanzado y generación de contenido para redes sociales.

## 🎨 Uso de la Funcionalidad

### En el Modal de Publicación

1. Abre el modal de publicación desde cualquier video
2. Selecciona las redes sociales donde quieres publicar
3. Haz clic en el botón **"Generar con IA"** ✨
4. Verás el video que será analizado automáticamente por la IA
5. Completa el formulario:
   - **Público objetivo**: Define tu audiencia (edad, intereses, comportamiento)
   - **Objetivo de la publicación**: ¿Qué quieres lograr? (ventas, engagement, educación, etc.)
6. Haz clic en **"Generar Contenido"**
7. La IA:
   - Descarga y analiza el video automáticamente
   - Examina el contenido visual, audio, movimientos, colores y texto
   - Identifica los momentos más impactantes
   - Genera contenido optimizado basado en lo que ve
8. Espera unos segundos mientras la IA procesa el video y genera el contenido
9. Revisa y edita el contenido generado si es necesario
10. Los hashtags se generarán automáticamente basados en el análisis del video

### Análisis Multimodal del Video

La IA de Gemini analiza automáticamente múltiples aspectos de tu video:

- 🎬 **Contenido Visual**: Objetos, personas, productos, escenarios
- 🎨 **Colores y Estética**: Paleta de colores, iluminación, composición
- 🎭 **Acciones y Movimientos**: Lo que sucede en el video, transiciones
- 📝 **Texto en Pantalla**: Títulos, subtítulos, gráficos de texto
- 🔊 **Audio**: Música, diálogos, efectos de sonido
- ⏱️ **Ritmo y Duración**: Tempo del video, momentos clave
- 😊 **Emociones**: Tono general (alegre, serio, inspirador, educativo)

### Prompts Personalizados por Plataforma

El sistema genera contenido optimizado específicamente para cada plataforma basándose en el análisis del video:

- **TikTok**: Textos cortos, directos y magnéticos con 5-7 hashtags relevantes al contenido del video
- **Instagram**: Captions envolventes con storytelling y 8-12 hashtags específicos a lo que se ve en el video
- **Facebook**: Contenido conversacional que fomenta la discusión con 3-5 hashtags relacionados con el video

## 🎥 Procesamiento de Videos

### Cómo Funciona

El sistema procesa los videos de la siguiente manera:

1. **Descarga**: El video se descarga desde la URL proporcionada
2. **Conversión**: Se convierte a formato base64 para enviarlo a Gemini
3. **Análisis**: Gemini analiza el video completo (visual + audio)
4. **Generación**: Crea contenido basado en lo que observó

### Limitaciones de Tamaño

Ten en cuenta las siguientes limitaciones:

- **Tamaño máximo**: Aproximadamente 20-30 MB (depende del modelo)
- **Duración recomendada**: Videos de menos de 2 minutos funcionan mejor
- **Formatos soportados**: MP4, MOV, AVI, WEBM
- **Tiempo de procesamiento**: Videos más largos tardan más en procesarse

**Nota**: Si tu video es muy grande, considera comprimirlo o usar una versión de menor resolución.

## 📊 Monitoreo y Límites

### Cuotas de la API

Google Cloud tiene cuotas gratuitas y de pago:

1. Ve a [Google Cloud Console > IAM y Administración > Cuotas](https://console.cloud.google.com/iam-admin/quotas)
2. Busca "Generative Language API"
3. Verifica tus límites actuales y uso

### Límites Gratuitos Típicos

- **Solicitudes por minuto**: 15-60 (según el modelo)
- **Tokens por día**: Variable según el plan
- **Solicitudes por día**: 1,500 (aproximadamente)

**Nota**: Los límites pueden variar. Verifica en la consola de Google Cloud.

## 🐛 Solución de Problemas

### Error: "GOOGLE_CLOUD_API_KEY no está configurada"

**Solución**: Asegúrate de haber configurado la variable de entorno correctamente y reiniciado la aplicación.

### Error: "API key not valid"

**Solución**: 
- Verifica que la API key sea correcta
- Asegúrate de que la Generative Language API esté habilitada
- Revisa las restricciones de la API key

### Error: "Quota exceeded"

**Solución**: 
- Has excedido tu cuota gratuita
- Espera a que se renueve (usualmente cada 24 horas)
- Considera actualizar a un plan de pago

### El botón "Generar con IA" no aparece

**Solución**:
- Verifica que la variable de entorno esté configurada
- Revisa la consola del navegador para errores
- Asegúrate de que el servicio de Gemini esté importado correctamente

### El contenido generado no es relevante

**Solución**:
- Define mejor tu público objetivo (edad, intereses específicos)
- Sé más específico con el objetivo de la publicación (usa objetivos medibles)
- Asegúrate de que el video sea claro y tenga contenido relevante
- Prueba ajustar la `temperature` en la configuración (valores más bajos = más conservador)

### Error: "No se pudo cargar el video"

**Solución**:
- Verifica que la URL del video sea accesible públicamente
- Asegúrate de que el video no esté protegido por autenticación
- Revisa que el formato del video sea compatible (MP4, MOV, etc.)
- Verifica tu conexión a internet

### Error: "Video demasiado grande"

**Solución**:
- Comprime el video a una resolución menor (720p o 480p)
- Reduce la duración del video (menos de 2 minutos recomendado)
- Usa un formato más eficiente (MP4 con H.264)
- Considera usar una herramienta de compresión de video

### La IA tarda mucho en responder

**Solución**:
- Es normal para videos largos o de alta resolución
- Espera pacientemente (puede tomar 30-60 segundos)
- Considera usar videos más cortos
- Verifica tu velocidad de internet

## 🔒 Mejores Prácticas de Seguridad

1. **Nunca subas tu API key al repositorio**
   - Usa `.env` y agrégalo a `.gitignore`
   - Usa variables de entorno en producción

2. **Restringe tu API key**
   - Configura restricciones de dominio o IP
   - Limita a solo las APIs necesarias

3. **Monitorea el uso**
   - Revisa regularmente el uso en Google Cloud Console
   - Configura alertas de cuota

4. **Rota las claves regularmente**
   - Cambia tu API key cada 3-6 meses
   - Si sospechas que fue comprometida, créala de nuevo inmediatamente

5. **Usa diferentes claves para diferentes entornos**
   - Una clave para desarrollo
   - Otra clave para producción

## 📞 Soporte

Si tienes problemas con la configuración de Gemini AI:

1. Revisa la documentación oficial: [Google AI Studio](https://ai.google.dev/)
2. Verifica los logs de la consola del navegador
3. Consulta la documentación del proyecto
4. Abre un issue en el repositorio

## 📚 Recursos Adicionales

- [Documentación de Gemini API](https://ai.google.dev/docs)
- [Google Cloud Console](https://console.cloud.google.com/)
- [Pricing de Gemini API](https://ai.google.dev/pricing)
- [Ejemplos de Código](https://ai.google.dev/tutorials)

