function renderBlock(block: string, key: number) {
  const lines = block.split('\n');
  const intro: string[] = [];
  const bullets: string[] = [];
  let footer: string | null = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (/^…and \d+ more/.test(trimmed)) {
      footer = trimmed;
      continue;
    }
    if (/^[•\-]\s/.test(trimmed)) {
      bullets.push(trimmed.replace(/^[•\-]\s*/, ''));
    } else {
      intro.push(trimmed);
    }
  }

  return (
    <div key={key} className="beezy-msg-block">
      {intro.map((paragraph, j) => {
        const isHeading = paragraph.endsWith(':') && bullets.length > 0;
        return (
          <p key={j} className={isHeading ? 'beezy-msg-heading' : 'beezy-msg-line'}>
            {paragraph}
          </p>
        );
      })}
      {bullets.length > 0 && (
        <ul className="beezy-msg-list">
          {bullets.map((item, j) => (
            <li key={j}>{item}</li>
          ))}
        </ul>
      )}
      {footer && <p className="beezy-msg-more">{footer}</p>}
    </div>
  );
}

export function BeezyMessage({ text }: { text: string }) {
  const blocks = text.split(/\n\n+/).filter((block) => block.trim());
  return <div className="beezy-msg">{blocks.map((block, i) => renderBlock(block, i))}</div>;
}
