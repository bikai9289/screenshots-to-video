import type { FeatureType } from './inspirations-data';

export interface ModelDetail {
  name: string;
  badge?: string;
  description: string;
  credits: string;
  tag: string;
}

export const FEATURE_MODEL_DETAILS: Partial<
  Record<FeatureType, ModelDetail[]>
> = {
  'ai-image': [
    {
      name: 'Nano Banana Pro',
      badge: 'Pro 4K',
      description:
        'Crisp micro-textures, photorealistic skin and reflections with fine typography control.',
      credits: '12 Credits / Image',
      tag: 'Flagship',
    },
    {
      name: 'Qwen Image 2.0',
      badge: 'Multilingual',
      description:
        'Deep semantic understanding across multiple cultural styles and languages.',
      credits: '6 Credits / Image',
      tag: 'Balanced',
    },
  ],

  'ai-video': [
    {
      name: 'Wan 2.7 Pro',
      badge: 'Flagship',
      description:
        'High temporal coherence and cinematic dynamics with minimal artifacting.',
      credits: '25 Credits / Clip',
      tag: 'Cinematic',
    },
    {
      name: 'Seedance 2.0',
      badge: 'Action',
      description:
        'Specialized in character movement choreography and energetic transitions.',
      credits: '85 Credits / Clip',
      tag: 'Motion Dynamics',
    },
  ],

  'ai-audio': [
    {
      name: 'Suno v5 Audio',
      badge: 'Vocals + Song',
      description:
        'Generates full structured songs with high-fidelity vocals, verse, chorus, and arrangements.',
      credits: '10 Credits / Track',
      tag: 'Full Songs',
    },
    {
      name: 'Udio v2 Studio',
      badge: 'Mastering',
      description:
        'Specializes in pristine musical composition, instrumental layers, and clean mastering.',
      credits: '8 Credits / Track',
      tag: 'Instrumentals',
    },
  ],

  'text-to-image': [
    {
      name: 'Nano Banana',
      badge: 'Popular',
      description:
        'Fast, high-fidelity daily generation with extraordinary aesthetic coherence and lighting.',
      credits: '6 Credits / Image',
      tag: 'General / Photo',
    },
    {
      name: 'Nano Banana Pro',
      badge: 'Flagship',
      description:
        'Ultra-high definition 4K render with precise text rendering and realistic textures.',
      credits: '12 Credits / Image',
      tag: 'Pro Creative',
    },
    {
      name: 'Grok Imagine',
      description:
        'Specialized in hyper-creative concepts, imaginative scenes, and whimsical art styles.',
      credits: '8 Credits / Image',
      tag: 'Art / Conceptual',
    },
    {
      name: 'Qwen Image 2.0',
      description:
        'State-of-the-art multimodal understanding with exceptional multilingual prompt comprehension.',
      credits: '6 Credits / Image',
      tag: 'Realistic / Global',
    },
    {
      name: 'GPT Image 1.5',
      description:
        'Superior reasoning and complex prompt decomposition with accurate spatial relationships.',
      credits: '10 Credits / Image',
      tag: 'Complex Scenes',
    },
    {
      name: 'Z-Image',
      badge: 'Ultra Fast',
      description:
        'Lightning-fast draft generation model designed for rapid concept exploration and iteration.',
      credits: '4 Credits / Image',
      tag: 'Draft / Speed',
    },
  ],

  'image-to-image': [
    {
      name: 'Nano Banana Pro',
      badge: 'Popular',
      description:
        'Maintains composition and facial geometry while dramatically reimagining stylistic textures and lighting.',
      credits: '12 Credits / Image',
      tag: 'Style Transfer',
    },
    {
      name: 'Qwen Image 2.0',
      badge: 'Precision',
      description:
        'Handles in-painting, object replacement, and background modifications guided by natural language prompts.',
      credits: '6 Credits / Image',
      tag: 'Object Modification',
    },
    {
      name: 'GPT Image 1.5',
      description:
        'High contextual understanding for complex composition shifts and semantic variations.',
      credits: '10 Credits / Image',
      tag: 'Semantic Remix',
    },
  ],

  'png-maker': [
    {
      name: 'Nano Banana Pro',
      badge: 'Transparent Alpha',
      description:
        'Generates subjects on a clean transparent alpha channel with ultra-crisp edge feathering.',
      credits: '12 Credits / Asset',
      tag: 'Alpha Channel PNG',
    },
  ],

  'text-to-video': [
    {
      name: 'Wan 2.7 Pro',
      badge: 'Latest',
      description:
        'Industry-leading temporal coherence with cinematic camera control, smooth panning, and realistic physics.',
      credits: '25 Credits / 5s Video',
      tag: 'Cinema / Motion',
    },
    {
      name: 'Seedance 2.0',
      badge: 'Dynamic',
      description:
        'Specializes in high-action sequences, character motion choreography, and fluid transitions.',
      credits: '85 Credits / 5s Video',
      tag: 'Action / Choreography',
    },
    {
      name: 'Wan 2.6',
      description:
        'Reliable and cost-effective text-to-video model for landscape and ambient visual content.',
      credits: '20 Credits / 5s Video',
      tag: 'Landscape / Ambient',
    },
  ],

  'image-to-video': [
    {
      name: 'Wan 2.7 Pro',
      badge: 'Flagship',
      description:
        'Brings photos to life with strict preservation of initial subject features and subtle realistic physics.',
      credits: '25 Credits / Clip',
      tag: 'Realistic Motion',
    },
    {
      name: 'Seedance 2.0',
      badge: 'Choreography',
      description:
        'Excels at complex camera rotation around still subjects and expressive character animation.',
      credits: '85 Credits / Clip',
      tag: '3D Camera Dynamics',
    },
  ],

  'text-to-music': [
    {
      name: 'Suno v5 Audio',
      badge: 'Popular',
      description:
        'Generates full structured songs with high-fidelity vocals, verse, chorus, and arrangements.',
      credits: '10 Credits / Track',
      tag: 'Full Song / Vocals',
    },
    {
      name: 'Udio v2 Studio',
      badge: 'Studio Quality',
      description:
        'Specializes in pristine musical composition, instrumental depth, and customizable music stems.',
      credits: '8 Credits / Track',
      tag: 'Instrumental / Mastering',
    },
  ],
};
