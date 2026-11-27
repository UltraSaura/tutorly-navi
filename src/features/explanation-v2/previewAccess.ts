/** Restrict the opt-in math demo to development and Stuwy Vercel preview hosts. */
export function isExplanationDemoHost(hostname: string, isDev: boolean): boolean {
  if (isDev) return true;
  const host = hostname.toLowerCase();
  return host.endsWith('-stuwy.vercel.app') && host.length > '-stuwy.vercel.app'.length;
}
