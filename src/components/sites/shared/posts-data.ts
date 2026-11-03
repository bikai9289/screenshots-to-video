export interface BlogPost {
  slug: string;
  title: string;
  description: string;
  date: string;
  readTime: string;
  tag: string;
  image: string;
  content: Array<{
    heading?: string;
    paragraphs: string[];
    list?: string[];
  }>;
}

export const BLOG_POSTS: Record<string, BlogPost> = {
  'wan-2-7-coming-soon': {
    slug: 'wan-2-7-coming-soon',
    title: 'Wan 2.7: The Next Leap in AI Video Generation Is Almost Here',
    description:
      'Wan 2.7 delivers major upgrades in AI video generation, including better quality, audio, motion consistency, 1080P output, and advanced controllable creation workflows.',
    date: 'February 2025',
    readTime: '4 min read',
    tag: 'AI Video',
    image: '/oss/display/home/text-to-image-ai-cover.webp',
    content: [
      {
        heading: 'Wan 2.7: A Full-Stack Upgrade Over 2.6',
        paragraphs: [
          'The AI video ecosystem continues to move at an extraordinary pace. Wan 2.7 represents a substantial architectural upgrade over its predecessor Wan 2.6, delivering massive improvements in temporal coherence, high-frequency textural detail, and cinematic camera trajectory handling.',
          'Built with an enhanced spatial-temporal transformer backbone, Wan 2.7 drastically reduces common video generation artifacts like morphing limbs, flickering backgrounds, and jittery camera motions.',
        ],
      },
      {
        heading: '1. Visual Quality: Toward Photorealism',
        paragraphs: [
          'Wan 2.7 outputs native 1080p high-definition video with rich dynamic range. Micro-textures such as water droplets, fabric weave, atmospheric fog, and subsurface skin scattering are rendered with studio precision.',
        ],
      },
      {
        heading: '2. Audio: Native, Synchronized Sound',
        paragraphs: [
          'One of the most requested features in generative video is native audio synchronization. Wan 2.7 introduces multi-modal audio generation capabilities, producing ambient soundscapes, engine rumbles, and acoustic reverberations synchronized to the visual action.',
        ],
      },
      {
        heading: '3. Motion Dynamics: Smoother, More Natural Movement',
        paragraphs: [
          'Physics simulation in Wan 2.7 accurately handles fluid dynamics, collision physics, and complex human choreography. Camera movements like orbital sweeps, zoom-ins, and high-speed drone pans remain stable across the entire generation timeline.',
        ],
      },
      {
        heading: 'Why Wan 2.7 Matters for Creators',
        paragraphs: [
          'With flexible credit tiers on Screenshots to Video, creators can leverage Wan 2.7 directly in their creative workflows without dedicated local hardware or complex model tuning.',
        ],
      },
    ],
  },
  '8-best-nano-banana-2-prompts': {
    slug: '8-best-nano-banana-2-prompts',
    title: '8 Best Nano Banana 2 Prompts for Studio Art',
    description:
      'A concise guide to crafting high-performing Nano Banana 2 prompts, featuring 8 real examples that demonstrate how to control composition, lighting, style, and structure.',
    date: 'January 2025',
    readTime: '6 min read',
    tag: 'Prompt Guide',
    image: '/oss/display/home/image-to-image-ai-1.webp',
    content: [
      {
        heading: 'Mastering Nano Banana 2',
        paragraphs: [
          'Nano Banana 2 is renowned for its speed, vibrant color balance, and responsive prompt adherence. Whether creating editorial product mockups, character art, or architectural renders, prompt structure makes all the difference.',
        ],
        list: [
          'Cyberpunk street photography with volumetric rain and neon signs',
          'Macro shot of mechanical hummingbird made of polished brass and gears',
          'Nordic minimalist kitchen interior bathed in warm morning sunlight',
          'Stylized 3D claymation character walking through miniature fantasy forest',
        ],
      },
      {
        heading: 'Prompt Engineering Best Practices',
        paragraphs: [
          'Always specify: Subject + Environment + Lighting conditions + Camera lens / Perspective + Art style keywords. Avoid negative prompt clutter and focus on descriptive visual cues.',
        ],
      },
    ],
  },
  'pixany-ai-introduction': {
    slug: 'pixany-ai-introduction',
    title: 'Screenshots to Video: All-in-One Creative AI Platform',
    description:
      'Screenshots to Video is an all-in-one creative platform offering AI-powered image generation, music creation, and video production for creators.',
    date: 'January 2025',
    readTime: '3 min read',
    tag: 'Platform News',
    image: '/oss/display/home/banner-1.webp',
    content: [
      {
        heading: 'A Unified Creative Hub',
        paragraphs: [
          'Instead of juggling five different subscriptions for image generators, video tools, and music creators, Screenshots to Video unifies industry-leading foundation models under one flexible credit package.',
          'Creators can prototype concepts in image models, animate them with video generators, and score the final piece with custom music — all from a single browser workspace.',
        ],
      },
    ],
  },
};

// Backwards-compatible alias
BLOG_POSTS['palix-ai-introduction'] = BLOG_POSTS['pixany-ai-introduction'];

export const BLOG_POSTS_LIST = [
  BLOG_POSTS['wan-2-7-coming-soon'],
  BLOG_POSTS['8-best-nano-banana-2-prompts'],
  BLOG_POSTS['pixany-ai-introduction'],
];
