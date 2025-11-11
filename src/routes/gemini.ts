import express, { Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import fetch from 'node-fetch';
import { GoogleAuth } from 'google-auth-library';

const router = express.Router();

const model = 'gemini-2.5-flash-preview-09-2025';

const generationConfig = {
  maxOutputTokens: 65535,  // Gemini 2.5 soporta hasta 65k tokens
  temperature: 1,
  topP: 0.95,
};

// Obtener access token con OAuth2
async function getAccessToken(): Promise<string> {
  try {
    const auth = new GoogleAuth({
      scopes: [
        'https://www.googleapis.com/auth/generative-language.tuning',
        'https://www.googleapis.com/auth/generative-language.retriever',
      ],
    });
    
    const client = await auth.getClient();
    const accessToken = await client.getAccessToken();
    
    if (!accessToken.token) {
      throw new Error('No se pudo obtener access token');
    }
    
    console.log('✅ Access token obtenido con OAuth2');
    return accessToken.token;
  } catch (error: any) {
    console.error('❌ Error al obtener access token:', error.message);
    throw new Error(
      'OAuth2 no configurado. Necesitas:\n' +
      '1. Habilitar "Generative Language API" en Google Cloud\n' +
      '2. Crear un Service Account con rol "Vertex AI User"\n' +
      '3. Descargar el archivo JSON de credenciales\n' +
      '4. Configurar GOOGLE_APPLICATION_CREDENTIALS=ruta/al/archivo.json'
    );
  }
}

// Función para descargar video y convertir a base64
async function downloadVideoAsBase64(url: string): Promise<{ inlineData: { data: string; mimeType: string } }> {
  try {
    console.log('Descargando video desde:', url);
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Error al descargar el video: ${response.statusText}`);
    }
    
    const buffer = await response.buffer();
    const base64Data = buffer.toString('base64');
    
    // Determinar el tipo MIME desde los headers o usar por defecto
    const contentType = response.headers.get('content-type') || 'video/mp4';
    
    console.log('Video descargado exitosamente. Tamaño:', buffer.length, 'bytes');
    
    return {
      inlineData: {
        data: base64Data,
        mimeType: contentType
      }
    };
  } catch (error: any) {
    console.error('Error al descargar video:', error);
    throw new Error(`No se pudo descargar el video: ${error.message}`);
  }
}

// Prompts por plataforma
const platformPrompts = {
  tiktok: (params: any) => `
Analiza el video que te he proporcionado y crea una publicación optimizada para TikTok.

Público objetivo: ${params.targetAudience}
Objetivo de la publicación: ${params.postGoal}
${params.productName ? `Producto: ${params.productName}` : ''}
${params.productDescription ? `Descripción del producto: ${params.productDescription}` : ''}

Sigue estas instrucciones paso a paso para completar la tarea:

1. **Análisis Profundo del Video:** Examina detenidamente el video que te he enviado. Identifica:
   - Los momentos más impactantes y memorables
   - El mensaje principal que transmite
   - Los elementos visuales clave (colores, movimientos, personas, productos)
   - El tono general del video (serio, divertido, educativo, emocional)
   - La duración y ritmo del video
   - Cualquier texto o audio presente

2. **Estrategia de Contenido:** Basándote en tu análisis del video y en tu conocimiento de las tendencias actuales de TikTok, define el mejor ángulo o enfoque para presentar este contenido. Piensa en qué formato (ej. storytime, reto, educativo, humorístico, antes/después) resonará más con la audiencia definida.

3. **Creación del Post:** Desarrolla todos los componentes de la publicación de TikTok.
   * **Texto del Post:** Escribe un texto (copy) corto, directo y magnético que complemente lo que se ve en el video. Utiliza un lenguaje que conecte con el público objetivo. Puedes incluir preguntas para fomentar la interacción o crear curiosidad.
   * **Hashtags:** Genera una lista de 5 a 7 hashtags relevantes. Combina hashtags populares y de nicho relacionados con lo que se ve en el video para maximizar el alcance y la relevancia.
   * **Llamada a la Acción (CTA):** Formula una llamada a la acción clara y directa que esté alineada con el objetivo (por ejemplo, "Síguenos para más", "Comenta tu opinión", "Visita el enlace en la bio").

4. **Formato de Salida:** Estructura tu respuesta final utilizando el siguiente formato, sin añadir texto introductorio adicional.

### Propuesta de Post para TikTok

**Texto del Post:**
[Aquí va el texto que has creado para la publicación]

**Hashtags Sugeridos:**
* #hashtag1
* #hashtag2
* #hashtag3
* #hashtag4
* #hashtag5

**Llamada a la Acción (CTA):**
[Aquí va la llamada a la acción que has formulado]
`,

  instagram: (params: any) => `
Analiza el video que te he proporcionado y crea una publicación optimizada para Instagram Reels.

Público objetivo: ${params.targetAudience}
Objetivo de la publicación: ${params.postGoal}
${params.productName ? `Producto: ${params.productName}` : ''}
${params.productDescription ? `Descripción del producto: ${params.productDescription}` : ''}

Sigue estas instrucciones paso a paso para completar la tarea:

1. **Análisis Profundo del Video:** Examina detenidamente el video que te he enviado. Identifica:
   - Los momentos más impactantes y memorables
   - El mensaje principal y la narrativa
   - Los elementos visuales clave y la estética
   - El tono general del video
   - Oportunidades para storytelling
   - Cualquier elemento que pueda resonar emocionalmente

2. **Estrategia de Contenido:** Basándote en tu análisis del video y en tu conocimiento de las tendencias actuales de Instagram Reels, define el mejor ángulo o enfoque. Piensa en qué estilo (lifestyle, educativo, inspiracional, entretenimiento) resonará más con la audiencia de Instagram.

3. **Creación del Post:** Desarrolla todos los componentes de la publicación de Instagram.
   * **Caption:** Escribe un caption atractivo y envolvente que complemente lo que se ve en el video. Instagram permite textos más largos, así que puedes contar una historia o dar más contexto. Usa emojis estratégicamente para hacer el contenido más visual y break up el texto.
   * **Hashtags:** Genera una lista de 8 a 12 hashtags relevantes a lo que se ve en el video. Mezcla hashtags con alto volumen, medio y específicos de nicho. En Instagram los hashtags son cruciales para el alcance.
   * **Llamada a la Acción (CTA):** Formula una llamada a la acción que invite a la interacción (por ejemplo, "Guarda este reel para después", "Comparte con alguien que lo necesite", "Síguenos para más contenido así", "Comenta tu opinión").

4. **Formato de Salida:** Estructura tu respuesta final utilizando el siguiente formato, sin añadir texto introductorio adicional.

### Propuesta de Post para Instagram

**Caption:**
[Aquí va el texto que has creado para la publicación]

**Hashtags Sugeridos:**
* #hashtag1
* #hashtag2
* #hashtag3
* #hashtag4
* #hashtag5
* #hashtag6
* #hashtag7
* #hashtag8

**Llamada a la Acción (CTA):**
[Aquí va la llamada a la acción que has formulado]
`,

  facebook: (params: any) => `
Analiza el video que te he proporcionado y crea una publicación optimizada para Facebook.

Público objetivo: ${params.targetAudience}
Objetivo de la publicación: ${params.postGoal}
${params.productName ? `Producto: ${params.productName}` : ''}
${params.productDescription ? `Descripción del producto: ${params.productDescription}` : ''}

Sigue estas instrucciones paso a paso para completar la tarea:

1. **Análisis Profundo del Video:** Examina detenidamente el video que te he enviado. Identifica:
   - Los momentos más impactantes y memorables
   - El mensaje principal y temas de conversación potenciales
   - Los elementos visuales clave
   - El tono general del video
   - Aspectos que puedan generar debate o discusión
   - Elementos comunitarios o sociales presentes

2. **Estrategia de Contenido:** Basándote en tu análisis del video y en tu conocimiento de las dinámicas de Facebook, define el mejor ángulo o enfoque. Facebook favorece el contenido que genera conversación y engagement comunitario, así que enfócate en crear un texto que invite a la participación.

3. **Creación del Post:** Desarrolla todos los componentes de la publicación de Facebook.
   * **Texto del Post:** Escribe un texto conversacional y cercano que complemente lo que se ve en el video. Facebook permite textos más largos y detallados. Usa un tono que invite a la discusión y la participación. Puedes estructurarlo con párrafos y usar emojis moderadamente para hacer el texto más amigable.
   * **Hashtags:** Genera una lista de 3 a 5 hashtags relevantes a lo que se ve en el video. En Facebook los hashtags son menos importantes que en otras plataformas, así que usa solo los más relevantes y populares.
   * **Llamada a la Acción (CTA):** Formula una llamada a la acción que fomente la interacción social (por ejemplo, "¿Qué opinas?", "Comparte tu experiencia en los comentarios", "Etiqueta a alguien que necesita ver esto", "Cuéntanos en los comentarios").

4. **Formato de Salida:** Estructura tu respuesta final utilizando el siguiente formato, sin añadir texto introductorio adicional.

### Propuesta de Post para Facebook

**Texto del Post:**
[Aquí va el texto que has creado para la publicación]

**Hashtags Sugeridos:**
* #hashtag1
* #hashtag2
* #hashtag3

**Llamada a la Acción (CTA):**
[Aquí va la llamada a la acción que has formulado]
`
};

// Función para parsear la respuesta de Gemini
function parseGeminiResponse(response: string): any {
  const lines = response.split('\n');
  let text = '';
  let hashtags: string[] = [];
  let cta = '';
  
  let currentSection = '';
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    
    if (trimmedLine.includes('**Texto del Post:**') || trimmedLine.includes('**Caption:**')) {
      currentSection = 'text';
      continue;
    } else if (trimmedLine.includes('**Hashtags Sugeridos:**')) {
      currentSection = 'hashtags';
      continue;
    } else if (trimmedLine.includes('**Llamada a la Acción')) {
      currentSection = 'cta';
      continue;
    }
    
    if (currentSection === 'text' && trimmedLine && !trimmedLine.startsWith('#')) {
      text += (text ? '\n' : '') + trimmedLine;
    } else if (currentSection === 'hashtags' && trimmedLine.startsWith('*')) {
      const hashtag = trimmedLine.replace(/^\*\s*/, '').trim();
      if (hashtag && hashtag.startsWith('#')) {
        hashtags.push(hashtag);
      }
    } else if (currentSection === 'cta' && trimmedLine) {
      cta += (cta ? ' ' : '') + trimmedLine;
    }
  }
  
  return {
    text: text.trim(),
    hashtags,
    cta: cta.trim()
  };
}

// POST /api/gemini/generate-content
router.post('/generate-content', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { platform, videoUrl, targetAudience, postGoal, productName, productDescription }: {
      platform: string;
      videoUrl: string;
      targetAudience: string;
      postGoal: string;
      productName?: string;
      productDescription?: string;
    } = req.body;
    
    // Validar parámetros requeridos
    if (!platform || !videoUrl || !targetAudience || !postGoal) {
      return res.status(400).json({
        success: false,
        message: 'Faltan parámetros requeridos: platform, videoUrl, targetAudience, postGoal'
      });
    }
    
    // Validar plataforma
    if (!['tiktok', 'instagram', 'facebook'].includes(platform)) {
      return res.status(400).json({
        success: false,
        message: 'Plataforma no válida. Debe ser: tiktok, instagram o facebook'
      });
    }
    
    console.log(`Generando contenido para ${platform}...`);
    console.log('URL del video:', videoUrl);
    
    // Obtener el prompt para la plataforma
    const promptFunction = platformPrompts[platform as keyof typeof platformPrompts];
    const prompt: string = promptFunction({
      targetAudience,
      postGoal,
      productName,
      productDescription
    });
    
    // Descargar el video y convertirlo a base64
    console.log('📥 Descargando video...');
    const videoPart = await downloadVideoAsBase64(videoUrl);
    
    // Obtener access token con OAuth2
    console.log('🔐 Obteniendo access token...');
    const accessToken = await getAccessToken();
    
    console.log(`🤖 Enviando video y prompt a Gemini AI (modelo: ${model})...`);
    
    // Hacer petición HTTP REST a la API de Gemini con OAuth2
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
    
    const requestBody = {
      contents: [
        {
          parts: [
            { text: prompt },
            videoPart
          ]
        }
      ],
      generationConfig: generationConfig
    };
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Error de Gemini API (${response.status}): ${errorText}`);
    }
    
    const result = await response.json();
    const textResponse = result.candidates[0].content.parts[0].text;
    
    console.log('Respuesta de Gemini recibida');
    
    // Parsear la respuesta
    const parsedContent = parseGeminiResponse(textResponse);
    
    return res.json({
      success: true,
      data: parsedContent
    });
    
  } catch (error: any) {
    console.error('Error al generar contenido con Gemini:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Error al generar contenido con IA'
    });
  }
});

export default router;

