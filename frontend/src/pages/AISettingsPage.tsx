import { useEffect, useState } from 'react';
import { Card, CardContent } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { useToast } from '../components/Toast';

interface AISettings {
  ai_history_depth: string;
  ai_max_titles: string;
  ai_num_recommendations: string;
  ai_temperature: string;
  ai_custom_prompt: string;
}

const defaults: AISettings = {
  ai_history_depth: '200',
  ai_max_titles: '30',
  ai_num_recommendations: '10',
  ai_temperature: '0.7',
  ai_custom_prompt: '',
};

export const AISettingsPage = () => {
  const { toast } = useToast();
  const [form, setForm] = useState<AISettings>(defaults);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/settings/');
        const data = await res.json();
        if (data.success) {
          const s = data.settings;
          setForm({
            ai_history_depth: s.ai_history_depth || defaults.ai_history_depth,
            ai_max_titles: s.ai_max_titles || defaults.ai_max_titles,
            ai_num_recommendations: s.ai_num_recommendations || defaults.ai_num_recommendations,
            ai_temperature: s.ai_temperature || defaults.ai_temperature,
            ai_custom_prompt: s.ai_custom_prompt || '',
          });
        }
      } catch {
        // use defaults
      }
      setLoaded(true);
    })();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/settings/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.success) {
        toast('AI settings saved', 'success');
      } else {
        toast('Failed to save', 'error');
      }
    } catch {
      toast('Failed to save', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (!loaded) return null;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">AI Configuration</h1>
        <p className="text-gray-400 mt-1">Fine-tune how the AI analyzes your watch history and generates recommendations</p>
      </div>

      <div className="grid gap-6 max-w-3xl">
        {/* History Analysis */}
        <Card>
          <CardContent>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white shadow-lg">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h3 className="text-base font-semibold text-gray-100">History Analysis</h3>
                <p className="text-xs text-gray-500">How much watch history the AI should look at</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="History Depth"
                type="number"
                value={form.ai_history_depth}
                onChange={(e) => setForm({ ...form, ai_history_depth: e.target.value })}
                hint={`Last ${form.ai_history_depth} watched items from Tautulli`}
                min="10"
                max="1000"
              />
              <Input
                label="Max Unique Titles"
                type="number"
                value={form.ai_max_titles}
                onChange={(e) => setForm({ ...form, ai_max_titles: e.target.value })}
                hint="Grouped titles sent to the AI (episodes count as 1)"
                min="5"
                max="100"
              />
            </div>
          </CardContent>
        </Card>

        {/* Recommendations */}
        <Card>
          <CardContent>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center text-white shadow-lg">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <div>
                <h3 className="text-base font-semibold text-gray-100">Recommendations Output</h3>
                <p className="text-xs text-gray-500">How many recommendations to generate and creativity level</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Number of Recommendations"
                type="number"
                value={form.ai_num_recommendations}
                onChange={(e) => setForm({ ...form, ai_num_recommendations: e.target.value })}
                hint="How many titles the AI should suggest"
                min="3"
                max="30"
              />
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">
                  Temperature (Creativity)
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="0"
                    max="1.5"
                    step="0.1"
                    value={form.ai_temperature}
                    onChange={(e) => setForm({ ...form, ai_temperature: e.target.value })}
                    className="flex-1 h-2 rounded-full appearance-none bg-surface-300 accent-accent cursor-pointer"
                  />
                  <span className="text-sm font-mono text-gray-300 w-10 text-right">
                    {parseFloat(form.ai_temperature).toFixed(1)}
                  </span>
                </div>
                <p className="mt-1.5 text-xs text-gray-500">
                  {parseFloat(form.ai_temperature) <= 0.3
                    ? 'Conservative - safe, popular picks'
                    : parseFloat(form.ai_temperature) <= 0.7
                    ? 'Balanced - good mix of popular and niche'
                    : parseFloat(form.ai_temperature) <= 1.0
                    ? 'Creative - more diverse, unexpected picks'
                    : 'Experimental - very creative, might be hit or miss'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Custom Instructions */}
        <Card>
          <CardContent>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center text-white shadow-lg">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </div>
              <div>
                <h3 className="text-base font-semibold text-gray-100">Custom Instructions</h3>
                <p className="text-xs text-gray-500">Additional rules the AI should follow when recommending</p>
              </div>
            </div>

            <textarea
              value={form.ai_custom_prompt}
              onChange={(e) => setForm({ ...form, ai_custom_prompt: e.target.value })}
              placeholder="e.g. No anime, only movies from 2015 or later, prefer sci-fi and thriller, avoid horror..."
              rows={4}
              className="w-full px-3 py-2 text-sm bg-surface-100 border border-surface-300 rounded-lg text-gray-200 placeholder-gray-500 transition-all duration-200 focus:border-accent focus:ring-2 focus:ring-accent/20 resize-y"
            />
            <p className="mt-1.5 text-xs text-gray-500">
              These instructions are appended to the AI prompt. Be specific about what you want or don't want.
            </p>
          </CardContent>
        </Card>

        {/* Preview */}
        <Card className="border-surface-300/30 bg-surface/50">
          <CardContent>
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Current Configuration Summary</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-gray-500">History Depth</p>
                <p className="text-lg font-bold text-white">{form.ai_history_depth}</p>
                <p className="text-xs text-gray-500">items</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Unique Titles</p>
                <p className="text-lg font-bold text-white">{form.ai_max_titles}</p>
                <p className="text-xs text-gray-500">max to AI</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Recommendations</p>
                <p className="text-lg font-bold text-white">{form.ai_num_recommendations}</p>
                <p className="text-xs text-gray-500">per run</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Temperature</p>
                <p className="text-lg font-bold text-white">{parseFloat(form.ai_temperature).toFixed(1)}</p>
                <p className="text-xs text-gray-500">creativity</p>
              </div>
            </div>
            {form.ai_custom_prompt && (
              <div className="mt-4 pt-4 border-t border-surface-300/30">
                <p className="text-xs text-gray-500 mb-1">Custom Instructions</p>
                <p className="text-sm text-gray-300 italic">"{form.ai_custom_prompt}"</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Save */}
        <div className="flex justify-end">
          <Button onClick={handleSave} loading={saving} size="lg" className="shadow-2xl shadow-accent/30">
            {saving ? 'Saving...' : 'Save AI Settings'}
          </Button>
        </div>
      </div>
    </div>
  );
};
