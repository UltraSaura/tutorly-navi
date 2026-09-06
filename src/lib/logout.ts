export function hardLogout(): void {
  Object.keys(localStorage).forEach((key) => {
    if (key.startsWith('sb-')) localStorage.removeItem(key);
  });
  sessionStorage.clear();
  window.location.replace('/auth');
}
