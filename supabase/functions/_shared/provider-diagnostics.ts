export type SafeProviderContentDiagnostics = {
  contentLength: number;
  parseState: 'valid' | 'malformed' | 'empty';
};

/** Never include provider content in logs; retain only safe parse metadata. */
export function safeProviderContentDiagnostics(content: unknown, parseState: SafeProviderContentDiagnostics['parseState']): SafeProviderContentDiagnostics {
  return {
    contentLength: typeof content === 'string' ? content.length : 0,
    parseState,
  };
}
