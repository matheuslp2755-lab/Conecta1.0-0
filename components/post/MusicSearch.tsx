import React, { useState } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import Button from '../common/Button';

type MusicTrackFromAPI = {
  trackId: number;
  trackName: string;
  artistName: string;
  artworkUrl100: string;
  previewUrl: string;
};

interface MusicSearchProps {
  onSelectMusic: (track: MusicTrackFromAPI) => void;
  onBack: () => void;
}

const Spinner: React.FC = () => (
    <div className="flex justify-center items-center p-4">
        <svg className="animate-spin h-5 w-5 text-zinc-500 dark:text-zinc-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
    </div>
);

const BackArrowIcon: React.FC<{className?: string}> = ({ className }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path></svg>
);

const MusicSearch: React.FC<MusicSearchProps> = ({ onSelectMusic, onBack }) => {
  const { t } = useLanguage();
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<MusicTrackFromAPI[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (searchTerm.trim() === '') return;

    setLoading(true);
    setError('');
    setResults([]);
    try {
      const response = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(searchTerm)}&entity=song&limit=10`);
      if (!response.ok) {
        throw new Error('Failed to fetch music');
      }
      const data = await response.json();
      setResults(data.results);
      if (data.results.length === 0) {
          setError(t('createPost.musicNoResults'));
      }
    } catch (err) {
      setError(t('musicSearch.searchError'));
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 flex flex-col h-[60vh] md:h-auto">
        <div className="flex items-center gap-2 mb-4">
            <button onClick={onBack} className="p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800" aria-label="Back">
                <BackArrowIcon className="w-5 h-5"/>
            </button>
            <form onSubmit={handleSearch} className="flex-grow flex gap-2">
                <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder={t('createPost.searchMusicPlaceholder')}
                    className="w-full bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-md py-1.5 px-4 text-sm focus:outline-none focus:ring-1 focus:ring-sky-500"
                    autoFocus
                />
                <Button type="submit" disabled={loading || !searchTerm.trim()} className="!w-auto">
                    {t('createPost.search')}
                </Button>
            </form>
        </div>
        <div className="flex-grow overflow-y-auto">
            {loading && <Spinner />}
            {error && <p className="text-zinc-500 text-center py-4">{error}</p>}
            <div className="flex flex-col gap-2">
                {results.map((track) => (
                    <div key={track.trackId} className="flex items-center gap-3 p-2 rounded-md hover:bg-zinc-50 dark:hover:bg-zinc-900">
                        <img src={track.artworkUrl100} alt={track.trackName} className="w-16 h-16 rounded-md object-cover flex-shrink-0" />
                        <div className="flex-grow overflow-hidden">
                            <p className="font-semibold text-sm truncate">{track.trackName}</p>
                            <p className="text-xs text-zinc-500 truncate">{track.artistName}</p>
                            <audio src={track.previewUrl} controls className="h-8 mt-1 w-full max-w-xs"></audio>
                        </div>
                        <Button onClick={() => onSelectMusic(track)} className="!w-auto !py-1 !px-3 !text-sm ml-auto">
                            {t('createPost.selectMusic')}
                        </Button>
                    </div>
                ))}
            </div>
      </div>
    </div>
  );
};

export default MusicSearch;