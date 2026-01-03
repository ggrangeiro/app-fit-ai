import React, { useState, useEffect, useMemo, useRef } from 'react';
import { User, ExerciseRecord, ExerciseDTO, SPECIAL_EXERCISES, AnalysisResult } from '../types';
import { MockDataService } from '../services/mockDataService';
import { apiService } from '../services/apiService'; 
import { generateExerciseThumbnail, analyzeVideo, generateDietPlan, generateWorkoutPlan } from '../services/geminiService';
import { compressVideo } from '../utils/videoUtils';
import { ResultView } from './ResultView';
import { Users, UserPlus, FileText, Check, Search, ChevronRight, Activity, Plus, Sparkles, Image as ImageIcon, Loader2, Dumbbell, ToggleLeft, ToggleRight, Save, Database, PlayCircle, X, Scale, ScanLine, AlertCircle, Utensils, UploadCloud, Stethoscope } from 'lucide-react';
import ConfirmModal from './ConfirmModal';
import Toast, { ToastType } from './Toast';

interface AdminDashboardProps {
  currentUser: User;
  onRefreshData?: () => void; 
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ currentUser, onRefreshData }) => {
  const [activeTab, setActiveTab] = useState<'users' | 'create' | 'assets'>('users');
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  
  const [userHistoryList, setUserHistoryList] = useState<ExerciseRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const [viewingRecord, setViewingRecord] = useState<ExerciseRecord | null>(null);
  const [detailedHistory, setDetailedHistory] = useState<ExerciseRecord[]>([]);
  
  const [allExercises, setAllExercises] = useState<ExerciseDTO[]>([]);

  const [processing, setProcessing] = useState(false);
  const [progressMsg, setProgressMsg] = useState('');
  
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  
  const [editingAssignments, setEditingAssignments] = useState<string[]>([]);

  // --- STATES PARA AÇÕES DO PROFESSOR ---
  const [showTeacherActionModal, setShowTeacherActionModal] = useState<'NONE' | 'DIET' | 'WORKOUT' | 'ASSESSMENT'>('NONE');
  const [assessmentType, setAssessmentType] = useState<string>(SPECIAL_EXERCISES.BODY_COMPOSITION);
  const [assessmentFile, setAssessmentFile] = useState<File | null>(null);
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
    isOpen: false, title: '', message: '', onConfirm: () => {}, isDestructive: false
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
        apiService.getUserExercises(selectedUser.id).then(exs => {
            if (exs.length > 0) {
                 const ids = exs.map((e: any) => String(e.id)); 
                 setEditingAssignments(ids);
            } else {
                 setEditingAssignments(selectedUser.assignedExercises || []);
            }
        }).catch(() => {
            setEditingAssignments(selectedUser.assignedExercises || []);
        });

        fetchUserHistory(selectedUser.id);
    } else {
        setUserHistoryList([]);
    }
  }, [selectedUser]);

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

  // ... (fetchExercises, fetchBackendUsers, fetchUserHistory functions remain same - omitted for brevity but assumed present)
  const fetchExercises = async () => {
    try {
        const v2Exercises = await apiService.getAllExercises();
        if(v2Exercises.length > 0) {
            const mapped = v2Exercises.map((e: any) => ({
                id: String(e.id),
                alias: e.name.toUpperCase().replace(/\s+/g, '_'),
                name: e.name,
                category: 'STANDARD'
            }));
            setAllExercises(mapped as ExerciseDTO[]);
            return;
        }
    } catch(e) {}
    
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
    try {
        const resultUsers = await apiService.getUsers(currentUser.id, currentUser.role);
        if (resultUsers && resultUsers.length > 0) {
            const mappedUsers: User[] = resultUsers.map((u: any) => ({
                id: String(u.id),
                name: u.nome || u.name || 'Sem Nome',
                email: u.email,
                role: u.role || 'user', 
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
    }
  };

  const fetchUserHistory = async (userId: string) => {
    setLoadingHistory(true);
    const API_URL = `https://testeai-732767853162.us-west1.run.app/api/historico/${userId}`;
    try {
        const response = await fetch(API_URL, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });
        if (response.ok) {
            const data = await response.json();
            let allRecords: ExerciseRecord[] = [];
            if (Array.isArray(data)) {
                allRecords = data;
            } else if (typeof data === 'object' && data !== null) {
                allRecords = Object.values(data).flat() as ExerciseRecord[];
            }
            const sorted = allRecords.sort((a: any, b: any) => b.timestamp - a.timestamp);
            setUserHistoryList(sorted);
        } else {
             setUserHistoryList(MockDataService.getUserHistory(userId));
        }
    } catch (e) {
        setUserHistoryList(MockDataService.getUserHistory(userId));
    } finally {
        setLoadingHistory(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const creatorId = isPersonal ? currentUser.id : undefined;
      await apiService.signup(newName, newEmail, "mudar123", creatorId);
      await MockDataService.createUser(newName, newEmail, undefined, creatorId, currentUser.role); 
      showToast(isPersonal ? 'Aluno criado com sucesso!' : 'Usuário criado com sucesso!', 'success');
      setNewName('');
      setNewEmail('');
      fetchBackendUsers();
      setTimeout(() => { setActiveTab('users'); }, 1500);
    } catch (err: any) {
      showToast("Erro: " + err.message, 'error');
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
        } catch (e) {}
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
                } catch(e) {}
            }
        }
        try {
             const payload = { nome: selectedUser.name, email: selectedUser.email, assignedExercises: editingAssignments };
            await fetch(`https://testeai-732767853162.us-west1.run.app/api/usuarios/${selectedUser.id}`, {
                method: 'PUT', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(payload)
            });
        } catch(e) {}
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
          setShowTeacherActionModal('NONE');
      } catch (err: any) {
          showToast("Erro: " + err.message, 'error');
      } finally {
          setProcessing(false);
          setProgressMsg('');
      }
  };

  const handleTeacherAssessment = async () => {
      if (!selectedUser || !assessmentFile) return;
      setProcessing(true);
      setProgressMsg("Analisando vídeo/imagem com IA...");
      
      try {
          // 1. Optimize video if needed
          let finalFile = assessmentFile;
          if (assessmentFile.type.startsWith('video/') && assessmentFile.size > 15 * 1024 * 1024) {
              setProgressMsg("Otimizando arquivo...");
              finalFile = await compressVideo(assessmentFile);
          }

          // 2. Analyze with Gemini
          setProgressMsg("IA Biomecânica em processamento...");
          const result = await analyzeVideo(finalFile, assessmentType);

          // 3. Save to History (using selectedUser.id)
          const payload = {
              userId: selectedUser.id,
              userName: selectedUser.name,
              exercise: assessmentType,
              timestamp: Date.now(),
              result: { ...result, date: new Date().toISOString() }
          };

          // Updated to use apiService with correct query params for Personal/Admin
          await apiService.saveHistory(payload, currentUser.id, currentUser.role);

          showToast("Avaliação realizada e salva com sucesso!", 'success');
          setShowTeacherActionModal('NONE');
          setAssessmentFile(null);
          
          // Refresh history
          fetchUserHistory(selectedUser.id);

      } catch (err: any) {
          showToast("Erro na avaliação: " + err.message, 'error');
      } finally {
          setProcessing(false);
          setProgressMsg('');
      }
  };

  // ... (getScoreColor, getMetricDisplay, getExerciseIcon logic remains same)
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
        const encodedExercise = encodeURIComponent(exerciseIdToSend);
        const url = `https://testeai-732767853162.us-west1.run.app/api/historico/${record.userId}?exercise=${encodedExercise}`;
        const response = await fetch(url, { method: "GET", headers: { "Content-Type": "application/json" } });
        if (response.ok) {
            const data: ExerciseRecord[] = await response.json();
            if (data && data.length > 0) setDetailedHistory(data.sort((a, b) => b.timestamp - a.timestamp));
        }
    } catch (e) {}
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
              <div className="bg-slate-900 border border-slate-700 rounded-3xl p-8 w-full max-w-md relative shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar">
                  <button onClick={() => {setShowTeacherActionModal('NONE'); setAssessmentFile(null);}} className="absolute top-4 right-4 text-slate-400 hover:text-white">
                      <X className="w-6 h-6" />
                  </button>

                  {showTeacherActionModal === 'DIET' && (
                      <form onSubmit={handleTeacherGenerateDiet} className="space-y-4">
                          <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2"><Utensils className="w-6 h-6 text-emerald-400" /> Prescrever Dieta IA</h3>
                          <p className="text-sm text-slate-400 mb-4">Gerando dieta para: <span className="text-white font-bold">{selectedUser?.name}</span></p>
                          {/* Reuse logic from App.tsx forms */}
                          <div className="grid grid-cols-2 gap-4">
                              <input type="number" placeholder="Peso (kg)" required className="bg-slate-800 border border-slate-700 rounded-xl p-3 text-white" value={actionFormData.weight} onChange={e => setActionFormData({...actionFormData, weight: e.target.value})} />
                              <input type="number" placeholder="Altura (cm)" required className="bg-slate-800 border border-slate-700 rounded-xl p-3 text-white" value={actionFormData.height} onChange={e => setActionFormData({...actionFormData, height: e.target.value})} />
                          </div>
                          <select className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white" value={actionFormData.gender} onChange={e => setActionFormData({...actionFormData, gender: e.target.value})}>
                              <option value="masculino">Masculino</option>
                              <option value="feminino">Feminino</option>
                          </select>
                          <select className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white" value={actionFormData.goal} onChange={e => setActionFormData({...actionFormData, goal: e.target.value})}>
                              <option value="emagrecer">Emagrecer</option>
                              <option value="ganhar_massa">Hipertrofia</option>
                              <option value="manutencao">Manutenção</option>
                          </select>
                          <textarea placeholder="Restrições alimentares..." className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white" value={actionFormData.observations} onChange={e => setActionFormData({...actionFormData, observations: e.target.value})} />
                          <button type="submit" disabled={processing} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl">{processing ? <Loader2 className="animate-spin mx-auto"/> : 'Gerar e Salvar'}</button>
                      </form>
                  )}

                  {showTeacherActionModal === 'WORKOUT' && (
                      <form onSubmit={handleTeacherGenerateWorkout} className="space-y-4">
                          <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2"><Dumbbell className="w-6 h-6 text-blue-400" /> Prescrever Treino IA</h3>
                          <p className="text-sm text-slate-400 mb-4">Gerando treino para: <span className="text-white font-bold">{selectedUser?.name}</span></p>
                          <div className="grid grid-cols-2 gap-4">
                              <input type="number" placeholder="Peso (kg)" required className="bg-slate-800 border border-slate-700 rounded-xl p-3 text-white" value={actionFormData.weight} onChange={e => setActionFormData({...actionFormData, weight: e.target.value})} />
                              <input type="number" placeholder="Altura (cm)" required className="bg-slate-800 border border-slate-700 rounded-xl p-3 text-white" value={actionFormData.height} onChange={e => setActionFormData({...actionFormData, height: e.target.value})} />
                          </div>
                          <select className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white" value={actionFormData.goal} onChange={e => setActionFormData({...actionFormData, goal: e.target.value})}>
                              <option value="hipertrofia">Hipertrofia</option>
                              <option value="emagrecimento">Emagrecimento</option>
                              <option value="definicao">Definição</option>
                          </select>
                          <select className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white" value={actionFormData.level} onChange={e => setActionFormData({...actionFormData, level: e.target.value})}>
                              <option value="iniciante">Iniciante</option>
                              <option value="intermediario">Intermediário</option>
                              <option value="avancado">Avançado</option>
                          </select>
                          <textarea placeholder="Lesões ou observações..." className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white" value={actionFormData.observations} onChange={e => setActionFormData({...actionFormData, observations: e.target.value})} />
                          <button type="submit" disabled={processing} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl">{processing ? <Loader2 className="animate-spin mx-auto"/> : 'Gerar e Salvar'}</button>
                      </form>
                  )}

                  {showTeacherActionModal === 'ASSESSMENT' && (
                      <div className="space-y-6">
                          <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2"><Stethoscope className="w-6 h-6 text-indigo-400" /> Nova Avaliação</h3>
                          <p className="text-sm text-slate-400">Faça upload de mídia do aluno para análise via IA.</p>
                          
                          <div className="space-y-2">
                              <label className="text-sm text-slate-300">Tipo de Avaliação</label>
                              <select className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white" value={assessmentType} onChange={e => setAssessmentType(e.target.value)}>
                                  <option value={SPECIAL_EXERCISES.BODY_COMPOSITION}>% de Gordura / Biotipo</option>
                                  <option value={SPECIAL_EXERCISES.POSTURE}>Análise Postural</option>
                                  <option value={SPECIAL_EXERCISES.FREE_MODE}>Exercício Livre (Técnica)</option>
                              </select>
                          </div>

                          <div 
                            onClick={() => fileInputRef.current?.click()}
                            className={`border-2 border-dashed rounded-xl h-32 flex flex-col items-center justify-center cursor-pointer transition-colors ${assessmentFile ? 'border-indigo-500 bg-indigo-500/10' : 'border-slate-600 hover:border-slate-400 bg-slate-800/30'}`}
                          >
                              {assessmentFile ? (
                                  <div className="text-center">
                                      <Check className="w-8 h-8 text-indigo-400 mx-auto mb-2"/>
                                      <p className="text-sm text-indigo-200">{assessmentFile.name}</p>
                                  </div>
                              ) : (
                                  <div className="text-center text-slate-400">
                                      <UploadCloud className="w-8 h-8 mx-auto mb-2"/>
                                      <p className="text-sm">Clique para upload (Vídeo/Foto)</p>
                                  </div>
                              )}
                              <input ref={fileInputRef} type="file" className="hidden" accept="video/*,image/*" onChange={e => setAssessmentFile(e.target.files?.[0] || null)} />
                          </div>

                          <button onClick={handleTeacherAssessment} disabled={!assessmentFile || processing} className={`w-full font-bold py-3 rounded-xl flex items-center justify-center gap-2 ${!assessmentFile || processing ? 'bg-slate-700 text-slate-500' : 'bg-indigo-600 text-white hover:bg-indigo-500'}`}>
                              {processing ? <Loader2 className="animate-spin"/> : <Sparkles className="w-4 h-4"/>}
                              {processing ? 'Analisando...' : 'Realizar Análise'}
                          </button>
                      </div>
                  )}
              </div>
          </div>
      )}

      {/* DETAILED VIEW MODAL */}
      {viewingRecord && selectedUser && (
        <div className="fixed inset-0 z-[100] bg-slate-900/95 overflow-y-auto animate-in fade-in backdrop-blur-sm">
           <div className="min-h-screen p-4 md:p-8 relative">
              <button 
                onClick={() => setViewingRecord(null)}
                className="fixed top-4 right-4 z-[110] p-2 bg-slate-800 rounded-full text-white hover:bg-slate-700 hover:text-red-400 transition-colors shadow-lg border border-slate-700"
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
                <button 
                  onClick={runAssignmentScript}
                  disabled={processing}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all mt-1 bg-indigo-600/20 text-indigo-300 hover:bg-indigo-600/30 border border-indigo-500/30 ${processing ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {processing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Database className="w-5 h-5" />}
                  <span className="text-xs font-bold">Rodar Script de Atribuição</span>
                </button>
                </>
            )}
          </div>
          {/* ... (Summary stats unchanged) ... */}
        </div>

        {/* Content Area */}
        <div className="flex-1 glass-panel rounded-3xl p-6 md:p-8 relative overflow-hidden min-h-[600px]">
          
          {processing && activeTab !== 'assets' && (
             <div className="absolute inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex flex-col items-center justify-center animate-in fade-in">
                <Loader2 className="w-12 h-12 text-blue-500 animate-spin mb-4" />
                <h3 className="text-xl font-bold text-white">{progressMsg}</h3>
                <p className="text-slate-400 mt-2">Processando solicitação...</p>
             </div>
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
                <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-900/20 transition-all">
                    {isPersonal ? 'Cadastrar Meu Aluno' : 'Cadastrar Usuário'}
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
                      
                      {/* --- PAINEL DE AÇÕES DO PROFESSOR (NOVO) --- */}
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
                                                <span className="text-xs text-slate-500">{new Date(record.timestamp).toLocaleDateString()} às {new Date(record.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
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
