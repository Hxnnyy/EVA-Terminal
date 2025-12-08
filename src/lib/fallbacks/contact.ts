type ContactFallback = {
  email: string;
  phone?: string;
  discord?: string;
};

export const CONTACT_FALLBACK: ContactFallback = {
  email: 'hello@example.com',
  phone: '+1-555-000-0000',
  discord: 'discorduser#1234',
};
