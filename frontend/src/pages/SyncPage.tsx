import { useEffect, useState, useCallback, useRef } from 'react';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { useToast } from '../components/Toast';

interface AutoRunSettings {
  enabled: boolean;
  interval_hours: number;
  max_movies: number;
  max_series: number;
  min_rating: number;
  users: string;
}

interface AutoRunStatus {
  enabled: boolean;
  is_running: boolean;
  next_run: string | null;
  last_run: RunLog | null;
}

interface RunLog {
  id: number;
  started_at: string;
  finished_at: string | null;
  status: string;
  user: string;
  movies_added: number;
  series_added: number;
  movies_skipped: number;
  series_skipped: number;
  error_message: string | null;
  details: string | null;
}

const intervals = [
  { value: 1, label: 'Every hour' },
  { value: 3, label: 'Every 3 hours' },
  { value: 6, label: 'Every 6 hours' },
  { value: 12, label: 'Every 12 hours' },
  { value: 24, label: 'Daily' },
  { value: 48, label: 'Every 2 days' },
  { value: 168, label: 'Weekly' },
];

function timeAgo(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = Math.floor((now.getTime() - d.getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleString('de-DE', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch { return dateStr; }
}

export const SyncPage = () => {
  const { toast } = useToast();
  const [settings, setSettings] = useState<AutoRunSettings>({
    enabled: false, interval_hours: 24, max_movies: 5, max_series: 5, min_rating: 7.0, users: 'all',
  });
  const [status, setStatus] = useState<AutoRunStatus | null>(null);
  const [logs, setLogs] = useState<RunLog[]>([]);
  const [users, setUsers] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [triggering, setTriggering] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [liveLog, setLiveLog] = useState<{ time: string; level: string; message: string }[]>([]);
  const [logIndex, setLogIndex] = useState(0);
  const logRef = useRef<HTMLDivElement>(null);
  const [expandedLogId, setExpandedLogId] = useState<number | null>(null);

  const fetchAll = useCallback(async () => {
    try {
      const [settingsRes, statusRes, logsRes, usersRes] = await Promise.all([
        fetch('/api/autorun/settings'),
        fetch('/api/autorun/status'),
        fetch('/api/autorun/logs?limit=10'),
        fetch('/api/history/users'),
      ]);
      const s = await settingsRes.json();
      const st = await statusRes.json();
      const l = await logsRes.json();
      const u = await usersRes.json();
      setSettings(s);
      setStatus(st);
      setLogs(l.data || []);
      if (u.success) setUsers(u.data?.map((x: any) => x.user) || []);
    } catch { /* ignore */ }
    setLoaded(true);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Poll status + live log while running
  useEffect(() => {
    if (!status?.is_running) return;
    let idx = logIndex;
    const interval = setInterval(async () => {
      try {
        const [st, l, ll] = await Promise.all([
          fetch('/api/autorun/status').then(r => r.json()),
          fetch('/api/autorun/logs?limit=10').then(r => r.json()),
          fetch(`/api/autorun/livelog?since=${idx}`).then(r => r.json()),
        ]);
        setStatus(st);
        setLogs(l.data || []);
        if (ll.entries?.length > 0) {
          setLiveLog(prev => [...prev, ...ll.entries]);
          idx = ll.next_index;
          setLogIndex(ll.next_index);
          // Auto-scroll
          setTimeout(() => logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: 'smooth' }), 50);
        }
        if (!st.is_running) {
          clearInterval(interval);
          toast('Auto-run completed', 'success');
        }
      } catch { /* ignore */ }
    }, 1500);
    return () => clearInterval(interval);
  }, [status?.is_running, toast]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/autorun/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      const data = await res.json();
      if (data.success) toast('Auto-run settings saved', 'success');
      await fetchAll();
    } catch { toast('Failed to save', 'error'); }
    finally { setSaving(false); }
  };

  const handleTrigger = async () => {
    setTriggering(true);
    setLiveLog([]);
    setLogIndex(0);
    try {
      const res = await fetch('/api/autorun/trigger', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        toast('Auto-run started...', 'info');
        // Refresh status to pick up is_running
        setTimeout(fetchAll, 500);
      } else {
        toast(data.message || 'Failed', 'error');
      }
    } catch { toast('Failed to trigger', 'error'); }
    finally { setTriggering(false); }
  };

  const selectedUsers = settings.users === 'all' ? [] : settings.users.split(',').map(s => s.trim()).filter(Boolean);
  const toggleUser = (user: string) => {
    const current = new Set(selectedUsers);
    if (current.has(user)) current.delete(user);
    else current.add(user);
    setSettings({ ...settings, users: current.size === 0 || current.size === users.length ? 'all' : Array.from(current).join(',') });
  };

  if (!loaded) return null;

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Auto-Run</h1>
          <p className="text-gray-400 mt-1">Automatically generate recommendations and add them to your library</p>
        </div>
        <Button onClick={handleTrigger} loading={triggering || status?.is_running} variant="success" size="lg">
          {status?.is_running ? 'Running...' : 'Run Now'}
        </Button>
      </div>

      {/* Live Log Panel */}
      {(status?.is_running || liveLog.length > 0) && (
        <Card className="mb-6 overflow-hidden">
          <div className="px-4 py-3 border-b border-surface-300/50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {status?.is_running && (
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              )}
              <h3 className="text-sm font-semibold text-gray-300">Live Log</h3>
            </div>
            {!status?.is_running && liveLog.length > 0 && (
              <button
                onClick={() => setLiveLog([])}
                className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
              >
                Clear
              </button>
            )}
          </div>
          <div
            ref={logRef}
            className="p-4 max-h-80 overflow-y-auto font-mono text-xs leading-relaxed bg-[#0d0f12]"
          >
            {liveLog.map((entry, i) => (
              <div key={i} className={`py-0.5 ${
                entry.level === 'error' ? 'text-red-400' :
                entry.level === 'warn' ? 'text-amber-400' :
                entry.message.startsWith('  >>') ? 'text-cyan-400' :
                entry.message.startsWith('    +') ? 'text-emerald-400' :
                entry.message.startsWith('    ~') ? 'text-gray-500' :
                entry.message.startsWith('    !') ? 'text-red-400' :
                'text-gray-400'
              }`}>
                <span className="text-gray-600 mr-2">{entry.time.split('T')[1]?.slice(0, 8)}</span>
                {entry.message}
              </div>
            ))}
            {status?.is_running && (
              <div className="py-0.5 text-gray-500 animate-pulse">...</div>
            )}
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Settings */}
        <div className="lg:col-span-2 space-y-6">
          {/* Enable + Interval */}
          <Card>
            <CardContent>
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-white shadow-lg">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-gray-100">Schedule</h3>
                    <p className="text-xs text-gray-500">Enable automatic runs on a schedule</p>
                  </div>
                </div>
                <button
                  onClick={() => setSettings({ ...settings, enabled: !settings.enabled })}
                  className={`relative w-12 h-7 rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-accent/40 ${settings.enabled ? 'bg-emerald-500' : 'bg-surface-300'}`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-6 h-6 rounded-full bg-white shadow-md transition-transform duration-200 ${settings.enabled ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {intervals.map((iv) => (
                  <button
                    key={iv.value}
                    type="button"
                    onClick={() => setSettings({ ...settings, interval_hours: iv.value })}
                    className={`px-3 py-2 rounded-lg border text-sm font-medium transition-all ${
                      settings.interval_hours === iv.value
                        ? 'border-accent bg-accent/10 text-accent-hover ring-1 ring-accent/30'
                        : 'border-surface-300 text-gray-400 hover:border-surface-400 bg-surface-100'
                    }`}
                  >
                    {iv.label}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Limits */}
          <Card>
            <CardContent>
              <div className="flex items-center gap-3 mb-5">
                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center text-white shadow-lg">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-base font-semibold text-gray-100">Limits per Run</h3>
                  <p className="text-xs text-gray-500">Control how many items get added each cycle</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Input
                  label="Max Movies"
                  type="number"
                  value={String(settings.max_movies)}
                  onChange={(e) => setSettings({ ...settings, max_movies: parseInt(e.target.value) || 0 })}
                  hint="Per user, per run"
                  min="0" max="50"
                />
                <Input
                  label="Max Series"
                  type="number"
                  value={String(settings.max_series)}
                  onChange={(e) => setSettings({ ...settings, max_series: parseInt(e.target.value) || 0 })}
                  hint="Per user, per run"
                  min="0" max="50"
                />
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">Min Rating</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="range" min="0" max="10" step="0.5"
                      value={settings.min_rating}
                      onChange={(e) => setSettings({ ...settings, min_rating: parseFloat(e.target.value) })}
                      className="flex-1 h-2 rounded-full appearance-none bg-surface-300 accent-amber-400 cursor-pointer"
                    />
                    <span className="text-sm font-mono text-amber-400 w-8 text-right">{settings.min_rating}</span>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">Only add if AI rates &ge; this</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Users */}
          <Card>
            <CardContent>
              <div className="flex items-center gap-3 mb-5">
                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-sky-500 to-blue-500 flex items-center justify-center text-white shadow-lg">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-base font-semibold text-gray-100">Users</h3>
                  <p className="text-xs text-gray-500">Generate recommendations for these users</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setSettings({ ...settings, users: 'all' })}
                  className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-all ${
                    settings.users === 'all'
                      ? 'border-accent bg-accent/10 text-accent-hover ring-1 ring-accent/30'
                      : 'border-surface-300 text-gray-400 hover:border-surface-400 bg-surface-100'
                  }`}
                >
                  All Users
                </button>
                {users.map((user) => (
                  <button
                    key={user}
                    type="button"
                    onClick={() => toggleUser(user)}
                    className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-all ${
                      settings.users === 'all' || selectedUsers.includes(user)
                        ? 'border-accent bg-accent/10 text-accent-hover ring-1 ring-accent/30'
                        : 'border-surface-300 text-gray-400 hover:border-surface-400 bg-surface-100'
                    }`}
                  >
                    {user}
                  </button>
                ))}
              </div>
              {users.length === 0 && (
                <p className="text-sm text-gray-500 mt-2">No users found. Hit Sync in the navbar first.</p>
              )}
            </CardContent>
          </Card>

          {/* Save */}
          <div className="flex justify-end">
            <Button onClick={handleSave} loading={saving} size="lg" className="shadow-2xl shadow-accent/30">
              Save Settings
            </Button>
          </div>
        </div>

        {/* Right Column: Status + Logs */}
        <div className="space-y-6">
          {/* Status Card */}
          <Card>
            <CardContent>
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Status</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400">State</span>
                  <span className={`inline-flex items-center gap-1.5 text-sm font-medium ${
                    status?.is_running ? 'text-amber-400' : settings.enabled ? 'text-emerald-400' : 'text-gray-500'
                  }`}>
                    <span className={`w-2 h-2 rounded-full ${
                      status?.is_running ? 'bg-amber-400 animate-pulse' : settings.enabled ? 'bg-emerald-400 animate-pulse-soft' : 'bg-gray-500'
                    }`} />
                    {status?.is_running ? 'Running' : settings.enabled ? 'Active' : 'Disabled'}
                  </span>
                </div>
                {status?.next_run && settings.enabled && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-400">Next Run</span>
                    <span className="text-sm text-gray-200">{formatDate(status.next_run)}</span>
                  </div>
                )}
                {status?.last_run && (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-400">Last Run</span>
                      <span className="text-sm text-gray-200">{timeAgo(status.last_run.started_at)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-400">Result</span>
                      <span className={`text-sm font-medium ${status.last_run.status === 'success' ? 'text-emerald-400' : status.last_run.status === 'failed' ? 'text-red-400' : 'text-amber-400'}`}>
                        {status.last_run.status === 'success'
                          ? `+${status.last_run.movies_added} movies, +${status.last_run.series_added} series`
                          : status.last_run.status}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Run Log */}
          <Card>
            <CardContent>
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Run History</h3>
              {logs.length === 0 ? (
                <p className="text-sm text-gray-500">No runs yet</p>
              ) : (
                <div className="space-y-2">
                  {logs.map((log) => {
                    const isExpanded = expandedLogId === log.id;
                    const details: { user: string; added: string[]; skipped: string[]; errors: string[] }[] =
                      log.details ? (() => { try { return JSON.parse(log.details); } catch { return []; } })() : [];

                    return (
                      <div key={log.id}>
                        <button
                          onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                          className={`w-full text-left p-3 rounded-lg border transition-all ${
                            isExpanded
                              ? 'bg-surface-200 border-surface-400/50'
                              : 'bg-surface-100 border-surface-300/50 hover:border-surface-400/50'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <div className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${
                              log.status === 'success' ? 'bg-emerald-400' : log.status === 'failed' ? 'bg-red-400' : 'bg-amber-400 animate-pulse'
                            }`} />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <span className="text-xs text-gray-400">{formatDate(log.started_at)}</span>
                                <div className="flex items-center gap-2">
                                  <span className={`text-xs font-medium ${log.status === 'success' ? 'text-emerald-400' : log.status === 'failed' ? 'text-red-400' : 'text-amber-400'}`}>
                                    {log.status}
                                  </span>
                                  <svg className={`w-3 h-3 text-gray-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                                  </svg>
                                </div>
                              </div>
                              {log.status === 'success' && (
                                <p className="text-xs text-gray-300 mt-1">
                                  +{log.movies_added} movies, +{log.series_added} series
                                  {(log.movies_skipped > 0 || log.series_skipped > 0) && (
                                    <span className="text-gray-500"> ({log.movies_skipped + log.series_skipped} skipped)</span>
                                  )}
                                </p>
                              )}
                              {log.error_message && (
                                <p className="text-xs text-red-400 mt-1 truncate">{log.error_message}</p>
                              )}
                            </div>
                          </div>
                        </button>

                        {/* Expanded Details */}
                        {isExpanded && details.length > 0 && (
                          <div className="mt-1 ml-5 space-y-3 p-3 rounded-lg bg-[#0d0f12] border border-surface-300/30">
                            {details.map((d, i) => (
                              <div key={i}>
                                <p className="text-xs font-semibold text-gray-300 mb-1.5 flex items-center gap-1.5">
                                  <svg className="w-3 h-3 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                  </svg>
                                  {d.user}
                                </p>
                                {d.added.length > 0 && (
                                  <div className="mb-1.5">
                                    {d.added.map((item, j) => (
                                      <div key={j} className="flex items-center gap-1.5 py-0.5 text-xs text-emerald-400">
                                        <svg className="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                                        </svg>
                                        {item}
                                      </div>
                                    ))}
                                  </div>
                                )}
                                {d.skipped.length > 0 && (
                                  <div className="mb-1.5">
                                    {d.skipped.map((item, j) => (
                                      <div key={j} className="flex items-center gap-1.5 py-0.5 text-xs text-gray-500">
                                        <svg className="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                          <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />
                                        </svg>
                                        {item}
                                        <span className="text-gray-600">— already in library</span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                                {d.errors.length > 0 && (
                                  <div>
                                    {d.errors.map((item, j) => (
                                      <div key={j} className="flex items-start gap-1.5 py-0.5 text-xs text-red-400">
                                        <svg className="w-3 h-3 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                        <span>{item}</span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                                {d.added.length === 0 && d.skipped.length === 0 && d.errors.length === 0 && (
                                  <p className="text-xs text-gray-600 italic">No actions taken</p>
                                )}
                              </div>
                            ))}
                            {log.finished_at && (
                              <div className="pt-2 mt-2 border-t border-surface-300/30 text-xs text-gray-600">
                                Duration: {(() => {
                                  const start = new Date(log.started_at).getTime();
                                  const end = new Date(log.finished_at).getTime();
                                  const sec = Math.round((end - start) / 1000);
                                  return sec < 60 ? `${sec}s` : `${Math.floor(sec / 60)}m ${sec % 60}s`;
                                })()}
                              </div>
                            )}
                          </div>
                        )}
                        {isExpanded && !details.length && log.error_message && (
                          <div className="mt-1 ml-5 p-3 rounded-lg bg-[#0d0f12] border border-red-500/20">
                            <p className="text-xs text-red-400">{log.error_message}</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
