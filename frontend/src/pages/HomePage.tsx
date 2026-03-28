import { useState, useCallback, type ReactNode } from 'react';
import { SettingsPage } from './SettingsPage';
import { RecommendationsPage } from './RecommendationsPage';
import { HistoryPage } from './HistoryPage';
import { SyncPage } from './SyncPage';
import { AISettingsPage } from './AISettingsPage';
import { useToast } from '../components/Toast';

type Tab = 'recommendations' | 'history' | 'ai' | 'sync' | 'settings';

const tabs: { id: Tab; label: string; icon: ReactNode }[] = [
  {
    id: 'recommendations',
    label: 'Recommendations',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
    ),
  },
  {
    id: 'history',
    label: 'History',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    id: 'ai',
    label: 'AI Config',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    id: 'sync',
    label: 'Auto-Run',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </svg>
    ),
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
];

export const HomePage = () => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<Tab>('recommendations');
  const [syncing, setSyncing] = useState(false);
  const [syncKey, setSyncKey] = useState(0);

  const handleSync = useCallback(async () => {
    setSyncing(true);
    try {
      // Fetch users from Tautulli
      const usersRes = await fetch('/api/history/users');
      const usersData = await usersRes.json();

      if (!usersRes.ok || !usersData.success) {
        const msg = usersData?.detail || usersData?.message || 'Failed to fetch users';
        toast(msg, 'error');
        setSyncing(false);
        return;
      }

      const userCount = usersData.data?.length || 0;

      // Also prefetch history
      await fetch('/api/history/?limit=50');

      // Bump key to force child components to re-mount and re-fetch
      setSyncKey((k) => k + 1);

      toast(`Synced ${userCount} user${userCount !== 1 ? 's' : ''} from Tautulli`, 'success');
    } catch (err: any) {
      toast(err?.message || 'Sync failed - check your Tautulli settings', 'error');
    } finally {
      setSyncing(false);
    }
  }, [toast]);

  return (
    <div className="min-h-screen bg-[#111318]">
      {/* Navigation */}
      <nav className="bg-surface border-b border-surface-300/50 sticky top-0 z-40 backdrop-blur-sm bg-surface/95">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              {/* Logo */}
              <div className="flex items-center gap-2.5 mr-8">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent to-purple-500 flex items-center justify-center shadow-lg shadow-accent/20">
                  <svg className="w-4.5 h-4.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7 4V2m0 2a2 2 0 110 4m0-4a2 2 0 100 4m10-4V2m0 2a2 2 0 110 4m0-4a2 2 0 100 4m-6 8v2m0-2a2 2 0 110-4m0 4a2 2 0 100-4" />
                  </svg>
                </div>
                <span className="text-lg font-bold text-white tracking-tight">
                  Recomendarr
                </span>
              </div>

              {/* Tab Navigation */}
              <div className="flex items-center gap-1">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`
                      flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium
                      transition-all duration-200
                      ${activeTab === tab.id
                        ? 'bg-surface-200 text-white shadow-sm'
                        : 'text-gray-400 hover:text-gray-200 hover:bg-surface-200/50'
                      }
                    `}
                  >
                    {tab.icon}
                    <span className="hidden sm:inline">{tab.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Sync Button */}
            <button
              onClick={handleSync}
              disabled={syncing}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium
                bg-emerald-600 hover:bg-emerald-500 text-white
                transition-all duration-200 shadow-lg shadow-emerald-600/20
                disabled:opacity-60 disabled:cursor-not-allowed
              `}
            >
              <svg
                className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span className="hidden sm:inline">{syncing ? 'Syncing...' : 'Sync'}</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div key={syncKey} className="animate-fade-in">
          {activeTab === 'recommendations' && <RecommendationsPage />}
          {activeTab === 'history' && <HistoryPage />}
          {activeTab === 'ai' && <AISettingsPage />}
          {activeTab === 'sync' && <SyncPage />}
          {activeTab === 'settings' && <SettingsPage />}
        </div>
      </main>
    </div>
  );
};
