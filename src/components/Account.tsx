import { createContext, useContext } from 'react';
import { Cloud, CloudOff, HardDrive, LoaderCircle, LogOut, TriangleAlert } from 'lucide-react';

export type SyncStatus = 'local' | 'syncing' | 'saved' | 'offline' | 'error';

interface AccountCtx {
  status: SyncStatus;
  email: string | null;
  signOut: (() => void) | null;
  /** Apaga um retrato do Storage se nenhuma outra ficha (além de `exceptId`) ainda o usa. */
  releasePhoto: (url: string, exceptId: string) => void;
}

export const AccountContext = createContext<AccountCtx>({ status: 'local', email: null, signOut: null, releasePhoto: () => {} });
export const useAccount = () => useContext(AccountContext);

const LABEL: Record<SyncStatus, string> = {
  local: 'Salvo neste navegador',
  syncing: 'Salvando…',
  saved: 'Salvo na nuvem',
  offline: 'Offline — salvo no aparelho',
  error: 'Erro ao salvar — tentando de novo',
};

export function SyncBadge({ compact = false }: { compact?: boolean }) {
  const { status } = useAccount();
  const icon =
    status === 'syncing' ? <LoaderCircle size={14} className="spin" /> :
    status === 'saved' ? <Cloud size={14} /> :
    status === 'offline' ? <CloudOff size={14} /> :
    status === 'error' ? <TriangleAlert size={14} /> :
    <HardDrive size={14} />;
  return (
    <span className={`sync-badge sync-${status}`} title={LABEL[status]} role="status">
      {icon}
      {!compact && <span className="sync-label">{LABEL[status]}</span>}
    </span>
  );
}

export function AccountMenu() {
  const { email, signOut } = useAccount();
  if (!email || !signOut) return null;
  return (
    <div className="account">
      <span className="account-email" title={email}>
        {email}
      </span>
      <button className="btn ghost sm" onClick={signOut} title="Sair da conta">
        <LogOut size={14} /> Sair
      </button>
    </div>
  );
}
