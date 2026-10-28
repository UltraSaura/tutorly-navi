import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useFamilyProfile } from '@/context/FamilyProfileContext';
import { useInterfaceTranslation } from '@/i18n/useInterfaceTranslation';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PageMeta } from '@/components/seo/PageMeta';
import LanguageSelector from '@/components/ui/language-selector';
import { LockKeyhole, Plus, Users } from 'lucide-react';

export default function FamilyPage() {
  const family = useFamilyProfile();
  const { signOut, resetPassword, user } = useAuth();
  const ui = useInterfaceTranslation();
  const navigate = useNavigate();
  const [target, setTarget] = useState<'parent' | 'add' | null>(null);
  const [reset, setReset] = useState(false);
  const [password, setPassword] = useState('');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const setup = !family.pinConfigured || reset;
  const explain = (message: string) => ['invalid_pin', 'rate_limited'].includes(message) ? ui(`family.${message}`) : message.startsWith('family.') ? ui(message) : ui('family.error');
  const openParent = (next: 'parent' | 'add') => { setTarget(next); setPin(''); setConfirmPin(''); setPassword(''); setError(''); setReset(false); };
  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setPending(true); setError('');
    try {
      if (setup) {
        if (pin !== confirmPin) throw new Error('family.pinMismatch');
        await family.setupPin(password, pin);
        setPassword('');
      }
      await family.unlockParent(pin);
      setPin('');
      navigate(target === 'add' ? '/guardian/children' : '/guardian');
    } catch (cause) { setError(explain((cause as Error).message)); }
    finally { setPending(false); }
  };
  return <main className="min-h-screen bg-background px-5 py-8">
    <PageMeta title={ui('family.title')} description={ui('family.subtitle')} />
    <header className="mx-auto flex max-w-4xl justify-between items-center gap-4">
      <span className="font-bold text-xl">Stuwy</span><LanguageSelector />
      <Button variant="ghost" onClick={() => void signOut()}>{ui('family.signOut')}</Button>
    </header>
    <section className="max-w-4xl mx-auto py-12 space-y-8">
      <div className="text-center space-y-3"><h1 className="text-3xl sm:text-4xl font-bold">{ui('family.title')}</h1><p className="text-muted-foreground">{ui('family.subtitle')}</p></div>
      {(error || family.error) && <div role="alert" className="text-center text-destructive space-y-2"><p>{error || explain(family.error!)}</p><Button variant="outline" onClick={() => { setError(''); void family.refreshFamily().catch(() => setError(ui('family.error'))); }}>{ui('family.retry')}</Button></div>}
      {notice && <p role="status" className="text-center">{notice}</p>}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 sm:gap-6">
        <button className="min-h-48 p-6 flex flex-col items-center justify-center gap-4 rounded-xl border-2 hover:border-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary" onClick={() => openParent('parent')}>
          <Users className="h-14 w-14 text-primary" /><span className="text-xl font-semibold">{ui('family.parent')}</span><LockKeyhole className="h-4 w-4" aria-hidden="true" />
        </button>
        {family.children.map(child => <button key={child.id} disabled={pending || !child.available} className={`min-h-48 bg-card p-6 flex flex-col items-center justify-center gap-3 rounded-xl border-2 hover:border-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary ${pending ? 'disabled:opacity-100 disabled:cursor-wait' : 'disabled:opacity-50'}`} onClick={async () => {
          setPending(true); setError('');
          try { await family.selectChild(child.id); navigate('/chat'); }
          catch (cause) { setError(explain((cause as Error).message)); }
          finally { setPending(false); }
        }}>
          <Avatar className="h-20 w-20"><AvatarImage src={child.avatarUrl ?? undefined} alt="" /><AvatarFallback className="text-3xl">{child.firstName?.[0] ?? '☺'}</AvatarFallback></Avatar>
          <span className="text-xl font-semibold">{child.firstName || ui('family.child')}</span>
          <span className="text-sm text-muted-foreground">{child.grade || ui('family.noLevel')}</span>
          {!child.available && <span className="text-xs">{ui('family.unavailable')}</span>}
        </button>)}
        <button className="min-h-48 p-6 flex flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed hover:border-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary" onClick={() => openParent('add')}>
          <Plus className="h-12 w-12" /><span className="text-lg font-semibold">{ui('family.addChild')}</span><span className="text-xs text-muted-foreground">{ui('family.parentRequired')}</span>
        </button>
      </div>
      {!family.children.length && <p className="text-center text-muted-foreground">{ui('family.noChildren')}</p>}
    </section>
    <Dialog open={Boolean(target)} onOpenChange={open => { if (!open && !pending) { setTarget(null); setPin(''); setPassword(''); } }}>
      <DialogContent className="max-w-md"><DialogHeader><DialogTitle>{ui(setup ? 'family.setupPin' : 'family.enterPin')}</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          {setup && <><p className="text-sm text-muted-foreground">{ui('family.reauthenticate')}</p><div className="space-y-2"><Label htmlFor="family-password">{ui('family.password')}</Label><Input id="family-password" type="password" autoComplete="current-password" value={password} onChange={event => setPassword(event.target.value)} required /></div></>}
          <div className="space-y-2"><Label htmlFor="family-pin">{ui('family.pin')}</Label><Input id="family-pin" type="password" inputMode="numeric" autoComplete="off" pattern="[0-9]{6}" maxLength={6} value={pin} onChange={event => setPin(event.target.value)} required autoFocus /></div>
          {setup && <div className="space-y-2"><Label htmlFor="family-pin-confirm">{ui('family.confirmPin')}</Label><Input id="family-pin-confirm" type="password" inputMode="numeric" autoComplete="off" pattern="[0-9]{6}" maxLength={6} value={confirmPin} onChange={event => setConfirmPin(event.target.value)} required /></div>}
          {error && <p role="alert" className="text-destructive text-sm">{error}</p>}
          <Button type="submit" className="w-full min-h-12" disabled={pending}>{ui(pending ? 'family.loading' : 'family.continue')}</Button>
          {!setup && <Button type="button" variant="ghost" className="w-full" onClick={() => { setReset(true); setPin(''); }}>{ui('family.resetPin')}</Button>}
          {setup && <Button type="button" variant="ghost" className="w-full" onClick={async () => {
            if (!user?.email) return;
            const result = await resetPassword(user.email);
            if (result.error) setError(ui('family.error')); else setNotice(ui('family.resetEmailSent'));
          }}>{ui('family.forgotPassword')}</Button>}
        </form>
      </DialogContent>
    </Dialog>
  </main>;
}
