import React, { useState, useEffect, useMemo } from 'react';
import { User, ExerciseRecord, ExerciseDTO } from '../types';
import { MockDataService } from '../services/mockDataService';
import { generateExerciseThumbnail } from '../services/geminiService';
import { ResultView } from './ResultView';
import { Users, UserPlus, FileText, Check, Search, ChevronRight, Activity, Plus, Sparkles, Image as ImageIcon, Loader2, Dumbbell, ToggleLeft, ToggleRight, Save, Database, PlayCircle, X, Scale, ScanLine, AlertCircle } from 'lucide-react';
import ConfirmModal from './ConfirmModal';
import Toast, { ToastType } from './Toast';

interface AdminDashboardProps {
  currentUser: User;
  onRefreshData?: () => void; // Notify parent to reload data (like images)
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ onRefreshData }) => {
  const [activeTab, setActiveTab] = useState<'users' | 'create' | 'assets'>('users');
  const [users, setUsers] = useState<User[]>([]);
  // const [records, setRecords] = useState<ExerciseRecord[]>([]); // Removed local records dependency for user detail
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  
  // State for User History List (Backend)
  const [userHistoryList, setUserHistoryList] = useState<ExerciseRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // State for Detailed View Modal
  const [viewingRecord, setViewingRecord] = useState<ExerciseRecord | null>(null);
  const [detailedHistory, setDetailedHistory] = useState<ExerciseRecord[]>([]);
  
  // Exercise List State
  const [allExercises, setAllExercises] = useState<ExerciseDTO[]>([]);

  // Asset Generation & Script State
  const [processing, setProcessing] = useState(false);
  const [progressMsg, setProgressMsg] = useState('');
  
  // Create User State
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  
  // Local state for assignments editing
  const [editingAssignments, setEditingAssignments] = useState<string[]>([]);

  // --- NEW LOCAL UI STATES FOR ADMIN ---
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
    // refreshData(); // Not strictly needed for list view anymore as we fetch live
    fetchBackendUsers();
    fetchExercises();
  }, []);

  useEffect(() => {
    if (selectedUser) {
        setEditingAssignments(selectedUser.assignedExercises || []);
        fetchUserHistory(selectedUser.id);
    } else {
        setUserHistoryList([]);
    }
  }, [selectedUser]);

  // --- GROUPING LOGIC ---
  // Agrupa a lista plana de históricos por tipo de exercício para exibição visual organizada
  const groupedRecords = useMemo(() => {
    const groups: Record<string, ExerciseRecord[]> = {};
    userHistoryList.forEach(record => {
        // Usa o nome do exercício como chave
        const key = record.exercise;
        if (!groups[key]) {
            groups[key] = [];
        }
        groups[key].push(record);
    });
    return groups;
  }, [userHistoryList]);

  const fetchExercises = async () => {
    const data = await MockDataService.fetchExercises();
    
    // Garante que os exercícios especiais estejam na lista para mapeamento correto de nomes
    const specialExercises: ExerciseDTO[] = [
        { id: 'POSTURE_ANALYSIS', alias: 'POSTURE_ANALYSIS', name: 'Análise de Postura', category: 'SPECIAL' },
        { id: 'BODY_COMPOSITION', alias: 'BODY_COMPOSITION', name: 'Composição Corporal', category: 'SPECIAL' },
        { id: 'FREE_ANALYSIS_MODE', alias: 'FREE_ANALYSIS_MODE', name: 'Análise Livre', category: 'SPECIAL' }
    ];

    // Merge garantindo que não haja duplicatas de ID
    const combined = [...data];
    specialExercises.forEach(sp => {
        if (!combined.find(c => c.id === sp.id)) {
            combined.push(sp);
        }
    });

    setAllExercises(combined);
  };

  // Função para buscar usuários no Backend real
  const fetchBackendUsers = async () => {
    const API_URL = "https://testeai-732767853162.us-west1.run.app/api/usuarios";
    
    try {
        const response = await fetch(API_URL, {
            method: 'GET',
            mode: 'cors',
            headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' }
        });

        if (!response.ok) throw new Error(`Erro na requisição: ${response.status}`);
        
        const data = await response.json();
        
        // Mapeia os dados do backend para o formato User do frontend
        const mappedUsers: User[] = data.map((u: any) => ({
            id: String(u.id),
            name: u.nome || u.name || 'Sem Nome',
            email: u.email,
            role: u.role || 'user',
            avatar: u.avatar,
            assignedExercises: u.assignedExercises || []
        }));

        setUsers(mappedUsers);
        
    } catch (err: any) {
        // Fallback para mock se falhar, apenas para não deixar vazio
        if (users.length === 0) setUsers(MockDataService.getUsers());
    }
  };

  // --- FETCH FULL LIST OF RECORDS FOR SELECTED USER ---
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

            // Cenário 1: Backend retorna Array direto (formato antigo)
            if (Array.isArray(data)) {
                allRecords = data;
            } 
            // Cenário 2: Backend retorna Objeto Agrupado (formato novo)
            else if (typeof data === 'object' && data !== null) {
                // Pega todos os arrays dentro das chaves e junta em um só para o estado interno
                // O useMemo se encarregará de reagrupar para exibição
                allRecords = Object.values(data).flat() as ExerciseRecord[];
            }

            // Ordena por data (mais recente primeiro)
            const sorted = allRecords.sort((a: any, b: any) => b.timestamp - a.timestamp);
            setUserHistoryList(sorted);
        } else {
             // Fallback to local storage if API fails
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
      const url = "https://testeai-732767853162.us-west1.run.app/api/usuarios";
      const payload = { name: newName, email: newEmail, senha: "mudar123" };

      const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error("Erro ao cadastrar usuário no servidor.");
      await response.json();

      await MockDataService.createUser(newName, newEmail); // Mantém sync local
      
      showToast('Usuário criado com sucesso!', 'success');
      setNewName('');
      setNewEmail('');
      fetchBackendUsers(); // Recarrega lista real
      
      setTimeout(() => {
        setActiveTab('users');
      }, 1500);

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
        } catch (e) {
        }
      }
      
      setProgressMsg('Concluído!');
      if (onRefreshData) onRefreshData();
      
      setTimeout(() => {
        setProcessing(false);
        setProgressMsg('');
      }, 2000);
      
    } catch (e) {
      setProgressMsg('Erro na geração.');
      setProcessing(false);
    }
  };

  // --- SCRIPT DE ATRIBUIÇÃO EM MASSA ---
  const runAssignmentScript = () => {
    if (processing) return;
    
    triggerConfirm(
        "Executar Script em Massa?",
        "Isso atribuirá TODOS os exercícios a TODOS os usuários listados. Essa ação não pode ser desfeita facilmente.",
        async () => {
            setProcessing(true);
            setProgressMsg("Iniciando script de atribuição...");

            const allExerciseIds = allExercises.map(e => e.id);

            try {
                let count = 0;
                for (const user of users) {
                     setProgressMsg(`Atualizando: ${user.name}...`);
                     
                     try {
                        const payload = {
                            nome: user.name,
                            email: user.email,
                            assignedExercises: allExerciseIds
                        };

                        const response = await fetch(`https://testeai-732767853162.us-west1.run.app/api/usuarios/${user.id}`, {
                            method: 'PUT',
                            headers: {'Content-Type': 'application/json'},
                            body: JSON.stringify(payload)
                        });

                        if (response.ok) {
                            count++;
                        }
                     } catch (err) {
                     }
                }
                setProgressMsg(`Sucesso! ${count} usuários atualizados.`);
                await fetchBackendUsers();
            } catch (e) {
                setProgressMsg("Erro crítico ao rodar script.");
            }
            
            setTimeout(() => {
                setProcessing(false);
                setProgressMsg('');
            }, 3000);
        },
        false // Not destructive in the "delete" sense, but massive update
    );
  };

  const toggleAssignment = (exerciseId: string) => {
    setEditingAssignments(prev => {
        if (prev.includes(exerciseId)) {
            return prev.filter(e => e !== exerciseId);
        } else {
            return [...prev, exerciseId];
        }
    });
  };

  const saveAssignments = async () => {
    if (!selectedUser) return;
    
    try {
        // Update Backend
        const payload = {
            nome: selectedUser.name,
            email: selectedUser.email,
            assignedExercises: editingAssignments
        };

        const response = await fetch(`https://testeai-732767853162.us-west1.run.app/api/usuarios/${selectedUser.id}`, {
            method: 'PUT',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            // Update UI State
            setSelectedUser({ ...selectedUser, assignedExercises: editingAssignments });
            
            // Update list state
            setUsers(prev => prev.map(u => u.id === selectedUser.id ? { ...u, assignedExercises: editingAssignments } : u));
            
            showToast("Permissões salvas no servidor com sucesso!", 'success');
        } else {
            throw new Error("Servidor rejeitou a atualização.");
        }
    } catch (e: any) {
        showToast("Erro ao salvar no servidor: " + e.message, 'error');
    }

    // Sync Local Mock just in case
    MockDataService.updateUserExercises(selectedUser.id, editingAssignments);
  };

  const selectAllExercises = () => {
    setEditingAssignments(allExercises.map(e => e.id));
  };
  
  const deselectAllExercises = () => {
    setEditingAssignments([]);
  };

  const handleDeleteRecord = async (recordId: string) => {
    if (!selectedUser) return;
    
    triggerConfirm(
        "Excluir Registro",
        "Tem certeza que deseja apagar este registro permanentemente?",
        async () => {
            const success = await MockDataService.deleteRecord(selectedUser.id, recordId);
            if (success) {
                // Update lists immediately
                setUserHistoryList(prev => prev.filter(r => r.id !== recordId));
                setDetailedHistory(prev => prev.filter(r => r.id !== recordId));
                
                if (viewingRecord?.id === recordId) {
                    setViewingRecord(null);
                }
                showToast("Registro removido.", 'success');
            } else {
                showToast("Erro ao apagar registro.", 'error');
            }
        },
        true // Destructive
    );
  };

  // --- FETCH FULL HISTORY FOR MODAL ---
  const handleViewRecordDetails = async (record: ExerciseRecord) => {
    // Determine the ID to send to the backend.
    // record.exercise might be the ID (e.g., BENCH_PRESS) or Name (e.g., Supino) depending on when it was saved.
    let exerciseIdToSend = record.exercise;
    
    // Attempt to resolve Name to Alias/ID if possible using the loaded exercise list
    const knownExercise = allExercises.find(e => e.name === record.exercise || e.alias === record.exercise);
    if (knownExercise) {
        exerciseIdToSend = knownExercise.alias;
    }

    // Normalize special exercises logic
    let normalizedRecord = { ...record };
    const lowerEx = exerciseIdToSend.toLowerCase();
    
    if (lowerEx.includes('postura') || lowerEx.includes('posture') || lowerEx === 'posture_analysis') {
        exerciseIdToSend = 'POSTURE_ANALYSIS';
        normalizedRecord.exercise = 'POSTURE_ANALYSIS';
    } else if (lowerEx.includes('gordura') || lowerEx.includes('body') || lowerEx.includes('corporal') || lowerEx === 'body_composition') {
        exerciseIdToSend = 'BODY_COMPOSITION';
        normalizedRecord.exercise = 'BODY_COMPOSITION';
    }
    
    setViewingRecord(normalizedRecord);
    setDetailedHistory([normalizedRecord]);
    
    try {
        const encodedExercise = encodeURIComponent(exerciseIdToSend);
        const url = `https://testeai-732767853162.us-west1.run.app/api/historico/${record.userId}?exercise=${encodedExercise}`;
        
        const response = await fetch(url, {
            method: "GET",
            headers: { "Content-Type": "application/json" }
        });

        if (response.ok) {
            const data: ExerciseRecord[] = await response.json();
            if (data && data.length > 0) {
                // Sort by timestamp desc (newest first)
                const sortedHistory = data.sort((a, b) => b.timestamp - a.timestamp);
                setDetailedHistory(sortedHistory);
            }
        }
    } catch (e) {
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-emerald-400 border-emerald-500/30 bg-emerald-500/10";
    if (score >= 60) return "text-yellow-400 border-yellow-500/30 bg-yellow-500/10";
    return "text-red-400 border-red-500/30 bg-red-500/10";
  };

  // Helper to determine display text for metrics
  const getMetricDisplay = (record: ExerciseRecord) => {
    const lowerEx = record.exercise.toLowerCase();
    
    if (lowerEx.includes('postura') || lowerEx.includes('posture') || record.exercise === 'POSTURE_ANALYSIS') {
        return { value: 'Check-up', label: 'Status' };
    }
    
    if (lowerEx.includes('gordura') || lowerEx.includes('body') || lowerEx.includes('corporal') || record.exercise === 'BODY_COMPOSITION') {
        return { value: `${record.result.repetitions}%`, label: 'Gordura' };
    }

    return { value: `${record.result.repetitions}`, label: 'reps' };
  };
  
  // Helper for icon
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
                 <div className="flex items-center gap-4 mb-6 text-slate-400 text-sm">
                     <button onClick={() => setViewingRecord(null)} className="hover:text-white transition-colors">Admin Dashboard</button>
                     <ChevronRight className="w-4 h-4" />
                     <span>{selectedUser.name}</span>
                     <ChevronRight className="w-4 h-4" />
                     <span className="text-white font-bold">Análise Detalhada</span>
                 </div>

                 <ResultView
                    result={viewingRecord.result}
                    exercise={viewingRecord.exercise}
                    history={detailedHistory}
                    userId={selectedUser.id} // Added userId prop
                    onReset={() => setViewingRecord(null)}
                    onDeleteRecord={handleDeleteRecord}
                    isHistoricalView={true}
                    // Pass admin specific toast handler if needed inside result view (optional)
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
          <div className="p-4 bg-slate-800/50 rounded-2xl border border-slate-700/50 mb-4">
            <h2 className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">Menu Admin</h2>
            <button 
              onClick={() => { setActiveTab('users'); setSelectedUser(null); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'users' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'text-slate-300 hover:bg-slate-800'}`}
            >
              <Users className="w-5 h-5" /> Usuários
            </button>
            <button 
              onClick={() => setActiveTab('create')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all mt-2 ${activeTab === 'create' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'text-slate-300 hover:bg-slate-800'}`}
            >
              <UserPlus className="w-5 h-5" /> Novo Usuário
            </button>
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
          </div>

          <div className="p-4 bg-slate-800/30 rounded-2xl border border-slate-700/30 flex-grow">
            <h3 className="text-slate-400 text-xs font-bold uppercase mb-4">Resumo</h3>
            <div className="space-y-4">
              <div>
                <span className="text-2xl font-bold text-white block">{users.length}</span>
                <span className="text-sm text-slate-500">Usuários Ativos (DB)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 glass-panel rounded-3xl p-6 md:p-8 relative overflow-hidden min-h-[600px]">
          
          {/* PROCESSING OVERLAY */}
          {processing && activeTab !== 'assets' && (
             <div className="absolute inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex flex-col items-center justify-center animate-in fade-in">
                <Loader2 className="w-12 h-12 text-blue-500 animate-spin mb-4" />
                <h3 className="text-xl font-bold text-white">{progressMsg}</h3>
                <p className="text-slate-400 mt-2">Atualizando banco de dados...</p>
             </div>
          )}

          {/* TAB: ASSETS */}
          {activeTab === 'assets' && (
             <div className="max-w-2xl mx-auto text-center py-10">
                <div className="p-4 bg-indigo-500/10 rounded-full inline-block mb-6 border border-indigo-500/20">
                  <Sparkles className="w-12 h-12 text-indigo-400" />
                </div>
                <h2 className="text-3xl font-bold text-white mb-4">Personalização com IA</h2>
                <p className="text-slate-400 mb-8 max-w-lg mx-auto">
                  Gere capas para todos os {allExercises.length} exercícios cadastrados.
                </p>
                
                {processing ? (
                  <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-8 max-w-md mx-auto">
                    <Loader2 className="w-10 h-10 text-blue-500 animate-spin mx-auto mb-4" />
                    <p className="text-white font-medium text-lg animate-pulse">{progressMsg}</p>
                    <p className="text-xs text-slate-500 mt-2">Isso pode levar alguns segundos por imagem.</p>
                  </div>
                ) : (
                  <button
                    onClick={handleGenerateAssets}
                    className="group relative inline-flex items-center justify-center px-8 py-4 font-bold text-white transition-all duration-200 bg-indigo-600 rounded-full hover:bg-indigo-500 shadow-lg shadow-indigo-900/30 hover:scale-105"
                  >
                    <span className="mr-2">Gerar Novas Capas</span>
                    <Sparkles className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                  </button>
                )}
             </div>
          )}

          {/* TAB: CREATE USER */}
          {activeTab === 'create' && (
            <div className="max-w-xl mx-auto">
              <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                <UserPlus className="w-6 h-6 text-blue-400" /> Cadastrar Aluno
              </h2>
              <form onSubmit={handleCreateUser} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Nome Completo</label>
                  <input type="text" required value={newName} onChange={e => setNewName(e.target.value)} className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">E-mail</label>
                  <input type="email" required value={newEmail} onChange={e => setNewEmail(e.target.value)} className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-900/20 transition-all">Cadastrar Usuário</button>
              </form>
            </div>
          )}

          {/* TAB: USER LIST */}
          {activeTab === 'users' && !selectedUser && (
            <div className="h-full flex flex-col">
              <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                    <Users className="w-6 h-6 text-blue-400" /> Gestão de Alunos
                  </h2>
                  <button onClick={fetchBackendUsers} className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1">
                     <PlayCircle className="w-3 h-3" /> Atualizar Lista
                  </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 overflow-y-auto pr-2 custom-scrollbar">
                {users.length === 0 && <div className="text-slate-500 col-span-full text-center py-10">Nenhum usuário encontrado no backend.</div>}
                
                {users.filter(u => u.role !== 'admin').map(user => {
                  return (
                    <div key={user.id} onClick={() => setSelectedUser(user)} className="bg-slate-800/40 border border-slate-700/50 hover:bg-slate-800 hover:border-blue-500/50 rounded-2xl p-5 cursor-pointer transition-all group">
                      <div className="flex justify-between items-start mb-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold">{user.name.charAt(0)}</div>
                        <div className="px-2 py-1 rounded text-xs font-bold text-slate-500 bg-slate-700/30">Aluno</div>
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

          {/* USER DETAIL VIEW & ASSIGNMENTS */}
          {activeTab === 'users' && selectedUser && (
            <div className="h-full flex flex-col animate-fade-in">
              <button onClick={() => setSelectedUser(null)} className="self-start text-sm text-slate-400 hover:text-white mb-4 flex items-center gap-1 transition-colors">← Voltar para lista</button>
              <div className="flex flex-col md:flex-row gap-6 h-full overflow-hidden">
                <div className="md:w-1/3 flex flex-col gap-4 overflow-y-auto custom-scrollbar pr-2">
                   <div className="bg-slate-800/30 p-5 rounded-2xl border border-slate-700/50">
                      <h3 className="text-xl font-bold text-white mb-1">{selectedUser.name}</h3>
                      <p className="text-slate-400 text-sm mb-6">{selectedUser.email}</p>
                      
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-sm font-bold text-white flex items-center gap-2"><Dumbbell className="w-4 h-4" /> Exercícios Atribuídos</h4>
                        <div className="flex gap-2 text-xs">
                            <button onClick={selectAllExercises} className="text-blue-400 hover:text-blue-300">Todos</button>
                            <span className="text-slate-600">|</span>
                            <button onClick={deselectAllExercises} className="text-slate-400 hover:text-slate-300">Nenhum</button>
                        </div>
                      </div>

                      <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar pr-1 mb-4 bg-slate-900/20 p-2 rounded-xl">
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
                      <button onClick={saveAssignments} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-3 rounded-xl font-bold text-sm shadow-lg flex items-center justify-center gap-2 transition-all"><Save className="w-4 h-4" /> Salvar Permissões</button>
                   </div>
                </div>

                <div className="md:w-2/3 flex flex-col gap-4 overflow-y-auto custom-scrollbar">
                  <div className="flex justify-between items-center mb-2">
                     <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Histórico de Execuções</h4>
                     {loadingHistory && <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />}
                  </div>
                  
                  {/* EMPTY STATE */}
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

                  {/* GROUPED RECORDS RENDER */}
                  {Object.entries(groupedRecords).map(([exerciseKey, recordsVal]) => {
                     const records = recordsVal as ExerciseRecord[];
                     // Tenta encontrar um nome amigável para o cabeçalho usando ID/Alias/Nome
                     // exerciseKey deve ser o ID (ex: BENCH_PRESS)
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