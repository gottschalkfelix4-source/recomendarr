import { useEffect, useState, useMemo } from 'react';
import { useRecommendationsStore } from '../store/recommendations';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { useToast } from '../components/Toast';

const PosterFallback = ({ type }: { type: string }) => (
  <div className="w-full h-full bg-surface-200 flex items-center justify-center">
    <svg className="w-10 h-10 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1">
      {type === 'movie' ? (
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
      ) : (
        <path strokeLinecap="round" strokeLinejoin="round" d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
      )}
    </svg>
  </div>
);

interface RecCardProps {
  rec: any;
  index: number;
  onAdd: (rec: any) => void;
  addingId: string | null;
  imgErrors: Set<string>;
  onImgError: (id: string) => void;
}

const RecCard = ({ rec, index, onAdd, addingId, imgErrors, onImgError }: RecCardProps) => {
  const recId = rec.id || rec.title;
  const showPoster = rec.poster_url && !imgErrors.has(recId);

  return (
    <Card
      className="group hover:border-surface-400/50 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl overflow-hidden animate-slide-up"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <div className="relative aspect-[2/3] w-full overflow-hidden bg-surface-200">
        {showPoster ? (
          <img
            src={rec.poster_url}
            alt={rec.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
            onError={() => onImgError(recId)}
          />
        ) : (
          <PosterFallback type={rec.mediaType} />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

        {/* Rating */}
        <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-0.5 rounded-md bg-black/50 backdrop-blur-sm">
          <svg className="w-3.5 h-3.5 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
          <span className="text-xs font-bold text-white">{rec.rating}</span>
        </div>

        {/* Title */}
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <h3 className="text-sm font-bold text-white leading-snug line-clamp-2 drop-shadow-lg">
            {rec.title}
          </h3>
        </div>
      </div>

      <div className="p-3">
        <p className="text-xs text-gray-400 leading-relaxed line-clamp-2 mb-2">{rec.reason}</p>

        {rec.genres && rec.genres.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {rec.genres.slice(0, 3).map((genre: string) => (
              <span key={genre} className="px-1.5 py-0.5 text-[10px] rounded bg-surface-200 text-gray-500 border border-surface-300/50">
                {genre}
              </span>
            ))}
          </div>
        )}

        <Button
          variant="success"
          size="sm"
          className="w-full"
          onClick={() => onAdd(rec)}
          loading={addingId === recId}
        >
          <svg className="w-3.5 h-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Add to {rec.mediaType === 'movie' ? 'Radarr' : 'Sonarr'}
        </Button>
      </div>
    </Card>
  );
};

export const RecommendationsPage = () => {
  const { toast } = useToast();
  const recommendations = useRecommendationsStore((s) => s.recommendations);
  const users = useRecommendationsStore((s) => s.users);
  const fetchUsers = useRecommendationsStore((s) => s.fetchUsers);
  const generateRecommendations = useRecommendationsStore((s) => s.generateRecommendations);
  const addRecToLibrary = useRecommendationsStore((s) => s.addRecToLibrary);

  const [selectedUser, setSelectedUser] = useState('');
  const [generating, setGenerating] = useState(false);
  const [addingId, setAddingId] = useState<string | null>(null);
  const [imgErrors, setImgErrors] = useState<Set<string>>(new Set());

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const movies = useMemo(() => recommendations.filter(r => r.mediaType === 'movie'), [recommendations]);
  const series = useMemo(() => recommendations.filter(r => r.mediaType === 'series'), [recommendations]);

  const handleGenerate = async () => {
    setGenerating(true);
    setImgErrors(new Set());
    try {
      await generateRecommendations(selectedUser || undefined);
      toast('Recommendations generated!', 'success');
    } catch {
      toast('Failed to generate recommendations', 'error');
    } finally {
      setGenerating(false);
    }
  };

  const handleAdd = async (rec: any) => {
    setAddingId(rec.id || rec.title);
    try {
      const result = await addRecToLibrary(rec);
      if (result.success) {
        toast(`Added "${rec.title}" to library`, 'success');
      } else {
        toast(result.message || 'Failed to add', 'error');
      }
    } catch {
      toast('Failed to add to library', 'error');
    } finally {
      setAddingId(null);
    }
  };

  const handleImgError = (id: string) => {
    setImgErrors((prev) => new Set(prev).add(id));
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Recommendations</h1>
          <p className="text-gray-400 mt-1">AI-generated media suggestions based on your watch history</p>
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

          <Button onClick={handleGenerate} loading={generating}>
            {generating ? 'Generating...' : 'Generate'}
          </Button>
        </div>
      </div>

      {generating && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <svg className="animate-spin h-10 w-10 text-accent mb-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <p className="text-gray-400 text-lg font-medium">Generating recommendations...</p>
          <p className="text-gray-500 text-sm mt-1">Asking AI for 10 movies and 10 series</p>
        </div>
      )}

      {!generating && recommendations.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-2xl bg-surface-200 flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
          <p className="text-gray-400 text-lg font-medium">No recommendations yet</p>
          <p className="text-gray-500 text-sm mt-1">Click "Generate" to get 10 movies and 10 series</p>
        </div>
      )}

      {!generating && recommendations.length > 0 && (
        <div className="space-y-10">
          {/* Movies Section */}
          {movies.length > 0 && (
            <section>
              <div className="flex items-center gap-3 mb-5">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center text-white shadow-lg shadow-amber-500/20">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Movies</h2>
                  <p className="text-xs text-gray-500">{movies.length} recommendations for Radarr</p>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {movies.map((rec, i) => (
                  <RecCard
                    key={rec.id || rec.title}
                    rec={rec}
                    index={i}
                    onAdd={handleAdd}
                    addingId={addingId}
                    imgErrors={imgErrors}
                    onImgError={handleImgError}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Series Section */}
          {series.length > 0 && (
            <section>
              <div className="flex items-center gap-3 mb-5">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-sky-500 to-blue-500 flex items-center justify-center text-white shadow-lg shadow-sky-500/20">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Series</h2>
                  <p className="text-xs text-gray-500">{series.length} recommendations for Sonarr</p>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {series.map((rec, i) => (
                  <RecCard
                    key={rec.id || rec.title}
                    rec={rec}
                    index={i}
                    onAdd={handleAdd}
                    addingId={addingId}
                    imgErrors={imgErrors}
                    onImgError={handleImgError}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
};
