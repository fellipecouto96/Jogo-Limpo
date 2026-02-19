import { useState, useEffect } from 'react';
import { useAuth } from '../auth/useAuth.ts';
import { apiFetch } from '../../shared/api.ts';

interface Settings {
  publicSlug: string | null;
  isPublicProfileEnabled: boolean;
  showFinancials: boolean;
}

export function SettingsPage() {
  const { organizer } = useAuth();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [slug, setSlug] = useState('');
  const [profileEnabled, setProfileEnabled] = useState(true);
  const [showFinancials, setShowFinancials] = useState(false);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await apiFetch('/organizer/settings');
        if (res.ok) {
          const data: Settings = await res.json();
          setSettings(data);
          setSlug(data.publicSlug ?? '');
          setProfileEnabled(data.isPublicProfileEnabled);
          setShowFinancials(data.showFinancials);
        }
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function handleSave() {
    setSaving(true);
    setFeedback(null);
    try {
      const res = await apiFetch('/organizer/settings', {
        method: 'PATCH',
        body: JSON.stringify({
          publicSlug: slug,
          isPublicProfileEnabled: profileEnabled,
          showFinancials,
        }),
      });
      if (res.ok) {
        const data: Settings = await res.json();
        setSettings(data);
        setFeedback({ type: 'success', message: 'Configuracoes salvas!' });
      } else {
        const body = await res.json().catch(() => ({}));
        setFeedback({
          type: 'error',
          message: (body as { error?: string }).error ?? 'Erro ao salvar',
        });
      }
    } catch {
      setFeedback({ type: 'error', message: 'Erro ao salvar' });
    } finally {
      setSaving(false);
    }
  }

  const publicUrl = slug
    ? `${window.location.origin}/organizer/${slug}`
    : null;

  return (
    <div>
      <h1 className="font-display text-3xl text-white mb-1">Configuracoes</h1>
      <p className="text-gray-400 mb-8">Gerencie sua conta de organizador.</p>

      <div className="space-y-6 max-w-lg">
        {/* Account info */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
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

        {/* Public profile settings */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h2 className="text-lg font-bold text-white mb-4">Perfil publico</h2>

          {loading ? (
            <p className="text-sm text-gray-500">Carregando...</p>
          ) : (
            <div className="space-y-5">
              {/* Slug */}
              <div>
                <label
                  htmlFor="slug"
                  className="block text-sm font-medium text-gray-400 mb-1"
                >
                  Slug (URL do perfil)
                </label>
                <input
                  id="slug"
                  type="text"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value.toLowerCase())}
                  className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  placeholder="seu-nome-aqui"
                />
                {publicUrl && (
                  <p className="mt-1 text-xs text-gray-500 break-all">
                    {publicUrl}
                  </p>
                )}
              </div>

              {/* Profile enabled toggle */}
              <ToggleField
                id="profile-enabled"
                label="Perfil publico ativo"
                description="Quando desativado, seu perfil nao ficara visivel."
                checked={profileEnabled}
                onChange={setProfileEnabled}
              />

              {/* Show financials toggle */}
              <ToggleField
                id="show-financials"
                label="Mostrar valores financeiros"
                description="Exibir taxas de inscricao e premiacoes no perfil publico."
                checked={showFinancials}
                onChange={setShowFinancials}
              />

              {/* Save button */}
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="flex h-11 w-full items-center justify-center rounded-xl bg-emerald-500 text-sm font-semibold text-gray-950 transition hover:bg-emerald-400 disabled:opacity-50 [touch-action:manipulation]"
              >
                {saving ? 'Salvando...' : 'Salvar configuracoes'}
              </button>

              {/* Feedback */}
              {feedback && (
                <p
                  className={`text-sm text-center ${
                    feedback.type === 'success'
                      ? 'text-emerald-400'
                      : 'text-red-400'
                  }`}
                >
                  {feedback.message}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ToggleField({
  id,
  label,
  description,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <label htmlFor={id} className="text-sm font-medium text-white">
          {label}
        </label>
        <p className="text-xs text-gray-500 mt-0.5">{description}</p>
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
          checked ? 'bg-emerald-500' : 'bg-gray-600'
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
            checked ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  );
}
