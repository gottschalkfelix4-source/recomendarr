import { useEffect, useState, useCallback } from 'react';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Card, CardContent } from '../components/ui/Card';
import { useSettingsStore } from '../store/settings';
import { useRecommendationsStore } from '../store/recommendations';
import { useToast } from '../components/Toast';

interface SettingsFormState {
  tautulliUrl: string;
  tautulliApiKey: string;
  sonarrUrl: string;
  sonarrApiKey: string;
  radarrUrl: string;
  radarrApiKey: string;
  plexUrl: string;
  plexToken: string;
  aiBaseUrl: string;
  aiApiKey: string;
  aiModel: string;
  tmdbApiKey: string;
  historySource: string;
  sonarrQualityProfile: string;
  sonarrMonitored: string;
  radarrQualityProfile: string;
  radarrMonitored: string;
}

interface QualityProfile {
  id: number;
  name: string;
}

const serviceConfig = [
  {
    key: 'tautulli',
    title: 'Tautulli',
    description: 'Plex watch history tracking',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
    color: 'from-orange-500 to-amber-500',
    fields: [
      { key: 'tautulliUrl', label: 'URL', placeholder: 'http://localhost:8181', type: 'text' },
      { key: 'tautulliApiKey', label: 'API Key', placeholder: 'Your Tautulli API Key', type: 'password' },
    ],
  },
  {
    key: 'sonarr',
    title: 'Sonarr',
    description: 'TV series management',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
      </svg>
    ),
    color: 'from-sky-500 to-blue-500',
    fields: [
      { key: 'sonarrUrl', label: 'URL', placeholder: 'http://localhost:8989', type: 'text' },
      { key: 'sonarrApiKey', label: 'API Key', placeholder: 'Your Sonarr API Key', type: 'password' },
    ],
  },
  {
    key: 'radarr',
    title: 'Radarr',
    description: 'Movie management',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
      </svg>
    ),
    color: 'from-yellow-500 to-orange-500',
    fields: [
      { key: 'radarrUrl', label: 'URL', placeholder: 'http://localhost:7878', type: 'text' },
      { key: 'radarrApiKey', label: 'API Key', placeholder: 'Your Radarr API Key', type: 'password' },
    ],
  },
  {
    key: 'plex',
    title: 'Plex',
    description: 'Media server (optional)',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    color: 'from-amber-400 to-yellow-500',
    fields: [
      { key: 'plexUrl', label: 'URL', placeholder: 'http://localhost:32400', type: 'text' },
      { key: 'plexToken', label: 'Token', placeholder: 'Your Plex Token', type: 'password' },
    ],
  },
  {
    key: 'ai',
    title: 'AI Provider',
    description: 'OpenAI-compatible API',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
    ),
    color: 'from-violet-500 to-purple-500',
    fields: [
      { key: 'aiBaseUrl', label: 'Base URL', placeholder: 'https://api.openai.com/v1', type: 'text' },
      { key: 'aiApiKey', label: 'API Key', placeholder: 'Your API Key', type: 'password' },
      { key: 'aiModel', label: 'Model', placeholder: 'gpt-4o', type: 'text' },
    ],
  },
  {
    key: 'tmdb',
    title: 'TMDB',
    description: 'Movie & TV poster images',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
    color: 'from-teal-500 to-emerald-500',
    fields: [
      { key: 'tmdbApiKey', label: 'API Key (v3)', placeholder: 'Your TMDB API Key', type: 'password' },
    ],
  },
];

export const SettingsPage = () => {
  const { toast } = useToast();
  const loadSettings = useSettingsStore((s) => s.loadSettings);
  const updateSettings = useSettingsStore((s) => s.updateSettings);
  const storedSettings = useSettingsStore((s) => s.settings);
  const [initialized, setInitialized] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState<SettingsFormState>({
    tautulliUrl: '',
    tautulliApiKey: '',
    sonarrUrl: '',
    sonarrApiKey: '',
    radarrUrl: '',
    radarrApiKey: '',
    plexUrl: '',
    plexToken: '',
    aiBaseUrl: 'https://api.openai.com/v1',
    aiApiKey: '',
    aiModel: 'gpt-4o',
    tmdbApiKey: '',
    historySource: 'tautulli',
    sonarrQualityProfile: '0',
    sonarrMonitored: 'true',
    radarrQualityProfile: '0',
    radarrMonitored: 'true',
  });

  const [qualityProfiles, setQualityProfiles] = useState<{ sonarr: QualityProfile[]; radarr: QualityProfile[] }>({ sonarr: [], radarr: [] });

  const fetchQualityProfiles = useCallback(async () => {
    try {
      const res = await fetch('/api/settings/quality-profiles');
      const data = await res.json();
      setQualityProfiles(data);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (!initialized) {
      loadSettings();
      fetchQualityProfiles();
      setInitialized(true);
    }
  }, [loadSettings, fetchQualityProfiles, initialized]);

  useEffect(() => {
    if (initialized && storedSettings) {
      setForm((prev) => ({
        ...prev,
        ...Object.fromEntries(
          Object.entries(storedSettings).filter(([, v]) => v !== '')
        ),
      }));
    }
  }, [storedSettings, initialized]);

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateSettings(form);
      await useRecommendationsStore.getState().fetchUsers();
      toast('Settings saved successfully', 'success');
    } catch {
      toast('Failed to save settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-gray-400 mt-1">Configure your service connections</p>
      </div>

      <form onSubmit={handleSubmit}>
        {/* History Source Selector */}
        <Card className="mb-6">
          <CardContent>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-white shadow-lg">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                </svg>
              </div>
              <div>
                <h3 className="text-base font-semibold text-gray-100">History Source</h3>
                <p className="text-xs text-gray-500">Where to pull watch history and user data from</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[
                { value: 'tautulli', label: 'Tautulli', desc: 'Via Tautulli API (recommended)' },
                { value: 'plex', label: 'Plex', desc: 'Directly from Plex server' },
                { value: 'both', label: 'Both', desc: 'Merge data from both sources' },
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => handleChange('historySource', opt.value)}
                  className={`
                    p-3 rounded-lg border text-left transition-all duration-200
                    ${form.historySource === opt.value
                      ? 'border-accent bg-accent/10 ring-1 ring-accent/30'
                      : 'border-surface-300 hover:border-surface-400 bg-surface-100'
                    }
                  `}
                >
                  <p className={`text-sm font-semibold ${form.historySource === opt.value ? 'text-accent-hover' : 'text-gray-200'}`}>
                    {opt.label}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">{opt.desc}</p>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {serviceConfig.map((service) => (
            <Card key={service.key} className="group hover:border-surface-400/50 transition-colors duration-200">
              <CardContent>
                <div className="flex items-center gap-3 mb-5">
                  <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${service.color} flex items-center justify-center text-white shadow-lg`}>
                    {service.icon}
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-gray-100">{service.title}</h3>
                    <p className="text-xs text-gray-500">{service.description}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  {service.fields.map((field) => (
                    <Input
                      key={field.key}
                      label={field.label}
                      type={field.type}
                      value={(form as any)[field.key] || ''}
                      onChange={(e) => handleChange(field.key, e.target.value)}
                      placeholder={field.placeholder}
                    />
                  ))}

                  {/* Quality Profile dropdown for Sonarr */}
                  {service.key === 'sonarr' && qualityProfiles.sonarr.length > 0 && (
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1.5">Quality Profile</label>
                      <select
                        value={form.sonarrQualityProfile}
                        onChange={(e) => handleChange('sonarrQualityProfile', e.target.value)}
                        className="w-full px-3 py-2 text-sm bg-surface-100 border border-surface-300 rounded-lg text-gray-200 focus:border-accent focus:ring-2 focus:ring-accent/20"
                      >
                        <option value="0">Auto (first available)</option>
                        {qualityProfiles.sonarr.map((p) => (
                          <option key={p.id} value={String(p.id)}>{p.name}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Monitored toggle for Sonarr */}
                  {service.key === 'sonarr' && (
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="block text-sm font-medium text-gray-300">Monitored</label>
                        <p className="text-xs text-gray-500">Automatically search for episodes</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleChange('sonarrMonitored', form.sonarrMonitored === 'true' ? 'false' : 'true')}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ${
                          form.sonarrMonitored === 'true' ? 'bg-accent' : 'bg-surface-300'
                        }`}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${
                          form.sonarrMonitored === 'true' ? 'translate-x-6' : 'translate-x-1'
                        }`} />
                      </button>
                    </div>
                  )}

                  {/* Quality Profile dropdown for Radarr */}
                  {service.key === 'radarr' && qualityProfiles.radarr.length > 0 && (
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1.5">Quality Profile</label>
                      <select
                        value={form.radarrQualityProfile}
                        onChange={(e) => handleChange('radarrQualityProfile', e.target.value)}
                        className="w-full px-3 py-2 text-sm bg-surface-100 border border-surface-300 rounded-lg text-gray-200 focus:border-accent focus:ring-2 focus:ring-accent/20"
                      >
                        <option value="0">Auto (first available)</option>
                        {qualityProfiles.radarr.map((p) => (
                          <option key={p.id} value={String(p.id)}>{p.name}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Monitored toggle for Radarr */}
                  {service.key === 'radarr' && (
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="block text-sm font-medium text-gray-300">Monitored</label>
                        <p className="text-xs text-gray-500">Automatically search for movie</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleChange('radarrMonitored', form.radarrMonitored === 'true' ? 'false' : 'true')}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ${
                          form.radarrMonitored === 'true' ? 'bg-accent' : 'bg-surface-300'
                        }`}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${
                          form.radarrMonitored === 'true' ? 'translate-x-6' : 'translate-x-1'
                        }`} />
                      </button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Save Button */}
        <div className="sticky bottom-6 mt-8 flex justify-end">
          <Button type="submit" size="lg" loading={saving} className="shadow-2xl shadow-accent/30">
            {saving ? 'Saving...' : 'Save Settings'}
          </Button>
        </div>
      </form>
    </div>
  );
};
