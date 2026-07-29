import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';

export default function LogoutPage() {
  useEffect(() => {
    // Clear all Supabase auth keys synchronously — no network call, cannot hang
    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith('sb-')) localStorage.removeItem(key);
    });
    sessionStorage.clear();
    window.location.replace('/auth');
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  );
}
