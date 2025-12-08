export type SearchParams = Record<string, string | string[] | undefined>;

export type AppPageProps<
  P extends Record<string, string | undefined> = Record<string, string | undefined>,
> = {
  params: Promise<P>;
  searchParams?: Promise<SearchParams>;
};

export type AppRouteContext<P extends Record<string, string>> = {
  params: Promise<P>;
};
