import type { FeatureType } from './inspirations-data';

export interface FAQItem {
  question: string;
  answer: string;
}

export const FEATURE_FAQS: Partial<Record<FeatureType, FAQItem[]>> = {
  'text-to-image': [
    {
      question: 'How does text to image AI turn prompts into art?',
      answer:
        'Screenshots to Video uses cutting-edge diffusion and autoregressive foundation models. When you type a prompt, the model tokenizes the words into semantic vectors and progressively refines visual noise into a crisp, high-resolution image that reflects every detail of your prompt.',
    },
    {
      question: 'Which AI image generator should I choose for daily content?',
      answer:
        'For daily content and social media marketing, Nano Banana and Qwen Image 2.0 offer the best balance of speed, aesthetic quality, and credit efficiency. For commercial print or billboard artwork, Nano Banana Pro is recommended.',
    },
    {
      question: 'Can I use generated images commercially?',
      answer:
        'Yes, all images generated on Screenshots to Video belong to you according to our terms of service, allowing full commercial use for branding, digital assets, and physical merchandise.',
    },
  ],

  'image-to-image': [
    {
      question: 'How does Image to Image AI work?',
      answer:
        'Image to Image AI takes an existing source image alongside your descriptive prompt, analyzing visual features like structure, silhouettes, and lighting, and applies targeted generative transformations to create a new variation.',
    },
    {
      question: 'What file formats and dimensions are supported?',
      answer:
        'Screenshots to Video supports PNG, JPG, WEBP, and TIFF files up to 25MB each. Resolution up to 4096x4096 is processed natively.',
    },
  ],

  'png-maker': [
    {
      question: 'Are generated PNGs truly transparent?',
      answer:
        'Yes, the output is exported directly as a 32-bit RGBA PNG with a pure transparent alpha channel, ready to drag and drop into Figma, Photoshop, or web projects.',
    },
  ],

  'text-to-video': [
    {
      question: 'How long are generated video clips?',
      answer:
        'Video generation currently outputs 5 to 10-second high-definition clips at 24 or 30 fps, which you can easily extend or loop.',
    },
    {
      question: 'Can I specify camera movements like zooms or pans?',
      answer:
        'Yes! You can include direct camera directions in your prompt such as "drone flyover", "cinematic slow push-in", "panning left to right", or "dolly zoom".',
    },
  ],

  'image-to-video': [
    {
      question: 'How do I get the best results with Image to Video?',
      answer:
        'Upload a high-resolution, clear initial image. In your prompt, describe what should move (e.g. "hair blowing gently in the wind", "camera slowly zooming out", "cars driving down the street").',
    },
  ],

  'text-to-music': [
    {
      question: 'Can I provide my own lyrics for music generation?',
      answer:
        'Yes, you can specify custom lyrics with verse, chorus, and bridge markers directly in the prompt textarea.',
    },
  ],
};
