/** No callback URL or credential is logged or persisted by this adapter. */
type CallbackAuth = {
  setSession: (tokens: { access_token: string; refresh_token: string }) => Promise<{ error: unknown }>;
  exchangeCodeForSession: (code: string) => Promise<{ error: unknown }>;
};

export function createNativeAuthCallback(options: {
  callbackUrl: string;
  auth: CallbackAuth;
  setRecovery: (value: boolean) => void;
  navigate: () => void;
  reportError: () => void;
}) {
  let lastSuccessfulUrl: string | null = null;
  let queue = Promise.resolve();
  const expected = new URL(options.callbackUrl);
  const process = async (raw: string) => {
    let url: URL;
    try { url = new URL(raw); } catch { return; }
    if (url.protocol !== expected.protocol || url.host !== expected.host
      || url.pathname !== expected.pathname || url.username || url.password) return;
    if (raw === lastSuccessfulUrl) return;
    const hash = new URLSearchParams(url.hash.slice(1));
    const get = (key: string) => hash.get(key) ?? url.searchParams.get(key);
    if (get('error') || get('error_code')) { options.reportError(); return; }
    const access = get('access_token');
    const refresh = get('refresh_token');
    const code = get('code');
    if (!(access && refresh) && !code) { options.reportError(); return; }
    const recovery = get('type') === 'recovery';
    if (recovery) options.setRecovery(true);
    try {
      const result = code
        ? await options.auth.exchangeCodeForSession(code)
        : await options.auth.setSession({ access_token: access!, refresh_token: refresh! });
      if (result.error) throw new Error('Authentication callback failed');
      lastSuccessfulUrl = raw;
      options.navigate();
    } catch {
      if (recovery) options.setRecovery(false);
      options.reportError();
    }
  };
  return (raw: string) => {
    queue = queue.then(() => process(raw));
    return queue;
  };
}
