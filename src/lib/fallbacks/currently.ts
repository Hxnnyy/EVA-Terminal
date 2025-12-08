type CurrentlyFallbackSection = {
  title: string;
  items: string[];
};

export const CURRENTLY_FALLBACK_SECTIONS: CurrentlyFallbackSection[] = [
  {
    title: 'Playing',
    items: ['Armored Core VI'],
  },
  {
    title: 'Watching',
    items: ['Shin Evangelion'],
  },
  {
    title: 'Listening',
    items: ['Nujabes live loops'],
  },
  {
    title: 'Reading',
    items: ['Creative Selection'],
  },
];

export const CURRENTLY_FALLBACK_BODY = CURRENTLY_FALLBACK_SECTIONS.map((section) => {
  const heading = `### ${section.title}`;
  const items = section.items.map((item) => `- ${item}`);
  return [heading, ...items].join('\n');
}).join('\n\n');
