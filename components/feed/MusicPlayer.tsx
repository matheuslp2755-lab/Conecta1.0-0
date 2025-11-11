import React, { useState, useEffect, useRef } from 'react';

interface MusicInfo {
  nome: string;
  artista: string;
  capa: string;
  preview: string;
}

interface MusicPlayerProps {
  musicInfo: MusicInfo;
  isPlaying: boolean;
}

const PlayIcon: React.FC<{className?: string}> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

const PauseIcon: React.FC<{className?: string}> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);


const MusicPlayer: React.FC<MusicPlayerProps> = ({ musicInfo, isPlaying }) => {
    const audioRef = useRef<HTMLAudioElement>(null);
    const [isAudioPlaying, setIsAudioPlaying] = useState(false);
    const [duration, setDuration] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);

    const togglePlayPause = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!audioRef.current) return;
        
        if (isAudioPlaying) {
            audioRef.current.pause();
        } else {
            audioRef.current.play().catch(err => console.error("Error playing audio:", err));
        }
    };
    
    useEffect(() => {
        if (isPlaying) {
            audioRef.current?.play().catch(() => {
                setIsAudioPlaying(false);
            });
        } else {
            audioRef.current?.pause();
        }
    }, [isPlaying]);

    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        const setAudioData = () => {
            setDuration(audio.duration);
            setCurrentTime(audio.currentTime);
        };
        const setAudioTime = () => setCurrentTime(audio.currentTime);
        const handlePlay = () => setIsAudioPlaying(true);
        const handlePause = () => setIsAudioPlaying(false);
        
        audio.addEventListener('loadeddata', setAudioData);
        audio.addEventListener('timeupdate', setAudioTime);
        audio.addEventListener('play', handlePlay);
        audio.addEventListener('pause', handlePause);
        audio.addEventListener('ended', handlePause);

        return () => {
            audio.removeEventListener('loadeddata', setAudioData);
            audio.removeEventListener('timeupdate', setAudioTime);
            audio.removeEventListener('play', handlePlay);
            audio.removeEventListener('pause', handlePause);
            audio.removeEventListener('ended', handlePause);
        };
    }, []);

    const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;

    return (
        <div className="p-3 bg-zinc-50 dark:bg-zinc-950 border-y border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center gap-3">
                <div className="relative flex-shrink-0 w-12 h-12">
                    <img src={musicInfo.capa} alt={musicInfo.nome} className="w-full h-full rounded-md object-cover"/>
                    <button 
                        onClick={togglePlayPause} 
                        className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30 text-white rounded-md opacity-0 hover:opacity-100 focus:opacity-100 transition-opacity"
                        aria-label={isAudioPlaying ? "Pause" : "Play"}
                    >
                       {isAudioPlaying ? <PauseIcon className="w-8 h-8" /> : <PlayIcon className="w-8 h-8" />}
                    </button>
                </div>
                <div className="flex-grow overflow-hidden">
                    <p className="font-semibold text-sm truncate">{musicInfo.nome}</p>
                    <p className="text-xs text-zinc-500 truncate">{musicInfo.artista}</p>
                     <div className="w-full bg-zinc-200 dark:bg-zinc-700 rounded-full h-1 mt-2">
                        <div className="bg-sky-500 h-1 rounded-full" style={{ width: `${progressPercentage}%` }}></div>
                    </div>
                </div>
                <audio ref={audioRef} src={musicInfo.preview} loop preload="metadata" />
            </div>
        </div>
    );
};

export default MusicPlayer;