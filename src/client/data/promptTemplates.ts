export interface PromptTemplate {
  id: string;
  name: string;
  category: string;
  template: string;
  description: string;
  variables: string[];
  // Instrucciones de sistema para el generador (no visibles al usuario)
  system?: string;
}

export const promptTemplates: PromptTemplate[] = [
  {
    id: 'fashion-seasonal-sale-minimal',
    name: 'Moda | Seasonal Sale Minimal',
    category: 'video',
    description: 'Presentación de producto inanimado sobre fondo blanco, estilo cinematográfico minimalista para rebajas de moda (9:16, 24 fps).',
    variables: [],
    template:
      'No alteres ni reemplaces el producto de la imagen. Mantén forma, color, textura, proporciones y materiales EXACTOS. No inventes variantes. No añadas ni remuevas logos o marcas.\n' +
      'No muestres texto en pantalla (sin títulos, captions, lower-thirds, subtítulos, marcas de agua).\n' +
      'No añadas elementos ajenos ni props. Mantén fondo blanco puro, sombras suaves homogéneas.\n' +
      'Prohibido incluir personas o partes del cuerpo. Solo objeto inanimado.\n' +
      'Respeta la relación de aspecto y la resolución especificadas.\n\n' +
      'Target: sobre esta imagen, presentado sobre fondo blanco limpio. Sin modelo; solo el artículo inanimado.\n' +
      'Theme: Seasonal Sale / Rebajas de Moda.\n' +
      'Style: Cinematic, Minimalist, Clean Composition, Steady Rhythm.\n' +
      'Lighting: Homogeneous studio lighting, very soft shadows.\n' +
      'Format: 9:16 (Vertical), 1080×1920, 24 fps.\n' +
      'Audio: Subtle ambient fashion tones, soft technological SFX, minimal.\n\n' +
      'Scene\n' +
      '1: Presentation 0–2s\n' +
      '[Prenda/objeto detectado] perfectamente compuesto y centrado sobre blanco puro, como en maniquí invisible o flat lay.\n' +
      'Focus: FULL — Inanimate.\n' +
      'Notas / Cámara: 0.5–2.0s: Push-in vertical súper lento o órbita 360° suave. Enfoque nítido en todos los elementos.\n\n' +
      '2: Details 2–5s\n' +
      'Secuencia breve de macro/close-up sobre [textura principal, materiales] y [2–3 detalles: p.ej., botones/hebilla/cuello/costuras/bolsillos/suela].\n' +
      'Focus: Inanimate Texture & Quality.\n' +
      'Notas / Cámara:\n' +
      '2.0–2.7s: Macro [detalle 1] (DOF muy bajo).\n' +
      '2.7–3.4s: Macro [detalle 2] (DOF muy bajo).\n' +
      '3.4–4.1s: Macro [detalle 3] (DOF muy bajo).\n' +
      '4.1–5.0s: Macro [detalle 4 opcional] (DOF muy bajo).\n\n' +
      '3: Highlight 5–7s\n' +
      'Vuelve al plano completo o casi completo de la escena 1.'
  },
  {
    id: 'tech-product-launch-clean',
    name: 'Tech | Product Launch Clean',
    category: 'video',
    description: 'Lanzamiento de producto tecnológico sobre fondo blanco, ritmo sereno, acentos SFX futuristas (9:16, 24 fps).',
    variables: [],
    template:
      'No alteres ni reemplaces el producto. Mantén forma, color, materiales y proporciones EXACTAS.\n' +
      'Prohibido cualquier texto en pantalla.\n' +
      'Sin manos/personas. Fondo blanco, sin props añadidos.\n' +
      'Respeta formato y fps.\n\n' +
      'Target: sobre esta imagen, dispositivo/artefacto presentado sobre fondo blanco limpio. Sin mano/usuario.\n' +
      'Theme: Tech Launch / Innovación.\n' +
      'Style: Cinematic, Minimalist, Geometric Framing, Clean Typo Space.\n' +
      'Lighting: Soft key + fill homogéneo, sombras ultra suaves.\n' +
      'Format: 9:16 (Vertical), 1080×1920, 24 fps.\n' +
      'Audio: Ambient futurista sutil, bips tecnológicos mínimos.\n\n' +
      'Scene\n' +
      '1: Presentation 0–2s\n' +
      '[Producto tecnológico] centrado, con leve giro en eje Y.\n' +
      'Focus: FULL — Inanimate.\n' +
      'Notas / Cámara: Push-in muy lento, micro-parallax.\n\n' +
      '2: Details 2–5s\n' +
      'Macros de [característica 1], [característica 2], [característica 3].\n' +
      'Focus: Precision & Finish.\n' +
      'Notas / Cámara: DOF muy bajo, iluminación controlada para brillos.\n\n' +
      '3: Highlight 5–7s\n' +
      'Regreso a plano casi completo con giro suave 360°.'
  },
  {
    id: 'beauty-skincare-soft',
    name: 'Beauty | Skincare Soft',
    category: 'video',
    description: 'Producto de belleza/cuidados con estética suave, luz homogénea y macros de textura (9:16, 24 fps).',
    variables: [],
    template:
      'No modifiques el envase ni sus colores/etiquetas. Mantén el producto EXACTO.\n' +
      'No texto en pantalla.\n' +
      'Sin props añadidos ni manos/personas. Fondo blanco.\n\n' +
      'Target: sobre esta imagen, cosmético o skincare sobre blanco puro, sin modelo.\n' +
      'Theme: Clean Beauty / Pure.\n' +
      'Style: Soft Cinematic, Minimalist, Gentle Motion.\n' +
      'Lighting: Homogeneous diffused, sombras sedosas.\n' +
      'Format: 9:16 (Vertical), 1080×1920, 24 fps.\n' +
      'Audio: Ambient calm, sutiles chimes.\n\n' +
      'Scene\n' +
      '1: Presentation 0–2s\n' +
      '[Producto] centrado, composición limpia.\n' +
      'Notas / Cámara: Push-in lento.\n\n' +
      '2: Details 2–5s\n' +
      'Macro de [textura principal, materiales] y [detalle 1], [detalle 2], [detalle 3].\n' +
      'Notas / Cámara: DOF muy bajo, reflejos suaves.\n\n' +
      '3: Highlight 5–7s\n' +
      'Plano casi completo con leve tilt-up.'
  },
  {
    id: 'footwear-studio-dynamic',
    name: 'Footwear | Studio Dynamic',
    category: 'video',
    description: 'Calzado con énfasis en suela, costuras y materiales; ritmo sobrio y limpio (9:16, 24 fps).',
    variables: [],
    template:
      'No alteres diseño, colorway ni branding del calzado. Mantén el producto EXACTO.\n' +
      'Sin texto en pantalla.\n' +
      'Sin props añadidos. Fondo blanco.\n\n' +
      'Target: sobre esta imagen, zapatilla/bota sobre fondo blanco limpio.\n' +
      'Theme: Footwear Craft / Performance.\n' +
      'Style: Cinematic Minimal, Clean Angles, Rhythm steady.\n' +
      'Lighting: Soft top light + fill, sombras ligeras.\n' +
      'Format: 9:16 (Vertical), 1080×1920, 24 fps.\n' +
      'Audio: Pulsos discretos, texturas suaves.\n\n' +
      'Scene\n' +
      '1: Presentation 0–2s\n' +
      '[Prenda/objeto detectado] centrado, leve rotación.\n\n' +
      '2: Details 2–5s\n' +
      'Macros: [detalle 1: suela], [detalle 2: costura], [detalle 3: material], [detalle 4 opcional: logo].\n\n' +
      '3: Highlight 5–7s\n' +
      'Plano completo con órbita 360° suave.'
  },
  {
    id: 'home-decor-elevated-minimal',
    name: 'Home Decor | Elevated Minimal',
    category: 'video',
    description: 'Objetos de hogar/decoración con enfoque en materiales, textura y forma (9:16, 24 fps).',
    variables: [],
    template:
      'No modifiques el objeto ni sus materiales/colores.\n' +
      'Prohibido texto en pantalla.\n' +
      'Fondo blanco sin elementos extra.\n\n' +
      'Target: sobre esta imagen, objeto decorativo sobre blanco puro.\n' +
      'Theme: Elevated Minimal Home.\n' +
      'Style: Calm Cinematic, Balanced Framing.\n' +
      'Lighting: Studio soft omni, sombras muy suaves.\n' +
      'Format: 9:16 (Vertical), 1080×1920, 24 fps.\n' +
      'Audio: Ambient cálido, sutiles pads.\n\n' +
      'Scene\n' +
      '1: Presentation 0–2s\n' +
      '[Producto] centrado, composición simétrica.\n\n' +
      '2: Details 2–5s\n' +
      'Macro: [textura principal], [detalle 1], [detalle 2], [detalle 3].\n\n' +
      '3: Highlight 5–7s\n' +
      'Plano completo con pequeño push-in.'
  },
  {
    id: 'luxury-product-gentle-gloss',
    name: 'Luxury | Gentle Gloss',
    category: 'video',
    description: 'Producto premium con reflejos controlados y tempo elegante (9:16, 24 fps).',
    variables: [],
    template:
      'Mantén el producto premium EXACTO (forma, color, acabados).\n' +
      'Cero texto en pantalla.\n' +
      'Sin props extra. Fondo blanco.\n\n' +
      'Target: sobre esta imagen, artículo de lujo sobre blanco brillante controlado.\n' +
      'Theme: Luxury Minimal.\n' +
      'Style: Cinematic, Refined, Slow Motion Feel.\n' +
      'Lighting: Soft wrap-around, highlights sutiles.\n' +
      'Format: 9:16 (Vertical), 1080×1920, 24 fps.\n' +
      'Audio: Ambient elegante, notas cristalinas.\n\n' +
      'Scene\n' +
      '1: Presentation 0–2s\n' +
      '[Producto] centrado con giro muy lento.\n\n' +
      '2: Details 2–5s\n' +
      'Macro: [detalle premium 1], [detalle premium 2], [detalle premium 3].\n\n' +
      '3: Highlight 5–7s\n' +
      'Plano casi completo con respiro visual.'
  },
  {
    id: 'streetwear-clean-energy',
    name: 'Streetwear | Clean Energy',
    category: 'video',
    description: 'Prenda streetwear con enfoque minimal en silueta y detalles icónicos (9:16, 24 fps).',
    variables: [],
    template:
      'No alterar prenda (color, gráficos, logos, cortes).\n' +
      'No texto en pantalla.\n' +
      'Fondo blanco, sin props ni personas.\n\n' +
      'Target: sobre esta imagen, prenda streetwear sobre blanco puro, sin modelo.\n' +
      'Theme: Urban Minimal / Drop.\n' +
      'Style: Clean Cinematic, Slight Pulse.\n' +
      'Lighting: Homogeneous studio soft.\n' +
      'Format: 9:16 (Vertical), 1080×1920, 24 fps.\n' +
      'Audio: Ambient con beat muy bajo.\n\n' +
      'Scene\n' +
      '1: Presentation 0–2s\n' +
      '[Prenda/objeto detectado] centrado tipo maniquí invisible.\n\n' +
      '2: Details 2–5s\n' +
      'Macro: [elemento esencial 1], [elemento esencial 2], [elemento esencial 3], [detalle 4 opcional].\n\n' +
      '3: Highlight 5–7s\n' +
      'Regresa a plano completo con leve órbita.'
  },
  {
    id: 'jewelry-sparkle-soft',
    name: 'Jewelry | Sparkle Soft',
    category: 'video',
    description: 'Joyería con brillos suaves y macros de corte/engaste (9:16, 24 fps).',
    variables: [],
    template:
      'No cambiar corte, engaste ni color del metal/piedra.\n' +
      'Sin texto en pantalla.\n' +
      'Fondo blanco, sin props añadidos.\n\n' +
      'Target: sobre esta imagen, pieza de joyería sobre blanco neutro.\n' +
      'Theme: Fine Jewelry / Sparkle.\n' +
      'Style: Minimal Cinematic, Controlled Highlights.\n' +
      'Lighting: Soft key + specular accents muy suaves.\n' +
      'Format: 9:16 (Vertical), 1080×1920, 24 fps.\n' +
      'Audio: Ambient cristalino sutil.\n\n' +
      'Scene\n' +
      '1: Presentation 0–2s\n' +
      '[Producto] centrado, pose estable.\n\n' +
      '2: Details 2–5s\n' +
      'Macro: [corte de piedra], [engaste], [acabado metal], [detalle 4 opcional].\n\n' +
      '3: Highlight 5–7s\n' +
      'Plano completo con micro-giro.'
  },
  {
    id: 'food-beverage-crisp-clean',
    name: 'Food & Beverage | Crisp Clean',
    category: 'video',
    description: 'Alimentos/bebidas con macros de textura y condensación, fondo blanco, limpio (9:16, 24 fps).',
    variables: [],
    template:
      'No modificar etiqueta/branding, color del líquido ni forma del envase.\n' +
      'Sin texto en pantalla.\n' +
      'Fondo blanco.\n\n' +
      'Target: sobre esta imagen, producto F&B sobre blanco puro.\n' +
      'Theme: Fresh & Crisp.\n' +
      'Style: Minimal Cinematic, Fresh Look.\n' +
      'Lighting: Soft wrap, highlights controlados.\n' +
      'Format: 9:16 (Vertical), 1080×1920, 24 fps.\n' +
      'Audio: Burbujas/ambiente muy sutil.\n\n' +
      'Scene\n' +
      '1: Presentation 0–2s\n' +
      '[Producto] centrado, fría/condensación si aplica.\n\n' +
      '2: Details 2–5s\n' +
      'Macro: [textura principal], [detalle 1], [detalle 2], [detalle 3].\n\n' +
      '3: Highlight 5–7s\n' +
      'Plano completo con pequeño push-in.'
  },
  {
    id: 'outdoor-gear-durable-clean',
    name: 'Outdoor Gear | Durable Clean',
    category: 'video',
    description: 'Equipo outdoor con foco en materiales y durabilidad, limpio y técnico (9:16, 24 fps).',
    variables: [],
    template:
      'No alterar materiales, colores ni branding del equipo.\n' +
      'Prohibido texto en pantalla.\n' +
      'Fondo blanco, sin props externos.\n\n' +
      'Target: sobre esta imagen, equipo outdoor sobre blanco puro.\n' +
      'Theme: Durable & Technical.\n' +
      'Style: Cinematic Minimal, Utility Focus.\n' +
      'Lighting: Soft top light, sombras suaves.\n' +
      'Format: 9:16 (Vertical), 1080×1920, 24 fps.\n' +
      'Audio: Ambient con texturas orgánicas muy leves.\n\n' +
      'Scene\n' +
      '1: Presentation 0–2s\n' +
      '[Producto] centrado, sólida presencia.\n\n' +
      '2: Details 2–5s\n' +
      'Macro: [elemento natural 1], [elemento natural 2], [característica 1], [característica 2].\n\n' +
      '3: Highlight 5–7s\n' +
      'Plano completo con órbita sutil.'
  },
];

export const getAllCategories = (): string[] => {
  const categories = new Set(promptTemplates.map(template => template.category));
  return Array.from(categories);
};

export const getTemplatesByCategory = (category: string): PromptTemplate[] => {
  return promptTemplates.filter(template => template.category === category);
};


