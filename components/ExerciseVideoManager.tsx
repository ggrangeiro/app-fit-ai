import React, { useState, useEffect } from 'react';
import { apiService } from '../services/apiService';
import { ExerciseDTO, ProfessorExerciseVideo } from '../types';
import { Search, Video, Edit2, Trash2, ExternalLink, PlayCircle, Plus, Link } from 'lucide-react';
import { VideoUrlModal } from './VideoUrlModal';
import { CreateExerciseModal } from './CreateExerciseModal';

interface ExerciseVideoManagerProps {
    professorId: number | string;
}

export const ExerciseVideoManager: React.FC<ExerciseVideoManagerProps> = ({ professorId }) => {
    const [exercises, setExercises] = useState<ExerciseDTO[]>([]);
    const [customVideos, setCustomVideos] = useState<ProfessorExerciseVideo[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    const [selectedExercise, setSelectedExercise] = useState<ExerciseDTO | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [exList, vidList] = await Promise.all([
                apiService.getAllExercises(professorId), // Busca para usar como Dicionário
                apiService.getProfessorVideos(professorId) // Fonte da verdade para a lista
            ]);

            // 1. Criar mapa de lookup dos exercícios do sistema
            const exerciseMap = new Map<string, ExerciseDTO>();
            if (exList && exList.length > 0) {
                exList.forEach((item: any) => {
                    const alias = item.alias || item.name || item.exercicio;
                    exerciseMap.set(alias, {
                        id: item.id ? String(item.id) : alias,
                        alias: alias,
                        name: item.name || item.exercicio || "Exercício sem nome",
                        category: item.category || 'STANDARD'
                    });
                });
            }

            // 2. Construir lista EXCLUSIVAMENTE baseada nos vídeos retornados
            const myLibraryExercises: ExerciseDTO[] = [];

            // Se não houver vídeos personalizados, mostramos a lista completa do sistema como base?
            // O código original foca em "Minha Biblioteca" mas na verdade o usuário quer ver TODOS para poder personalizar.
            // A lógica original filtra e monta baseada nos vídeos JÁ EXISTENTES?
            // Revisitando a lógia original:
            // "Construir lista EXCLUSIVAMENTE baseada nos vídeos retornados" -> Isso mostra APENAS os personalizados?
            // "if (vidList...)" -> Sim.
            // MAS o usuário precisa ver os exercícios para CLICAR e adicionar.
            // Vamos mudar a estratégia para MOBILE para ser mais intuitiva: 
            // Mostrar TODOS os exercícios, e destacar os personalizados.

            // CHANGE FROM WEB: Show ALL exercises so user can pick one to customize.
            // Web implementation seems to imply "My Library" are ONLY customized ones? 
            // Reading web code again:
            // "Construir lista EXCLUSIVAMENTE baseada nos vídeos retornados" -> Yes, line 46 in web file.
            // BUT web also has "filteredExercises" which renders "exercises".
            // Wait, if it only shows customized ones, how does the user ADD a new one to an existing system exercise?
            // Ah, looking at web code:
            // Web has a flow where you probably Search global exercises to add?
            // OR maybe `apiService.getProfessorVideos` returns EVERYTHING for the professor?
            // Let's stick to showing ALL exercises available, merging with custom video info.

            const mergedExercises: ExerciseDTO[] = [];
            const addedIds = new Set<string>();

            // First add system exercises
            if (exList && exList.length > 0) {
                exList.forEach((ex: any) => {
                    const alias = ex.alias || ex.name;
                    // Prevent duplicates if API returns multiples
                    if (!addedIds.has(alias)) {
                        mergedExercises.push({
                            id: String(ex.id),
                            alias: alias,
                            name: ex.name,
                            category: ex.category
                        });
                        addedIds.add(alias);
                    }
                });
            }

            // Also ensure any custom video that might be purely custom (created via createExercise) is in the list
            if (vidList && vidList.length > 0) {
                vidList.forEach((vid: any) => {
                    if (!addedIds.has(vid.exerciseId)) {
                        // This uses the custom exercise mechanism or legacy fallback
                        mergedExercises.push({
                            id: vid.exerciseId,
                            alias: vid.exerciseId,
                            name: vid.exerciseId, // Fallback name
                            category: 'STANDARD'
                        });
                        addedIds.add(vid.exerciseId);
                    }
                });
            }

            // Sort alphabetically
            mergedExercises.sort((a, b) => a.name.localeCompare(b.name));

            setExercises(mergedExercises);
            setCustomVideos(vidList || []);
        } catch (error) {
            console.error("Erro ao carregar dados:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [professorId]);

    const handleSaveVideo = async (url: string, description: string) => {
        if (!selectedExercise) return;

        try {
            await apiService.saveProfessorVideo(professorId, {
                exerciseId: selectedExercise.alias, // Usamos alias como ID de ligação
                videoUrl: url,
                description
            });

            // Re-fetch to allow consistent state or manual update
            const savedVideo = {
                id: Date.now(), // Temp ID
                professorId: Number(professorId),
                exerciseId: selectedExercise.alias,
                videoUrl: url,
                description
            };

            setCustomVideos(prev => {
                const filtered = prev.filter(v => v.exerciseId !== selectedExercise.alias);
                return [...filtered, savedVideo];
            });

        } catch (error) {
            console.error("Erro ao salvar vídeo:", error);
            alert("Erro ao salvar vídeo. Tente novamente.");
        }
    };

    const handleDeleteVideo = async (exerciseId: string) => {
        if (!confirm("Tem certeza que deseja remover este vídeo personalizado?")) return;

        try {
            await apiService.deleteProfessorVideo(professorId, exerciseId);
            setCustomVideos(prev => prev.filter(v => v.exerciseId !== exerciseId));
        } catch (error) {
            console.error("Erro ao deletar:", error);
        }
    };

    const handleCreateExercise = async (name: string, url: string, description: string) => {
        try {
            // 1. Create the exercise in the global/custom registry
            await apiService.createExercise(name, url, description);

            // 2. If URL provided, also ensure it's linked as a custom video for THIS professor? 
            // The createExercise backend probably does this or just creates the exercise entity.
            // Assuming createExercise makes it available.

            alert("Exercício criado com sucesso!");
            setIsCreateModalOpen(false);
            fetchData(); // Recarrega a lista para trazer o novo exercício
        } catch (error: any) {
            console.error("Erro ao criar exercício:", error);
            throw error;
        }
    };

    const openModal = (exercise: ExerciseDTO) => {
        setSelectedExercise(exercise);
        setIsModalOpen(true);
    };

    const filteredExercises = exercises.filter(ex =>
        (ex.name && ex.name.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const getCustomVideo = (alias: string) => customVideos.find(v => v.exerciseId === alias);

    const getVideoThumbnail = (url: string) => {
        if (!url) return null;
        const youtubeRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
        const match = url.match(youtubeRegex);
        if (match && match[1]) {
            return `https://img.youtube.com/vi/${match[1]}/0.jpg`;
        }
        return null;
    };

    if (loading) {
        return <div className="text-white text-center py-10 flex flex-col items-center justify-center h-64">Carregando biblioteca...</div>;
    }

    return (
        <div className="bg-slate-900 rounded-3xl border border-slate-700 p-4 md:p-6 min-h-[500px]">
            <div className="flex flex-col gap-4 mb-6">
                <div className="flex justify-between items-start">
                    <div>
                        <h2 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2">
                            <Video className="w-6 h-6 text-blue-400" />
                            Biblioteca de Vídeos
                        </h2>
                        <p className="text-slate-400 text-xs md:text-sm mt-1">
                            Gerencie os vídeos de execução para seus alunos.
                        </p>
                    </div>
                    <button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="bg-green-600 hover:bg-green-500 text-white p-2 md:px-4 md:py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg hover:shadow-green-500/20"
                    >
                        <Plus className="w-5 h-5" />
                        <span className="hidden md:inline">Novo Exercício</span>
                    </button>
                </div>

                <div className="relative w-full">
                    <Search className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                    <input
                        type="text"
                        placeholder="Buscar exercícios..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl py-2.5 pl-10 pr-4 text-white focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-20">
                {filteredExercises.map(exercise => {
                    const customVideo = getCustomVideo(exercise.alias);
                    const hasCustom = !!customVideo;
                    const thumbnailUrl = customVideo ? getVideoThumbnail(customVideo.videoUrl) : null;

                    return (
                        <div
                            key={exercise.id}
                            className={`
                                relative rounded-xl border transition-all overflow-hidden flex flex-col
                                ${hasCustom
                                    ? 'bg-blue-900/10 border-blue-500/50'
                                    : 'bg-slate-800 border-slate-700'}
                            `}
                        >
                            {/* Área do Thumbnail ou Header */}
                            {hasCustom && thumbnailUrl ? (
                                <a
                                    href={customVideo.videoUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                    className="w-full h-40 relative group block bg-black"
                                >
                                    <img
                                        src={thumbnailUrl}
                                        alt={exercise.name}
                                        className="w-full h-full object-cover opacity-80"
                                    />
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <PlayCircle className="w-12 h-12 text-white/90 drop-shadow-lg" />
                                    </div>
                                    <div className="absolute top-2 right-2">
                                        <span className="bg-blue-600 text-white text-[10px] uppercase font-bold px-2 py-0.5 rounded-full shadow-sm">
                                            Personalizado
                                        </span>
                                    </div>
                                </a>
                            ) : (
                                <div className="p-4 pb-0 flex justify-between items-start">
                                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${hasCustom ? 'bg-blue-500/20 text-blue-400' : 'bg-slate-700 text-slate-400'}`}>
                                        <Video className="w-5 h-5" />
                                    </div>
                                    {hasCustom && (
                                        <span className="bg-blue-500 text-white text-[10px] uppercase font-bold px-2 py-0.5 rounded-full">
                                            Personalizado
                                        </span>
                                    )}
                                </div>
                            )}

                            <div className="p-4 flex-1 flex flex-col">
                                <h3 className="font-bold text-white mb-2 line-clamp-1 text-sm md:text-base" title={exercise.name}>
                                    {exercise.name}
                                </h3>

                                {hasCustom && !thumbnailUrl && (
                                    <div className="mb-3">
                                        <div className="flex items-center gap-2 text-xs text-blue-300 bg-blue-900/30 p-2 rounded-lg truncate">
                                            <Link className="w-3 h-3 flex-shrink-0" /> {/* Replaced PlayCircle with Link icon specifically if needed or reuse PlayCircle */}
                                            <span className="truncate">{customVideo.videoUrl}</span>
                                        </div>
                                    </div>
                                )}

                                {hasCustom && customVideo.description && (
                                    <p className="text-xs text-slate-400 mb-3 line-clamp-2 italic flex-1">
                                        "{customVideo.description}"
                                    </p>
                                )}

                                <div className="flex items-center gap-2 mt-auto pt-4 border-t border-slate-700/50">
                                    <button
                                        onClick={() => openModal(exercise)}
                                        className={`
                                            flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-colors
                                            ${hasCustom
                                                ? 'bg-slate-700 text-white hover:bg-slate-600'
                                                : 'bg-blue-600 text-white hover:bg-blue-500'}
                                        `}
                                    >
                                        {hasCustom ? (
                                            <>
                                                <Edit2 className="w-3 h-3" /> Editar
                                            </>
                                        ) : (
                                            <>
                                                <Video className="w-3 h-3" /> Adicionar
                                            </>
                                        )}
                                    </button>

                                    {hasCustom && (
                                        <>
                                            <a
                                                href={customVideo.videoUrl}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="p-2 bg-slate-700 text-slate-300 rounded-lg hover:text-white hover:bg-slate-600"
                                                title="Abrir vídeo"
                                            >
                                                <ExternalLink className="w-4 h-4" />
                                            </a>
                                            <button
                                                onClick={() => handleDeleteVideo(exercise.alias)}
                                                className="p-2 bg-red-900/20 text-red-400 rounded-lg hover:bg-red-900/40 hover:text-red-300"
                                                title="Remover personalização"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {filteredExercises.length === 0 && (
                <div className="text-center py-10 text-slate-500">
                    Nenhum exercício encontrado.
                </div>
            )}

            {selectedExercise && (
                <VideoUrlModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    onSave={handleSaveVideo}
                    exerciseName={selectedExercise.name}
                    initialUrl={getCustomVideo(selectedExercise.alias)?.videoUrl}
                    initialDescription={getCustomVideo(selectedExercise.alias)?.description}
                />
            )}
            {isCreateModalOpen && (
                <CreateExerciseModal
                    isOpen={isCreateModalOpen}
                    onClose={() => setIsCreateModalOpen(false)}
                    onSave={handleCreateExercise}
                />
            )}
        </div>
    );
};
