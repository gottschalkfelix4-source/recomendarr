import { create } from 'zustand';

interface Settings {
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

interface SettingsState {
  settings: Settings;
  loadSettings: () => void;
  updateSettings: (settings: Partial<Settings>) => void;
  testConnection: (type: string, url: string, apiKey?: string, baseUrl?: string) => Promise<{ success: boolean; message: string }>;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: {
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
  },

  loadSettings: async () => {
    try {
      const response = await fetch('/api/settings/');
      const data = await response.json();
      if (data.success) {
        const settingsData = data.settings;
        // Convert camelCase keys from API to our snake_case
        set({
          settings: {
            tautulliUrl: settingsData.tautulli_url || '',
            tautulliApiKey: settingsData.tautulli_api_key || '',
            sonarrUrl: settingsData.sonarr_url || '',
            sonarrApiKey: settingsData.sonarr_api_key || '',
            radarrUrl: settingsData.radarr_url || '',
            radarrApiKey: settingsData.radarr_api_key || '',
            plexUrl: settingsData.plex_url || '',
            plexToken: settingsData.plex_token || '',
            aiBaseUrl: settingsData.ai_base_url || 'https://api.openai.com/v1',
            aiApiKey: settingsData.ai_api_key || '',
            aiModel: settingsData.ai_model || 'gpt-4o',
            tmdbApiKey: settingsData.tmdb_api_key || '',
            historySource: settingsData.history_source || 'tautulli',
            sonarrQualityProfile: settingsData.sonarr_quality_profile || '0',
            sonarrMonitored: settingsData.sonarr_monitored || 'true',
            radarrQualityProfile: settingsData.radarr_quality_profile || '0',
            radarrMonitored: settingsData.radarr_monitored || 'true',
          }
        });
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  },

  updateSettings: async (settings: Partial<Settings>) => {
    // Convert our camelCase to snake_case for API
    const apiSettings: any = {};
    if (settings.tautulliUrl !== undefined) apiSettings.tautulli_url = settings.tautulliUrl;
    if (settings.tautulliApiKey !== undefined) apiSettings.tautulli_api_key = settings.tautulliApiKey;
    if (settings.sonarrUrl !== undefined) apiSettings.sonarr_url = settings.sonarrUrl;
    if (settings.sonarrApiKey !== undefined) apiSettings.sonarr_api_key = settings.sonarrApiKey;
    if (settings.radarrUrl !== undefined) apiSettings.radarr_url = settings.radarrUrl;
    if (settings.radarrApiKey !== undefined) apiSettings.radarr_api_key = settings.radarrApiKey;
    if (settings.plexUrl !== undefined) apiSettings.plex_url = settings.plexUrl;
    if (settings.plexToken !== undefined) apiSettings.plex_token = settings.plexToken;
    if (settings.aiBaseUrl !== undefined) apiSettings.ai_base_url = settings.aiBaseUrl;
    if (settings.aiApiKey !== undefined) apiSettings.ai_api_key = settings.aiApiKey;
    if (settings.aiModel !== undefined) apiSettings.ai_model = settings.aiModel;
    if (settings.tmdbApiKey !== undefined) apiSettings.tmdb_api_key = settings.tmdbApiKey;
    if (settings.historySource !== undefined) apiSettings.history_source = settings.historySource;
    if (settings.sonarrQualityProfile !== undefined) apiSettings.sonarr_quality_profile = settings.sonarrQualityProfile;
    if (settings.sonarrMonitored !== undefined) apiSettings.sonarr_monitored = settings.sonarrMonitored;
    if (settings.radarrQualityProfile !== undefined) apiSettings.radarr_quality_profile = settings.radarrQualityProfile;
    if (settings.radarrMonitored !== undefined) apiSettings.radarr_monitored = settings.radarrMonitored;

    try {
      const response = await fetch('/api/settings/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(apiSettings),
      });
      const data = await response.json();
      if (data.success) {
        set({ settings: { ...get().settings, ...settings } });
      }
    } catch (error) {
      console.error('Failed to update settings:', error);
    }
  },

  testConnection: async (type: string, url: string, apiKey?: string, baseUrl?: string) => {
    try {
      const response = await fetch('/api/settings/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          url,
          api_key: apiKey,
          base_url: baseUrl,
        }),
      });
      return await response.json();
    } catch (error) {
      return { success: false, message: `Connection test failed: ${error}` };
    }
  },
}));
