import {
  buildThemeCss,
  THEME_CLASS_PREFIX,
  THEME_STYLE_ELEMENT_ID,
} from '@/lib/theme/theme-manifest';

type ThemeStyleTagProps = {
  nonce?: string | null;
};

export function ThemeStyleTag({ nonce }: ThemeStyleTagProps) {
  const css = buildThemeCss(THEME_CLASS_PREFIX);
  return (
    // SECURITY: Safe usage — CSS generated from trusted ThemeManifest.
    // Content is statically typed, not user-provided. Nonce protects from injection.
    <style
      id={THEME_STYLE_ELEMENT_ID}
      nonce={nonce ?? undefined}
      dangerouslySetInnerHTML={{ __html: css }}
      suppressHydrationWarning
    />
  );
}
