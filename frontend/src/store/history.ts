import { create } from 'zustand';

interface HistoryItem {
  id: number;
  username: string;
  title: string;
  mediaType: string;
  viewDate: string;
  watched: boolean;
}

interface HistoryState {
  history: HistoryItem[];
  loading: boolean;
  users: string[];
  selectedUser: string | null;

  fetchHistory: (username?: string) => Promise<void>;
  fetchUsers: () => Promise<void>;
  setSelectedUser: (user: string | null) => void;
}

export const useHistoryStore = create<HistoryState>((set, get) => ({
  history: [],
  loading: false,
  users: [],
  selectedUser: null,

  fetchHistory: async (username?: string) => {
    set({ loading: true });
    try {
      const params = new URLSearchParams();
      if (username) params.append('username', username);

      const response = await fetch(`/api/history/?${params.toString()}`);
      const data = await response.json();
      if (data.success) {
        set({ history: data.data });
      }
    } catch (error) {
      console.error('Failed to fetch history:', error);
    } finally {
      set({ loading: false });
    }
  },

  fetchUsers: async () => {
    try {
      const response = await fetch('/api/history/users');
      const data = await response.json();
      if (data.success) {
        set({ users: data.data.map((u: any) => u.user) });
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
    }
  },

  setSelectedUser: (user: string | null) => {
    set({ selectedUser: user });
    if (user) {
      get().fetchHistory(user);
    }
  },
}));
