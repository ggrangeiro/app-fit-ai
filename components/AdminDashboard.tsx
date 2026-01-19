import React, { useState, useEffect, useMemo, useRef } from 'react';
import { User, ExerciseRecord, ExerciseDTO, SPECIAL_EXERCISES, AnalysisResult, DietPlan, WorkoutPlan, AppStep, WorkoutCheckIn, ProfessorActivity, ProfessorSummary } from '../types';
import { MockDataService } from '../services/mockDataService';
import { apiService } from '../services/apiService';
import { generateExerciseThumbnail, analyzeVideo, generateDietPlan, generateWorkoutPlan, regenerateWorkoutPlan, regenerateDietPlan, generateDietPlanV2, generateWorkoutPlanV2, regenerateWorkoutPlanV2, regenerateDietPlanV2 } from '../services/geminiService';
import { compressVideo } from '../utils/videoUtils';
import { shareAsPdf } from '../utils/pdfUtils';
import { ResultView } from './ResultView';
import LoadingScreen from './LoadingScreen';
import { Users, UserPlus, FileText, Check, Search, ChevronRight, Activity, Plus, Sparkles, Image as ImageIcon, Loader2, Dumbbell, ToggleLeft, ToggleRight, Save, Database, PlayCircle, X, Scale, ScanLine, AlertCircle, Utensils, UploadCloud, Stethoscope, Calendar, Eye, ShieldAlert, Video, FileVideo, Printer, Share2, CheckCircle, ChevronUp, ChevronDown, RefreshCw, Phone, Key, Lock, Trash2, UsersRound, BarChart3 } from 'lucide-react';
import ConfirmModal from './ConfirmModal';
import Toast, { ToastType } from './Toast';
import { AnamnesisModal } from './AnamnesisModal';
import { AICustomizationModal } from './AICustomizationModal';
import { ClipboardList, Camera } from 'lucide-react';
import { getFullImageUrl } from '../utils/imageUtils';

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
    const [activeTab, setActiveTab] = useState<'users' | 'create' | 'assets' | 'team'>('users');
    const [users, setUsers] = useState<User[]>([]);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [isLoadingUsers, setIsLoadingUsers] = useState(false); // Novo estado de loading

    const [userHistoryList, setUserHistoryList] = useState<ExerciseRecord[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [openHistoryGroups, setOpenHistoryGroups] = useState<Record<string, boolean>>({});

    // States para exibir planos atuais do usuário
    const [userDiet, setUserDiet] = useState<DietPlan | null>(null);
    const [userWorkout, setUserWorkout] = useState<WorkoutPlan | null>(null);
    const [viewingPlan, setViewingPlan] = useState<{ type: 'workout' | 'diet', title: string, content: string, daysData?: string, id: string, redoCount?: number, originalFormData?: any } | null>(null);
    const [pdfLoading, setPdfLoading] = useState(false);

    // Modals
    const [showEvolutionModal, setShowEvolutionModal] = useState(false);
    const [showPlansModal, setShowPlansModal] = useState(false);
    const [showAnamnesisModal, setShowAnamnesisModal] = useState(false);
    const [showRedoModal, setShowRedoModal] = useState(false);

    const [selectedExerciseId, setSelectedExerciseId] = useState<string | number | null>(null);
    const [redoFeedback, setRedoFeedback] = useState('');
    const [checkIns, setCheckIns] = useState<WorkoutCheckIn[]>([]);
    const [isCheckInsExpanded, setIsCheckInsExpanded] = useState(false);
    const [isLoadingCheckIns, setIsLoadingCheckIns] = useState(false);

    const [viewingRecord, setViewingRecord] = useState<ExerciseRecord | null>(null);
    const [detailedHistory, setDetailedHistory] = useState<ExerciseRecord[]>([]);

    const [allExercises, setAllExercises] = useState<ExerciseDTO[]>([]);
    const [studentExercises, setStudentExercises] = useState<ExerciseDTO[]>([]); // New state for student specific exercises

    const [processing, setProcessing] = useState(false);
    const [progressMsg, setProgressMsg] = useState('');

    const [newName, setNewName] = useState('');
    const [newEmail, setNewEmail] = useState('');
    const [newPhone, setNewPhone] = useState('');
    const [newRole, setNewRole] = useState('user'); // Novo estado para o papel do usuário
    const [newAccessLevel, setNewAccessLevel] = useState<'FULL' | 'READONLY'>('FULL'); // Initial state for access level

    // --- V2 GENERATION STATE ---
    const [useV2, setUseV2] = useState(false);

    // --- TEAM MANAGEMENT STATES (Only for Personal) ---
    const [professors, setProfessors] = useState<User[]>([]);
    const [loadingProfessors, setLoadingProfessors] = useState(false);
    const [showCreateProfessorModal, setShowCreateProfessorModal] = useState(false);
    const [newProfessorName, setNewProfessorName] = useState('');
    const [newProfessorEmail, setNewProfessorEmail] = useState('');
    const [newProfessorPhone, setNewProfessorPhone] = useState('');
    const [teamSummary, setTeamSummary] = useState<ProfessorSummary | null>(null);
    const [teamActivities, setTeamActivities] = useState<ProfessorActivity[]>([]);
    const [summaryPeriod, setSummaryPeriod] = useState<'day' | 'week' | 'month'>('week');


    // Máscara de telefone brasileiro (10 ou 11 dígitos)
    const formatPhone = (value: string): string => {
        const digits = value.replace(/\D/g, ''); // Remove tudo que não é número
        if (digits.length <= 10) {
            return digits.replace(/^(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3').replace(/-$/, '');
        } else {
            return digits.replace(/^(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3').replace(/-$/, '');
        }
    };

    const handleNewPhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const formatted = formatPhone(e.target.value);
        setNewPhone(formatted);
    };

    const [editingAssignments, setEditingAssignments] = useState<string[]>([]);

    // --- STATES PARA AÇÕES DO PROFESSOR ---
    const [showTeacherActionModal, setShowTeacherActionModal] = useState<'NONE' | 'DIET' | 'WORKOUT' | 'ASSESSMENT'>('NONE');
    const [assessmentType, setAssessmentType] = useState<string>(''); // Start empty to force selection or default
    const [assessmentFiles, setAssessmentFiles] = useState<File[]>([]);
    const [assessmentPreviews, setAssessmentPreviews] = useState<string[]>([]);
    const [actionFormData, setActionFormData] = useState({
        weight: '', height: '', goal: 'hipertrofia', level: 'iniciante', frequency: '4', duration: 'medium', observations: '', gender: 'masculino'
    });

    // Novos estados para anexos (Prescrição Planos)
    const [actionDocument, setActionDocument] = useState<File | null>(null);
    const [actionPhoto, setActionPhoto] = useState<File | null>(null);
    const [actionPhotoPreview, setActionPhotoPreview] = useState<string | null>(null);

    const [showDeleteConfirm, setShowDeleteConfirm] = useState<{ isOpen: boolean; recordId: string | null }>({ isOpen: false, recordId: null });
    const [isAnamnesisModalOpen, setIsAnamnesisModalOpen] = useState(false);
    const [isAICustomizationModalOpen, setIsAICustomizationModalOpen] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const brandLogoInputRef = useRef<HTMLInputElement>(null);
    const stdAvatarInputRef = useRef<HTMLInputElement>(null);

    const handleUploadLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            showToast("Enviando logo...", 'info');
            // Para logo, o target é o próprio personal (currentUser)
            const response = await apiService.uploadAsset(currentUser.id, file, 'logo', currentUser.id, currentUser.role);
            if (response && response.success) {
                // Se o onUpdateUser foi passado (geralmente é o App.tsx), atualiza o estado global
                if (onUpdateUser) {
                    const updated = { ...currentUser, brandLogo: response.imageUrl };
                    onUpdateUser(updated);
                }
                showToast("Logo atualizada com sucesso!", 'success');
            }
        } catch (e: any) {
            showToast("Erro ao enviar logo: " + e.message, 'error');
        }
    };

    const handleUploadStudentAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !selectedUser) return;

        try {
            showToast("Enviando foto do aluno...", 'info');
            // Upload para o selectedUser, mas requisitado pelo currentUser (Personal/Admin)
            // Backend espera /api/usuarios/{targetId}/upload-asset
            const response = await apiService.uploadAsset(selectedUser.id, file, 'avatar', currentUser.id, currentUser.role);

            if (response && response.success) {
                const newUrl = response.imageUrl;
                const updated = { ...selectedUser, avatar: newUrl };
                setSelectedUser(updated);
                // Atualiza na lista também
                setUsers(prev => prev.map(u => u.id === updated.id ? updated : u));
                showToast("Foto do aluno atualizada!", 'success');
            }
        } catch (e: any) {
            showToast("Erro ao enviar foto: " + e.message, 'error');
        }
    };

    // Reset helper for action forms
    const resetActionForm = () => {
        setActionFormData({ weight: '', height: '', goal: 'hipertrofia', level: 'iniciante', frequency: '4', duration: 'medium', observations: '', gender: 'masculino' });
        if (actionPhotoPreview) URL.revokeObjectURL(actionPhotoPreview);
        setActionDocument(null);
        setActionPhoto(null);
        setActionPhotoPreview(null);
    };

    // Password Reset States
    const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
    const [resetPasswordValue, setResetPasswordValue] = useState('');
    const [resetPasswordLoading, setResetPasswordLoading] = useState(false);

    // Plan Change States
    const [showPlanChangeModal, setShowPlanChangeModal] = useState(false);
    const [selectedPlanId, setSelectedPlanId] = useState<string>('');
    const [planChangeLoading, setPlanChangeLoading] = useState(false);

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

    const isPersonal = currentUser.role === 'personal' || currentUser.role === 'professor';
    const isManager = currentUser.role === 'personal'; // Só Personal pode gerenciar equipe
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
            fetchUserCheckIns(selectedUser.id);

        } else {
            setUserHistoryList([]);
            setUserDiet(null);
            setUserWorkout(null);
            setStudentExercises([]);
            setCheckIns([]);
            setIsCheckInsExpanded(false);
        }
    }, [selectedUser]);

    // Limpeza de preview ao fechar modal
    useEffect(() => {
        if (showTeacherActionModal === 'NONE') {
            assessmentPreviews.forEach(url => URL.revokeObjectURL(url));
            setAssessmentPreviews([]);
            setAssessmentFiles([]);
            setAssessmentType(''); // Reset selection

            // Limpa anexos de planos
            if (actionPhotoPreview) URL.revokeObjectURL(actionPhotoPreview);
            setActionPhotoPreview(null);
            setActionPhoto(null);
            setActionDocument(null);
        } else if (showTeacherActionModal === 'ASSESSMENT') {
            // Start empty to allow "Free Analysis/Auto-detect" if user doesn't pick anything
            setAssessmentType('');
        }
    }, [showTeacherActionModal]);

    const handleAssessmentFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []) as File[];
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

    // --- TEAM FETCH FUNCTIONS (Only for Personal/Manager) ---
    const fetchTeamData = async () => {
        if (currentUser.role !== 'personal') return;

        setLoadingProfessors(true);
        try {
            const [profs, summary, activities] = await Promise.all([
                apiService.getProfessors(currentUser.id),
                apiService.getProfessorsSummary(currentUser.id, summaryPeriod),
                apiService.getProfessorsActivities(currentUser.id)
            ]);
            setProfessors(profs);
            setTeamSummary(summary);
            setTeamActivities(activities);
        } catch (e) {
            console.error("Erro ao buscar dados da equipe:", e);
        } finally {
            setLoadingProfessors(false);
        }
    };

    const handleCreateProfessor = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newProfessorName || !newProfessorEmail) {
            showToast("Preencha nome e email do professor.", 'error');
            return;
        }
        setProcessing(true);
        try {
            await apiService.createProfessor(newProfessorName, newProfessorEmail, newProfessorPhone, currentUser.id);
            showToast("Professor cadastrado com sucesso! Senha inicial: mudar123", 'success');
            setShowCreateProfessorModal(false);
            setNewProfessorName('');
            setNewProfessorEmail('');
            setNewProfessorPhone('');
            fetchTeamData();
        } catch (err: any) {
            showToast("Erro ao cadastrar professor: " + (err.message || "Tente novamente."), 'error');
        } finally {
            setProcessing(false);
        }
    };

    // Fetch team data when switching to team tab
    useEffect(() => {
        if (activeTab === 'team' && currentUser.role === 'personal') {
            fetchTeamData();
        }
    }, [activeTab, summaryPeriod]);

    const [isEditingSelf, setIsEditingSelf] = useState(false);

    // ... (existing code)

    const fetchBackendUsers = async () => {
        setIsLoadingUsers(true);
        try {
            const resultUsers = await apiService.getUsers(currentUser.id, currentUser.role);
            if (resultUsers && resultUsers.length > 0) {
                const mappedUsers: User[] = resultUsers.map((u: any) => ({
                    id: String(u.id),
                    name: u.nome || u.name || 'Sem Nome',
                    email: u.email,
                    // Fix: Cast role string to UserRole (assuming backend validates values)
                    role: (u.role ? String(u.role).toLowerCase() : 'user') as 'admin' | 'personal' | 'user',
                    credits: u.credits || 0,
                    avatar: u.avatar,
                    assignedExercises: u.assignedExercises || [],
                    phone: u.telefone || u.phone,
                    plan: u.plan,
                    usage: u.usage,
                    methodology: u.methodology,
                    communicationStyle: u.communicationStyle
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

    const fetchUserCheckIns = async (userId: string) => {
        setIsLoadingCheckIns(true);
        try {
            const data = await apiService.getCheckIns(userId);
            if (Array.isArray(data)) {
                setCheckIns(data.sort((a, b) => b.timestamp - a.timestamp));
            }
        } catch (e) {
            console.error("Erro ao buscar check-ins", e);
        } finally {
            setIsLoadingCheckIns(false);
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

            await apiService.signup(newName, newEmail, "mudar123", newPhone, creatorId, roleToCreate, newAccessLevel);
            await MockDataService.createUser(newName, newEmail, undefined, creatorId, currentUser.role, roleToCreate);

            const roleName = roleToCreate === 'user' ? 'Aluno' : (roleToCreate === 'personal' ? 'Personal' : 'Admin');
            showToast(`${roleName} cadastrado com sucesso!`, 'success');

            setNewName('');
            setNewEmail('');
            setNewPhone('');
            setNewRole('user');
            setNewAccessLevel('FULL');

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
                await fetch(`https://app-back-ia-732767853162.southamerica-east1.run.app/api/usuarios/${selectedUser.id}`, {
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
        setProgressMsg(useV2 ? "Gerando Dieta V2 (Estruturada)..." : "Gerando Dieta com IA...");
        try {
            // 1. Buscar treino ativo do ALUNO para dar contexto
            let workoutContext = "";
            try {
                if (userWorkout) {
                    if (userWorkout.daysData) {
                        try {
                            const workoutJson = JSON.parse(userWorkout.daysData);
                            const summary = workoutJson.summary;
                            workoutContext = `Estilo: ${summary.trainingStyle}, Foco: ${summary?.focus?.join(', ')}, Freq: ${userWorkout.frequency || 'N/A'}. Obs: ${summary.considerations}`;
                        } catch (e) { }
                    } else {
                        workoutContext = userWorkout.content;
                    }
                }
            } catch (e) {
                console.warn("Erro ao preparar contexto de treino:", e);
            }

            if (useV2) {
                const planV2 = await generateDietPlanV2({
                    weight: actionFormData.weight,
                    height: actionFormData.height,
                    goal: actionFormData.goal,
                    gender: actionFormData.gender,
                    observations: actionFormData.observations,
                    workoutPlan: workoutContext, // Contexto,
                    anamnesis: selectedUser.anamnesis
                }, currentUser.id, currentUser.role, actionDocument, actionPhoto, {
                    methodology: currentUser.methodology,
                    communicationStyle: currentUser.communicationStyle
                });

                const planJson = JSON.stringify(planV2);
                const newDiet = await apiService.createDietV2(selectedUser.id, planJson, actionFormData.goal);

                showToast(`Dieta V2 salva para ${selectedUser.name}!`, 'success');
                setViewingPlan({ type: 'diet', content: `<pre class="whitespace-pre-wrap text-xs bg-slate-900 text-green-400 p-4 rounded-lg overflow-auto">${JSON.stringify(planV2, null, 2)}</pre>`, title: 'Nova Dieta V2 (JSON)', id: newDiet.id });
            } else {
                const planHtml = await generateDietPlan({
                    weight: actionFormData.weight,
                    height: actionFormData.height,
                    goal: actionFormData.goal,
                    gender: actionFormData.gender,
                    observations: actionFormData.observations,
                    workoutPlan: workoutContext, // Contexto
                    anamnesis: selectedUser.anamnesis
                }, currentUser.id, currentUser.role, actionDocument, actionPhoto, {
                    methodology: currentUser.methodology,
                    communicationStyle: currentUser.communicationStyle
                });

                const newDiet = await apiService.createDiet(selectedUser.id, planHtml, actionFormData.goal);
                showToast(`Dieta salva para ${selectedUser.name}!`, 'success');
                setViewingPlan({ type: 'diet', content: planHtml, title: 'Nova Dieta Gerada', id: newDiet.id });
            }

            // Limpa anexos
            if (actionPhotoPreview) URL.revokeObjectURL(actionPhotoPreview);
            setActionPhotoPreview(null);
            setActionPhoto(null);
            setActionDocument(null);

            fetchUserPlans(selectedUser.id);
            setShowTeacherActionModal('NONE');
            resetActionForm();

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
        setProgressMsg(useV2 ? "Gerando Treino V2 (Estruturado)..." : "Gerando Treino com IA...");
        try {
            const originalData = {
                weight: actionFormData.weight,
                height: actionFormData.height,
                goal: actionFormData.goal,
                level: actionFormData.level,
                frequency: actionFormData.frequency,
                observations: actionFormData.observations,
                gender: actionFormData.gender
            };

            if (useV2) {
                const planV2 = await generateWorkoutPlanV2(
                    { ...originalData, anamnesis: selectedUser.anamnesis },
                    currentUser.id,
                    currentUser.role,
                    actionDocument,
                    actionPhoto,
                    {
                        methodology: currentUser.methodology,
                        communicationStyle: currentUser.communicationStyle
                    }
                );
                const planJson = JSON.stringify(planV2);
                const newWorkout = await apiService.createTrainingV2(selectedUser.id, planJson, actionFormData.goal);

                showToast(`Treino V2 salvo para ${selectedUser.name}!`, 'success');

                setViewingPlan({ type: 'workout', content: `<pre class="whitespace-pre-wrap text-xs bg-slate-900 text-blue-400 p-4 rounded-lg overflow-auto">${JSON.stringify(planV2, null, 2)}</pre>`, title: 'Novo Treino V2 (JSON)', id: newWorkout.id, redoCount: 0, originalFormData: originalData });
            } else {
                const planHtml = await generateWorkoutPlan(
                    { ...originalData, anamnesis: selectedUser.anamnesis },
                    currentUser.id,
                    currentUser.role,
                    actionDocument,
                    actionPhoto,
                    {
                        methodology: currentUser.methodology,
                        communicationStyle: currentUser.communicationStyle
                    }
                );
                const newWorkout = await apiService.createTraining(selectedUser.id, planHtml, actionFormData.goal);

                showToast(`Treino salva para ${selectedUser.name}!`, 'success');

                setViewingPlan({ type: 'workout', content: planHtml, title: 'Novo Treino Gerado', id: newWorkout.id, redoCount: 0, originalFormData: originalData });
            }

            // Limpa anexos
            if (actionPhotoPreview) URL.revokeObjectURL(actionPhotoPreview);
            setActionPhotoPreview(null);
            setActionPhoto(null);
            setActionDocument(null);

            fetchUserPlans(selectedUser.id);
            setShowTeacherActionModal('NONE');
            resetActionForm();

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
            const result = await analyzeVideo(finalFiles, finalType, currentUser.id, currentUser.role);

            // --- 1. CONSUMIR CRÉDITO (MOVED TO AFTER SUCCESS) ---
            if (currentUser.role !== 'admin') {
                try {
                    // Determinar Nome Amigável
                    let analysisFriendlyName = finalType;
                    if (finalType === SPECIAL_EXERCISES.FREE_MODE) analysisFriendlyName = "Análise Livre";
                    else if (finalType === SPECIAL_EXERCISES.POSTURE) analysisFriendlyName = "Avaliação Postural";
                    else if (finalType === SPECIAL_EXERCISES.BODY_COMPOSITION) analysisFriendlyName = "Composição Corporal";

                    const creditResponse = await apiService.consumeCredit(currentUser.id, 'ANALISE', analysisFriendlyName);
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

            // --- UPLOAD DE EVIDÊNCIA PARA ANÁLISES ESPECIAIS (Postura/Composição Corporal) ---
            let uploadedImageUrl: string | undefined;
            const isPostureOrBodyComp =
                finalType === SPECIAL_EXERCISES.POSTURE ||
                finalType === SPECIAL_EXERCISES.BODY_COMPOSITION;

            if (isPostureOrBodyComp && assessmentFiles.length > 0) {
                try {
                    const fileToUpload = assessmentFiles[0];
                    const uploadResult = await apiService.uploadAnalysisEvidence(selectedUser.id, fileToUpload);
                    if (uploadResult.success) {
                        uploadedImageUrl = uploadResult.imageUrl;
                    }
                } catch (err) {
                    console.error("Falha no upload da evidência:", err);
                    // Continua a análise mesmo sem salvar a foto
                }
            }

            // 4. Save to History (using selectedUser.id as owner, but log who requested)
            const payload = {
                userId: selectedUser.id,
                userName: selectedUser.name,
                exercise: finalType,
                timestamp: Date.now(),
                result: { ...result, date: new Date().toISOString(), imageUrl: uploadedImageUrl }
            };

            // Updated to use apiService with correct query params for Personal/Admin
            await apiService.saveHistory(payload, currentUser.id, currentUser.role);

            // --- ALTERAÇÃO: Abrir resultado imediatamente ---
            const newRecord: ExerciseRecord = {
                id: 'temp-new',
                userId: selectedUser.id,
                userName: selectedUser.name,
                exercise: finalType,
                result: { ...result, date: new Date().toISOString(), imageUrl: uploadedImageUrl },
                timestamp: Date.now()
            };

            showToast("Avaliação concluída! Visualizando resultado...", 'success');

            setDetailedHistory([newRecord]);
            setViewingRecord(newRecord); // Abre o modal ResultView imediatamente
            setShowTeacherActionModal('NONE');
            resetActionForm();
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
        setPdfLoading(true);
        try {
            await shareAsPdf('printable-plan-container', viewingPlan.title);
            showToast("PDF gerado com sucesso!", 'success');
        } catch (error) {
            showToast("Erro ao compartilhar PDF.", 'error');
        } finally {
            setPdfLoading(false);
        }
    };

    const handleDeletePlan = async () => {
        if (!viewingPlan || !selectedUser) return;

        triggerConfirm(
            `Excluir ${viewingPlan.type === 'workout' ? 'Treino' : 'Dieta'}`,
            "Tem certeza que deseja apagar este plano permanentemente?",
            async () => {
                setProcessing(true);
                try {
                    if (viewingPlan.type === 'workout') {
                        await apiService.deleteTraining(selectedUser.id, viewingPlan.id);
                        showToast("Treino removido com sucesso.", 'success');
                    } else {
                        await apiService.deleteDiet(selectedUser.id, viewingPlan.id);
                        showToast("Dieta removida com sucesso.", 'success');
                    }
                    setViewingPlan(null);
                    // Refresh user data to update list
                    await fetchBackendUsers();
                    setSelectedUser(null); // Force re-selection to avoid stale data
                } catch (e) {
                    showToast("Erro ao remover plano.", 'error');
                } finally {
                    setProcessing(false);
                }
            },
            true
        );
    };

    const handleRedoWorkout = async () => {
        if (!viewingPlan || !redoFeedback.trim()) return;

        setProcessing(true);
        setProgressMsg(viewingPlan.type === 'workout' ? "Ajustando treino..." : "Ajustando dieta...");
        // NOTE: Keeping modal open so user sees the loading state

        try {
            let newHtml = '';
            let newDaysData = '';

            if (viewingPlan.type === 'workout') {
                if (viewingPlan.daysData) {
                    // --- TREINO V2 (JSON) ---
                    const updatedV2 = await regenerateWorkoutPlanV2(
                        viewingPlan.daysData,
                        redoFeedback,
                        viewingPlan.originalFormData || selectedUser || {},
                        currentUser.id,
                        currentUser.role
                    );
                    newDaysData = JSON.stringify(updatedV2);
                    newHtml = `<pre class="bg-slate-900 p-4 rounded-lg overflow-x-auto text-xs text-emerald-400 font-mono">${JSON.stringify(updatedV2, null, 2)}</pre>`;
                } else {
                    // --- TREINO V1 (HTML) ---
                    newHtml = await regenerateWorkoutPlan(
                        viewingPlan.content,
                        redoFeedback,
                        viewingPlan.originalFormData || selectedUser || {},
                        currentUser.id,
                        currentUser.role
                    );
                }
            } else if (viewingPlan.type === 'diet') {
                if (viewingPlan.daysData) {
                    // --- DIETA V2 (JSON) ---
                    const updatedV2 = await regenerateDietPlanV2(
                        viewingPlan.daysData,
                        redoFeedback,
                        viewingPlan.originalFormData || selectedUser || {},
                        currentUser.id,
                        currentUser.role
                    );
                    newDaysData = JSON.stringify(updatedV2);
                    newHtml = `<pre class="bg-slate-900 p-4 rounded-lg overflow-x-auto text-xs text-emerald-400 font-mono">${JSON.stringify(updatedV2, null, 2)}</pre>`;
                } else {
                    // --- DIETA V1 (HTML) ---
                    newHtml = await regenerateDietPlan(
                        viewingPlan.content,
                        redoFeedback,
                        viewingPlan.originalFormData || selectedUser || {},
                        currentUser.id,
                        currentUser.role
                    );
                }
            }

            // Update viewing plan with new content and increment redoCount
            setViewingPlan({
                ...viewingPlan,
                content: newHtml,
                daysData: newDaysData || viewingPlan.daysData,
                redoCount: (viewingPlan.redoCount || 0) + 1
            });

            setShowRedoModal(false);
            setRedoFeedback('');
            showToast("Plano ajustado com sucesso!", 'success');
        } catch (err: any) {
            showToast("Erro ao ajustar plano: " + err.message, 'error');
        } finally {
            setProcessing(false);
            setProgressMsg('');
        }
    };

    const handleResetPassword = async () => {
        if (!selectedUser || !resetPasswordValue.trim()) return;

        if (resetPasswordValue.length < 6) {
            showToast('A senha deve ter no mínimo 6 caracteres.', 'error');
            return;
        }

        setResetPasswordLoading(true);
        try {
            await apiService.adminResetPassword(selectedUser.id, resetPasswordValue);
            showToast(`Senha de ${selectedUser.name} alterada com sucesso!`, 'success');
            setShowResetPasswordModal(false);
            setResetPasswordValue('');
        } catch (err: any) {
            showToast('Erro ao resetar senha: ' + err.message, 'error');
        } finally {
            setResetPasswordLoading(false);
        }
    };

    const handleChangePlan = async () => {
        if (!selectedUser || !selectedPlanId) return;

        setPlanChangeLoading(true);
        try {
            await apiService.subscribe(selectedUser.id, selectedPlanId);
            showToast(`Plano de ${selectedUser.name} alterado para ${selectedPlanId}!`, 'success');
            setShowPlanChangeModal(false);
            setSelectedPlanId('');
            // Refresh user data (would ideally call getMe but we'll refetch users list)
            await fetchBackendUsers();
            // Re-select the user to show updated data
            // This is a simplification; a full implementation would update the selected user object directly
        } catch (err: any) {
            showToast('Erro ao alterar plano: ' + err.message, 'error');
        } finally {
            setPlanChangeLoading(false);
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

            {/* RESET PASSWORD MODAL */}
            {showResetPasswordModal && selectedUser && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
                    <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 md:p-8 w-full max-w-md relative shadow-2xl">
                        <button
                            onClick={() => { setShowResetPasswordModal(false); setResetPasswordValue(''); }}
                            className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
                        >
                            <X className="w-6 h-6" />
                        </button>

                        <div className="text-center mb-6">
                            <div className="flex justify-center mb-3">
                                <div className="p-3 bg-orange-600/20 rounded-2xl">
                                    <Key className="w-8 h-8 text-orange-400" />
                                </div>
                            </div>
                            <h3 className="text-xl font-bold text-white mb-1">Resetar Senha</h3>
                            <p className="text-slate-400 text-sm">
                                Definir nova senha para <span className="text-white font-semibold">{selectedUser.name}</span>
                            </p>
                        </div>

                        <div className="space-y-4">
                            <div className="space-y-1">
                                <label className="text-sm font-medium text-slate-300 ml-1">Nova Senha Temporária</label>
                                <div className="relative">
                                    <Lock className="absolute left-4 top-3.5 w-5 h-5 text-slate-500" />
                                    <input
                                        type="password"
                                        value={resetPasswordValue}
                                        onChange={(e) => setResetPasswordValue(e.target.value)}
                                        placeholder="Mínimo 6 caracteres"
                                        minLength={6}
                                        className="w-full bg-slate-800/50 border border-slate-700 rounded-xl py-3 pl-12 pr-4 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 transition-all"
                                    />
                                </div>
                            </div>

                            <p className="text-xs text-slate-500 text-center">
                                O aluno deverá alterar esta senha no próximo login.
                            </p>

                            <button
                                onClick={handleResetPassword}
                                disabled={resetPasswordLoading || resetPasswordValue.length < 6}
                                className="w-full py-3.5 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-bold rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {resetPasswordLoading ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        Alterando...
                                    </>
                                ) : (
                                    <>
                                        <Key className="w-5 h-5" />
                                        Confirmar Nova Senha
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* PLAN CHANGE MODAL */}
            {showPlanChangeModal && selectedUser && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
                    <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 md:p-8 w-full max-w-md relative shadow-2xl">
                        <button
                            onClick={() => { setShowPlanChangeModal(false); setSelectedPlanId(''); }}
                            className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
                        >
                            <X className="w-6 h-6" />
                        </button>

                        <div className="text-center mb-6">
                            <div className="flex justify-center mb-3">
                                <div className="p-3 bg-purple-600/20 rounded-2xl">
                                    <Sparkles className="w-8 h-8 text-purple-400" />
                                </div>
                            </div>
                            <h3 className="text-xl font-bold text-white mb-1">Alterar Plano</h3>
                            <p className="text-slate-400 text-sm">
                                Alterando plano de <span className="text-white font-semibold">{selectedUser.name}</span>
                            </p>
                        </div>

                        <div className="space-y-3 mb-6">
                            {['FREE', 'STARTER', 'PRO', 'STUDIO'].map((plan) => (
                                <button
                                    key={plan}
                                    onClick={() => setSelectedPlanId(plan)}
                                    className={`w-full p-4 rounded-xl border-2 transition-all flex items-center justify-between ${selectedPlanId === plan
                                        ? 'border-purple-500 bg-purple-500/10'
                                        : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
                                        }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <span className="text-white font-bold">{plan}</span>
                                        {plan === 'PRO' && (
                                            <span className="text-[10px] bg-amber-500 text-white px-2 py-0.5 rounded-full font-bold">
                                                POPULAR
                                            </span>
                                        )}
                                    </div>
                                    {selectedPlanId === plan && <Check className="w-5 h-5 text-purple-400" />}
                                </button>
                            ))}
                        </div>

                        <button
                            onClick={handleChangePlan}
                            disabled={planChangeLoading || !selectedPlanId}
                            className="w-full py-3.5 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-bold rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {planChangeLoading ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Alterando...
                                </>
                            ) : (
                                <>
                                    <Check className="w-5 h-5" />
                                    Confirmar Alteração
                                </>
                            )}
                        </button>
                    </div>
                </div>
            )}

            {/* TEACHER ACTION MODAL */}
            {showTeacherActionModal !== 'NONE' && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
                    <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 md:p-8 w-full max-w-lg relative shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar">
                        <button onClick={() => { setShowTeacherActionModal('NONE'); resetActionForm(); setAssessmentFiles([]); }} className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors">
                            <X className="w-6 h-6" />
                        </button>

                        {showTeacherActionModal === 'DIET' && (
                            <form onSubmit={handleTeacherGenerateDiet} className="space-y-4">
                                <div className="flex items-center justify-between mb-2">
                                    <h3 className="text-xl font-bold text-white flex items-center gap-2"><Utensils className="w-6 h-6 text-emerald-400" /> Prescrever Dieta IA</h3>
                                    <div className="flex items-center gap-2 bg-slate-800 p-1.5 rounded-lg border border-slate-700">
                                        <span className={`text-xs font-bold ${!useV2 ? 'text-white' : 'text-slate-500'}`}>Web (HTML)</span>
                                        <button
                                            type="button"
                                            onClick={() => { if (isAdmin) setUseV2(!useV2); }}
                                            className={`w-10 h-5 rounded-full relative transition-colors ${useV2 ? 'bg-emerald-500' : 'bg-slate-600'} ${!isAdmin ? 'opacity-50 cursor-not-allowed' : ''}`}
                                        >
                                            <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-transform ${useV2 ? 'left-6' : 'left-1'}`} />
                                        </button>
                                        <span className={`text-xs font-bold ${useV2 ? 'text-emerald-400' : 'text-slate-500'}`}>App V2 (JSON) {isAdmin ? '' : '(Admin)'}</span>
                                    </div>
                                </div>
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

                                <div className="space-y-3">
                                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Anexos Opcionais</p>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="relative">
                                            <label className="flex flex-col items-center justify-center p-3 bg-slate-800 border-2 border-dashed border-slate-700 rounded-xl hover:border-emerald-500 transition-all cursor-pointer group">
                                                <UploadCloud className="w-5 h-5 text-slate-500 group-hover:text-emerald-400 mb-1" />
                                                <span className="text-[10px] text-slate-400 group-hover:text-slate-200 truncate max-w-full">
                                                    {actionDocument ? actionDocument.name : 'Exame/PDF'}
                                                </span>
                                                <input type="file" accept=".pdf,image/*" className="hidden" onChange={e => setActionDocument(e.target.files?.[0] || null)} />
                                            </label>
                                            {actionDocument && (
                                                <button type="button" onClick={() => setActionDocument(null)} className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white text-xs hover:bg-red-400 transition-colors">
                                                    <X className="w-3 h-3" />
                                                </button>
                                            )}
                                        </div>

                                        <div className="relative">
                                            <label className="flex flex-col items-center justify-center p-3 bg-slate-800 border-2 border-dashed border-slate-700 rounded-xl hover:border-emerald-500 transition-all cursor-pointer group overflow-hidden">
                                                {actionPhotoPreview ? (
                                                    <img src={actionPhotoPreview} className="absolute inset-0 w-full h-full object-cover opacity-60" />
                                                ) : (
                                                    <ImageIcon className="w-5 h-5 text-slate-500 group-hover:text-emerald-400 mb-1" />
                                                )}
                                                <span className="text-[10px] text-slate-400 group-hover:text-slate-200 relative z-10">
                                                    {actionPhoto ? 'Trocar Foto' : 'Foto Paciente'}
                                                </span>
                                                <input type="file" accept="image/*" className="hidden" onChange={e => {
                                                    const file = e.target.files?.[0] || null;
                                                    setActionPhoto(file);
                                                    if (actionPhotoPreview) URL.revokeObjectURL(actionPhotoPreview);
                                                    if (file) setActionPhotoPreview(URL.createObjectURL(file));
                                                    else setActionPhotoPreview(null);
                                                }} />
                                            </label>
                                            {actionPhoto && (
                                                <button type="button" onClick={() => { if (actionPhotoPreview) URL.revokeObjectURL(actionPhotoPreview); setActionPhoto(null); setActionPhotoPreview(null); }} className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white text-xs hover:bg-red-400 transition-colors z-20">
                                                    <X className="w-3 h-3" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <button type="submit" disabled={processing} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl transition-all">{processing ? <Loader2 className="animate-spin mx-auto" /> : 'Gerar e Salvar'}</button>
                            </form>
                        )}

                        {showTeacherActionModal === 'WORKOUT' && (
                            <form onSubmit={handleTeacherGenerateWorkout} className="space-y-4">
                                <div className="flex items-center justify-between mb-2">
                                    <h3 className="text-xl font-bold text-white flex items-center gap-2"><Dumbbell className="w-6 h-6 text-blue-400" /> Prescrever Treino IA</h3>
                                    <div className="flex items-center gap-2 bg-slate-800 p-1.5 rounded-lg border border-slate-700">
                                        <span className={`text-xs font-bold ${!useV2 ? 'text-white' : 'text-slate-500'}`}>Web (HTML)</span>
                                        <button
                                            type="button"
                                            onClick={() => { if (isAdmin) setUseV2(!useV2); }}
                                            className={`w-10 h-5 rounded-full relative transition-colors ${useV2 ? 'bg-blue-500' : 'bg-slate-600'} ${!isAdmin ? 'opacity-50 cursor-not-allowed' : ''}`}
                                        >
                                            <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-transform ${useV2 ? 'left-6' : 'left-1'}`} />
                                        </button>
                                        <span className={`text-xs font-bold ${useV2 ? 'text-blue-400' : 'text-slate-500'}`}>App V2 (JSON) {isAdmin ? '' : '(Admin)'}</span>
                                    </div>
                                </div>
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

                                {/* NOVA GRID: LEVEL, FREQUENCY, DURATION */}
                                <div className="grid grid-cols-3 gap-3">
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
                                            <option value="1">1x/sem</option>
                                            <option value="2">2x/sem</option>
                                            <option value="3">3x/sem</option>
                                            <option value="4">4x/sem</option>
                                            <option value="5">5x/sem</option>
                                            <option value="6">6x/sem</option>
                                            <option value="7">Todos</option>
                                        </select>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs text-slate-400 ml-1">Duração</label>
                                        <select className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white focus:border-blue-500 focus:outline-none" value={actionFormData.duration} onChange={e => setActionFormData({ ...actionFormData, duration: e.target.value })}>
                                            <option value="short">Curto (30min)</option>
                                            <option value="medium">Médio (60min)</option>
                                            <option value="long">Longo (90min+)</option>
                                        </select>
                                    </div>
                                </div>

                                <textarea placeholder="Lesões ou observações..." className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white focus:border-blue-500 focus:outline-none" value={actionFormData.observations} onChange={e => setActionFormData({ ...actionFormData, observations: e.target.value })} />

                                <div className="space-y-3">
                                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Anexos Opcionais</p>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="relative">
                                            <label className="flex flex-col items-center justify-center p-3 bg-slate-800 border-2 border-dashed border-slate-700 rounded-xl hover:border-blue-500 transition-all cursor-pointer group">
                                                <UploadCloud className="w-5 h-5 text-slate-500 group-hover:text-blue-400 mb-1" />
                                                <span className="text-[10px] text-slate-400 group-hover:text-slate-200 truncate max-w-full">
                                                    {actionDocument ? actionDocument.name : 'Avaliação/PDF'}
                                                </span>
                                                <input type="file" accept=".pdf,image/*" className="hidden" onChange={e => setActionDocument(e.target.files?.[0] || null)} />
                                            </label>
                                            {actionDocument && (
                                                <button type="button" onClick={() => setActionDocument(null)} className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white text-xs hover:bg-red-400 transition-colors">
                                                    <X className="w-3 h-3" />
                                                </button>
                                            )}
                                        </div>

                                        <div className="relative">
                                            <label className="flex flex-col items-center justify-center p-3 bg-slate-800 border-2 border-dashed border-slate-700 rounded-xl hover:border-blue-500 transition-all cursor-pointer group overflow-hidden">
                                                {actionPhotoPreview ? (
                                                    <img src={actionPhotoPreview} className="absolute inset-0 w-full h-full object-cover opacity-60" />
                                                ) : (
                                                    <ImageIcon className="w-5 h-5 text-slate-500 group-hover:text-blue-400 mb-1" />
                                                )}
                                                <span className="text-[10px] text-slate-400 group-hover:text-slate-200 relative z-10">
                                                    {actionPhoto ? 'Trocar Foto' : 'Foto Aluno'}
                                                </span>
                                                <input type="file" accept="image/*" className="hidden" onChange={e => {
                                                    const file = e.target.files?.[0] || null;
                                                    setActionPhoto(file);
                                                    if (actionPhotoPreview) URL.revokeObjectURL(actionPhotoPreview);
                                                    if (file) setActionPhotoPreview(URL.createObjectURL(file));
                                                    else setActionPhotoPreview(null);
                                                }} />
                                            </label>
                                            {actionPhoto && (
                                                <button type="button" onClick={() => { if (actionPhotoPreview) URL.revokeObjectURL(actionPhotoPreview); setActionPhoto(null); setActionPhotoPreview(null); }} className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white text-xs hover:bg-red-400 transition-colors z-20">
                                                    <X className="w-3 h-3" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>

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
                                                <option key={ex.id} value={ex.name}>{ex.name}</option>
                                            ))
                                        ) : (
                                            allExercises.filter(ex => ex.category !== 'SPECIAL').map(ex => (
                                                <option key={ex.id} value={ex.name}>{ex.name}</option>
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
            )
            }

            {/* PLAN PREVIEW MODAL */}
            {
                viewingPlan && (
                    <div className="fixed inset-0 z-[120] bg-slate-900/95 overflow-y-auto animate-in fade-in backdrop-blur-sm">
                        <div className="min-h-screen p-4 md:p-8 relative" style={{ paddingTop: 'max(4rem, env(safe-area-inset-top))' }}>
                            <div className="flex justify-between items-center max-w-6xl mx-auto mb-6 no-print">
                                <div className="flex items-center gap-4">

                                    <button
                                        onClick={() => setIsEditingSelf(true)}
                                        className="text-xs text-slate-400 hover:text-white underline"
                                    >
                                        Editar Perfil
                                    </button>
                                    <button
                                        onClick={() => setViewingPlan(null)}
                                        className="flex items-center gap-2 text-slate-300 hover:text-white transition-colors"
                                    >
                                        <X className="w-6 h-6" /> <span className="hidden sm:inline">Fechar Visualização</span>
                                    </button>
                                </div>
                                <div className="flex gap-3">
                                    {/* Redo Button - For Workouts and Diets (Personal/Admin) */}
                                    {(isPersonal || isAdmin) && (
                                        <button
                                            onClick={() => setShowRedoModal(true)}
                                            disabled={processing || (viewingPlan.redoCount || 0) >= 2}
                                            title={`Refazer (${viewingPlan.redoCount || 0}/2 usados)`}
                                            className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg font-bold shadow-lg transition-all ${(viewingPlan.redoCount || 0) >= 2
                                                ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                                                : 'bg-amber-600 hover:bg-amber-500 text-white'
                                                }`}
                                        >
                                            <RefreshCw className="w-5 h-5" />
                                            <span className="hidden sm:inline">Refazer ({2 - (viewingPlan.redoCount || 0)} restantes)</span>
                                            <span className="sm:hidden">{2 - (viewingPlan.redoCount || 0)}</span>
                                        </button>
                                    )}
                                    <button
                                        onClick={handleDeletePlan}
                                        disabled={processing}
                                        className="p-2 bg-red-600 hover:bg-red-500 rounded-lg text-white shadow-lg transition-colors"
                                        title="Excluir Plano"
                                    >
                                        <Trash2 className="w-5 h-5" />
                                    </button>
                                    <button
                                        onClick={handleSharePlan}
                                        disabled={pdfLoading}
                                        className="flex items-center gap-2 px-4 sm:px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold shadow-lg transition-all disabled:opacity-50"
                                    >
                                        {pdfLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Share2 className="w-5 h-5" />}
                                        <span className="hidden sm:inline">{pdfLoading ? 'Gerando PDF...' : 'Compartilhar PDF'}</span>
                                    </button>
                                </div>
                            </div>
                            <div id="printable-plan-container" className="max-w-6xl mx-auto bg-slate-50 rounded-3xl p-8 shadow-2xl min-h-[80vh] printable-content">
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
                )
            }

            {/* REDO WORKOUT/DIET FEEDBACK MODAL */}
            {
                showRedoModal && viewingPlan && (viewingPlan.type === 'workout' || viewingPlan.type === 'diet') && (
                    <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
                        <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 md:p-8 w-full max-w-lg relative shadow-2xl">
                            <button onClick={() => { setShowRedoModal(false); setRedoFeedback(''); }} className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors">
                                <X className="w-6 h-6" />
                            </button>

                            <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                                <RefreshCw className="w-6 h-6 text-amber-400" /> Refazer {viewingPlan.type === 'workout' ? 'Treino' : 'Dieta'}
                            </h3>
                            <p className="text-sm text-slate-400 mb-4">
                                Descreva as alterações desejadas. A IA ajustará o plano mantendo o restante intacto.
                            </p>

                            <div className="mb-4">
                                <span className="text-xs text-slate-500">Refazimentos usados: <span className="text-amber-400 font-bold">{viewingPlan.redoCount || 0}/2</span></span>
                            </div>

                            <textarea
                                value={redoFeedback}
                                onChange={(e) => setRedoFeedback(e.target.value)}
                                disabled={processing}
                                placeholder="Ex: Trocar supino reto por flexão de braço, aumentar séries de agachamento para 4..."
                                className={`w-full bg-slate-800 border border-slate-700 rounded-xl p-4 text-white focus:border-amber-500 focus:outline-none resize-none h-32 placeholder:text-slate-500 ${processing ? 'opacity-50 cursor-not-allowed' : ''}`}
                            />

                            <div className="flex gap-3 mt-4">
                                <button
                                    onClick={() => { setShowRedoModal(false); setRedoFeedback(''); }}
                                    className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 rounded-xl transition-all"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleRedoWorkout}
                                    disabled={!redoFeedback.trim() || processing}
                                    className="flex-1 bg-amber-600 hover:bg-amber-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2"
                                >
                                    {processing ? <Loader2 className="animate-spin w-5 h-5" /> : <RefreshCw className="w-5 h-5" />}
                                    {processing ? 'Ajustando...' : `Refazer ${viewingPlan.type === 'workout' ? 'Treino' : 'Dieta'}`}
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* DETAILED VIEW MODAL */}
            {
                viewingRecord && selectedUser && (
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
                                    currentUser={currentUser}
                                    onReset={() => setViewingRecord(null)}
                                    onDeleteRecord={handleDeleteRecord}
                                    isHistoricalView={true}
                                    showToast={showToast}
                                    triggerConfirm={triggerConfirm}
                                />
                            </div>
                        </div>
                    </div>
                )
            }

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

                        {/* Botão Equipe - Apenas para Personal Trainer (Manager) */}
                        {isManager && (
                            <button
                                onClick={() => setActiveTab('team')}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all mt-2 ${activeTab === 'team' ? 'bg-purple-600 text-white shadow-lg shadow-purple-900/20' : 'text-slate-300 hover:bg-slate-800'}`}
                            >
                                <UsersRound className="w-5 h-5" /> Minha Equipe
                            </button>
                        )}

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

                    {/* ===== TEAM TAB (Gerenciamento de Professores - Somente Personal) ===== */}
                    {activeTab === 'team' && isManager && (
                        <div className="max-w-4xl mx-auto py-6 animate-in fade-in space-y-6">
                            {/* Header */}
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="p-3 bg-purple-500/20 rounded-xl">
                                        <UsersRound className="w-6 h-6 text-purple-400" />
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-bold text-white">Minha Equipe</h2>
                                        <p className="text-slate-400 text-sm">Gerencie seus professores assistentes</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setShowCreateProfessorModal(true)}
                                    className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl flex items-center gap-2 font-bold shadow-lg shadow-purple-900/20 transition-all"
                                >
                                    <UserPlus className="w-4 h-4" /> Adicionar Professor
                                </button>
                            </div>

                            {/* Summary Cards */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-700/50">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Users className="w-4 h-4 text-blue-400" />
                                        <span className="text-xs text-slate-400 uppercase font-bold">Alunos</span>
                                    </div>
                                    <span className="text-2xl font-bold text-white">{teamSummary?.totals?.studentsCreated || 0}</span>
                                </div>
                                <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-700/50">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Dumbbell className="w-4 h-4 text-emerald-400" />
                                        <span className="text-xs text-slate-400 uppercase font-bold">Treinos</span>
                                    </div>
                                    <span className="text-2xl font-bold text-white">{teamSummary?.totals?.workoutsGenerated || 0}</span>
                                </div>
                                <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-700/50">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Utensils className="w-4 h-4 text-orange-400" />
                                        <span className="text-xs text-slate-400 uppercase font-bold">Dietas</span>
                                    </div>
                                    <span className="text-2xl font-bold text-white">{teamSummary?.totals?.dietsGenerated || 0}</span>
                                </div>
                                <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-700/50">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Activity className="w-4 h-4 text-pink-400" />
                                        <span className="text-xs text-slate-400 uppercase font-bold">Análises</span>
                                    </div>
                                    <span className="text-2xl font-bold text-white">{teamSummary?.totals?.analysisPerformed || 0}</span>
                                </div>
                            </div>

                            {/* Period Filter */}
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-slate-400">Período:</span>
                                {(['day', 'week', 'month'] as const).map(p => (
                                    <button
                                        key={p}
                                        onClick={() => setSummaryPeriod(p)}
                                        className={`px-3 py-1 text-xs rounded-lg font-bold transition-all ${summaryPeriod === p ? 'bg-purple-600 text-white' : 'bg-slate-700/50 text-slate-400 hover:bg-slate-700'}`}
                                    >
                                        {p === 'day' ? 'Hoje' : p === 'week' ? 'Semana' : 'Mês'}
                                    </button>
                                ))}
                            </div>

                            {/* Professor List */}
                            <div className="bg-slate-800/30 p-5 rounded-2xl border border-slate-700/50">
                                <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                                    <UsersRound className="w-5 h-5 text-purple-400" /> Professores ({professors.length})
                                </h3>
                                {loadingProfessors ? (
                                    <div className="flex justify-center py-8">
                                        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
                                    </div>
                                ) : professors.length === 0 ? (
                                    <div className="text-center py-8 text-slate-500">
                                        <UsersRound className="w-12 h-12 mx-auto mb-2 opacity-20" />
                                        <p>Nenhum professor cadastrado ainda.</p>
                                        <p className="text-xs mt-1">Clique em "Adicionar Professor" para começar.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {professors.map(prof => (
                                            <div key={prof.id} className="flex items-center justify-between p-4 bg-slate-800/50 rounded-xl hover:bg-slate-800 transition-colors">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 bg-purple-500/20 rounded-full flex items-center justify-center">
                                                        <span className="text-purple-400 font-bold">{prof.name?.[0]?.toUpperCase() || 'P'}</span>
                                                    </div>
                                                    <div>
                                                        <p className="text-white font-medium">{prof.name}</p>
                                                        <p className="text-xs text-slate-500">{prof.email}</p>
                                                    </div>
                                                </div>
                                                {prof.phone && (
                                                    <span className="text-xs text-slate-400">{prof.phone}</span>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Activity Timeline */}
                            <div className="bg-slate-800/30 p-5 rounded-2xl border border-slate-700/50">
                                <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                                    <BarChart3 className="w-5 h-5 text-cyan-400" /> Atividades Recentes
                                </h3>
                                {teamActivities.length === 0 ? (
                                    <p className="text-slate-500 text-center py-4">Nenhuma atividade registrada.</p>
                                ) : (
                                    <div className="space-y-2 max-h-80 overflow-y-auto">
                                        {teamActivities.map(act => (
                                            <div key={act.id} className="flex items-start gap-3 p-3 bg-slate-800/40 rounded-xl">
                                                <div className={`w-2 h-2 rounded-full mt-2 ${act.actionType.includes('CREATED') ? 'bg-emerald-400' :
                                                    act.actionType.includes('GENERATED') ? 'bg-blue-400' :
                                                        act.actionType.includes('DELETED') ? 'bg-red-400' : 'bg-yellow-400'
                                                    }`} />
                                                <div className="flex-1">
                                                    <p className="text-sm text-slate-300">
                                                        <span className="font-bold text-white">{act.professorName}</span>
                                                        {' '}
                                                        {act.actionType === 'STUDENT_CREATED' && 'cadastrou aluno'}
                                                        {act.actionType === 'WORKOUT_GENERATED' && 'gerou treino para'}
                                                        {act.actionType === 'DIET_GENERATED' && 'gerou dieta para'}
                                                        {act.actionType === 'ANALYSIS_PERFORMED' && 'analisou'}
                                                        {act.actionType === 'WORKOUT_DELETED' && 'excluiu treino de'}
                                                        {act.actionType === 'DIET_DELETED' && 'excluiu dieta de'}
                                                        {act.actionType === 'WORKOUT_REDO' && 'refez treino de'}
                                                        {act.actionType === 'DIET_REDO' && 'refez dieta de'}
                                                        {' '}
                                                        {act.targetUserName && <span className="text-cyan-400">{act.targetUserName}</span>}
                                                    </p>
                                                    <p className="text-[10px] text-slate-500 mt-1">
                                                        {new Date(act.createdAt).toLocaleString('pt-BR')}
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Create Professor Modal */}
                    {showCreateProfessorModal && (
                        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in">
                            <div className="bg-slate-900 border border-slate-700 rounded-3xl p-8 w-full max-w-md relative shadow-2xl">
                                <button onClick={() => setShowCreateProfessorModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white">
                                    <X className="w-6 h-6" />
                                </button>

                                <div className="flex flex-col items-center mb-6">
                                    <div className="p-3 bg-purple-500/20 text-purple-400 rounded-full mb-3">
                                        <UserPlus className="w-8 h-8" />
                                    </div>
                                    <h3 className="text-2xl font-bold text-white">Novo Professor</h3>
                                    <p className="text-slate-400 text-center text-sm">Cadastre um membro para sua equipe</p>
                                </div>

                                <form onSubmit={handleCreateProfessor} className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-1">Nome Completo *</label>
                                        <input
                                            type="text"
                                            required
                                            className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white focus:ring-2 focus:ring-purple-500 outline-none"
                                            value={newProfessorName}
                                            onChange={e => setNewProfessorName(e.target.value)}
                                            placeholder="Nome do professor"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-1">Email *</label>
                                        <input
                                            type="email"
                                            required
                                            className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white focus:ring-2 focus:ring-purple-500 outline-none"
                                            value={newProfessorEmail}
                                            onChange={e => setNewProfessorEmail(e.target.value)}
                                            placeholder="email@exemplo.com"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-1">Telefone</label>
                                        <input
                                            type="tel"
                                            className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white focus:ring-2 focus:ring-purple-500 outline-none"
                                            value={newProfessorPhone}
                                            onChange={e => setNewProfessorPhone(formatPhone(e.target.value))}
                                            placeholder="(11) 99999-9999"
                                        />
                                    </div>

                                    <div className="bg-slate-800/50 p-3 rounded-xl border border-slate-700/50">
                                        <p className="text-xs text-slate-400 flex items-center gap-2">
                                            <Key className="w-4 h-4" />
                                            Senha inicial: <span className="font-mono text-purple-400">mudar123</span>
                                        </p>
                                        <p className="text-[10px] text-slate-500 mt-1">O professor deve trocar a senha no primeiro acesso.</p>
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={processing}
                                        className="w-full mt-4 bg-purple-600 hover:bg-purple-500 text-white font-bold py-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                                    >
                                        {processing ? <Loader2 className="w-5 h-5 animate-spin" /> : <UserPlus className="w-5 h-5" />}
                                        {processing ? 'Cadastrando...' : 'Cadastrar Professor'}
                                    </button>
                                </form>
                            </div>
                        </div>
                    )}

                    {activeTab === 'assets' && (isAdmin || isPersonal) && (
                        <div className="max-w-3xl mx-auto py-10 animate-in fade-in">
                            <h2 className="text-3xl font-bold text-white mb-8 flex items-center gap-3">
                                <Sparkles className="w-8 h-8 text-indigo-400" /> Personalização & Assets
                            </h2>

                            {/* BRAND LOGO SECTION (WHITE LABEL) */}
                            <div className="bg-slate-800/50 p-6 rounded-3xl border border-slate-700/50 mb-8">
                                <div className="flex justify-between items-start mb-6">
                                    <div>
                                        <h3 className="text-xl font-bold text-white mb-2">Sua Marca (White Label)</h3>
                                        <p className="text-slate-400 text-sm max-w-md">
                                            Adicione sua logomarca para personalizar o aplicativo. Seus alunos verão <strong>sua marca</strong> no topo da tela principal.
                                        </p>
                                    </div>
                                    <div className="bg-indigo-500/10 p-3 rounded-xl">
                                        <ImageIcon className="w-8 h-8 text-indigo-400" />
                                    </div>
                                </div>

                                <div className="flex flex-col md:flex-row items-center gap-8">
                                    {/* Preview */}
                                    <div className="w-full md:w-1/3 flex flex-col items-center gap-3">
                                        <div className="w-full aspect-[3/1] bg-slate-900 rounded-xl border-2 border-dashed border-slate-700 flex items-center justify-center relative overflow-hidden group">
                                            {currentUser.brandLogo ? (
                                                <img
                                                    src={getFullImageUrl(currentUser.brandLogo)}
                                                    alt="Brand Logo"
                                                    className="w-full h-full object-contain p-2"
                                                />
                                            ) : (
                                                <span className="text-slate-600 text-xs font-bold uppercase tracking-wider">Sem Logo</span>
                                            )}
                                        </div>
                                        <p className="text-[10px] text-slate-500">Formato recomendado: PNG Transparente (300x100)</p>
                                    </div>

                                    {/* Action */}
                                    <div className="w-full md:w-2/3">
                                        <input
                                            type="file"
                                            ref={brandLogoInputRef}
                                            className="hidden"
                                            accept="image/png,image/jpeg"
                                            onChange={handleUploadLogo}
                                        />
                                        <button
                                            onClick={() => brandLogoInputRef.current?.click()}
                                            className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-lg shadow-indigo-900/20 transition-all flex items-center justify-center gap-2"
                                        >
                                            <UploadCloud className="w-5 h-5" />
                                            Carregar Logomarca
                                        </button>
                                        <p className="text-slate-500 text-xs mt-3 text-center">
                                            Ao enviar, a logo será atualizada imediatamente para todos os seus alunos.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* ADMIN ONLY ASSETS */}
                            {isAdmin && (
                                <div className="bg-slate-800/30 p-6 rounded-3xl border border-slate-700/30 opacity-70 hover:opacity-100 transition-opacity">
                                    <h3 className="text-lg font-bold text-white mb-2">Assets do Sistema</h3>
                                    <p className="text-slate-400 text-sm mb-4">Geração automática de tumbnails para exercícios.</p>
                                    <button onClick={handleGenerateAssets} className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-medium text-sm transition-colors">
                                        Gerar Capas de Exercícios (IA)
                                    </button>
                                </div>
                            )}
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
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-2">Telefone</label>
                                    <div className="relative">
                                        <Phone className="absolute left-4 top-3.5 w-5 h-5 text-slate-500" />
                                        <input
                                            type="tel"
                                            required
                                            value={newPhone}
                                            onChange={handleNewPhoneChange}
                                            placeholder="(11) 98888-7777"
                                            maxLength={15}
                                            className="w-full bg-slate-800/50 border border-slate-700 rounded-xl py-3 pl-12 pr-4 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                        />
                                    </div>
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

                                {/* Access Level Selector */}
                                <div className="animate-in fade-in slide-in-from-top-2">
                                    <label className="block text-sm font-medium text-slate-300 mb-2">Nível de Permissão</label>
                                    <div className="flex gap-3">
                                        <button
                                            type="button"
                                            onClick={() => setNewAccessLevel('FULL')}
                                            className={`flex-1 p-3 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all ${newAccessLevel === 'FULL' ? 'bg-blue-500/20 border-blue-500 text-blue-400' : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'}`}
                                        >
                                            <CheckCircle className="w-5 h-5" />
                                            <span className="text-sm font-bold">Total (Full)</span>
                                            <span className="text-[10px] opacity-70">Gera treinos e dietas</span>
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => setNewAccessLevel('READONLY')}
                                            className={`flex-1 p-3 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all ${newAccessLevel === 'READONLY' ? 'bg-slate-500/20 border-slate-500 text-slate-300' : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'}`}
                                        >
                                            <Lock className="w-5 h-5" />
                                            <span className="text-sm font-bold">Leitura (ReadOnly)</span>
                                            <span className="text-[10px] opacity-70">Apenas visualiza</span>
                                        </button>
                                    </div>
                                    <p className="text-xs text-slate-500 mt-2 ml-1">
                                        {newAccessLevel === 'FULL' ? 'ℹ️ O aluno pode gerar treinos, dietas e fazer análises.' : '🔒 O aluno vê apenas o que o professor criar.'}
                                    </p>
                                </div>

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
                                <div className="flex items-center gap-3">
                                    {(isPersonal || isAdmin) && (
                                        <button
                                            onClick={() => setIsAICustomizationModalOpen(true)}
                                            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-indigo-500/20 transition-all border border-indigo-500/50"
                                        >
                                            <Sparkles className="w-4 h-4" /> Minha IA
                                        </button>
                                    )}
                                    <button onClick={fetchBackendUsers} className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1">
                                        <PlayCircle className="w-3 h-3" /> Atualizar Lista
                                    </button>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 overflow-y-auto pr-2 custom-scrollbar">
                                {isLoadingUsers ? (
                                    <div className="col-span-full flex flex-col items-center justify-center py-20 opacity-80">
                                        <Loader2 className="w-12 h-12 text-blue-500 animate-spin mb-4" />
                                        <p className="text-white font-bold text-lg">Carregando lista de alunos...</p>
                                        <p className="text-slate-400 text-sm">Sincronizando com o banco de dados</p>
                                    </div>
                                ) : (
                                    <div>
                                        {users.length === 0 && <div className="text-slate-500 col-span-full text-center py-10">
                                            {isPersonal ? 'Você ainda não tem alunos cadastrados.' : 'Nenhum usuário encontrado no backend.'}
                                        </div>}

                                        {users.filter(u => isPersonal ? u.role === 'user' : u.role !== 'admin').map(user => {
                                            return (
                                                <div key={user.id} onClick={() => setSelectedUser(user)} className="bg-slate-800/40 border border-slate-700/50 hover:bg-slate-800 hover:border-blue-500/50 rounded-2xl p-5 cursor-pointer transition-all group">
                                                    <div className="flex justify-between items-start mb-3">
                                                        <div className="w-10 h-10 rounded-full bg-slate-700 overflow-hidden border border-slate-600 relative">
                                                            {user.avatar ? (
                                                                <img src={getFullImageUrl(user.avatar)} alt={user.name} className="w-full h-full object-cover" />
                                                            ) : (
                                                                <div className="w-full h-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold">{user.name.charAt(0)}</div>
                                                            )}
                                                        </div>
                                                        <div className="flex flex-col items-end gap-1">
                                                            <div className="px-2 py-1 rounded text-xs font-bold text-slate-500 bg-slate-700/30">
                                                                {user.role === 'personal' ? 'Personal' : 'Aluno'}
                                                            </div>
                                                            {user.plan && (
                                                                <div className={`px-2 py-0.5 rounded text-[10px] font-bold border
                                                                    ${user.plan.type === 'PRO' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                                                        user.plan.type === 'STUDIO' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' :
                                                                            user.plan.type === 'STARTER' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' :
                                                                                'bg-slate-700/50 text-slate-400 border-slate-600'}
                                                                `}>
                                                                    {user.plan.type}
                                                                </div>
                                                            )}
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
                                    </div>
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
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <h3 className="text-xl font-bold text-white mb-1 flex items-center gap-2">
                                                    {selectedUser.name}
                                                    {selectedUser.plan && (
                                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wider
                                                            ${selectedUser.plan.type === 'PRO' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                                                selectedUser.plan.type === 'STUDIO' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' :
                                                                    selectedUser.plan.type === 'STARTER' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' :
                                                                        'bg-slate-700/50 text-slate-400 border-slate-600'}
                                                        `}>
                                                            {selectedUser.plan.type}
                                                        </span>
                                                    )}
                                                </h3>
                                                <p className="text-slate-400 text-sm mb-2">{selectedUser.email}</p>

                                                {/* STUDENT AVATAR UPLOAD */}
                                                <button
                                                    onClick={() => stdAvatarInputRef.current?.click()}
                                                    className="flex items-center gap-1.5 text-[10px] text-blue-400 hover:text-blue-300 font-bold uppercase tracking-wider mt-1 transition-colors group"
                                                >
                                                    <Camera className="w-3 h-3" /> Alterar Foto
                                                </button>
                                                <input
                                                    type="file"
                                                    ref={stdAvatarInputRef}
                                                    className="hidden"
                                                    accept="image/*"
                                                    onChange={handleUploadStudentAvatar}
                                                />
                                            </div>
                                            {selectedUser.usage && (
                                                <div className="text-right">
                                                    <div className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">Créditos</div>
                                                    <div className="text-xl font-bold text-white">{selectedUser.credits || 0}</div>
                                                    <div className="text-[10px] text-slate-500">
                                                        <span className="text-slate-400">{selectedUser.usage.subscriptionCredits}</span> Plano + <span className="text-emerald-400">{selectedUser.usage.purchasedCredits}</span> Extras
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {selectedUser.phone && (
                                            <a
                                                href={`tel:${selectedUser.phone.replace(/\D/g, '')}`}
                                                className="flex items-center gap-2 text-sm text-emerald-400 hover:text-emerald-300 transition-colors mb-6 group"
                                            >
                                                <Phone className="w-4 h-4 text-emerald-500 group-hover:scale-110 transition-transform" />
                                                <span>{selectedUser.phone}</span>
                                            </a>
                                        )}

                                        {/* PERMISSIONS CARD */}
                                        <div className="mb-4 bg-slate-900/50 p-4 rounded-xl border border-slate-700/50">
                                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center justify-between">
                                                Permissões de Acesso
                                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${selectedUser.accessLevel === 'READONLY' ? 'bg-slate-700 text-slate-300' : 'bg-emerald-500/20 text-emerald-400'}`}>
                                                    {selectedUser.accessLevel === 'READONLY' ? 'BLOQUEADO' : 'TOTAL'}
                                                </span>
                                            </h4>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={async () => {
                                                        try {
                                                            showToast("Atualizando permissão...", 'info');
                                                            await apiService.updateUser(selectedUser.id, { accessLevel: 'FULL' });
                                                            // Update local state
                                                            const updated = { ...selectedUser, accessLevel: 'FULL' } as User;
                                                            setSelectedUser(updated);
                                                            setUsers(prev => prev.map(u => u.id === updated.id ? updated : u));
                                                            showToast("Acesso alterado para TOTAL", 'success');
                                                        } catch (e) { showToast("Erro ao atualizar", 'error'); }
                                                    }}
                                                    className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all border ${selectedUser.accessLevel !== 'READONLY' ? 'bg-emerald-600 text-white border-emerald-500 shadow-lg shadow-emerald-900/20' : 'text-slate-400 border-slate-700 hover:bg-slate-800'}`}
                                                >
                                                    Total (Full)
                                                </button>
                                                <button
                                                    onClick={async () => {
                                                        try {
                                                            showToast("Atualizando permissão...", 'info');
                                                            await apiService.updateUser(selectedUser.id, { accessLevel: 'READONLY' });
                                                            // Update local state
                                                            const updated = { ...selectedUser, accessLevel: 'READONLY' } as User;
                                                            setSelectedUser(updated);
                                                            setUsers(prev => prev.map(u => u.id === updated.id ? updated : u));
                                                            showToast("Acesso alterado para LEITURA", 'success');
                                                        } catch (e) { showToast("Erro ao atualizar", 'error'); }
                                                    }}
                                                    className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all border ${selectedUser.accessLevel === 'READONLY' ? 'bg-slate-600 text-white border-slate-500 shadow-lg' : 'text-slate-400 border-slate-700 hover:bg-slate-800'}`}
                                                >
                                                    Leitura
                                                </button>
                                            </div>
                                        </div>

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
                                                    <button onClick={() => setShowAnamnesisModal(true)} className="flex items-center gap-2 px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm font-medium transition-colors">
                                                        <ClipboardList className="w-4 h-4" /> Anamnese Completa
                                                    </button>
                                                    <button onClick={() => setShowResetPasswordModal(true)} className="flex items-center gap-2 px-3 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-lg text-sm font-medium transition-colors">
                                                        <Key className="w-4 h-4" /> Resetar Senha
                                                    </button>
                                                    <button onClick={() => setShowPlanChangeModal(true)} className="flex items-center gap-2 px-3 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-sm font-medium transition-colors">
                                                        <Sparkles className="w-4 h-4" /> Alterar Plano
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
                                                        onClick={() => {
                                                            if (!userWorkout) return;
                                                            if (!userWorkout.content && userWorkout.daysData) {
                                                                // V2 Plan Fallback View
                                                                setViewingPlan({
                                                                    type: 'workout',
                                                                    content: `<pre class="whitespace-pre-wrap text-xs bg-slate-900 text-blue-400 p-4 rounded-lg overflow-auto">${JSON.stringify(JSON.parse(userWorkout.daysData), null, 2)}</pre>`,
                                                                    title: 'Treino V2 (JSON)'
                                                                });
                                                            } else {
                                                                setViewingPlan({ type: 'workout', content: userWorkout.content, title: 'Treino Atual' });
                                                            }
                                                        }}
                                                        className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-2 transition-all ${userWorkout ? 'bg-blue-600/10 border-blue-500/30 text-blue-300 hover:bg-blue-600/20' : 'bg-slate-800/30 border-slate-700 text-slate-500 cursor-not-allowed'}`}
                                                    >
                                                        <Calendar className="w-5 h-5" />
                                                        <span className="text-xs font-bold">{userWorkout ? (userWorkout.daysData && !userWorkout.content ? 'Ver Treino V2' : 'Ver Treino') : 'Sem Treino'}</span>
                                                    </button>
                                                    <button
                                                        disabled={!userDiet}
                                                        onClick={() => {
                                                            if (!userDiet) return;
                                                            if (!userDiet.content && userDiet.daysData) {
                                                                // V2 Plan Fallback View
                                                                setViewingPlan({
                                                                    type: 'diet',
                                                                    content: `<pre class="whitespace-pre-wrap text-xs bg-slate-900 text-emerald-400 p-4 rounded-lg overflow-auto">${JSON.stringify(JSON.parse(userDiet.daysData), null, 2)}</pre>`,
                                                                    title: 'Dieta V2 (JSON)'
                                                                });
                                                            } else {
                                                                setViewingPlan({ type: 'diet', content: userDiet.content, title: 'Dieta Atual' });
                                                            }
                                                        }}
                                                        className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-2 transition-all ${userDiet ? 'bg-emerald-600/10 border-emerald-500/30 text-emerald-300 hover:bg-emerald-600/20' : 'bg-slate-800/30 border-slate-700 text-slate-500 cursor-not-allowed'}`}
                                                    >
                                                        <Utensils className="w-5 h-5" />
                                                        <span className="text-xs font-bold">{userDiet ? (userDiet.daysData && !userDiet.content ? 'Ver Dieta V2' : 'Ver Dieta') : 'Sem Dieta'}</span>
                                                    </button>
                                                </div>
                                            </div>
                                        )}

                                        {/* --- CHECK-INS DE TREINO (NOVO) --- */}
                                        {(isPersonal || isAdmin) && (
                                            <div className="mb-6 bg-slate-800/30 rounded-xl border border-slate-700/50 overflow-hidden">
                                                <button
                                                    onClick={() => setIsCheckInsExpanded(!isCheckInsExpanded)}
                                                    className="w-full flex items-center justify-between p-4 hover:bg-slate-700/30 transition-colors"
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <CheckCircle className="w-5 h-5 text-emerald-400" />
                                                        <h4 className="text-sm font-bold text-white uppercase tracking-wider">Check-ins de Treino</h4>
                                                        {checkIns.length > 0 && (
                                                            <span className="bg-emerald-500/20 text-emerald-400 text-[10px] px-2 py-0.5 rounded-full border border-emerald-500/30 leading-tight">
                                                                {checkIns.length}
                                                            </span>
                                                        )}
                                                    </div>
                                                    {isCheckInsExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                                                </button>

                                                {isCheckInsExpanded && (
                                                    <div className="p-4 pt-0 space-y-3 animate-in fade-in slide-in-from-top-2">
                                                        {isLoadingCheckIns ? (
                                                            <div className="flex items-center justify-center py-4">
                                                                <Loader2 className="w-5 h-5 animate-spin text-emerald-500" />
                                                            </div>
                                                        ) : checkIns.length === 0 ? (
                                                            <p className="text-xs text-slate-500 text-center py-4 italic">Nenhum check-in registrado.</p>
                                                        ) : (
                                                            <div className="space-y-3 max-h-[300px] overflow-y-auto custom-scrollbar pr-1">
                                                                {checkIns.map((checkIn) => (
                                                                    <div key={checkIn.id} className="bg-slate-900/40 border border-slate-700/50 rounded-xl p-3 flex flex-col gap-2">
                                                                        <div className="flex justify-between items-start">
                                                                            <div className="flex items-center gap-2">
                                                                                <div className="p-1.5 bg-emerald-500/10 rounded-lg">
                                                                                    <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                                                                                </div>
                                                                                <div>
                                                                                    <p className="text-[11px] font-bold text-white uppercase tracking-tight">Realizado em:</p>
                                                                                    <p className="text-xs text-slate-400">{new Date(checkIn.date).toLocaleDateString('pt-BR')}</p>
                                                                                    <span className="text-[10px] text-slate-500 bg-slate-800 px-2 py-0.5 rounded-md border border-slate-700">
                                                                                        {new Date(checkIn.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                                                                    </span>
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                        {checkIn.comment && (
                                                                            <div className="bg-slate-900/60 p-2.5 rounded-lg border-l-2 border-emerald-500/50">
                                                                                <p className="text-xs text-slate-300 italic leading-relaxed">
                                                                                    "{checkIn.comment}"
                                                                                </p>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
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
                                        const isOpen = openHistoryGroups[exerciseKey] || false;

                                        return (
                                            <div key={exerciseKey} className="mb-4 bg-slate-800/20 rounded-xl overflow-hidden animate-in slide-in-from-bottom-2 border border-slate-700/30">
                                                <button
                                                    onClick={() => setOpenHistoryGroups(prev => ({ ...prev, [exerciseKey]: !prev[exerciseKey] }))}
                                                    className={`w-full flex items-center justify-between p-3 transition-colors ${isOpen ? 'bg-slate-700/40 text-white' : 'hover:bg-slate-800/40 text-slate-300'}`}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className={`p-1.5 rounded-lg ${isOpen ? 'bg-blue-600/20 text-blue-400' : 'bg-slate-800 text-slate-500'}`}>
                                                            {getExerciseIcon(exerciseKey)}
                                                        </div>
                                                        <span className="font-bold text-sm text-left">{friendlyName}</span>
                                                        <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded-full border border-slate-700 text-slate-400 font-normal">
                                                            {records.length}
                                                        </span>
                                                    </div>
                                                    {isOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
                                                </button>

                                                {isOpen && (
                                                    <div className="p-3 space-y-3 border-t border-slate-700/30 bg-slate-900/20">
                                                        {records.map(record => {
                                                            const metric = getMetricDisplay(record);
                                                            return (
                                                                <div
                                                                    key={record.id}
                                                                    onClick={() => handleViewRecordDetails(record)}
                                                                    className="bg-slate-800/40 p-3 rounded-xl border border-slate-700/50 hover:bg-slate-800 hover:border-blue-500/50 transition-all cursor-pointer group relative overflow-hidden flex flex-col gap-2"
                                                                >
                                                                    <div className="absolute right-3 top-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                        <ChevronRight className="w-4 h-4 text-blue-400" />
                                                                    </div>

                                                                    <div className="flex items-center justify-between">
                                                                        <span className="text-xs text-slate-500">{new Date(record.timestamp).toLocaleDateString()} <span className="text-slate-600">|</span> {new Date(record.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                                    </div>

                                                                    <div className="flex items-center gap-3">
                                                                        {/* Score Badge */}
                                                                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-lg border border-white/5 ${getScoreColor(record.result.score).replace('text-', 'bg-').replace('500', '500/20')} ${getScoreColor(record.result.score)}`}>
                                                                            {record.result.score}
                                                                        </div>

                                                                        <div className="flex-1">
                                                                            <div className="flex justify-between items-end mb-1">
                                                                                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">{metric.label}</span>
                                                                                <span className="text-sm font-bold text-white">{metric.value}</span>
                                                                            </div>
                                                                            <div className="w-full h-1.5 bg-slate-700 rounded-full overflow-hidden">
                                                                                <div className={`h-full ${getScoreColor(record.result.score).includes('emerald') ? 'bg-emerald-500' : (record.result.score > 50 ? 'bg-yellow-500' : 'bg-red-500')}`} style={{ width: `${record.result.score}%` }} />
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {isAnamnesisModalOpen && selectedUser && (
                <AnamnesisModal
                    isOpen={isAnamnesisModalOpen}
                    onClose={() => setIsAnamnesisModalOpen(false)}
                    studentId={selectedUser.id}
                    studentName={selectedUser.name}
                    initialData={selectedUser.anamnesis}
                    onSave={async (updatedAnamnesis) => {
                        // Atualiza estado local
                        const updated = { ...selectedUser, anamnesis: updatedAnamnesis };
                        setSelectedUser(updated);
                        // Atualiza lista principal se necessário
                        const updatedList = users.map(u => u.id === updated.id ? updated : u);
                        // setUsers(updatedList); // Se tivesse setUsers aqui
                        setIsAnamnesisModalOpen(false);
                    }}
                />
            )}

            <AICustomizationModal
                isOpen={isAICustomizationModalOpen}
                onClose={() => setIsAICustomizationModalOpen(false)}
                currentUser={currentUser}
                onUpdateUser={(updated) => {
                    if (onUpdateUser) onUpdateUser(updated);
                }}
            />
        </div >
    );
};

export default AdminDashboard;