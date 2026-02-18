import { useAuth } from '../auth/useAuth.ts';

export function SettingsPage() {
  const { organizer } = useAuth();

  return (
    <div>
      <h1 className="font-display text-3xl text-white mb-1">Configurações</h1>
      <p className="text-gray-400 mb-8">Gerencie sua conta de organizador.</p>

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 max-w-lg">
        <h2 className="text-lg font-bold text-white mb-4">Conta</h2>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-400">Nome</span>
            <span className="text-white">{organizer?.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Email</span>
            <span className="text-white">{organizer?.email}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
