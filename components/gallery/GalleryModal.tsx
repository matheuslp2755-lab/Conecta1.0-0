import React, { useState, useRef, useEffect } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import Button from '../common/Button';

interface GalleryImage {
    file: File;
    preview: string;
}

interface GalleryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImageSelected: (image: GalleryImage) => void;
}

const GalleryModal: React.FC<GalleryModalProps> = ({ isOpen, onClose, onImageSelected }) => {
    const { t } = useLanguage();
    const [galleryImages, setGalleryImages] = useState<GalleryImage[]>([]);
    const [selectedImage, setSelectedImage] = useState<GalleryImage | null>(null);
    const [activeTab, setActiveTab] = useState<'gallery' | 'camera'>('gallery');
    const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
    const [cameraError, setCameraError] = useState<string | null>(null);
    
    const fileInputRef = useRef<HTMLInputElement>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const cleanupCamera = () => {
        if (cameraStream) {
            cameraStream.getTracks().forEach(track => track.stop());
            setCameraStream(null);
        }
    };

    useEffect(() => {
        if (!isOpen) {
            setGalleryImages([]);
            setSelectedImage(null);
            setActiveTab('gallery');
            cleanupCamera();
            setCameraError(null);
        }
    }, [isOpen]);

    useEffect(() => {
        if (activeTab === 'camera' && !cameraStream && isOpen) {
            const startCamera = async () => {
                try {
                    const stream = await navigator.mediaDevices.getUserMedia({ 
                        video: { facingMode: 'environment' } // Prioritize rear camera
                    });
                    setCameraStream(stream);
                    if (videoRef.current) {
                        videoRef.current.srcObject = stream;
                    }
                } catch (err) {
                    console.error("Camera error:", err);
                    setCameraError(t('gallery.cameraError'));
                }
            };
            startCamera();
        } else if (activeTab !== 'camera') {
            cleanupCamera();
        }
        // Cleanup on component unmount
        return cleanupCamera;
    }, [activeTab, isOpen, cameraStream, t]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const files = Array.from(e.target.files);
            const imagePromises = files
                // FIX: Explicitly type 'file' as File to resolve type inference issue.
                .filter((file: File) => file.type.startsWith('image/'))
                .map((file: File) => {
                    return new Promise<GalleryImage>((resolve) => {
                        const reader = new FileReader();
                        reader.onload = (event) => {
                            resolve({ file, preview: event.target?.result as string });
                        };
                        reader.readAsDataURL(file);
                    });
                });

            Promise.all(imagePromises).then(images => {
                setGalleryImages(prev => [...images, ...prev]);
                if (images.length > 0 && !selectedImage) {
                    setSelectedImage(images[0]);
                }
            });
        }
    };

    const handleCapture = () => {
        if (!videoRef.current || !canvasRef.current) return;

        const video = videoRef.current;
        const canvas = canvasRef.current;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const context = canvas.getContext('2d');
        context?.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);

        canvas.toBlob((blob) => {
            if (blob) {
                const newFile = new File([blob], `capture-${Date.now()}.jpg`, { type: 'image/jpeg' });
                const preview = URL.createObjectURL(blob);
                const newImage = { file: newFile, preview };
                
                setGalleryImages(prev => [newImage, ...prev]);
                setSelectedImage(newImage);
                setActiveTab('gallery'); // Switch back to gallery view
            }
        }, 'image/jpeg', 0.95);
    };

    const handleNext = () => {
        if (selectedImage) {
            onImageSelected(selectedImage);
        }
    };

    if (!isOpen) return null;

    return (
        <div 
            className="fixed inset-0 bg-white dark:bg-black z-50 flex flex-col"
            role="dialog"
            aria-modal="true"
        >
            <header className="flex-shrink-0 flex items-center justify-between p-4 border-b border-zinc-200 dark:border-zinc-800">
                <button onClick={onClose} className="p-1">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
                <h2 className="text-lg font-semibold">{t('gallery.title')}</h2>
                <Button 
                    onClick={handleNext} 
                    disabled={!selectedImage} 
                    className="!w-auto !py-0 !px-4 !text-sm"
                >
                    {t('gallery.next')}
                </Button>
            </header>
            
            <div className="flex-grow flex flex-col overflow-hidden">
                <div className="w-full aspect-square bg-black flex items-center justify-center">
                    {selectedImage ? (
                        <img src={selectedImage.preview} alt="Selected" className="max-h-full max-w-full object-contain" />
                    ) : (
                        <div className="text-zinc-500">{t('gallery.selectPhotos')}</div>
                    )}
                </div>

                <div className="flex-shrink-0 border-b border-zinc-200 dark:border-zinc-800">
                    <div className="flex justify-around">
                        <button onClick={() => setActiveTab('gallery')} className={`w-full py-3 text-sm font-semibold border-b-2 ${activeTab === 'gallery' ? 'border-black dark:border-white text-black dark:text-white' : 'border-transparent text-zinc-500'}`}>{t('gallery.galleryTab')}</button>
                        <button onClick={() => setActiveTab('camera')} className={`w-full py-3 text-sm font-semibold border-b-2 ${activeTab === 'camera' ? 'border-black dark:border-white text-black dark:text-white' : 'border-transparent text-zinc-500'}`}>{t('gallery.cameraTab')}</button>
                    </div>
                </div>

                <div className="flex-grow overflow-y-auto">
                    {activeTab === 'gallery' && (
                        galleryImages.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                                <h3 className="text-xl mt-4 mb-2">{t('createPost.dragPhotos')}</h3>
                                <Button onClick={() => fileInputRef.current?.click()}>
                                    {t('gallery.selectPhotos')}
                                </Button>
                            </div>
                        ) : (
                            <div className="grid grid-cols-3 sm:grid-cols-4 gap-0.5">
                                {galleryImages.map((image, index) => (
                                    <div
                                        key={`${image.file.name}-${index}`}
                                        className="relative aspect-square cursor-pointer group"
                                        onClick={() => setSelectedImage(image)}
                                    >
                                        <img src={image.preview} alt="Gallery item" className="w-full h-full object-cover" />
                                        <div className={`absolute inset-0 transition-colors ${selectedImage?.preview === image.preview ? 'bg-black/30' : 'bg-black/0 group-hover:bg-black/10'}`}></div>
                                    </div>
                                ))}
                            </div>
                        )
                    )}
                    {activeTab === 'camera' && (
                        <div className="relative w-full h-full bg-black flex flex-col items-center justify-center">
                            {cameraError ? (
                                <p className="text-red-500 p-4">{cameraError}</p>
                            ) : (
                                <>
                                    <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover"></video>
                                    <div className="absolute bottom-6 flex justify-center">
                                        <button onClick={handleCapture} className="w-16 h-16 rounded-full bg-white/30 border-4 border-white flex items-center justify-center" aria-label={t('gallery.capture')}>
                                            <div className="w-12 h-12 rounded-full bg-white"></div>
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                </div>
            </div>

            <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" multiple />
            <canvas ref={canvasRef} className="hidden"></canvas>
        </div>
    );
};

export default GalleryModal;