import React, { useState, useEffect, useRef } from 'react';
import { auth, db, storage, addDoc, collection, serverTimestamp, storageRef, uploadString, getDownloadURL } from '../../firebase';
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

    useEffect(() => {
        if (!isOpen) {
            setGeneratedImage(null);
            setIsGenerating(true);
            setError('');
            return;
        }

        const generateImage = async () => {
            setIsGenerating(true);
            setError('');
            const canvas = canvasRef.current;
            if (!canvas) {
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

            const W = 1080;
            const H = 1920;
            canvas.width = W;
            canvas.height = H;

            const userImg = new Image();
            const otherUserImg = new Image();
            userImg.crossOrigin = "anonymous";
            otherUserImg.crossOrigin = "anonymous";

            const userImgPromise = new Promise<void>((resolve, reject) => {
                userImg.onload = () => resolve();
                userImg.onerror = () => reject(new Error('Failed to load user image.'));
                // Add cache-busting param
                userImg.src = `${currentUser.photoURL}?${new Date().getTime()}`;
            });

            const otherUserImgPromise = new Promise<void>((resolve, reject) => {
                otherUserImg.onload = () => resolve();
                otherUserImg.onerror = () => reject(new Error('Failed to load other user image.'));
                 // Add cache-busting param
                otherUserImg.src = `${otherUser.avatar}?${new Date().getTime()}`;
            });

            try {
                await Promise.all([userImgPromise, otherUserImgPromise]);
            } catch (e) {
                console.error(e);
                setError(t('crystal.imageLoadError'));
                setIsGenerating(false);
                return;
            }

            // --- Drawing ---
            // Background
            const bgGradient = ctx.createLinearGradient(0, 0, W, H);
            bgGradient.addColorStop(0, '#0f172a'); // slate-900
            bgGradient.addColorStop(1, '#1e293b'); // slate-800
            ctx.fillStyle = bgGradient;
            ctx.fillRect(0, 0, W, H);
            
            // Particles
            for (let i = 0; i < 150; i++) {
                ctx.fillStyle = `rgba(253, 224, 71, ${Math.random() * 0.5 + 0.2})`; // yellow-300
                ctx.beginPath();
                ctx.arc(Math.random() * W, Math.random() * H, Math.random() * 2.5 + 1, 0, Math.PI * 2);
                ctx.fill();
            }

            // Avatars
            const avatarSize = 320;
            const avatarY = 550;
            const userAvatarX = W / 2 - avatarSize - 30;
            const otherAvatarX = W / 2 + 30;
            
            ctx.save();
            ctx.shadowColor = 'rgba(250, 204, 21, 0.7)'; // amber-300
            ctx.shadowBlur = 40;
            ctx.beginPath();
            ctx.arc(userAvatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(250, 204, 21, 0.8)'; // amber-300
            ctx.lineWidth = 8;
            ctx.stroke();
            ctx.clip();
            ctx.drawImage(userImg, userAvatarX, avatarY, avatarSize, avatarSize);
            ctx.restore();

            ctx.save();
            ctx.shadowColor = 'rgba(250, 204, 21, 0.7)';
            ctx.shadowBlur = 40;
            ctx.beginPath();
            ctx.arc(otherAvatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(250, 204, 21, 0.8)';
            ctx.lineWidth = 8;
            ctx.stroke();
            ctx.clip();
            ctx.drawImage(otherUserImg, otherAvatarX, avatarY, avatarSize, avatarSize);
            ctx.restore();
            
            // Lightning Bolt
            const boltY = avatarY + avatarSize / 2;
            const boltStartX = userAvatarX + avatarSize;
            const boltEndX = otherAvatarX;
            ctx.save();
            ctx.shadowColor = '#fef08a'; // yellow-200
            ctx.shadowBlur = 30;
            ctx.strokeStyle = '#fde047'; // yellow-400
            ctx.lineWidth = 15;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(boltStartX, boltY);
            ctx.lineTo(boltStartX + 60, boltY + 40);
            ctx.lineTo(boltStartX + 30, boltY);
            ctx.lineTo(boltStartX + 90, boltY - 40);
            ctx.lineTo(boltEndX, boltY);
            ctx.stroke();
            ctx.restore();

            // Title
            ctx.font = '70px "Times New Roman", serif';
            ctx.fillStyle = '#f1f5f9'; // slate-100
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(t('crystal.shareTitle'), W / 2, 300);

            // Streak Number
            const streakNumber = crystalData.streak.toString();
            ctx.font = 'bold 400px "Helvetica Neue", sans-serif';
            const textGradient = ctx.createLinearGradient(0, 1000, 0, 1400);
            textGradient.addColorStop(0, '#fcd34d'); // amber-300
            textGradient.addColorStop(1, '#fbbf24'); // amber-400
            ctx.fillStyle = textGradient;
            ctx.shadowColor = 'rgba(0,0,0,0.4)';
            ctx.shadowBlur = 20;
            ctx.shadowOffsetX = 8;
            ctx.shadowOffsetY = 8;
            ctx.fillText(streakNumber, W / 2, 1150);
            
            ctx.shadowColor = 'transparent'; // Reset shadow

            // Subtitle
            ctx.font = '60px "Helvetica Neue", sans-serif';
            ctx.fillStyle = '#e2e8f0'; // slate-200
            ctx.fillText(t('crystal.streakDays', { streak: '' }).trim(), W / 2, 1350);

            // Watermark
            ctx.font = 'italic 40px "Times New Roman", serif';
            ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.fillText('Vibe', W / 2, H - 100);

            setGeneratedImage(canvas.toDataURL('image/png'));
            setIsGenerating(false);
        };
        
        generateImage();

    }, [isOpen, crystalData, currentUser, otherUser, t]);

    const handlePublish = async () => {
        if (!generatedImage || !currentUser) return;
        
        setIsPublishing(true);
        setError('');

        try {
            const pulseRef = storageRef(storage, `pulses/${currentUser.uid}/streak_${Date.now()}.png`);
            await uploadString(pulseRef, generatedImage, 'data_url');
            const downloadURL = await getDownloadURL(pulseRef);

            await addDoc(collection(db, 'pulses'), {
                authorId: currentUser.uid,
                mediaUrl: downloadURL,
                legenda: t('crystal.streakDays', { streak: crystalData.streak }),
                createdAt: serverTimestamp(),
            });

            onPulseCreated();
        } catch (err) {
            console.error(err);
            setError(t('crystal.shareError'));
        } finally {
            setIsPublishing(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-[60]" onClick={onClose}>
            <canvas ref={canvasRef} style={{ display: 'none' }} />
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
            </div>
        </div>
    );
};

export default ConnectionStreakShareModal;
