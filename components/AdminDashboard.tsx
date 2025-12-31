import React, { useState, useEffect } from 'react';
import { User, ExerciseRecord, ExerciseDTO } from '../types';
import { MockDataService } from '../services/mockDataService';
import { generateExerciseThumbnail } from '../services/geminiService';
import { Users, UserPlus, FileText, Check, Search, ChevronRight, Activity, Plus, Sparkles, Image as ImageIcon, Loader2, Dumbbell, ToggleLeft, ToggleRight, Save, Database, PlayCircle } from 'lucide-react';

interface AdminDashboardProps {
  currentUser: User;
  onRefreshData?: () => void; // Notify parent to reload data (like images)
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ onRefreshData }) => {
  const [activeTab, setActiveTab] = useState<'users' | 'create' | 'assets'>('users');
  const [users, setUsers] = useState<User[]>([]);
  const [records, setRecords] = useState<ExerciseRecord[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  
  // Exercise List State
  const [allExercises, setAllExercises] = useState<ExerciseDTO[]>([]);

  // Asset Generation & Script State
  const [processing, setProcessing] = useState(false);
  const [progressMsg, setProgressMsg] = useState('');
  
  // Create User State
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [createMsg, setCreateMsg] = useState('');

  // Local state for assignments editing
  const [editingAssignments, setEditingAssignments] = useState<string[]>([]);

  useEffect(() => {
    refreshData();
    fetchBackendUsers();
    fetchExercises();
  }, []);

  useEffect(() => {
    if (selectedUser) {
        setEditingAssignments(selectedUser.assignedExercises || []);
    }
  }, [selectedUser]);

  const fetchExercises = async () => {
    const data = await MockDataService.fetchExercises();
    setAllExercises(data);
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
        console.log("Usuários carregados do backend:", mappedUsers.length);
        
    } catch (err: any) {
        console.error("Erro ao buscar usuários do backend:", err.message);
        // Fallback para mock se falhar, apenas para não deixar vazio
        if (users.length === 0) setUsers(MockDataService.getUsers());
    }
  };

  const refreshData = () => {
    // Apenas recarrega registros locais de histórico
    setRecords(MockDataService.getAllHistory());
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateMsg('Enviando dados...');
    
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
      
      setCreateMsg('Usuário criado com sucesso no Backend!');
      setNewName('');
      setNewEmail('');
      fetchBackendUsers(); // Recarrega lista real
      
      setTimeout(() => {
        setCreateMsg('');
        setActiveTab('users');
      }, 1500);

    } catch (err: any) {
      console.error(err);
      setCreateMsg("Erro: " + err.message);
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
          console.error(`Failed to generate for ${ex.name}`, e);
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
  const runAssignmentScript = async () => {
    if (processing) return;
    if (!confirm("Isso atribuirá TODOS os exercícios a TODOS os usuários listados. Tem certeza?")) return;
    
    setProcessing(true);
    setProgressMsg("Iniciando script de atribuição...");

    const allExerciseIds = allExercises.map(e => e.id);

    try {
        let count = 0;
        for (const user of users) {
             setProgressMsg(`Atualizando: ${user.name}...`);
             
             try {
                // Monta payload. Como é PUT, enviamos dados completos ou parciais dependendo da API.
                // Assumindo que o backend aceita atualização parcial ou reenvio dos dados.
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
                } else {
                    console.warn(`Falha ao atualizar user ${user.id}`);
                }
             } catch (err) {
                 console.error(`Erro user ${user.id}`, err);
             }
        }
        setProgressMsg(`Sucesso! ${count} usuários atualizados.`);
        await fetchBackendUsers();
    } catch (e) {
        setProgressMsg("Erro crítico ao rodar script.");
        console.error(e);
    }
    
    setTimeout(() => {
        setProcessing(false);
        setProgressMsg('');
    }, 3000);
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
    
    const originalText = "Salvar Permissões";
    // UI Feedback is tricky without state, using alert for now or simple logic
    
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
            
            alert("Permissões salvas no servidor com sucesso!");
        } else {
            throw new Error("Servidor rejeitou a atualização.");
        }
    } catch (e: any) {
        alert("Erro ao salvar no servidor: " + e.message);
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

  const getUserRecords = (userId: string) => {
    return records.filter(r => r.userId === userId);
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-emerald-400 border-emerald-500/30 bg-emerald-500/10";
    if (score >= 60) return "text-yellow-400 border-yellow-500/30 bg-yellow-500/10";
    return "text-red-400 border-red-500/30 bg-red-500/10";
  };

  return (
    <div className="w-full max-w-7xl mx-auto p-4 animate-fade-in">
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
              <div>
                <span className="text-2xl font-bold text-emerald-400 block">{records.length}</span>
                <span className="text-sm text-slate-500">Exercícios Realizados</span>
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
                {createMsg && (
                  <div className={`p-4 rounded-xl text-sm ${createMsg.includes('sucesso') ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'}`}>{createMsg}</div>
                )}
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
                  const userHistory = getUserRecords(user.id);
                  const avgScore = userHistory.length > 0 ? Math.round(userHistory.reduce((acc, curr) => acc + curr.result.score, 0) / userHistory.length) : '-';
                  return (
                    <div key={user.id} onClick={() => setSelectedUser(user)} className="bg-slate-800/40 border border-slate-700/50 hover:bg-slate-800 hover:border-blue-500/50 rounded-2xl p-5 cursor-pointer transition-all group">
                      <div className="flex justify-between items-start mb-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold">{user.name.charAt(0)}</div>
                        <div className={`px-2 py-1 rounded text-xs font-bold ${getScoreColor(typeof avgScore === 'number' ? avgScore : 0)}`}>Média: {avgScore}</div>
                      </div>
                      <h3 className="text-white font-bold text-lg truncate">{user.name}</h3>
                      <p className="text-slate-400 text-sm truncate mb-4">{user.email}</p>
                      <div className="flex items-center justify-between text-xs text-slate-500 border-t border-slate-700/50 pt-3">
                         <span className={user.assignedExercises && user.assignedExercises.length > 0 ? 'text-emerald-400' : 'text-slate-500'}>
                             {user.assignedExercises?.length || 0} exercícios
                         </span>
                         <span className="flex items-center gap-1 group-hover:text-blue-400 transition-colors">Ver perfil <ChevronRight className="w-3 h-3" /></span>
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
                  <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider sticky top-0 bg-transparent mb-2">Histórico de Execuções</h4>
                  {getUserRecords(selectedUser.id).length === 0 ? (
                    <div className="text-center py-10 text-slate-500 bg-slate-800/20 rounded-2xl border border-dashed border-slate-700">Nenhum exercício realizado ainda.</div>
                  ) : (
                    getUserRecords(selectedUser.id).map(record => (
                      <div key={record.id} className="bg-slate-800/40 p-4 rounded-xl border border-slate-700/50 hover:bg-slate-800 transition-colors">
                         <div className="flex justify-between items-start mb-2">
                           <span className="text-white font-bold text-sm">{allExercises.find(e => e.id === record.exercise)?.name || record.exercise}</span>
                           <span className="text-xs text-slate-500">{new Date(record.timestamp).toLocaleDateString()}</span>
                         </div>
                         <div className="flex items-center gap-4">
                           <div className={`text-2xl font-bold ${getScoreColor(record.result.score).split(' ')[0]}`}>{record.result.score}</div>
                           <div className="flex-1">
                              <div className="w-full h-1.5 bg-slate-700 rounded-full overflow-hidden">
                                <div className={`h-full ${getScoreColor(record.result.score).includes('emerald') ? 'bg-emerald-500' : (record.result.score > 50 ? 'bg-yellow-500' : 'bg-red-500')}`} style={{ width: `${record.result.score}%` }} />
                              </div>
                           </div>
                           <span className="text-xs text-slate-400 font-mono">{record.result.repetitions} reps</span>
                         </div>
                      </div>
                    ))
                  )}
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