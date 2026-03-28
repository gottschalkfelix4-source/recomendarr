import { useEffect, useState } from 'react';
import { Card } from '../components/ui/Card';

interface HistoryItem {
  id: number | null;
  username: string | null;
  title: string;
  parent_title: string | null;
  grandparent_title: string | null;
  media_type: string;
  view_date: string;
  watched: boolean;
  duration: number;
  rating_key: string | null;
}

function formatDuration(seconds: number): string {
  if (!seconds) return '-';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }) +
      ' ' + d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return dateStr;
  }
}

export const HistoryPage = () => {
  const [users, setUsers] = useState<string[]>([]);
  const [selectedUser, setSelectedUser] = useState('');
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/history/users');
      const data = await response.json();
      if (data.success) {
        setUsers(data.data.map((u: any) => u.user));
      }
    } catch (err) {
      console.error('Failed to fetch users:', err);
    }
  };

  const fetchHistory = async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (selectedUser) params.set('username', selectedUser);
      params.set('limit', '100');
      const url = `/api/history/?${params.toString()}`;
      const response = await fetch(url);
      const data = await response.json();
      if (data.success) {
        setHistory(data.data || []);
      } else {
        setError(data.detail || 'Failed to fetch history');
        setHistory([]);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch history');
      setHistory([]);
    } finally {
      setLoading(false);
    }
  };

  const [initialLoad, setInitialLoad] = useState(true);

  // Fetch history on mount and when user changes
  useEffect(() => {
    if (initialLoad && users.length >= 0) {
      setInitialLoad(false);
      fetchHistory();
    }
  }, [users, initialLoad]);

  useEffect(() => {
    if (!initialLoad) {
      fetchHistory();
    }
  }, [selectedUser]);

  const mediaTypeLabel = (type: string) => {
    switch (type) {
      case 'episode': return 'Episode';
      case 'movie': return 'Movie';
      case 'track': return 'Track';
      default: return type;
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Watch History</h1>
          <p className="text-gray-400 mt-1">View your Plex watch history from Tautulli</p>
        </div>

        <div className="flex items-center gap-3">
          <select
            className="px-3 py-2 text-sm bg-surface-100 border border-surface-300 rounded-lg text-gray-200 focus:border-accent focus:ring-2 focus:ring-accent/20"
            value={selectedUser}
            onChange={(e) => setSelectedUser(e.target.value)}
          >
            <option value="">All Users</option>
            {users.map((user) => (
              <option key={user} value={user}>{user}</option>
            ))}
          </select>

          <button
            onClick={fetchHistory}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium bg-surface-200 hover:bg-surface-300 text-gray-200 rounded-lg transition-colors disabled:opacity-50"
          >
            <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-3">
            <svg className="animate-spin h-8 w-8 text-accent" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <span className="text-sm text-gray-400">Loading history...</span>
          </div>
        </div>
      ) : history.length === 0 && !error ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-2xl bg-surface-200 flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-gray-400 text-lg font-medium">No watch history found</p>
          <p className="text-gray-500 text-sm mt-1">Hit the Sync button in the navbar to pull data from Tautulli</p>
        </div>
      ) : history.length > 0 && (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-surface-300/50">
                  <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Title</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Type</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">User</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Date</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Duration</th>
                </tr>
              </thead>
              <tbody>
                {history.map((item, i) => (
                  <tr
                    key={`${item.id}-${i}`}
                    className={`border-b border-surface-300/30 hover:bg-surface-200/50 transition-colors ${i % 2 === 0 ? 'bg-surface/50' : ''}`}
                  >
                    <td className="px-5 py-3.5 text-sm text-gray-200 font-medium max-w-xs truncate">
                      {item.title}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`
                        inline-flex px-2 py-0.5 text-xs font-medium rounded-md uppercase
                        ${item.media_type === 'movie'
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          : item.media_type === 'episode'
                          ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                          : 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                        }
                      `}>
                        {mediaTypeLabel(item.media_type)}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-gray-400">{item.username || '-'}</td>
                    <td className="px-5 py-3.5 text-sm text-gray-400">{formatDate(item.view_date)}</td>
                    <td className="px-5 py-3.5 text-sm text-gray-400">{formatDuration(item.duration)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-5 py-3 border-t border-surface-300/50 text-xs text-gray-500">
            Showing {history.length} entries
          </div>
        </Card>
      )}
    </div>
  );
};
