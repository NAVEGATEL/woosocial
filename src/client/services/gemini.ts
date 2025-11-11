import { apiService } from './api';

interface GenerateContentParams {
  platform: 'tiktok' | 'instagram' | 'facebook';
  videoUrl: string;
  targetAudience: string;
  postGoal: string;
  productName?: string;
  productDescription?: string;
}

interface ParsedContent {
  text: string;
  hashtags: string[];
  cta: string;
}

export const generateSocialContent = async (params: GenerateContentParams): Promise<ParsedContent> => {
  try {
    console.log('Enviando solicitud al backend para generar contenido con IA...');
    
    const response = await apiService.generateSocialContentWithAI(params);
    
    if (response.success && response.data) {
      console.log('Contenido generado exitosamente');
      return response.data;
    } else {
      throw new Error(response.message || 'Error al generar contenido');
    }
  } catch (error: any) {
    console.error('Error al generar contenido con Gemini:', error);
    throw new Error(error.message || 'Error al generar contenido con IA');
  }
};

export const generateSocialContentStream = async (
  params: GenerateContentParams,
  onChunk: (text: string) => void
): Promise<void> => {
  // Por ahora, usamos la versión sin streaming
  // En el futuro se puede implementar streaming con Server-Sent Events
  const result = await generateSocialContent(params);
  onChunk(JSON.stringify(result));
};
