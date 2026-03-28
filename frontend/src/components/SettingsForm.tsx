import { useCallback, useState } from 'react';
import { Input } from './ui/Input';
import { Button } from './ui/Button';

interface SettingsFormProps {
  onSave: (settings: any) => void;
  onCancel?: () => void;
}

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
}

const formStyles = {
  form: {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  } as const,
  card: {
    backgroundColor: '#ffffff',
    borderRadius: '0.75rem',
    border: '1px solid #e5e7eb',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
    padding: '1.5rem',
  } as const,
  cardTitle: {
    fontSize: '1.125rem',
    fontWeight: '600',
    color: '#111827',
    margin: '0 0 1.25rem 0',
    paddingBottom: '0.75rem',
    borderBottom: '1px solid #e5e7eb',
  } as const,
  inputLabel: {
    display: 'block',
    fontSize: '0.875rem',
    fontWeight: '500',
    color: '#374151',
    marginBottom: '0.25rem',
  } as const,
  inputField: {
    width: '100%',
    padding: '0.5rem 0.75rem',
    fontSize: '0.875rem',
    border: '1px solid #d1d5db',
    borderRadius: '0.5rem',
    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
    outline: 'none',
    boxSizing: 'border-box',
  } as const,
  section: {
    marginBottom: '1.5rem',
  } as const,
  buttonContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    marginTop: '1.5rem',
    paddingTop: '1rem',
    borderTop: '1px solid #e5e7eb',
  } as const,
  submitBtn: {
    backgroundColor: '#4f46e5',
    color: '#ffffff',
    padding: '0.75rem 1.5rem',
    fontSize: '0.875rem',
    fontWeight: '500',
    borderRadius: '0.5rem',
    border: 'none',
    cursor: 'pointer',
    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
  } as const,
  cancelBtn: {
    backgroundColor: '#ffffff',
    color: '#374151',
    padding: '0.75rem 1.5rem',
    fontSize: '0.875rem',
    fontWeight: '500',
    borderRadius: '0.5rem',
    border: '1px solid #d1d5db',
    cursor: 'pointer',
    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
  } as const,
};

export const SettingsForm = ({ onSave, onCancel }: SettingsFormProps) => {
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
  });

  const handleChange = useCallback((field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    onSave(form);
  }, [form, onSave]);

  const renderInput = (label: string, field: string, type: string = 'text', placeholder: string = '') => (
    <div style={formStyles.section}>
      <label style={formStyles.inputLabel}>{label}</label>
      <Input
        label=""
        type={type}
        value={form[field as keyof SettingsFormState]}
        onChange={(e) => handleChange(field, e.target.value)}
        placeholder={placeholder}
        style={formStyles.inputField}
      />
    </div>
  );

  return (
    <form onSubmit={handleSubmit} style={formStyles.form}>
      {/* Tautulli */}
      <div style={formStyles.card}>
        <h3 style={formStyles.cardTitle}>Tautulli</h3>
        {renderInput('URL', 'tautulliUrl', 'text', 'http://localhost:8181')}
        {renderInput('API Key', 'tautulliApiKey', 'password', 'Your Tautulli API Key')}
      </div>

      {/* Sonarr */}
      <div style={formStyles.card}>
        <h3 style={formStyles.cardTitle}>Sonarr</h3>
        {renderInput('URL', 'sonarrUrl', 'text', 'http://localhost:8989')}
        {renderInput('API Key', 'sonarrApiKey', 'password', 'Your Sonarr API Key')}
      </div>

      {/* Radarr */}
      <div style={formStyles.card}>
        <h3 style={formStyles.cardTitle}>Radarr</h3>
        {renderInput('URL', 'radarrUrl', 'text', 'http://localhost:7878')}
        {renderInput('API Key', 'radarrApiKey', 'password', 'Your Radarr API Key')}
      </div>

      {/* Plex */}
      <div style={formStyles.card}>
        <h3 style={formStyles.cardTitle}>Plex</h3>
        {renderInput('URL', 'plexUrl', 'text', 'http://localhost:32400')}
        {renderInput('Token', 'plexToken', 'password', 'Your Plex Token')}
      </div>

      {/* AI Provider */}
      <div style={formStyles.card}>
        <h3 style={formStyles.cardTitle}>AI Provider</h3>
        {renderInput('Base URL', 'aiBaseUrl', 'text', 'https://api.openai.com/v1')}
        {renderInput('API Key', 'aiApiKey', 'password', 'Your API Key')}
        {renderInput('Model', 'aiModel', 'text', 'gpt-4o')}
      </div>

      {/* Buttons */}
      <div style={formStyles.buttonContainer}>
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} style={formStyles.cancelBtn}>
            Cancel
          </Button>
        )}
        <Button type="submit" style={formStyles.submitBtn}>
          Save Settings
        </Button>
      </div>
    </form>
  );
};
