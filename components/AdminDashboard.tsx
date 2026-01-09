import React, { useState, useEffect, useMemo, useRef } from 'react';
import { User, ExerciseRecord, ExerciseDTO, SPECIAL_EXERCISES, AnalysisResult, DietPlan, WorkoutPlan, AppStep } from '../types';
import { MockDataService } from '../services/mockDataService';
import { apiService } from '../services/apiService';
import { generateExerciseThumbnail, analyzeVideo, generateDietPlan, generateWorkoutPlan } from '../services/geminiService';
import { compressVideo } from '../utils/videoUtils';
import { ResultView } from './ResultView';
import LoadingScreen from './LoadingScreen';
import { Users, UserPlus, FileText, Check, Search, ChevronRight, Activity, Plus, Sparkles, Image as ImageIcon, Loader2, Dumbbell, ToggleLeft, ToggleRight, Save, Database, PlayCircle, X, Scale, ScanLine, AlertCircle, Utensils, UploadCloud, Stethoscope, Calendar, Eye, ShieldAlert, Video, FileVideo, Printer, Share2 } from 'lucide-react';
import ConfirmModal from './ConfirmModal';
import Toast, { ToastType } from './Toast';

// LISTA FIXA DE EXERCÍCIOS PARA O PERSONAL (SUBSTITUI CHAMADA DE API)
const FIXED_EXERCISES_LIST = [
    { exercicio: "Abdominal Supra", id: 536, nomeExibicao: "Abdominal supra" },
    { exercicio: "Afundo (Lunge)", id: 538, nomeExibicao: "Afundo (lunge)" },
    { exercicio: "Agachamento (Squat)", id: 539, nomeExibicao: "Agachamento (squat)" },
    { exercicio: "Barra Fixa (Pull-up)", id: 543, nomeExibicao: "Barra fixa (pull-up)" },
    { exercicio: "Burpee", id: 545, nomeExibicao: "Burpee" },
    { exercicio: "Cadeira Abdutora", id: 546, nomeExibicao: "Cadeira abdutora" },
    { exercicio: "Crucifixo no Cross Over", id: 547, nomeExibicao: "Crucifixo no cross over" },
    { exercicio: "Elevação Frontal no Cabo", id: 548, nomeExibicao: "Elevação frontal no cabo" },
    { exercicio: "Elevação Pélvica", id: 549, nomeExibicao: "Elevação pélvica" },
    { exercicio: "Escalador (Mountain Climber)", id: 550, nomeExibicao: "Escalador (mountain climber)" },
    { exercicio: "Flexão de Braço (Push-up)", id: 551, nomeExibicao: "Flexão de braço (push-up)" },
    { exercicio: "Leg Press 45 Graus", id: 552, nomeExibicao: "Leg press 45 graus" },
    { exercicio: "Leg Press Horizontal", id: 553, nomeExibicao: "Leg press horizontal" },
    { exercicio: "Levantamento Terra (Deadlift)", id: 554, nomeExibicao: "Levantamento terra (deadlift)" },
    { exercicio: "Polichinelo", id: 555, nomeExibicao: "Polichinelo" },
    { exercicio: "Prancha (Plank)", id: 556, nomeExibicao: "Prancha (plank)" },
    { exercicio: "Puxada Alta (Pulldown)", id: 558, nomeExibicao: "Puxada alta (pulldown)" },
    { exercicio: "Puxada na Máquina Articulada", id: 559, nomeExibicao: "Puxada na máquina articulada" },
    { exercicio: "Remada Alta no Smith", id: 560, nomeExibicao: "Remada alta no smith" },
    { exercicio: "Remada Baixa na Máquina", id: 561, nomeExibicao: "Remada baixa na máquina" },
    { exercicio: "Remada no TRX", id: 562, nomeExibicao: "Remada no trx" },
    { exercicio: "Rosca Biceps no Cabo", id: 563, nomeExibicao: "Rosca biceps no cabo" },
    { exercicio: "Rosca Direta (Bicep Curl)", id: 564, nomeExibicao: "Rosca direta (bicep curl)" },
    { exercicio: "Rosca Martelo com Halter", id: 565, nomeExibicao: "Rosca martelo com halter" },
    { exercicio: "Rosca Scott com Halter", id: 566, nomeExibicao: "Rosca scott com halter" },
    { exercicio: "Supino na Máquina (Chest Press)", id: 567, nomeExibicao: "Supino na máquina (chest press)" },
    { exercicio: "Supino Reto com Barra", id: 568, nomeExibicao: "Supino reto com barra" },
    { exercicio: "Tríceps Banco (Dips)", id: 569, nomeExibicao: "Tríceps banco (dips)" }
];

interface AdminDashboardProps {
    currentUser: User;
    onRefreshData?: () => void;
    onUpdateUser?: (updatedUser: User) => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ currentUser, onRefreshData, onUpdateUser }) => {
    const [activeTab, setActiveTab] = useState<'users' | 'create' | 'assets'>('users');
    const [users, setUsers] = useState<User[]>([]);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [isLoadingUsers, setIsLoadingUsers] = useState(false); // Novo estado de loading

    const [userHistoryList, setUserHistoryList] = useState<ExerciseRecord[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(false);

    // States para exibir planos atuais do usuário
    const [userDiet, setUserDiet] = useState<DietPlan | null>(null);
    const [userWorkout, setUserWorkout] = useState<WorkoutPlan | null>(null);
    const [viewingPlan, setViewingPlan] = useState<{ type: 'DIET' | 'WORKOUT', content: string, title: string } | null>(null);

    const [viewingRecord, setViewingRecord] = useState<ExerciseRecord | null>(null);
    const [detailedHistory, setDetailedHistory] = useState<ExerciseRecord[]>([]);

    const [allExercises, setAllExercises] = useState<ExerciseDTO[]>([]);
    const [studentExercises, setStudentExercises] = useState<ExerciseDTO[]>([]); // New state for student specific exercises

    const [processing, setProcessing] = useState(false);
    const [progressMsg, setProgressMsg] = useState('');

    const [newName, setNewName] = useState('');
    const [newEmail, setNewEmail] = useState('');
    const [newRole, setNewRole] = useState('user'); // Novo estado para o papel do usuário

    const [editingAssignments, setEditingAssignments] = useState<string[]>([]);

    // --- STATES PARA AÇÕES DO PROFESSOR ---
    const [showTeacherActionModal, setShowTeacherActionModal] = useState<'NONE' | 'DIET' | 'WORKOUT' | 'ASSESSMENT'>('NONE');
    const [assessmentType, setAssessmentType] = useState<string>(''); // Start empty to force selection or default
    const [assessmentFiles, setAssessmentFiles] = useState<File[]>([]);
    const [assessmentPreviews, setAssessmentPreviews] = useState<string[]>([]);
    const [actionFormData, setActionFormData] = useState({
        weight: '', height: '', goal: 'hipertrofia', level: 'iniciante', frequency: '4', observations: '', gender: 'masculino'
    });
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [toast, setToast] = useState<{ message: string; type: ToastType; isVisible: boolean }>({
        message: '', type: 'info', isVisible: false
    });

    const [confirmModal, setConfirmModal] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        onConfirm: () => void;
        isDestructive?: boolean;
    }>({
        isOpen: false, title: '', message: '', onConfirm: () => { }, isDestructive: false
    });

    const isPersonal = currentUser.role === 'personal';
    const isAdmin = currentUser.role === 'admin';

    const showToast = (message: string, type: ToastType = 'info') => {
        setToast({ message, type, isVisible: true });
    };

    const closeToast = () => {
        setToast(prev => ({ ...prev, isVisible: false }));
    };

    const triggerConfirm = (title: string, message: string, onConfirm: () => void, isDestructive = false) => {
        setConfirmModal({
            isOpen: true,
            title,
            message,
            onConfirm: () => {
                onConfirm();
                setConfirmModal(prev => ({ ...prev, isOpen: false }));
            },
            isDestructive
        });
    };

    useEffect(() => {
        fetchBackendUsers();
        fetchExercises();
    }, []);

    useEffect(() => {
        if (selectedUser) {
            // --- USANDO LISTA FIXA DE EXERCÍCIOS PARA O PERSONAL ---
            const mapped = FIXED_EXERCISES_LIST.map((e: any) => ({
                id: String(e.id),
                alias: e.exercicio.toUpperCase().replace(/[\s\(\)]+/g, '_').replace(/_$/, ''), // Gera um alias consistente
                name: e.nomeExibicao,
                category: 'STANDARD'
            }));
            setStudentExercises(mapped);

            // Mantemos apenas a chamada para buscar o histórico e planos
            fetchUserHistory(selectedUser.id);
            fetchUserPlans(selectedUser.id);

        } else {
            setUserHistoryList([]);
            setUserDiet(null);
            setUserWorkout(null);
            setStudentExercises([]);
        }
    }, [selectedUser]);

    // Limpeza de preview ao fechar modal
    useEffect(() => {
        if (showTeacherActionModal === 'NONE') {
            assessmentPreviews.forEach(url => URL.revokeObjectURL(url));
            setAssessmentPreviews([]);
            setAssessmentFiles([]);
            setAssessmentType(''); // Reset selection
        } else if (showTeacherActionModal === 'ASSESSMENT') {
            // Start empty to allow "Free Analysis/Auto-detect" if user doesn't pick anything
            setAssessmentType('');
        }
    }, [showTeacherActionModal]);

    const handleAssessmentFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (files.length > 0) {
            // Validate: Prevent mixing video with multiple files, or enforce single video
            const isVideo = files.some(f => f.type.startsWith('video/'));
            if (isVideo && files.length > 1) {
                showToast("Por favor, envie apenas 1 vídeo por vez.", 'info');
                return;
            }

            setAssessmentFiles(files);
            const newPreviews = files.map(file => URL.createObjectURL(file));
            setAssessmentPreviews(prev => {
                prev.forEach(url => URL.revokeObjectURL(url)); // Cleanup old
                return newPreviews;
            });
        }
    };

    const groupedRecords = useMemo(() => {
        const groups: Record<string, ExerciseRecord[]> = {};
        userHistoryList.forEach(record => {
            const key = record.exercise;
            if (!groups[key]) {
                groups[key] = [];
            }
            groups[key].push(record);
        });
        return groups;
    }, [userHistoryList]);

    const fetchExercises = async () => {
        try {
            const v2Exercises = await apiService.getAllExercises();
            if (v2Exercises.length > 0) {
                const mapped = v2Exercises.map((e: any) => ({
                    id: String(e.id),
                    alias: e.name.toUpperCase().replace(/\s+/g, '_'),
                    name: e.name,
                    category: 'STANDARD'
                }));
                setAllExercises(mapped as ExerciseDTO[]);
                return;
            }
        } catch (e) { }

        const data = await MockDataService.fetchExercises();
        const specialExercises: ExerciseDTO[] = [
            { id: 'POSTURE_ANALYSIS', alias: 'POSTURE_ANALYSIS', name: 'Análise de Postura', category: 'SPECIAL' },
            { id: 'BODY_COMPOSITION', alias: 'BODY_COMPOSITION', name: 'Composição Corporal', category: 'SPECIAL' },
            { id: 'FREE_ANALYSIS_MODE', alias: 'FREE_ANALYSIS_MODE', name: 'Análise Livre', category: 'SPECIAL' }
        ];

        const combined = [...data];
        specialExercises.forEach(sp => {
            if (!combined.find(c => c.id === sp.id)) {
                combined.push(sp);
            }
        });

        setAllExercises(combined);
    };

    const fetchBackendUsers = async () => {
        setIsLoadingUsers(true);
        try {
            const resultUsers = await apiService.getUsers(currentUser.id, currentUser.role);
            if (resultUsers && resultUsers.length > 0) {
                const mappedUsers: User[] = resultUsers.map((u: any) => ({
                    id: String(u.id),
                    name: u.nome || u.name || 'Sem Nome',
                    email: u.email,
                    // CORREÇÃO: Converter role para minúsculo para garantir compatibilidade com o filtro (USER -> user)
                    role: u.role ? String(u.role).toLowerCase() : 'user',
                    credits: u.credits || 0,
                    avatar: u.avatar,
                    assignedExercises: u.assignedExercises || []
                }));
                setUsers(mappedUsers);
                return;
            } else {
                setUsers([]);
            }
        } catch (err: any) {
            if (users.length === 0) {
                const mockUsers = MockDataService.getUsers(currentUser);
                setUsers(mockUsers);
            }
        } finally {
            setIsLoadingUsers(false);
        }
    };

    const fetchUserHistory = async (userId: string) => {
        setLoadingHistory(true);
        try {
            const data = await apiService.getUserHistory(userId);

            let allRecords: ExerciseRecord[] = [];
            if (Array.isArray(data)) {
                allRecords = data;
            } else if (typeof data === 'object' && data !== null) {
                allRecords = Object.values(data).flat() as ExerciseRecord[];
            }
            const sorted = allRecords.sort((a: any, b: any) => b.timestamp - a.timestamp);
            setUserHistoryList(sorted);
        } catch (e) {
            setUserHistoryList(MockDataService.getUserHistory(userId));
        } finally {
            setLoadingHistory(false);
        }
    };

    const fetchUserPlans = async (userId: string) => {
        try {
            const diets = await apiService.getDiets(userId);
            setUserDiet(diets.length > 0 ? diets[0] : null);

            const trainings = await apiService.getTrainings(userId);
            setUserWorkout(trainings.length > 0 ? trainings[0] : null);
        } catch (e) {
            console.error("Erro ao buscar planos", e);
        }
    };

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        if (processing) return;

        setProcessing(true);
        setProgressMsg('Cadastrando usuário...');

        try {
            const creatorId = isPersonal ? currentUser.id : undefined;
            // Define a role: se for Personal, força 'user'. Se for Admin, usa o que foi selecionado.
            const roleToCreate = isPersonal ? 'user' : newRole;

            await apiService.signup(newName, newEmail, "mudar123", creatorId, roleToCreate);
            await MockDataService.createUser(newName, newEmail, undefined, creatorId, currentUser.role, roleToCreate);

            const roleName = roleToCreate === 'user' ? 'Aluno' : (roleToCreate === 'personal' ? 'Personal' : 'Admin');
            showToast(`${roleName} cadastrado com sucesso!`, 'success');

            setNewName('');
            setNewEmail('');
            setNewRole('user');

            // Atualiza a lista antes de mudar a tab
            await fetchBackendUsers();

            setTimeout(() => { setActiveTab('users'); }, 500);
        } catch (err: any) {
            showToast("Erro: " + err.message, 'error');
        } finally {
            setProcessing(false);
            setProgressMsg('');
        }
    };

    const handleGenerateAssets = async () => {
        if (processing) return;
        setProcessing(true);
        setProgressMsg('Iniciando...');
        const newImages: Record<string, string> = MockDataService.getExerciseImages();
        try {
            for (let i = 0; i < allExercises.length; i++) {
                const ex = allExercises[i];
                setProgressMsg(`Gerando (${i + 1}/${allExercises.length}): ${ex.name}...`);
                try {
                    const base64Image = await generateExerciseThumbnail(ex.name);
                    newImages[ex.id] = base64Image;
                    MockDataService.saveExerciseImages(newImages);
                } catch (e) { }
            }
            setProgressMsg('Concluído!');
            if (onRefreshData) onRefreshData();
            setTimeout(() => { setProcessing(false); setProgressMsg(''); }, 2000);
        } catch (e) {
            setProgressMsg('Erro na geração.');
            setProcessing(false);
        }
    };

    const runAssignmentScript = () => { /* ... existing logic ... */ };
    const toggleAssignment = (exerciseId: string) => { setEditingAssignments(prev => prev.includes(exerciseId) ? prev.filter(e => e !== exerciseId) : [...prev, exerciseId]); };
    const saveAssignments = async () => {
        if (!selectedUser) return;
        setProcessing(true);
        setProgressMsg("Salvando permissões...");
        try {
            let successCount = 0;
            for (const exId of editingAssignments) {
                if (!isNaN(Number(exId))) {
                    try {
                        await apiService.assignExercise(selectedUser.id, Number(exId));
                        successCount++;
                    } catch (e) { }
                }
            }
            try {
                const payload = { nome: selectedUser.name, email: selectedUser.email, assignedExercises: editingAssignments };
                await fetch(`https://testeai-732767853162.us-west1.run.app/api/usuarios/${selectedUser.id}`, {
                    method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
                });
            } catch (e) { }
            setSelectedUser({ ...selectedUser, assignedExercises: editingAssignments });
            setUsers(prev => prev.map(u => u.id === selectedUser.id ? { ...u, assignedExercises: editingAssignments } : u));
            showToast("Permissões atualizadas!", 'success');
        } catch (e: any) {
            showToast("Erro parcial ao salvar: " + e.message, 'error');
        } finally {
            setProcessing(false);
            setProgressMsg('');
        }
        MockDataService.updateUserExercises(selectedUser.id, editingAssignments);
    };
    const selectAllExercises = () => { setEditingAssignments(allExercises.map(e => e.id)); };
    const deselectAllExercises = () => { setEditingAssignments([]); };
    const handleDeleteRecord = async (recordId: string) => {
        if (!selectedUser) return;
        triggerConfirm(
            "Excluir Registro", "Tem certeza que deseja apagar este registro permanentemente?",
            async () => {
                const success = await MockDataService.deleteRecord(selectedUser.id, recordId);
                if (success) {
                    setUserHistoryList(prev => prev.filter(r => r.id !== recordId));
                    setDetailedHistory(prev => prev.filter(r => r.id !== recordId));
                    if (viewingRecord?.id === recordId) setViewingRecord(null);
                    showToast("Registro removido.", 'success');
                } else {
                    showToast("Erro ao apagar registro.", 'error');
                }
            }, true
        );
    };

    // --- NEW TEACHER ACTION HANDLERS ---

    const handleTeacherGenerateDiet = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedUser) return;
        setProcessing(true);
        setProgressMsg("Gerando Dieta com IA...");
        try {
            const planHtml = await generateDietPlan({
                weight: actionFormData.weight,
                height: actionFormData.height,
                goal: actionFormData.goal,
                gender: actionFormData.gender,
                observations: actionFormData.observations
            });

            await apiService.createDiet(selectedUser.id, planHtml, actionFormData.goal);
            showToast(`Dieta salva para ${selectedUser.name}!`, 'success');

            // Abre preview imediatamente e atualiza lista
            setViewingPlan({ type: 'DIET', content: planHtml, title: 'Nova Dieta Gerada' });
            fetchUserPlans(selectedUser.id);
            setShowTeacherActionModal('NONE');

        } catch (err: any) {
            showToast("Erro: " + err.message, 'error');
        } finally {
            setProcessing(false);
            setProgressMsg('');
        }
    };

    const handleTeacherGenerateWorkout = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedUser) return;
        setProcessing(true);
        setProgressMsg("Gerando Treino com IA...");
        try {
            const planHtml = await generateWorkoutPlan({
                weight: actionFormData.weight,
                height: actionFormData.height,
                goal: actionFormData.goal,
                level: actionFormData.level,
                frequency: actionFormData.frequency,
                observations: actionFormData.observations,
                gender: actionFormData.gender
            });

            await apiService.createTraining(selectedUser.id, planHtml, actionFormData.goal);
            showToast(`Treino salvo para ${selectedUser.name}!`, 'success');

            // Abre preview imediatamente e atualiza lista
            setViewingPlan({ type: 'WORKOUT', content: planHtml, title: 'Novo Treino Gerado' });
            fetchUserPlans(selectedUser.id);
            setShowTeacherActionModal('NONE');

        } catch (err: any) {
            showToast("Erro: " + err.message, 'error');
        } finally {
            setProcessing(false);
            setProgressMsg('');
        }
    };

    const handleTeacherAssessment = async () => {
        if (!selectedUser || assessmentFiles.length === 0) return;

        // --- VERIFICAÇÃO DE CRÉDITO PARA PERSONAL ---
        if (currentUser.role !== 'admin') {
            if (currentUser.credits !== undefined && currentUser.credits <= 0) {
                showToast("Créditos insuficientes. Recarregue para continuar.", 'error');
                return;
            }
        }

        setProcessing(true);
        setProgressMsg("Analisando vídeo/imagem com IA...");

        try {
            // 2. Optimize video if needed (Currently handles single video or multi-image)
            let finalFiles = assessmentFiles;
            if (assessmentFiles.length === 1 && assessmentFiles[0].type.startsWith('video/') && assessmentFiles[0].size > 15 * 1024 * 1024) {
                setProgressMsg("Otimizando arquivo...");
                const optimized = await compressVideo(assessmentFiles[0]);
                finalFiles = [optimized];
            }

            // 3. Analyze with Gemini
            setProgressMsg("IA Biomecânica em processamento...");
            // Use assessmentType OR default to FREE_ANALYSIS_MODE if nothing selected
            const finalType = assessmentType || SPECIAL_EXERCISES.FREE_MODE;
            // Agora passamos o array de arquivos
            const result = await analyzeVideo(finalFiles, finalType);

            // --- 1. CONSUMIR CRÉDITO (MOVED TO AFTER SUCCESS) ---
            if (currentUser.role !== 'admin') {
                try {
                    const creditResponse = await apiService.consumeCredit(currentUser.id);
                    if (creditResponse && typeof creditResponse.novoSaldo === 'number') {
                        if (onUpdateUser) {
                            onUpdateUser({ ...currentUser, credits: creditResponse.novoSaldo });
                        }
                    }
                } catch (e: any) {
                    if (e.message === 'CREDITS_EXHAUSTED' || e.message.includes('402')) {
                        showToast("Saldo insuficiente para realizar a análise.", 'error');
                        // Optional: decide if you want to stop here or show result anyway.
                        // Usually if IA already processed, we might want to show it, but blocking future requests.
                        // For now, let's allow showing since it's already processed.
                    } else {
                        // Log error but continue
                        console.error("Erro ao debitar crédito", e);
                    }
                }
            }

            // 4. Save to History (using selectedUser.id as owner, but log who requested)
            const payload = {
                userId: selectedUser.id,
                userName: selectedUser.name,
                exercise: finalType,
                timestamp: Date.now(),
                result: { ...result, date: new Date().toISOString() }
            };

            // Updated to use apiService with correct query params for Personal/Admin
            await apiService.saveHistory(payload, currentUser.id, currentUser.role);

            // --- ALTERAÇÃO: Abrir resultado imediatamente ---
            const newRecord: ExerciseRecord = {
                id: 'temp-new',
                userId: selectedUser.id,
                userName: selectedUser.name,
                exercise: finalType,
                result: { ...result, date: new Date().toISOString() },
                timestamp: Date.now()
            };

            showToast("Avaliação concluída! Visualizando resultado...", 'success');

            setDetailedHistory([newRecord]);
            setViewingRecord(newRecord); // Abre o modal ResultView imediatamente
            setShowTeacherActionModal('NONE');
            setAssessmentFiles([]);
            setAssessmentPreviews([]);
            setAssessmentType(''); // Reset type

            // Refresh background list
            fetchUserHistory(selectedUser.id);

        } catch (err: any) {
            showToast("Erro na avaliação: " + err.message, 'error');
        } finally {
            setProcessing(false);
            setProgressMsg('');
        }
    };

    const handleViewRecordDetails = async (record: ExerciseRecord) => {
        let exerciseIdToSend = record.exercise;
        const knownExercise = allExercises.find(e => e.name === record.exercise || e.alias === record.exercise);
        if (knownExercise) exerciseIdToSend = knownExercise.alias;

        let normalizedRecord = { ...record };
        const lowerEx = exerciseIdToSend.toLowerCase();
        if (lowerEx.includes('postura') || lowerEx.includes('posture') || lowerEx === 'posture_analysis') {
            exerciseIdToSend = 'POSTURE_ANALYSIS'; normalizedRecord.exercise = 'POSTURE_ANALYSIS';
        } else if (lowerEx.includes('gordura') || lowerEx.includes('body') || lowerEx.includes('corporal') || lowerEx === 'body_composition') {
            exerciseIdToSend = 'BODY_COMPOSITION'; normalizedRecord.exercise = 'BODY_COMPOSITION';
        }
        setViewingRecord(normalizedRecord);
        setDetailedHistory([normalizedRecord]);

        try {
            // --- CORREÇÃO: Usar apiService ---
            const data = await apiService.getUserHistory(record.userId, exerciseIdToSend);

            if (data && data.length > 0) {
                const records = Array.isArray(data) ? data : Object.values(data).flat();
                setDetailedHistory((records as ExerciseRecord[]).sort((a, b) => b.timestamp - a.timestamp));
            }
        } catch (e) { }
    };

    const handleSharePlan = async () => {
        if (!viewingPlan) return;

        // Cria uma versão simplificada do texto para compartilhar
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = viewingPlan.content;
        const textContent = tempDiv.innerText || tempDiv.textContent || "";

        const shareText = `📋 *${viewingPlan.title} - FitAI*\n\n${textContent.substring(0, 1000)}...\n\n(Acesse o app para ver completo)`;

        if (navigator.share) {
            try {
                await navigator.share({
                    title: viewingPlan.title,
                    text: shareText
                });
            } catch (e) { }
        } else {
            try {
                await navigator.clipboard.writeText(shareText);
                showToast("Resumo copiado para a área de transferência!", 'success');
            } catch (e) {
                showToast("Erro ao copiar.", 'error');
            }
        }
    };

    const getScoreColor = (score: number) => {
        if (score >= 80) return "text-emerald-400 border-emerald-500/30 bg-emerald-500/10";
        if (score >= 60) return "text-yellow-400 border-yellow-500/30 bg-yellow-500/10";
        return "text-red-400 border-red-500/30 bg-red-500/10";
    };
    const getMetricDisplay = (record: ExerciseRecord) => {
        const lowerEx = record.exercise.toLowerCase();
        if (lowerEx.includes('postura') || lowerEx.includes('posture') || record.exercise === 'POSTURE_ANALYSIS') return { value: 'Check-up', label: 'Status' };
        if (lowerEx.includes('gordura') || lowerEx.includes('body') || lowerEx.includes('corporal') || record.exercise === 'BODY_COMPOSITION') return { value: `${record.result.repetitions}%`, label: 'Gordura' };
        return { value: `${record.result.repetitions}`, label: 'reps' };
    };
    const getExerciseIcon = (exercise: string) => {
        const lowerEx = exercise.toLowerCase();
        if (lowerEx.includes('postura') || lowerEx.includes('posture')) return <ScanLine className="w-5 h-5 text-blue-400" />;
        if (lowerEx.includes('gordura') || lowerEx.includes('body')) return <Scale className="w-5 h-5 text-violet-400" />;
        return <Activity className="w-5 h-5 text-slate-400" />;
    };

    return (
        <div className="w-full max-w-7xl mx-auto p-4 animate-fade-in">
            <Toast message={toast.message} type={toast.type} isVisible={toast.isVisible} onClose={closeToast} />
            <ConfirmModal
                isOpen={confirmModal.isOpen}
                title={confirmModal.title}
                message={confirmModal.message}
                onConfirm={confirmModal.onConfirm}
                onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                isDestructive={confirmModal.isDestructive}
            />

            {/* TEACHER ACTION MODAL */}
            {showTeacherActionModal !== 'NONE' && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
                    <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 md:p-8 w-full max-w-lg relative shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar">
                        <button onClick={() => { setShowTeacherActionModal('NONE'); setAssessmentFiles([]); }} className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors">
                            <X className="w-6 h-6" />
                        </button>

                        {showTeacherActionModal === 'DIET' && (
                            <form onSubmit={handleTeacherGenerateDiet} className="space-y-4">
                                <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2"><Utensils className="w-6 h-6 text-emerald-400" /> Prescrever Dieta IA</h3>
                                <p className="text-sm text-slate-400 mb-4">Gerando dieta para: <span className="text-white font-bold">{selectedUser?.name}</span></p>
                                {/* Reuse logic from App.tsx forms */}
                                <div className="grid grid-cols-2 gap-4">
                                    <input type="number" placeholder="Peso (kg)" required className="bg-slate-800 border border-slate-700 rounded-xl p-3 text-white focus:border-emerald-500 focus:outline-none" value={actionFormData.weight} onChange={e => setActionFormData({ ...actionFormData, weight: e.target.value })} />
                                    <input type="number" placeholder="Altura (cm)" required className="bg-slate-800 border border-slate-700 rounded-xl p-3 text-white focus:border-emerald-500 focus:outline-none" value={actionFormData.height} onChange={e => setActionFormData({ ...actionFormData, height: e.target.value })} />
                                </div>
                                <select className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white focus:border-emerald-500 focus:outline-none" value={actionFormData.gender} onChange={e => setActionFormData({ ...actionFormData, gender: e.target.value })}>
                                    <option value="masculino">Masculino</option>
                                    <option value="feminino">Feminino</option>
                                </select>
                                <select className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white focus:border-emerald-500 focus:outline-none" value={actionFormData.goal} onChange={e => setActionFormData({ ...actionFormData, goal: e.target.value })}>
                                    <option value="emagrecer">Emagrecer</option>
                                    <option value="ganhar_massa">Hipertrofia</option>
                                    <option value="manutencao">Manutenção</option>
                                </select>
                                <textarea placeholder="Restrições alimentares..." className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white focus:border-emerald-500 focus:outline-none" value={actionFormData.observations} onChange={e => setActionFormData({ ...actionFormData, observations: e.target.value })} />
                                <button type="submit" disabled={processing} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl transition-all">{processing ? <Loader2 className="animate-spin mx-auto" /> : 'Gerar e Salvar'}</button>
                            </form>
                        )}

                        {showTeacherActionModal === 'WORKOUT' && (
                            <form onSubmit={handleTeacherGenerateWorkout} className="space-y-4">
                                <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2"><Dumbbell className="w-6 h-6 text-blue-400" /> Prescrever Treino IA</h3>
                                <p className="text-sm text-slate-400 mb-4">Gerando treino para: <span className="text-white font-bold">{selectedUser?.name}</span></p>
                                <div className="grid grid-cols-2 gap-4">
                                    <input type="number" placeholder="Peso (kg)" required className="bg-slate-800 border border-slate-700 rounded-xl p-3 text-white focus:border-blue-500 focus:outline-none" value={actionFormData.weight} onChange={e => setActionFormData({ ...actionFormData, weight: e.target.value })} />
                                    <input type="number" placeholder="Altura (cm)" required className="bg-slate-800 border border-slate-700 rounded-xl p-3 text-white focus:border-blue-500 focus:outline-none" value={actionFormData.height} onChange={e => setActionFormData({ ...actionFormData, height: e.target.value })} />
                                </div>
                                <select className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white focus:border-blue-500 focus:outline-none" value={actionFormData.gender} onChange={e => setActionFormData({ ...actionFormData, gender: e.target.value })}>
                                    <option value="masculino">Masculino</option>
                                    <option value="feminino">Feminino</option>
                                </select>
                                <select className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white focus:border-blue-500 focus:outline-none" value={actionFormData.goal} onChange={e => setActionFormData({ ...actionFormData, goal: e.target.value })}>
                                    <option value="hipertrofia">Hipertrofia</option>
                                    <option value="emagrecimento">Emagrecimento</option>
                                    <option value="definicao">Definição</option>
                                </select>

                                {/* NOVA GRID: NÍVEL E FREQUÊNCIA */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-xs text-slate-400 ml-1">Nível</label>
                                        <select className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white focus:border-blue-500 focus:outline-none" value={actionFormData.level} onChange={e => setActionFormData({ ...actionFormData, level: e.target.value })}>
                                            <option value="iniciante">Iniciante</option>
                                            <option value="intermediario">Intermediário</option>
                                            <option value="avancado">Avançado</option>
                                        </select>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs text-slate-400 ml-1">Frequência</label>
                                        <select className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white focus:border-blue-500 focus:outline-none" value={actionFormData.frequency} onChange={e => setActionFormData({ ...actionFormData, frequency: e.target.value })}>
                                            <option value="1">1x na Semana</option>
                                            <option value="2">2x na Semana</option>
                                            <option value="3">3x na Semana</option>
                                            <option value="4">4x na Semana</option>
                                            <option value="5">5x na Semana</option>
                                            <option value="6">6x na Semana</option>
                                            <option value="7">Todos os dias</option>
                                        </select>
                                    </div>
                                </div>

                                <textarea placeholder="Lesões ou observações..." className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white focus:border-blue-500 focus:outline-none" value={actionFormData.observations} onChange={e => setActionFormData({ ...actionFormData, observations: e.target.value })} />
                                <button type="submit" disabled={processing} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl transition-all">{processing ? <Loader2 className="animate-spin mx-auto" /> : 'Gerar e Salvar'}</button>
                            </form>
                        )}

                        {showTeacherActionModal === 'ASSESSMENT' && (
                            <div className="space-y-6">
                                <div>
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-lg">
                                            <Stethoscope className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-bold text-white">Protocolo de Avaliação</h3>
                                            <p className="text-xs text-indigo-300 font-medium">BETA CLINICAL IA™</p>
                                        </div>
                                    </div>
                                    <p className="text-sm text-slate-400 leading-relaxed border-t border-slate-800 pt-3">
                                        Selecione o protocolo clínico abaixo e faça o upload da mídia do paciente/aluno para iniciar o processamento biomecânico.
                                    </p>
                                </div>

                                {/* SELEÇÃO DE TIPO COM CARDS VISUAIS */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                    <button
                                        onClick={() => setAssessmentType(SPECIAL_EXERCISES.BODY_COMPOSITION)}
                                        className={`flex flex-col items-center justify-center p-4 rounded-xl border transition-all duration-300 ${assessmentType === SPECIAL_EXERCISES.BODY_COMPOSITION ? 'bg-indigo-600 border-indigo-500 shadow-lg shadow-indigo-900/40 scale-105 z-10' : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-750 hover:border-slate-600'}`}
                                    >
                                        <Scale className={`w-6 h-6 mb-2 ${assessmentType === SPECIAL_EXERCISES.BODY_COMPOSITION ? 'text-white' : 'text-slate-500'}`} />
                                        <span className={`text-xs font-bold ${assessmentType === SPECIAL_EXERCISES.BODY_COMPOSITION ? 'text-white' : 'text-slate-400'}`}>Biotipo & Gordura</span>
                                    </button>

                                    <button
                                        onClick={() => setAssessmentType(SPECIAL_EXERCISES.POSTURE)}
                                        className={`flex flex-col items-center justify-center p-4 rounded-xl border transition-all duration-300 ${assessmentType === SPECIAL_EXERCISES.POSTURE ? 'bg-indigo-600 border-indigo-500 shadow-lg shadow-indigo-900/40 scale-105 z-10' : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-750 hover:border-slate-600'}`}
                                    >
                                        <ScanLine className={`w-6 h-6 mb-2 ${assessmentType === SPECIAL_EXERCISES.POSTURE ? 'text-white' : 'text-slate-500'}`} />
                                        <span className={`text-xs font-bold ${assessmentType === SPECIAL_EXERCISES.POSTURE ? 'text-white' : 'text-slate-400'}`}>Análise Postural</span>
                                    </button>

                                    <button
                                        onClick={() => setAssessmentType(SPECIAL_EXERCISES.FREE_MODE)}
                                        className={`flex flex-col items-center justify-center p-4 rounded-xl border transition-all duration-300 ${assessmentType === SPECIAL_EXERCISES.FREE_MODE ? 'bg-indigo-600 border-indigo-500 shadow-lg shadow-indigo-900/40 scale-105 z-10' : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-750 hover:border-slate-600'}`}
                                    >
                                        <Activity className={`w-6 h-6 mb-2 ${assessmentType === SPECIAL_EXERCISES.FREE_MODE ? 'text-white' : 'text-slate-500'}`} />
                                        <span className={`text-xs font-bold ${assessmentType === SPECIAL_EXERCISES.FREE_MODE ? 'text-white' : 'text-slate-400'}`}>Técnica de Movimento</span>
                                    </button>
                                </div>

                                {/* Dropdown de Exercícios do Aluno (NOVO) */}
                                <div className="pt-4 border-t border-slate-700">
                                    <label className="text-xs text-slate-400 mb-2 block uppercase font-bold">Ou selecione um exercício do aluno:</label>
                                    <select
                                        className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white focus:border-indigo-500 focus:outline-none"
                                        onChange={(e) => setAssessmentType(e.target.value)}
                                        value={assessmentType}
                                    >
                                        <option value="">Identificar Automaticamente (IA)</option>

                                        {studentExercises.length > 0 ? (
                                            studentExercises.map(ex => (
                                                <option key={ex.id} value={ex.alias}>{ex.name}</option>
                                            ))
                                        ) : (
                                            allExercises.filter(ex => ex.category !== 'SPECIAL').map(ex => (
                                                <option key={ex.id} value={ex.alias}>{ex.name}</option>
                                            ))
                                        )}
                                    </select>
                                    {studentExercises.length === 0 && (
                                        <p className="text-[10px] text-slate-500 mt-1 italic">Mostrando lista completa (Aluno sem exercícios atribuídos).</p>
                                    )}
                                </div>

                                {/* ÁREA DE UPLOAD APRIMORADA (MULTI-FILE) */}
                                <div
                                    onClick={() => fileInputRef.current?.click()}
                                    className={`group relative border-2 border-dashed rounded-2xl min-h-[12rem] flex flex-col items-center justify-center cursor-pointer transition-all overflow-hidden ${assessmentFiles.length > 0 ? 'border-indigo-500 bg-slate-900' : 'border-slate-600 hover:border-indigo-400 hover:bg-slate-800/50 bg-slate-800/20'}`}
                                >
                                    {assessmentPreviews.length > 0 ? (
                                        <div className="w-full h-full p-2 grid grid-cols-2 gap-2">
                                            {assessmentPreviews.map((preview, idx) => (
                                                <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border border-slate-700">
                                                    {assessmentFiles[idx]?.type.startsWith('video/') ? (
                                                        <video src={preview} className="w-full h-full object-cover" muted />
                                                    ) : (
                                                        <img src={preview} className="w-full h-full object-cover" />
                                                    )}
                                                    {/* Overlay apenas no primeiro ou gerar um geral */}
                                                </div>
                                            ))}
                                            <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-[2px]">
                                                <p className="text-white font-bold text-sm bg-black/50 px-3 py-1 rounded-full">Clique para alterar seleção</p>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="text-center p-6 transition-transform group-hover:scale-105">
                                            <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center mx-auto mb-4 group-hover:bg-indigo-500/20 transition-colors">
                                                <UploadCloud className="w-8 h-8 text-slate-400 group-hover:text-indigo-400 transition-colors" />
                                            </div>
                                            <p className="text-sm font-bold text-slate-300 group-hover:text-white transition-colors">Selecione 1 ou mais fotos</p>
                                            <p className="text-xs text-slate-500 mt-2 max-w-[200px] mx-auto">Para Postura/Biotipo, envie: Frente, Lado e Costas.</p>
                                        </div>
                                    )}
                                    <input ref={fileInputRef} type="file" className="hidden" accept="video/*,image/*" multiple onChange={handleAssessmentFileChange} />
                                </div>

                                <button
                                    onClick={handleTeacherAssessment}
                                    disabled={assessmentFiles.length === 0 || processing}
                                    className={`w-full font-bold py-4 rounded-xl flex items-center justify-center gap-2 text-sm shadow-lg transition-all ${(assessmentFiles.length === 0 || processing) ? 'bg-slate-800 text-slate-500 cursor-not-allowed' : 'bg-indigo-600 text-white hover:bg-indigo-500 hover:shadow-indigo-500/25 active:scale-[0.98]'}`}
                                >
                                    {processing ? <Loader2 className="animate-spin w-5 h-5" /> : <Sparkles className="w-5 h-5" />}
                                    {processing ? 'Processando Dados...' : 'INICIAR ANÁLISE CLÍNICA'}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* PLAN PREVIEW MODAL */}
            {viewingPlan && (
                <div className="fixed inset-0 z-[120] bg-slate-900/95 overflow-y-auto animate-in fade-in backdrop-blur-sm">
                    <div className="min-h-screen p-4 md:p-8 relative" style={{ paddingTop: 'max(4rem, env(safe-area-inset-top))' }}>
                        <div className="flex justify-between items-center max-w-6xl mx-auto mb-6 no-print">
                            <button
                                onClick={() => setViewingPlan(null)}
                                className="flex items-center gap-2 text-slate-300 hover:text-white transition-colors"
                            >
                                <X className="w-6 h-6" /> Fechar Visualização
                            </button>
                            <div className="flex gap-3">
                                <button onClick={handleSharePlan} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold shadow-lg transition-all">
                                    <Share2 className="w-4 h-4" /> Compartilhar
                                </button>
                                <button onClick={() => window.print()} className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-bold shadow-lg transition-all border border-slate-600">
                                    <Printer className="w-4 h-4" /> Imprimir
                                </button>
                            </div>
                        </div>
                        <div className="max-w-6xl mx-auto bg-slate-50 rounded-3xl p-8 shadow-2xl min-h-[80vh] printable-content">
                            <style>{`
                     #admin-plan-view { font-family: 'Plus Jakarta Sans', sans-serif; color: #1e293b; }
                     @media print {
                       body * { visibility: hidden; }
                       .printable-content, .printable-content * { visibility: visible; }
                       .printable-content { position: absolute; left: 0; top: 0; width: 100%; margin: 0; padding: 0; background: white; box-shadow: none; border-radius: 0; }
                       .no-print { display: none !important; }
                     }
                 `}</style>
                            {/* Title Header inside Printable Area */}
                            <div className="mb-6 border-b border-slate-200 pb-4">
                                <div className="bg-slate-800 text-white inline-block px-4 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-2">
                                    FitAI Pro
                                </div>
                                <h2 className="text-2xl font-bold text-slate-900">{viewingPlan.title}</h2>
                                <p className="text-sm text-slate-500">Plano gerado para: {selectedUser?.name}</p>
                            </div>

                            <div id="admin-plan-view" dangerouslySetInnerHTML={{ __html: viewingPlan.content }} />

                            <div className="mt-8 pt-4 border-t border-slate-200 text-center text-xs text-slate-400">
                                Documento gerado automaticamente por FitAI Analyzer. Acompanhamento profissional recomendado.
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* DETAILED VIEW MODAL */}
            {viewingRecord && selectedUser && (
                <div className="fixed inset-0 z-[100] bg-slate-900/95 overflow-y-auto animate-in fade-in backdrop-blur-sm">
                    <div className="min-h-screen p-4 md:p-8 relative" style={{ paddingTop: 'max(4rem, env(safe-area-inset-top))' }}>
                        <button
                            onClick={() => setViewingRecord(null)}
                            className="fixed right-4 z-[110] p-2 bg-slate-800 rounded-full text-white hover:bg-slate-700 hover:text-red-400 transition-colors shadow-lg border border-slate-700 no-print"
                            style={{ top: 'max(1rem, env(safe-area-inset-top))' }}
                        >
                            <X className="w-6 h-6" />
                        </button>

                        <div className="max-w-6xl mx-auto pt-8">
                            <ResultView
                                result={viewingRecord.result}
                                exercise={viewingRecord.exercise}
                                history={detailedHistory}
                                userId={selectedUser.id}
                                onReset={() => setViewingRecord(null)}
                                onDeleteRecord={handleDeleteRecord}
                                isHistoricalView={true}
                                showToast={showToast}
                                triggerConfirm={triggerConfirm}
                            />
                        </div>
                    </div>
                </div>
            )}

            <div className="flex flex-col md:flex-row gap-6 h-full min-h-[600px]">
                {/* Sidebar */}
                <div className="md:w-64 flex flex-col gap-2">
                    {/* ... (Sidebar logic unchanged) ... */}
                    <div className="p-4 bg-slate-800/50 rounded-2xl border border-slate-700/50 mb-4">
                        <h2 className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">
                            {isPersonal ? 'Menu Personal' : 'Menu Admin'}
                        </h2>
                        <button
                            onClick={() => { setActiveTab('users'); setSelectedUser(null); }}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'users' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'text-slate-300 hover:bg-slate-800'}`}
                        >
                            <Users className="w-5 h-5" /> {isPersonal ? 'Meus Alunos' : 'Usuários'}
                        </button>
                        <button
                            onClick={() => setActiveTab('create')}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all mt-2 ${activeTab === 'create' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'text-slate-300 hover:bg-slate-800'}`}
                        >
                            <UserPlus className="w-5 h-5" /> {isPersonal ? 'Cadastrar Aluno' : 'Novo Usuário'}
                        </button>

                        {isAdmin && (
                            <>
                                <button
                                    onClick={() => setActiveTab('assets')}
                                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all mt-2 ${activeTab === 'assets' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'text-slate-300 hover:bg-slate-800'}`}
                                >
                                    <ImageIcon className="w-5 h-5" /> Assets IA
                                </button>
                                <div className="h-px bg-slate-700/50 my-2"></div>
                                {/* 
                <button 
                  onClick={runAssignmentScript}
                  disabled={processing}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all mt-1 bg-indigo-600/20 text-indigo-300 hover:bg-indigo-600/30 border border-indigo-500/30 ${processing ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {processing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Database className="w-5 h-5" />}
                  <span className="text-xs font-bold">Rodar Script de Atribuição</span>
                </button>
                */}
                            </>
                        )}
                    </div>
                    {/* ... (Summary stats unchanged) ... */}
                </div>

                {/* Content Area */}
                <div className="flex-1 glass-panel rounded-3xl p-6 md:p-8 relative overflow-hidden min-h-[600px]">

                    {processing && activeTab !== 'assets' && (
                        showTeacherActionModal === 'ASSESSMENT' ? (
                            <div className="fixed inset-0 z-[200] bg-slate-900/95 flex items-center justify-center animate-in fade-in duration-300">
                                <LoadingScreen
                                    step={AppStep.ANALYZING}
                                    tip="A IA está processando os dados biomecânicos do aluno."
                                    exerciseType={assessmentType}
                                    isTeacherMode={true}
                                />
                            </div>
                        ) : (
                            <div className="absolute inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex flex-col items-center justify-center animate-in fade-in">
                                <Loader2 className="w-12 h-12 text-blue-500 animate-spin mb-4" />
                                <h3 className="text-xl font-bold text-white">{progressMsg}</h3>
                                <p className="text-slate-400 mt-2">Processando solicitação...</p>
                            </div>
                        )
                    )}

                    {activeTab === 'assets' && isAdmin && (
                        <div className="max-w-2xl mx-auto text-center py-10">
                            {/* ... (Assets view unchanged) ... */}
                            <h2 className="text-3xl font-bold text-white mb-4">Personalização com IA</h2>
                            <button onClick={handleGenerateAssets} className="bg-indigo-600 text-white px-6 py-3 rounded-full">Gerar Capas</button>
                        </div>
                    )}

                    {activeTab === 'create' && (
                        <div className="max-w-xl mx-auto">
                            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                                <UserPlus className="w-6 h-6 text-blue-400" /> {isPersonal ? 'Novo Aluno' : 'Novo Usuário'}
                            </h2>
                            {isPersonal && (
                                <div className="mb-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl text-blue-300 text-sm">
                                    Este aluno será automaticamente vinculado ao seu perfil de Personal Trainer.
                                </div>
                            )}
                            <form onSubmit={handleCreateUser} className="space-y-6">
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-2">Nome Completo</label>
                                    <input type="text" required value={newName} onChange={e => setNewName(e.target.value)} className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 outline-none" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-2">E-mail</label>
                                    <input type="email" required value={newEmail} onChange={e => setNewEmail(e.target.value)} className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 outline-none" />
                                </div>

                                {/* Role Selector - Apenas para Admins (Personais só criam usuários 'user') */}
                                {isAdmin && (
                                    <div className="animate-in fade-in slide-in-from-top-2">
                                        <label className="block text-sm font-medium text-slate-300 mb-2">Perfil de Acesso</label>
                                        <div className="relative">
                                            <ShieldAlert className="absolute left-4 top-3.5 w-5 h-5 text-slate-500" />
                                            <select
                                                value={newRole}
                                                onChange={e => setNewRole(e.target.value)}
                                                className="w-full bg-slate-800/50 border border-slate-700 rounded-xl py-3 pl-12 pr-4 text-white focus:ring-2 focus:ring-blue-500 outline-none appearance-none"
                                            >
                                                <option value="user">Aluno (Usuário Comum)</option>
                                                <option value="personal">Personal Trainer</option>
                                                <option value="admin">Administrador</option>
                                            </select>
                                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-500">
                                                <svg className="h-4 w-4 fill-current" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" /></svg>
                                            </div>
                                        </div>
                                        <p className="text-xs text-slate-500 mt-2 ml-1">
                                            {newRole === 'admin' ? '⚠️ Acesso total ao sistema.' : (newRole === 'personal' ? 'ℹ️ Pode gerenciar alunos vinculados.' : '👤 Acesso apenas aos próprios treinos.')}
                                        </p>
                                    </div>
                                )}

                                <button type="submit" disabled={processing} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-900/20 transition-all disabled:opacity-70 disabled:cursor-not-allowed">
                                    {processing ? (
                                        <span className="flex items-center justify-center gap-2">
                                            <Loader2 className="w-5 h-5 animate-spin" /> Cadastrando...
                                        </span>
                                    ) : (
                                        isPersonal ? 'Cadastrar Meu Aluno' : 'Cadastrar Usuário'
                                    )}
                                </button>
                            </form>
                        </div>
                    )}

                    {activeTab === 'users' && !selectedUser && (
                        <div className="h-full flex flex-col">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                                    <Users className="w-6 h-6 text-blue-400" /> {isPersonal ? 'Gestão dos Meus Alunos' : 'Gestão Global de Usuários'}
                                </h2>
                                <button onClick={fetchBackendUsers} className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1">
                                    <PlayCircle className="w-3 h-3" /> Atualizar Lista
                                </button>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 overflow-y-auto pr-2 custom-scrollbar">
                                {isLoadingUsers ? (
                                    <div className="col-span-full flex flex-col items-center justify-center py-20 opacity-80">
                                        <Loader2 className="w-12 h-12 text-blue-500 animate-spin mb-4" />
                                        <p className="text-white font-bold text-lg">Carregando lista de alunos...</p>
                                        <p className="text-slate-400 text-sm">Sincronizando com o banco de dados</p>
                                    </div>
                                ) : (
                                    <>
                                        {users.length === 0 && <div className="text-slate-500 col-span-full text-center py-10">
                                            {isPersonal ? 'Você ainda não tem alunos cadastrados.' : 'Nenhum usuário encontrado no backend.'}
                                        </div>}

                                        {users.filter(u => isPersonal ? u.role === 'user' : u.role !== 'admin').map(user => {
                                            return (
                                                <div key={user.id} onClick={() => setSelectedUser(user)} className="bg-slate-800/40 border border-slate-700/50 hover:bg-slate-800 hover:border-blue-500/50 rounded-2xl p-5 cursor-pointer transition-all group">
                                                    <div className="flex justify-between items-start mb-3">
                                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold">{user.name.charAt(0)}</div>
                                                        <div className="px-2 py-1 rounded text-xs font-bold text-slate-500 bg-slate-700/30">
                                                            {user.role === 'personal' ? 'Personal' : 'Aluno'}
                                                        </div>
                                                    </div>
                                                    <h3 className="text-white font-bold text-lg truncate">{user.name}</h3>
                                                    <p className="text-slate-400 text-sm truncate mb-4">{user.email}</p>
                                                    <div className="flex items-center justify-between text-xs text-slate-500 border-t border-slate-700/50 pt-3">
                                                        <span className={user.assignedExercises && user.assignedExercises.length > 0 ? 'text-emerald-400' : 'text-slate-500'}>
                                                            {user.assignedExercises?.length || 0} exercícios
                                                        </span>
                                                        <span className="flex items-center gap-1 group-hover:text-blue-400 transition-colors">Ver histórico <ChevronRight className="w-3 h-3" /></span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </>
                                )}
                            </div>
                        </div>
                    )}

                    {activeTab === 'users' && selectedUser && (
                        <div className="h-full flex flex-col animate-fade-in">
                            <button onClick={() => setSelectedUser(null)} className="self-start text-sm text-slate-400 hover:text-white mb-4 flex items-center gap-1 transition-colors">← Voltar para lista</button>
                            <div className="flex flex-col md:flex-row gap-6 h-full overflow-hidden">
                                <div className="md:w-1/3 flex flex-col gap-4 overflow-y-auto custom-scrollbar pr-2">
                                    <div className="bg-slate-800/30 p-5 rounded-2xl border border-slate-700/50">
                                        <h3 className="text-xl font-bold text-white mb-1">{selectedUser.name}</h3>
                                        <p className="text-slate-400 text-sm mb-6">{selectedUser.email}</p>

                                        {/* --- PAINEL DE AÇÕES DO PROFESSOR --- */}
                                        {(isPersonal || isAdmin) && (
                                            <div className="mb-6 bg-slate-900/50 p-4 rounded-xl border border-indigo-500/20">
                                                <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-3">Ações do Professor</h4>
                                                <div className="grid grid-cols-1 gap-2">
                                                    <button onClick={() => setShowTeacherActionModal('ASSESSMENT')} className="flex items-center gap-2 px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition-colors">
                                                        <Stethoscope className="w-4 h-4" /> Realizar Avaliação (IA)
                                                    </button>
                                                    <button onClick={() => setShowTeacherActionModal('WORKOUT')} className="flex items-center gap-2 px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm font-medium transition-colors">
                                                        <Dumbbell className="w-4 h-4" /> Prescrever Treino
                                                    </button>
                                                    <button onClick={() => setShowTeacherActionModal('DIET')} className="flex items-center gap-2 px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm font-medium transition-colors">
                                                        <Utensils className="w-4 h-4" /> Prescrever Dieta
                                                    </button>
                                                </div>
                                            </div>
                                        )}

                                        {/* --- PLANOS ATUAIS DO ALUNO (NOVO) --- */}
                                        {(isPersonal || isAdmin) && (
                                            <div className="mb-6">
                                                <h4 className="text-sm font-bold text-white flex items-center gap-2 mb-3">
                                                    <FileText className="w-4 h-4" /> Planos Atuais
                                                </h4>
                                                <div className="grid grid-cols-2 gap-2">
                                                    <button
                                                        disabled={!userWorkout}
                                                        onClick={() => userWorkout && setViewingPlan({ type: 'WORKOUT', content: userWorkout.content, title: 'Treino Atual' })}
                                                        className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-2 transition-all ${userWorkout ? 'bg-blue-600/10 border-blue-500/30 text-blue-300 hover:bg-blue-600/20' : 'bg-slate-800/30 border-slate-700 text-slate-500 cursor-not-allowed'}`}
                                                    >
                                                        <Calendar className="w-5 h-5" />
                                                        <span className="text-xs font-bold">{userWorkout ? 'Ver Treino' : 'Sem Treino'}</span>
                                                    </button>
                                                    <button
                                                        disabled={!userDiet}
                                                        onClick={() => userDiet && setViewingPlan({ type: 'DIET', content: userDiet.content, title: 'Dieta Atual' })}
                                                        className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-2 transition-all ${userDiet ? 'bg-emerald-600/10 border-emerald-500/30 text-emerald-300 hover:bg-emerald-600/20' : 'bg-slate-800/30 border-slate-700 text-slate-500 cursor-not-allowed'}`}
                                                    >
                                                        <Utensils className="w-5 h-5" />
                                                        <span className="text-xs font-bold">{userDiet ? 'Ver Dieta' : 'Sem Dieta'}</span>
                                                    </button>
                                                </div>
                                            </div>
                                        )}

                                        {/* --- EXERCÍCIOS ATRIBUÍDOS REMOVIDOS --- */}
                                        {/* 
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-sm font-bold text-white flex items-center gap-2"><Dumbbell className="w-4 h-4" /> Exercícios Atribuídos</h4>
                        <div className="flex gap-2 text-xs">
                            <button onClick={selectAllExercises} className="text-blue-400 hover:text-blue-300">Todos</button>
                            <span className="text-slate-600">|</span>
                            <button onClick={deselectAllExercises} className="text-slate-400 hover:text-slate-300">Nenhum</button>
                        </div>
                      </div>

                      <div className="space-y-2 max-h-[200px] overflow-y-auto custom-scrollbar pr-1 mb-4 bg-slate-900/20 p-2 rounded-xl">
                        {allExercises.length === 0 ? <p className="text-xs text-slate-500 p-2">Carregando exercícios...</p> : allExercises.map(exercise => {
                            const isAssigned = editingAssignments.includes(exercise.id);
                            return (
                                <div key={exercise.id} onClick={() => toggleAssignment(exercise.id)} className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors border ${isAssigned ? 'bg-blue-600/20 border-blue-500/30' : 'bg-slate-800/50 border-transparent hover:border-slate-600'}`}>
                                    <span className={`text-xs font-medium ${isAssigned ? 'text-white' : 'text-slate-500'}`}>{exercise.name}</span>
                                    {isAssigned ? <ToggleRight className="w-5 h-5 text-blue-400" /> : <ToggleLeft className="w-5 h-5 text-slate-600" />}
                                </div>
                            );
                        })}
                      </div>
                      <button onClick={saveAssignments} disabled={processing} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-3 rounded-xl font-bold text-sm shadow-lg flex items-center justify-center gap-2 transition-all">
                          {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                          Salvar Permissões
                      </button>
                      */}
                                    </div>
                                </div>

                                <div className="md:w-2/3 flex flex-col gap-4 overflow-y-auto custom-scrollbar">
                                    <div className="flex justify-between items-center mb-2">
                                        <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Histórico de Execuções</h4>
                                        {loadingHistory && <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />}
                                    </div>

                                    {userHistoryList.length === 0 && (
                                        <div className="text-center py-10 text-slate-500 bg-slate-800/20 rounded-2xl border border-dashed border-slate-700 flex flex-col items-center gap-2">
                                            {loadingHistory ? (
                                                <>
                                                    <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                                                    <p>Buscando histórico...</p>
                                                </>
                                            ) : (
                                                <>
                                                    <AlertCircle className="w-8 h-8 opacity-20" />
                                                    <p>Nenhum exercício realizado ainda.</p>
                                                </>
                                            )}
                                        </div>
                                    )}

                                    {Object.entries(groupedRecords).map(([exerciseKey, recordsVal]) => {
                                        const records = recordsVal as ExerciseRecord[];
                                        const friendlyName = allExercises.find(e => e.alias === exerciseKey || e.id === exerciseKey || e.name === exerciseKey)?.name || exerciseKey;

                                        return (
                                            <div key={exerciseKey} className="mb-6 animate-in slide-in-from-bottom-2">
                                                <h5 className="text-white font-bold text-md mb-3 border-b border-slate-700/50 pb-2 flex items-center gap-2 sticky top-0 bg-slate-900/90 p-2 rounded-lg backdrop-blur-sm z-10">
                                                    <div className="p-1.5 bg-slate-800 rounded-lg">
                                                        {getExerciseIcon(exerciseKey)}
                                                    </div>
                                                    <span className="truncate">{friendlyName}</span>
                                                    <span className="text-xs text-slate-500 font-normal ml-auto bg-slate-800 px-2 py-0.5 rounded-full border border-slate-700">{records.length} registros</span>
                                                </h5>

                                                <div className="space-y-3 pl-2 border-l-2 border-slate-800 ml-3">
                                                    {records.map(record => {
                                                        const metric = getMetricDisplay(record);
                                                        return (
                                                            <div
                                                                key={record.id}
                                                                onClick={() => handleViewRecordDetails(record)}
                                                                className="bg-slate-800/40 p-4 rounded-xl border border-slate-700/50 hover:bg-slate-800 hover:border-blue-500/50 transition-all cursor-pointer group relative overflow-hidden ml-2"
                                                            >
                                                                <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                    <ChevronRight className="w-5 h-5 text-blue-400" />
                                                                </div>
                                                                <div className="flex justify-between items-start mb-2 pr-8">
                                                                    <span className="text-xs text-slate-500">{new Date(record.timestamp).toLocaleDateString()} às {new Date(record.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                                </div>
                                                                <div className="flex items-center gap-4">
                                                                    <div className={`text-2xl font-bold ${getScoreColor(record.result.score).split(' ')[0]}`}>{record.result.score}</div>
                                                                    <div className="flex-1">
                                                                        <div className="w-full h-1.5 bg-slate-700 rounded-full overflow-hidden">
                                                                            <div className={`h-full ${getScoreColor(record.result.score).includes('emerald') ? 'bg-emerald-500' : (record.result.score > 50 ? 'bg-yellow-500' : 'bg-red-500')}`} style={{ width: `${record.result.score}%` }} />
                                                                        </div>
                                                                    </div>
                                                                    <div className="text-right pr-8 min-w-[80px]">
                                                                        <span className="block text-white font-bold text-sm">{metric.value}</span>
                                                                        <span className="text-[10px] text-slate-500 uppercase font-bold">{metric.label}</span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;