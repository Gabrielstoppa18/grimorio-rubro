import { useState, type FormEvent } from 'react';
import { Mail } from 'lucide-react';
import { oauthProviders, supabase } from '../lib/supabase';
import { Divider } from './Ornaments';

const PROVIDER_LABEL = { google: 'Google', discord: 'Discord' } as const;

export function Login() {
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [error, setError] = useState('');

  const redirectTo = `${window.location.origin}${window.location.pathname}`;

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
          ? 'Muitos pedidos de link em pouco tempo. Espere alguns minutos e tente de novo.'
          : `Não foi possível enviar o link: ${error.message}`,
      );
      return;
    }
    setState('sent');
  };

  const oauth = async (provider: 'google' | 'discord') => {
    if (!supabase) return;
    setError('');
    const { error } = await supabase.auth.signInWithOAuth({ provider, options: { redirectTo } });
    if (error) setError(`Não foi possível entrar com ${PROVIDER_LABEL[provider]}: ${error.message}`);
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
            <form className="login-form" onSubmit={sendLink}>
              <label className="field">
                <span className="field-label">Seu e-mail</span>
                <input type="email" required autoComplete="email" value={email} placeholder="voce@exemplo.com" onChange={(e) => setEmail(e.target.value)} />
              </label>
              <button className="btn primary lg" type="submit" disabled={state === 'sending'}>
                <Mail size={18} /> {state === 'sending' ? 'Enviando…' : 'Receber link de acesso'}
              </button>
              <p className="hint">Sem senha: você recebe um link no e-mail e entra direto.</p>
            </form>
            {oauthProviders.length > 0 && (
              <div className="login-oauth">
                <span className="muted small">ou entre com</span>
                {oauthProviders.map((p) => (
                  <button key={p} className="btn" onClick={() => oauth(p)}>
                    {PROVIDER_LABEL[p]}
                  </button>
                ))}
              </div>
            )}
          </>
        )}

        {error && <div className="banner-error">{error}</div>}
      </div>
    </div>
  );
}
