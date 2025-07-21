export const GAP_REGEX = /\{\{(\d+)(?::([^}]+))?\}\}/g;

export const gapTokensToNodes = (
  html: string,
  answers: Record<number, string> = {}
) =>
  html.replace(GAP_REGEX, (_, idx: string, placeholder: string) => {
    const value = answers[Number(idx)] ?? '';
    const ph = placeholder || '';
    return `<gap-token data-index="${idx}" data-placeholder="${ph}" data-value="${value}"></gap-token>`;
  });

export const gapNodesToTokens = (html: string) =>
  html.replace(/<gap-token[^>]*data-index="(\d+)"[^>]*data-placeholder="([^"/]*)"[^>]*>(?:<\/gap-token>)?/g, (_, idx: string, ph: string) => {
    const label = ph ? `${idx}:${ph}` : idx;
    return `{{${label}}}`;
  });
