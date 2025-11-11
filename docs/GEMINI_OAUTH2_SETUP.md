# Configuración de OAuth2 para Gemini con Video

**⚠️ IMPORTANTE**: Para usar análisis de video con Gemini, necesitas configurar OAuth2 con Service Account. Las API Keys simples NO funcionan con video.

## 🎯 ¿Por qué OAuth2?

La API de Gemini usa dos endpoints diferentes:
- `/v1/models/*` - Acepta API Keys (solo texto e imágenes)
- `/v1beta/models/*` - Requiere OAuth2 (para video multimodal)

Cuando envías video, automáticamente se usa `v1beta` que requiere OAuth2.

## 📋 Requisitos

- Cuenta de Google Cloud
- Proyecto de Google Cloud (ej: `drive-navegatime`)
- Permisos de administrador en el proyecto

## 🚀 Guía Paso a Paso

### Paso 1: Habilitar APIs Necesarias

1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Selecciona tu proyecto (`drive-navegatime`)
3. Ve a **APIs y Servicios > Biblioteca**
4. Busca y habilita:
   - ✅ **Generative Language API**
   - ✅ **Vertex AI API** (opcional pero recomendado)

### Paso 2: Crear Service Account

1. Ve a **IAM y Administración > Cuentas de servicio**
2. Haz clic en **+ CREAR CUENTA DE SERVICIO**
3. Completa:
   - **Nombre**: `gemini-video-service`
   - **ID**: Se genera automáticamente
   - **Descripción**: `Service Account para Gemini AI con video`
4. Haz clic en **CREAR Y CONTINUAR**

### Paso 3: Asignar Permisos

Asigna estos roles (elige UNO de estos):

**Opción A - Rol Específico (Recomendado)**:
- `Vertex AI User` o `AI Platform User`

**Opción B - Rol Amplio** (si la Opción A no funciona):
- `Editor` del proyecto

Haz clic en **CONTINUAR** y luego **LISTO**

### Paso 4: Crear y Descargar Clave JSON

1. En la lista de Service Accounts, encuentra la que creaste
2. Haz clic en el **nombre** de la cuenta
3. Ve a la pestaña **CLAVES**
4. Haz clic en **AGREGAR CLAVE** → **Crear clave nueva**
5. Selecciona tipo **JSON**
6. Haz clic en **CREAR**

Se descargará un archivo similar a:
```
drive-navegatime-abc123def456.json
```

⚠️ **MUY IMPORTANTE**: Este archivo contiene credenciales privadas. Nunca lo subas a Git.

### Paso 5: Guardar el Archivo Correctamente

**Windows**:
```powershell
# Crea una carpeta para credenciales fuera del proyecto
mkdir C:\credentials
# Mueve el archivo allí
move .\drive-navegatime-*.json C:\credentials\gemini-service-account.json
```

**Linux/macOS**:
```bash
# Crea una carpeta para credenciales fuera del proyecto
mkdir -p ~/credentials
# Mueve el archivo allí
mv ~/Downloads/drive-navegatime-*.json ~/credentials/gemini-service-account.json
```

### Paso 6: Configurar Variable de Entorno

Agrega esta línea a tu archivo `.env` en la raíz del proyecto:

**Opción A - Ruta Relativa (Recomendada)**:
```env
GOOGLE_APPLICATION_CREDENTIALS=src/services/drive/drive-navegatime-9e3d81ffbb7d.json
```

**Opción B - Ruta Absoluta**:
```env
# Windows
GOOGLE_APPLICATION_CREDENTIALS=C:\credentials\gemini-service-account.json

# Linux/macOS
GOOGLE_APPLICATION_CREDENTIALS=/home/usuario/credentials/gemini-service-account.json
```

**Nota**: La ruta relativa se resuelve desde la raíz del proyecto.

### Paso 7: Reiniciar el Servidor

Es **crítico** reiniciar el servidor después de configurar la variable:

```bash
# Detén el servidor (Ctrl+C)
# Reinicia
npm run dev
```

### Paso 8: Verificar la Configuración

Cuando generes contenido, deberías ver en los logs:

```
✅ Access token obtenido con OAuth2
🤖 Enviando video y prompt a Gemini AI...
```

Si ves esto, ¡está funcionando! 🎉

## 🔍 Verificación Adicional

Para verificar que el Service Account está configurado:

1. **Verifica que el archivo existe**:
   ```bash
   # Windows
   dir C:\credentials\gemini-service-account.json
   
   # Linux/macOS
   ls ~/credentials/gemini-service-account.json
   ```

2. **Verifica el contenido del JSON** (debe tener estos campos):
   ```json
   {
     "type": "service_account",
     "project_id": "drive-navegatime",
     "private_key_id": "...",
     "private_key": "-----BEGIN PRIVATE KEY-----\n...",
     "client_email": "gemini-video-service@drive-navegatime.iam.gserviceaccount.com",
     ...
   }
   ```

3. **Verifica la variable de entorno**:
   ```bash
   # Windows PowerShell
   echo $env:GOOGLE_APPLICATION_CREDENTIALS
   
   # Linux/macOS
   echo $GOOGLE_APPLICATION_CREDENTIALS
   ```

## 🐛 Solución de Problemas

### Error: "OAuth2 no configurado"

**Causa**: No se encuentra el archivo de credenciales.

**Solución**:
1. Verifica que `GOOGLE_APPLICATION_CREDENTIALS` esté en `.env`
2. Verifica que la ruta sea correcta y absoluta
3. Verifica que el archivo existe en esa ruta
4. Reinicia el servidor

### Error: "Error al obtener access token"

**Causa**: El Service Account no tiene permisos.

**Solución**:
1. Ve a Google Cloud Console
2. IAM y Administración → IAM
3. Encuentra tu Service Account
4. Asegúrate de que tiene el rol "Vertex AI User" o "Editor"
5. Si no lo tiene, haz clic en el lápiz y agrégalo

### Error: "Permission denied"

**Causa**: APIs no habilitadas o permisos incorrectos.

**Solución**:
1. Habilita "Generative Language API" en Google Cloud
2. Espera 5-10 minutos después de habilitar
3. Verifica los permisos del Service Account

### La descarga del video funciona pero la IA falla

**Causa**: El access token puede haber expirado o es inválido.

**Solución**:
- Los tokens se obtienen automáticamente en cada request
- Verifica los logs para ver el error específico
- Asegúrate de que el proyecto de Google Cloud es el correcto

## 🔒 Seguridad

### ✅ Buenas Prácticas

1. **Archivo fuera del repositorio**:
   ```
   ❌ ./gemini-service-account.json
   ✅ C:\credentials\gemini-service-account.json
   ```

2. **Nunca commites el JSON**:
   - Agrégalo a `.gitignore`
   - Verifica con `git status` antes de commit

3. **Rota las claves regularmente**:
   - Cada 90 días recomendado
   - Crea nueva clave antes de eliminar la antigua

4. **Permisos mínimos**:
   - Usa roles específicos, no "Owner"
   - Solo "Vertex AI User" es suficiente

5. **Diferentes cuentas por entorno**:
   - Service Account para desarrollo
   - Service Account diferente para producción

### ❌ Nunca Hagas Esto

- ❌ Subir el JSON a Git
- ❌ Enviar el JSON por email/chat
- ❌ Compartir el JSON públicamente
- ❌ Usar rol "Owner" innecesariamente
- ❌ Reutilizar la misma cuenta en múltiples proyectos

## 🎉 Resultado Final

Una vez configurado correctamente:

- ✅ Análisis de video multimodal funcionando
- ✅ OAuth2 automático y transparente
- ✅ Sin necesidad de API Keys para video
- ✅ Acceso a los modelos más avanzados
- ✅ Sin límites de cuota de API Keys

## 📚 Recursos Adicionales

- [Service Accounts - Google Cloud](https://cloud.google.com/iam/docs/service-accounts)
- [Gemini API Documentation](https://ai.google.dev/docs)
- [OAuth2 with Service Accounts](https://cloud.google.com/docs/authentication/production)

## ⚡ Resumen Rápido

```bash
# 1. Crea Service Account en Google Cloud
# 2. Descarga el JSON
# 3. Guárdalo en una ubicación segura
# 4. Configura en .env:
GOOGLE_APPLICATION_CREDENTIALS=C:\credentials\gemini-service-account.json

# 5. Reinicia el servidor
npm run dev

# 6. ¡Listo para analizar videos! 🎥
```

¿Problemas? Revisa los logs del servidor para ver el error específico.

