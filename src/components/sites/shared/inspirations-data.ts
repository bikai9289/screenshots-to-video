export interface InspirationItem {
  id: string;
  title: string;
  image?: string;
  video?: string;
  audio?: string;
  prompt: string;
  model: string;
  mediaType?: string;
}

export type FeatureType =
  | 'workspace'
  | 'ai-image'
  | 'ai-video'
  | 'ai-audio'
  | 'text-to-image'
  | 'image-to-image'
  | 'png-maker'
  | 'text-to-video'
  | 'image-to-video'
  | 'text-to-music';

export function getMediaTypeForFeature(
  feature?: FeatureType
): 'video' | 'image' | 'music' | undefined {
  if (!feature || feature === 'workspace') return undefined;
  if (['ai-video', 'text-to-video', 'image-to-video'].includes(feature)) {
    return 'video';
  }
  if (
    ['ai-image', 'text-to-image', 'image-to-image', 'png-maker'].includes(
      feature
    )
  ) {
    return 'image';
  }
  if (['ai-audio', 'text-to-music'].includes(feature)) {
    return 'music';
  }
  return undefined;
}

export const FEATURE_INSPIRATIONS: Record<FeatureType, InspirationItem[]> = {
  workspace: [
    {
      id: '1',
      title: 'Cyberpunk Tokyo Rain',
      image: '/oss/display/home/image-to-image-ai-1.webp',
      prompt:
        'Neon cyberpunk street in Tokyo with rain puddles reflecting holographic billboards, cinematic 8k',
      model: 'Nano Banana Pro',
    },
    {
      id: '2',
      title: 'Cinematic FPV Mountain Drone Flight',
      video: '/oss/display/home/text-to-image-ai.mp4',
      prompt:
        'FPV drone shot sweeping through emerald misty mountains at dawn, lens flare, 4k 60fps',
      model: 'Wan 2.7 Pro',
    },
    {
      id: '3',
      title: 'Crystal Dragon in Nebula',
      image: '/oss/display/home/image-to-image-ai-2.webp',
      prompt:
        'Iridescent crystalline dragon flying across cosmic nebula dust and glowing galaxies',
      model: 'Qwen Image 2.0',
    },
    {
      id: '4',
      title: 'Fast Hypercar Light Trails',
      video: '/oss/palix-ai.mp4',
      prompt:
        'Futuristic hypercar speeding through underground neon tunnel with light streaks',
      model: 'Seedance 2.0',
    },
    {
      id: '5',
      title: 'Lo-Fi Sunset Beats',
      image: '/oss/display/home/ai-audio.webp',
      prompt:
        'Calm ambient lofi rhythm with warm vinyl chords, soothing electric piano, chill summer evening',
      model: 'Suno v5 Audio',
    },
    {
      id: '6',
      title: 'Minimalist Architecture',
      image: '/oss/display/home/banner-1.webp',
      prompt:
        'Modern architectural villa cantilevered above ocean, warm evening lighting, editorial shot',
      model: 'Nano Banana',
    },
  ],

  'ai-image': [
    {
      id: '1',
      title: 'Cyberpunk Neon Samurai',
      image: '/oss/display/home/image-to-image-ai-1.webp',
      prompt:
        'Futuristic samurai walking through a rain-soaked cyberpunk Tokyo street, volumetric neon lighting',
      model: 'Nano Banana Pro',
    },
    {
      id: '2',
      title: 'Majestic Crystal Phoenix',
      image: '/oss/display/home/image-to-image-ai-2.webp',
      prompt:
        'A mythical bird made of glowing azure crystal feathers, perched on ancient ruins',
      model: 'Grok Imagine',
    },
  ],

  'ai-video': [
    {
      id: '1',
      title: 'FPV Valley Flyover',
      video: '/oss/display/home/text-to-image-ai.mp4',
      prompt:
        'FPV drone racing through foggy alpine canyon with cascading waterfalls, 4k 60fps',
      model: 'Wan 2.7 Pro',
    },
    {
      id: '2',
      title: 'Neon Drift Sequence',
      video: '/oss/palix-ai.mp4',
      prompt:
        'Hypercar drifting across wet asphalt in rainy neon cyberpunk city, sparks flying',
      model: 'Seedance 2.0',
    },
  ],

  'ai-audio': [
    {
      id: '1',
      title: 'Warm Acoustic Coffee Shop Beats',
      audio: '/oss/display/home/ai-audio-demo.mp3',
      image: '/oss/display/home/ai-audio.webp',
      prompt:
        'Acoustic guitar with gentle brushes on snare drum, warm ambient coffee shop atmosphere, 90 bpm',
      model: 'Suno v5 Audio',
    },
    {
      id: '2',
      title: 'Cyberpunk Synthwave Anthem',
      audio: '/oss/display/home/ai-audio-demo.mp3',
      image: '/oss/display/home/ai-video.webp',
      prompt:
        'Retro 80s synthwave lead with arpeggiated bassline and gated reverb drums, 128 bpm',
      model: 'Udio v2 Studio',
    },
  ],

  'text-to-image': [
    {
      id: '1',
      title: 'Cyberpunk Neon Samurai',
      image: '/oss/display/home/image-to-image-ai-1.webp',
      prompt:
        'Futuristic samurai walking through a rain-soaked cyberpunk Tokyo street, volumetric neon lighting, cinematic 8k detail',
      model: 'Nano Banana Pro',
    },
    {
      id: '2',
      title: 'Majestic Crystal Phoenix',
      image: '/oss/display/home/image-to-image-ai-2.webp',
      prompt:
        'A mythical bird made of glowing azure crystal feathers, perched on ancient marble ruins under galaxy skies',
      model: 'Grok Imagine',
    },
    {
      id: '3',
      title: 'Minimalist Architectural Villa',
      image: '/oss/display/home/banner-1.webp',
      prompt:
        'Modern brutalist luxury villa on a cliff overlooking Mediterranean sunset, warm lighting, architectural photography',
      model: 'Qwen Image 2.0',
    },
  ],

  'image-to-image': [
    {
      id: '1',
      title: 'Portrait to Anime Artwork',
      image: '/oss/display/home/image-to-image-ai-1.webp',
      prompt:
        'Convert photographic portrait into Makoto Shinkai anime aesthetic, vibrant saturated sky, glowing highlights',
      model: 'Nano Banana Pro',
    },
    {
      id: '2',
      title: 'Modern Room to Retro Futurism',
      image: '/oss/display/home/image-to-image-ai-2.webp',
      prompt:
        'Restyle interior living room into 80s synthwave neon studio with retro CRT monitors and purple lighting',
      model: 'Qwen Image 2.0',
    },
    {
      id: '3',
      title: 'Sketch to Realistic Product Render',
      image: '/oss/display/home/ai-image.webp',
      prompt:
        'Transform wireframe sketch into studio commercial product photography with softbox lighting and metallic finish',
      model: 'GPT Image 1.5',
    },
  ],

  'png-maker': [
    {
      id: '1',
      title: '3D Glossy Rocket Icon',
      image: '/oss/model/icon/nano-banana-40.webp',
      prompt:
        '3D glossy isometric space rocket icon, metallic purple and gold finish, transparent background PNG',
      model: 'Nano Banana Pro',
    },
    {
      id: '2',
      title: 'Holographic Cyber Cat Sticker',
      image: '/oss/display/home/image-to-image-ai-1.webp',
      prompt:
        'Cute holographic robotic kitten sticker with white contour border, transparent background PNG',
      model: 'Qwen Image 2.0',
    },
  ],

  'text-to-video': [
    {
      id: '1',
      title: 'Cinematic Drone Flyover',
      video: '/oss/display/home/text-to-image-ai.mp4',
      prompt:
        'FPV drone shot sweeping through mist-shrouded emerald valleys at sunrise, lens flare, 4k cinematic',
      model: 'Wan 2.7 Pro',
    },
    {
      id: '2',
      title: 'Neon Cyber Racer',
      video: '/oss/palix-ai.mp4',
      prompt:
        'Supercar accelerating through glowing hyperloop tunnel, motion blur, reflection trails, 60fps',
      model: 'Seedance 2.0',
    },
    {
      id: '3',
      title: 'Ocean Bioluminescence',
      video: '/oss/display/home/text-to-image-ai.mp4',
      prompt:
        'Bioluminescent jellyfish pulsating rhythmically in deep ocean abyss, ethereal cyan and magenta glow',
      model: 'Wan 2.6',
    },
  ],

  'image-to-video': [
    {
      id: '1',
      title: 'Portrait Facial Animation & Breathing',
      video: '/oss/palix-ai.mp4',
      prompt:
        'Gentle head turn with blinking eyes, subtle natural smile, soft breeze moving hair strands',
      model: 'Wan 2.7 Pro',
    },
    {
      id: '2',
      title: 'Flowing Waterfall Landscape',
      video: '/oss/display/home/text-to-image-ai.mp4',
      prompt:
        'Rushing cascade of water with mist rising, leaves swaying in foreground, sunlight shimmering',
      model: 'Seedance 2.0',
    },
  ],

  'text-to-music': [
    {
      id: '1',
      title: 'Upbeat Lo-Fi Chillhop',
      audio: '/oss/display/home/ai-audio-demo.mp3',
      image: '/oss/display/home/ai-audio.webp',
      prompt:
        'Chill lofi study beats, warm vinyl crackle, mellow electric piano, soft 80bpm drums',
      model: 'Suno v5 Audio',
    },
    {
      id: '2',
      title: 'Epic Orchestral Trailer',
      audio: '/oss/display/home/ai-audio-demo.mp3',
      image: '/oss/display/home/ai-video.webp',
      prompt:
        'Epic cinematic orchestral climax, intense taiko drums, soaring violins, dramatic brass crescendo',
      model: 'Udio v2 Studio',
    },
  ],
};
