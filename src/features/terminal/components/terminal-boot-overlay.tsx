import clsx from 'clsx';

type BootOverlayProps = {
  visible: boolean;
  fading: boolean;
  lines: string[];
  ready: boolean;
  readyText?: string;
  reduceMotion?: boolean;
};

export function TerminalBootOverlay({
  visible,
  fading,
  lines,
  ready,
  readyText,
  reduceMotion,
}: BootOverlayProps) {
  if (!visible) return null;

  return (
    <div
      className={clsx('magi-boot', {
        'magi-boot--fade': fading,
        'magi-boot--reduce': reduceMotion,
      })}
      aria-label="MAGI boot sequence"
    >
      <div className="magi-boot__content">
        <div className="magi-boot__line">
          <span>INITIALISING MAGI SYSTEM...</span>
          <span className="magi-boot__cursor" aria-hidden="true" />
        </div>
        <pre className="magi-boot__ascii" aria-hidden="true">
          {lines.join('\n')}
        </pre>
        {ready ? (
          <div className="magi-boot__ready">
            {readyText ?? "MAGI SYSTEM READY. GOD'S IN HIS HEAVEN, ALL'S RIGHT WITH THE WORLD."}
          </div>
        ) : null}
      </div>
    </div>
  );
}
