import React, { useState, useEffect, useRef } from 'react';
import { User, PhotoCategory, EvolutionPhoto } from '../types';
import { apiService, API_BASE_URL } from '../services/apiService';
import { X, Camera, Calendar, Trash2, Loader2, Image as ImageIcon, ChevronRight } from 'lucide-react';
import { Camera as CapacitorCamera, CameraResultType, CameraSource } from '@capacitor/camera';

interface EvolutionPhotosModalProps {
    isOpen: boolean;
    onClose: () => void;
    targetUser: User;
    currentUser: User;
}

const CATEGORIES: { key: PhotoCategory; label: string; icon: string }[] = [
    { key: 'FRONT', label: 'Frente', icon: '👤' },
    { key: 'BACK', label: 'Costas', icon: '🔙' },
    { key: 'LEFT', label: 'Lado Esquerdo', icon: '◀️' },
    { key: 'RIGHT', label: 'Lado Direito', icon: '▶️' }
];

const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T12:00:00');
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
};

const getFullImageUrl = (url: string) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    return `${API_BASE_URL}${url}`;
};

const EvolutionPhotosModal: React.FC<EvolutionPhotosModalProps> = ({
    isOpen,
    onClose,
    targetUser,
    currentUser
}) => {
    const [photos, setPhotos] = useState<EvolutionPhoto[]>([]);
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState<PhotoCategory | null>(null);
    const [activeTab, setActiveTab] = useState<'grid' | 'history'>('grid');
    const [uploadDate, setUploadDate] = useState<string>(new Date().toISOString().split('T')[0]);

    useEffect(() => {
        if (isOpen && targetUser) {
            loadPhotos();
        }
    }, [isOpen, targetUser?.id]);

    const loadPhotos = async () => {
        setLoading(true);
        try {
            const result = await apiService.getEvolutionPhotos(targetUser.id);
            setPhotos(result.fotos || []);
        } catch (e) {
            console.error('Erro ao carregar fotos:', e);
        } finally {
            setLoading(false);
        }
    };

    const handleTakePhoto = async (category: PhotoCategory) => {
        try {
            const image = await CapacitorCamera.getPhoto({
                quality: 80,
                allowEditing: false,
                resultType: CameraResultType.Uri,
                source: CameraSource.Prompt // Ask user: Camera or Photos
            });

            if (image.webPath) {
                uploadPhoto(category, image);
            }
        } catch (e) {
            console.log('User cancelled or error:', e);
        }
    };

    const uploadPhoto = async (category: PhotoCategory, image: any) => {
        setUploading(category);
        try {
            // Convert webPath to Blob/File for upload
            const response = await fetch(image.webPath);
            const blob = await response.blob();
            const file = new File([blob], `evolution_${category}_${Date.now()}.${image.format}`, { type: `image/${image.format}` });

            await apiService.uploadEvolutionPhoto(targetUser.id, file, category, uploadDate);
            await loadPhotos();
        } catch (e: any) {
            alert(e.message || 'Erro ao fazer upload');
        } finally {
            setUploading(null);
        }
    };

    const handleDeletePhoto = async (photo: EvolutionPhoto) => {
        // Simple confirmation using window.confirm (works in Capacitor webview)
        // Or could use a custom modal. For now, simple.
        // Note: native 'confirm' might look basic but works.

        try {
            await apiService.deleteEvolutionPhoto(photo.id);
            setPhotos(prev => prev.filter(p => p.id !== photo.id));
        } catch (e: any) {
            alert(e.message || 'Erro ao excluir foto');
        }
    };

    const getLatestPhotoByCategory = (category: PhotoCategory): EvolutionPhoto | null => {
        const categoryPhotos = photos.filter(p => p.category === category);
        return categoryPhotos.length > 0 ? categoryPhotos[0] : null;
    };

    const groupedByDate = () => {
        const groups: Record<string, EvolutionPhoto[]> = {};
        photos.forEach(photo => {
            const date = photo.photoDate;
            if (!groups[date]) groups[date] = [];
            groups[date].push(photo);
        });
        return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]));
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex flex-col bg-slate-900">
            {/* Header */}
            <div className="flex items-center justify-between p-4 bg-slate-800 border-b border-slate-700 pt-12 md:pt-4">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <Camera className="w-5 h-5 text-purple-400" />
                    Minha Evolução
                </h2>
                <button onClick={onClose} className="p-2 bg-slate-700/50 rounded-full">
                    <X className="w-5 h-5 text-gray-300" />
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 pb-20">

                {/* Date Selector */}
                <div className="mb-6 flex items-center gap-3 bg-slate-800 p-3 rounded-xl border border-slate-700">
                    <Calendar className="w-5 h-5 text-purple-400" />
                    <div className="flex-1">
                        <label className="text-xs text-slate-400 block">Data da Foto</label>
                        <input
                            type="date"
                            value={uploadDate}
                            onChange={(e) => setUploadDate(e.target.value)}
                            className="bg-transparent text-white w-full outline-none font-medium"
                        />
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex mb-6 bg-slate-800 p-1 rounded-xl">
                    <button
                        onClick={() => setActiveTab('grid')}
                        className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${activeTab === 'grid' ? 'bg-purple-600 text-white shadow-lg' : 'text-gray-400'
                            }`}
                    >
                        Upload
                    </button>
                    <button
                        onClick={() => setActiveTab('history')}
                        className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${activeTab === 'history' ? 'bg-purple-600 text-white shadow-lg' : 'text-gray-400'
                            }`}
                    >
                        Histórico
                    </button>
                </div>

                {loading ? (
                    <div className="flex flex-col items-center justify-center py-12">
                        <Loader2 className="w-8 h-8 text-purple-400 animate-spin mb-3" />
                        <p className="text-gray-400">Carregando...</p>
                    </div>
                ) : activeTab === 'grid' ? (
                    <div className="grid grid-cols-2 gap-4">
                        {CATEGORIES.map(({ key, label, icon }) => {
                            const latestPhoto = getLatestPhotoByCategory(key);
                            const isUploading = uploading === key;

                            return (
                                <div key={key} className="flex flex-col gap-2">
                                    <div
                                        className={`aspect-[3/4] rounded-2xl border-2 border-dashed relative overflow-hidden bg-slate-800/50 ${isUploading ? 'border-purple-500' : 'border-slate-700'
                                            }`}
                                        onClick={() => !isUploading && handleTakePhoto(key)}
                                    >
                                        {isUploading ? (
                                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 backdrop-blur-sm z-10">
                                                <Loader2 className="w-8 h-8 text-purple-400 animate-spin mb-2" />
                                                <span className="text-xs text-white">Enviando...</span>
                                            </div>
                                        ) : latestPhoto ? (
                                            <>
                                                <img
                                                    src={getFullImageUrl(latestPhoto.imageUrl)}
                                                    alt={label}
                                                    className="w-full h-full object-cover"
                                                />
                                                <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent p-3 pt-6 flex justify-between items-end">
                                                    <span className="text-[10px] text-white/80">{formatDate(latestPhoto.photoDate)}</span>
                                                    <Trash2
                                                        className="w-4 h-4 text-red-400"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleDeletePhoto(latestPhoto);
                                                        }}
                                                    />
                                                </div>
                                            </>
                                        ) : (
                                            <div className="absolute inset-0 flex flex-col items-center justify-center p-4">
                                                <Camera className="w-8 h-8 text-slate-500 mb-2" />
                                                <span className="text-xs text-slate-500 text-center">Tocar para adicionar</span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="text-center">
                                        <span className="text-xl">{icon}</span>
                                        <span className="text-sm text-gray-300 ml-2 font-medium">{label}</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="space-y-6">
                        {groupedByDate().length === 0 ? (
                            <div className="text-center py-12">
                                <ImageIcon className="w-12 h-12 text-slate-700 mx-auto mb-3" />
                                <p className="text-slate-500">Nenhuma foto encontrada</p>
                            </div>
                        ) : (
                            groupedByDate().map(([date, datePhotos]) => (
                                <div key={date} className="bg-slate-800 rounded-2xl p-4 border border-slate-700">
                                    <h3 className="text-white font-bold mb-3 flex items-center gap-2">
                                        <Calendar className="w-4 h-4 text-purple-400" />
                                        {formatDate(date)}
                                    </h3>
                                    <div className="grid grid-cols-4 gap-2">
                                        {CATEGORIES.map(({ key, label }) => {
                                            const photo = datePhotos.find(p => p.category === key);
                                            return (
                                                <div key={key} className="flex flex-col items-center">
                                                    {photo ? (
                                                        <div className="w-full aspect-[3/4] rounded-lg overflow-hidden bg-slate-900 mb-1 relative group">
                                                            <img
                                                                src={getFullImageUrl(photo.imageUrl)}
                                                                className="w-full h-full object-cover"
                                                                alt={label}
                                                            />
                                                        </div>
                                                    ) : (
                                                        <div className="w-full aspect-[3/4] rounded-lg bg-slate-700/30 mb-1 flex items-center justify-center">
                                                            <span className="text-slate-600 text-xs">-</span>
                                                        </div>
                                                    )}
                                                    <span className="text-[10px] text-slate-400">{label.split(' ')[0]}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default EvolutionPhotosModal;
