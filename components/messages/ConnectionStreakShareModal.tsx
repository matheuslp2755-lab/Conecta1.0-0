import React, { useState, useEffect, useRef } from 'react';
import { auth, db, storage, addDoc, collection, serverTimestamp, storageRef, uploadBytes, getDownloadURL } from '../../firebase';
import Button from '../common/Button';
import { useLanguage } from '../../context/LanguageContext';

interface CrystalData {
    streak: number;
}

interface UserInfo {
    uid?: string;
    photoURL?: string | null;
    id: string;
    username: string;
    avatar: string;
}

interface ConnectionStreakShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  crystalData: CrystalData;
  currentUser: any; // Firebase User type
  otherUser: UserInfo;
  onPulseCreated: () => void;
}

const Spinner: React.FC = () => (
    <div className="flex justify-center items-center p-4">
        <svg className="animate-spin h-8 w-8 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
    </div>
);

const ConnectionStreakShareModal: React.FC<ConnectionStreakShareModalProps> = ({ isOpen, onClose, crystalData, currentUser, otherUser, onPulseCreated }) => {
    const { t } = useLanguage();
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [generatedImage, setGeneratedImage] = useState<string | null>(null);
    const [isGenerating, setIsGenerating] = useState(true);
    const [isPublishing, setIsPublishing] = useState(false);
    const [error, setError] = useState('');

    const loadImage = (src: string) => new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        img.onload = () => resolve(img);
        img.onerror = (err) => reject(err);
        img.src = src;
    });

    useEffect(() => {
        if (!isOpen) return;

        const generateImage = async () => {
            setIsGenerating(true);
            setGeneratedImage(null);
            setError('');
            const canvas = canvasRef.current;
            if (!canvas || !currentUser?.photoURL) {
                setError(t('crystal.canvasError'));
                setIsGenerating(false);
                return;
            }

            const ctx = canvas.getContext('2d');
            if (!ctx) {
                setError(t('crystal.canvasError'));
                setIsGenerating(false);
                return;
            }

            const width = 1080;
            const height = 1920;
            canvas.width = width;
            canvas.height = height;

            // 1. Draw Background
            const streak = crystalData.streak;
            if (streak <= 3) {
                ctx.fillStyle = '#374151'; // Gray-700
            } else if (streak <= 6) {
                const gradient = ctx.createLinearGradient(0, 0, width, height);
                gradient.addColorStop(0, '#3B82F6'); // blue-500
                gradient.addColorStop(1, '#6366F1'); // indigo-500
                ctx.fillStyle = gradient;
            } else {
                const gradient = ctx.createLinearGradient(0, 0, width, height);
                gradient.addColorStop(0, '#F59E0B'); // amber-500
                gradient.addColorStop(0.5, '#EF4444'); // red-500
                gradient.addColorStop(1, '#8B5CF6'); // violet-500
                ctx.fillStyle = gradient;
            }
            ctx.fillRect(0, 0, width, height);

            try {
                // 2. Draw Profile Pictures
                const [userImg, otherUserImg] = await Promise.all([
                    loadImage(currentUser.photoURL),
                    loadImage(otherUser.avatar)
                ]);

                const avatarSize = 350;
                const avatarY = height * 0.25;
                const avatarSpacing = 20;

                ctx.save();
                ctx.beginPath();
                ctx.arc(width / 2 - avatarSize / 2 - avatarSpacing / 2, avatarY, avatarSize / 2, 0, Math.PI * 2, true);
                ctx.closePath();
                ctx.clip();
                ctx.drawImage(userImg, width / 2 - avatarSize - avatarSpacing / 2, avatarY - avatarSize / 2, avatarSize, avatarSize);
                ctx.restore();
                
                ctx.save();
                ctx.beginPath();
                ctx.arc(width / 2 + avatarSize / 2 + avatarSpacing / 2, avatarY, avatarSize / 2, 0, Math.PI * 2, true);
                ctx.closePath();
                ctx.clip();
                ctx.drawImage(otherUserImg, width / 2 + avatarSpacing / 2, avatarY - avatarSize / 2, avatarSize, avatarSize);
                ctx.restore();

                // Add white borders
                ctx.strokeStyle = 'white';
                ctx.lineWidth = 10;
                ctx.beginPath();
                ctx.arc(width / 2 - avatarSize / 2 - avatarSpacing / 2, avatarY, avatarSize / 2, 0, Math.PI * 2, true);
                ctx.stroke();
                ctx.beginPath();
                ctx.arc(width / 2 + avatarSize / 2 + avatarSpacing / 2, avatarY, avatarSize / 2, 0, Math.PI * 2, true);
                ctx.stroke();

            } catch (e) {
                console.error("Error loading images for canvas:", e);
                setError(t('crystal.imageLoadError'));
            }

            // 3. Draw Text
            ctx.fillStyle = 'white';
            ctx.textAlign = 'center';
            ctx.shadowColor = 'rgba(0,0,0,0.5)';
            ctx.shadowBlur = 10;
            ctx.shadowOffsetY = 5;

            ctx.font = 'bold 100px sans-serif';
            ctx.fillText(t('crystal.streakDays', { streak: crystalData.streak }), width / 2, height / 2 + 100);
            
            ctx.font = '70px sans-serif';
            ctx.fillText(t('crystal.vibe'), width / 2, height / 2 + 220);
            
            // 4. Draw Conecta+ watermark
            ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
            ctx.font = '40px serif';
            ctx.textAlign = 'center';
            ctx.fillText(t('crystal.watermark'), width / 2, height - 100);

            setGeneratedImage(canvas.toDataURL('image/png'));
            setIsGenerating(false);
        };

        generateImage();

    }, [isOpen, crystalData, currentUser, otherUser, t]);

    const handlePublish = async () => {
        if (!generatedImage || !canvasRef.current || !currentUser) return;
        
        setIsPublishing(true);
        setError('');

        try {
            canvasRef.current.toBlob(async (blob) => {
                if (!blob) {
                    throw new Error('Canvas to Blob conversion failed');
                }
                const pulseRef = storageRef(storage, `pulses/${currentUser.uid}/streak_${Date.now()}.png`);
                await uploadBytes(pulseRef, blob);
                const downloadURL = await getDownloadURL(pulseRef);

                await addDoc(collection(db, 'pulses'), {
                    authorId: currentUser.uid,
                    mediaUrl: downloadURL,
                    legenda: `${t('crystal.streakDays', { streak: crystalData.streak })} ${t('crystal.vibe')}`,
                    createdAt: serverTimestamp(),
                });

                onPulseCreated();
            }, 'image/png');
        } catch (err) {
            console.error(err);
            setError(t('crystal.shareError'));
            setIsPublishing(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-[60]" onClick={onClose}>
            <div className="bg-zinc-800 text-white rounded-lg shadow-xl w-full max-w-sm p-4 border border-zinc-700 flex flex-col gap-4" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold">{t('crystal.shareTitle')}</h3>
                    <button onClick={onClose} className="text-2xl">&times;</button>
                </div>
                
                <div className="aspect-[9/16] w-full bg-zinc-900 rounded-md flex items-center justify-center overflow-hidden">
                    {isGenerating && <Spinner />}
                    {error && !isGenerating && <p className="text-red-400 text-center p-4">{error}</p>}
                    {generatedImage && !isGenerating && (
                        <img src={generatedImage} alt="Connection streak preview" className="w-full h-full object-contain" />
                    )}
                </div>

                <Button onClick={handlePublish} disabled={isGenerating || isPublishing || !!error}>
                    {isPublishing ? t('crystal.publishing') : t('crystal.shareAction')}
                </Button>

                <canvas ref={canvasRef} style={{ display: 'none' }} />
            </div>
        </div>
    );
};

export default ConnectionStreakShareModal;