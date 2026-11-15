import { useEffect, useState, type FormEvent } from 'react';
import { Mail, Users } from 'lucide-react';
import { fetchEnabledProviders, supabase, type OAuthProvider } from '../lib/supabase';
import { Divider } from './Ornaments';

const PROVIDER_LABEL: Record<OAuthProvider, string> = { google: 'Google', discord: 'Discord' };

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}

export function Login({ invited = false }: { invited?: boolean }) {
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [error, setError] = useState('');
  const [providers, setProviders] = useState<OAuthProvider[]>([]);
  const [redirecting, setRedirecting] = useState<OAuthProvider | null>(null);

  const redirectTo = `${window.location.origin}${window.location.pathname}`;

  useEffect(() => {
    void fetchEnabledProviders().then(setProviders);
    // Erro devolvido pelo provedor na volta do login (ex.: usuário cancelou).
    const params = new URLSearchParams(window.location.hash.slice(1) || window.location.search);
    const desc = params.get('error_description');
    if (desc) {
      setError(`Não foi possível entrar: ${desc.replace(/\+/g, ' ')}`);
      history.replaceState(null, '', window.location.pathname);
    }
  }, []);

  const sendLink = async (e: FormEvent) => {
    e.preventDefault();
    if (!supabase) return;
    setError('');
    setState('sending');
    const { error } = await supabase.auth.signInWithOtp({ email: email.trim(), options: { emailRedirectTo: redirectTo } });
    if (error) {
      setState('idle');
      setError(
        error.status === 429
          ? 'Muitos pedidos de link em pouco tempo. Espere alguns minutos ou entre com o Google.'
          : `Não foi possível enviar o link: ${error.message}`,
      );
      return;
    }
    setState('sent');
  };

  const oauth = async (provider: OAuthProvider) => {
    if (!supabase) return;
    setError('');
    setRedirecting(provider);
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo, queryParams: provider === 'google' ? { prompt: 'select_account' } : undefined },
    });
    if (error) {
      setRedirecting(null);
      setError(`Não foi possível entrar com ${PROVIDER_LABEL[provider]}: ${error.message}`);
    }
  };

  return (
    <div className="login">
      <div className="login-card">
        <div className="login-brand">
          <img className="login-logo" src="./logo.webp" alt="" width={640} height={640} />
          <h1 className="sr-only">Grimório Rubro</h1>
          <p>Fichas de Tormenta 20 para criar, evoluir e levar seus heróis à mesa.</p>
        </div>
        <Divider />

        {invited && state !== 'sent' && (
          <div className="login-invite">
            <Users size={18} /> Você recebeu um convite para uma mesa. Entre para escolher sua ficha.
          </div>
        )}

        {state === 'sent' ? (
          <div className="login-sent">
            <Mail size={36} />
            <h2>Confira seu e-mail</h2>
            <p>
              Enviamos um link de acesso para <strong>{email}</strong>. Abra o e-mail e toque no link para entrar — pode ser em qualquer aparelho.
            </p>
            <p className="muted small">Não chegou? Veja a caixa de spam ou promoções.</p>
            <button className="btn ghost sm" onClick={() => setState('idle')}>
              Usar outro e-mail
            </button>
          </div>
        ) : (
          <>
            {providers.length > 0 && (
              <div className="login-oauth">
                {providers.map((p) => (
                  <button key={p} className={`btn lg oauth-btn oauth-${p}`} onClick={() => oauth(p)} disabled={redirecting !== null}>
                    {p === 'google' && <GoogleIcon />}
                    {redirecting === p ? 'Abrindo…' : `Entrar com ${PROVIDER_LABEL[p]}`}
                  </button>
                ))}
                <div className="login-or">
                  <span>ou receba um link no e-mail</span>
                </div>
              </div>
            )}
            <form className="login-form" onSubmit={sendLink}>
              <label className="field">
                <span className="field-label">Seu e-mail</span>
                <input type="email" required autoComplete="email" value={email} placeholder="voce@exemplo.com" onChange={(e) => setEmail(e.target.value)} />
              </label>
              <button className={`btn lg ${providers.length ? '' : 'primary'}`} type="submit" disabled={state === 'sending'}>
                <Mail size={18} /> {state === 'sending' ? 'Enviando…' : 'Receber link de acesso'}
              </button>
              {providers.length === 0 && <p className="hint">Sem senha: você recebe um link no e-mail e entra direto.</p>}
            </form>
          </>
        )}

        {error && <div className="banner-error">{error}</div>}
      </div>
    </div>
  );
}
