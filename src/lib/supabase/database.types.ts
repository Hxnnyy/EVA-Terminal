export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      articles: {
        Row: {
          id: string;
          slug: string;
          title: string;
          subtitle: string | null;
          body_mdx: string;
          status: 'draft' | 'published';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          title: string;
          subtitle?: string | null;
          body_mdx: string;
          status?: 'draft' | 'published';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          slug?: string;
          title?: string;
          subtitle?: string | null;
          body_mdx?: string;
          status?: 'draft' | 'published';
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      links: {
        Row: {
          id: string;
          category: 'social' | 'site' | 'other';
          label: string;
          url: string;
          order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          category: 'social' | 'site' | 'other';
          label: string;
          url: string;
          order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          category?: 'social' | 'site' | 'other';
          label?: string;
          url?: string;
          order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      projects: {
        Row: {
          id: string;
          slug: string | null;
          title: string;
          blurb: string | null;
          url: string | null;
          tags: string[];
          order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          slug?: string | null;
          title: string;
          blurb?: string | null;
          url?: string | null;
          tags?: string[];
          order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          slug?: string | null;
          title?: string;
          blurb?: string | null;
          url?: string | null;
          tags?: string[];
          order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      investments: {
        Row: {
          id: string;
          ticker: string;
          label: string | null;
          order: number;
          provider: 'stooq' | 'alphavantage';
          provider_symbol: string | null;
          perf_6m_percent: string | null;
          perf_last_fetched: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          ticker: string;
          label?: string | null;
          order?: number;
          provider?: 'stooq' | 'alphavantage';
          provider_symbol?: string | null;
          perf_6m_percent?: string | null;
          perf_last_fetched?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          ticker?: string;
          label?: string | null;
          order?: number;
          provider?: 'stooq' | 'alphavantage';
          provider_symbol?: string | null;
          perf_6m_percent?: string | null;
          perf_last_fetched?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      singletons: {
        Row: {
          key: string;
          body_mdx: string | null;
          meta: Json;
          updated_at: string;
        };
        Insert: {
          key: string;
          body_mdx?: string | null;
          meta?: Json;
          updated_at?: string;
        };
        Update: {
          key?: string;
          body_mdx?: string | null;
          meta?: Json;
          updated_at?: string;
        };
        Relationships: [];
      };
      reel_images: {
        Row: {
          id: string;
          url: string;
          caption: string | null;
          order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          url: string;
          caption?: string | null;
          order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          url?: string;
          caption?: string | null;
          order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
