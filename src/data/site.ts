export const site = {
  name: 'Johan Sjöberg',
  eyebrow: 'Cloud, AI & things that actually work',
  intro:
    "I'm Johan. I make AI and automation concrete — with strategy, prototypes and the small experiments that keep me learning.",
  bio:
    'Cloud & AI specialist and tech-driven product leader in Stockholm. I write about digital innovation, applied AI, automation, connected devices and the useful lessons hiding inside real projects.',
  location: 'Stockholm, Sweden',
  profileImage: '/images/profile.jpg',
  profileImageAlt: 'Johan Sjöberg',
  social: {
    linkedin: 'https://www.linkedin.com/in/johansj',
    github: 'https://github.com/grobius'
  },
  focus: ['Applied AI', 'Automation', 'Cloud architecture', 'IoT & prototypes']
} as const;

export const deskItems = [
  {
    label: 'Building',
    title: 'A personal publishing workflow where AI drafts and I remain the editor.'
  },
  {
    label: 'Testing',
    title: 'Small, battery-powered sensors that can live quietly in the real world.'
  },
  {
    label: 'Thinking about',
    title: 'How prototypes make strategy more honest, specific and useful.'
  }
] as const;
