import { create } from 'zustand';

interface Recommendation {
  id: string;
  title: string;
  mediaType: 'movie' | 'series';
  rating: number;
  reason: string;
  genres: string[];
  poster_url: string | null;
  tmdb_id: number | null;
}

interface RecommendationsState {
  recommendations: Recommendation[];
  loading: boolean;
  generating: boolean;
  users: string[];
  selectedUser: string | null;

  fetchUsers: () => void;
  generateRecommendations: (username?: string) => Promise<void>;
  addRecToLibrary: (rec: Recommendation) => Promise<{ success: boolean; message: string }>;
}

export const useRecommendationsStore = create<RecommendationsState>((set) => ({
  recommendations: [],
  loading: false,
  generating: false,
  users: [],
  selectedUser: null,

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

  generateRecommendations: async (username?: string) => {
    set({ generating: true });
    try {
      const response = await fetch('/api/recommendations/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username }),
      });
      const data = await response.json();
      if (data.success) {
        const recs = (data.data || []).map((r: any, i: number) => ({
          id: r.id || r.tmdb_id || `rec-${i}`,
          title: r.title,
          mediaType: r.media_type || r.mediaType,
          rating: r.rating || 0,
          reason: r.reason || '',
          genres: r.genres || [],
          poster_url: r.poster_url || null,
          tmdb_id: r.tmdb_id || null,
        }));
        set({ recommendations: recs });
      }
    } catch (error) {
      console.error('Failed to generate recommendations:', error);
    } finally {
      set({ generating: false });
    }
  },

  addRecToLibrary: async (rec: Recommendation) => {
    try {
      const response = await fetch('/api/recommendations/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: rec.title,
          mediaType: rec.mediaType,
        }),
      });
      return await response.json();
    } catch (error) {
      return { success: false, message: `Failed to add: ${error}` };
    }
  },
}));
