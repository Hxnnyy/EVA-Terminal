import { THEME_LIST, type ThemeId } from '@/lib/theme/theme-manifest';

type MenuOption = {
  id: number;
  label: string;
  summary: string;
};

export const MENU_OPTIONS: MenuOption[] = [
  { id: 1, label: 'Bio', summary: 'Stat sheet of who, what, where.' },
  { id: 2, label: 'CV', summary: 'Download the latest resume PDF.' },
  { id: 3, label: 'Links', summary: 'Quick jumps to social, site, and elsewhere.' },
  { id: 4, label: 'Projects', summary: 'Selected builds and shippable work.' },
  { id: 5, label: 'Writing', summary: 'Articles, essays, and long-form notes in MDX.' },
  { id: 6, label: 'Investments', summary: 'Tracked tickers with rolling 6M price return.' },
  {
    id: 7,
    label: 'Currently...',
    summary: 'Now Playing / Watching / Listening / Reading.',
  },
  {
    id: 8,
    label: 'Contact',
    summary: 'Email reveal plus copy-to-clipboard helper.',
  },
  { id: 9, label: 'Reel', summary: 'Image grid + modal viewer with keyboard nav.' },
  {
    id: 10,
    label: 'Repo',
    summary: 'Open the GitHub repository for this terminal.',
  },
];

export const THEME_COMMANDS: Record<string, ThemeId> = Object.fromEntries(
  THEME_LIST.map((theme) => [`/${theme.id}`, theme.id]),
);
