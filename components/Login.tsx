import React, { useState } from 'react';
import { User, ExerciseType } from '../types';
import { MockDataService } from '../services/mockDataService';
import { Dumbbell, ArrowRight, Lock, Mail, UserPlus, User as UserIcon } from 'lucide-react';
import axios from 'axios';

interface LoginProps {
  onLogin: (user: User) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [name, setName] = useState(''); // New field for registration
  const [password, setPassword] = useState(''); // Added state for password
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // --- CHAVE DE CONFIGURAÇÃO ---
    // Defina como TRUE para usar o Backend Real via Axios.
    // Defina como FALSE para usar o MockDataService (Simulação Local).
    const USE_REAL_BACKEND = false; 

    try {
      if (isRegistering) {
        
        if (!name.trim()) {
           throw new Error("Por favor, digite seu nome.");
        }
        if (!password.trim()) {
           throw new Error("Por favor, digite uma senha.");
        }

        if (USE_REAL_BACKEND) {
            // --- FLUXO DE CADASTRO COM BACKEND REAL ---
            // URL do Backend Real
            const url = 'https://backendai-732767853162.southamerica-east1.run.app/api/cadastrar';
            
            const payload = {
              nome: name,
              email: email,
              senha: password
            };

            // Simplificando a chamada do Axios para evitar problemas de CORS com headers manuais desnecessários
            const response = await axios.post(url, payload);

            console.log('Resposta do Servidor:', response.data);
            alert('Cadastro realizado com sucesso! Faça login para continuar.');
        } else {
            // --- FLUXO DE CADASTRO MOCK (Simulação) ---
            // Simula um delay de rede
            await new Promise(resolve => setTimeout(resolve, 800));
            
            // Cria o usuário no localStorage
            await MockDataService.createUser(name, email);
            
            console.log('Usuário criado via MockService (Senha ignorada na simulação local)');
            alert('Cadastro realizado com sucesso (Simulação Local)! Faça login para continuar.');
        }
        
        // Limpar formulário e mudar para login após sucesso
        setIsRegistering(false);
        setPassword('');
        
      } else {
        // --- FLUXO DE LOGIN (Mantido Mock ou Implementar Backend Futuro) ---
        // Por enquanto, mantemos o login via MockDataService para não quebrar a aplicação 
        // até que você tenha a rota de /login pronta no backend também.
        
        const user = await MockDataService.login(email);
        if (user) {
          onLogin(user);
        } else {
          // Fallback temporário
          setError('Usuário não encontrado ou senha incorreta (Simulação). Verifique o e-mail digitado.');
        }
      }
    } catch (err: any) {
      console.error('Erro na operação:', err);
      // Tratamento de erro do Axios ou do Mock
      const mensagemErro = err.response?.data?.message || err.message || 'Ocorreu um erro. Tente novamente.';
      setError(mensagemErro);
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setIsRegistering(!isRegistering);
    setError(null);
    setEmail('');
    setName('');
    setPassword('');
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="glass-panel w-full max-w-md p-8 rounded-3xl animate-fade-in relative overflow-hidden transition-all duration-500">
        {/* Decorative Background Elements */}
        <div className="absolute top-0 right-0 p-10 opacity-10 pointer-events-none">
             <Dumbbell className="w-40 h-40 text-blue-500 rotate-45" />
        </div>

        <div className="relative z-10">
            <div className="flex flex-col items-center mb-8 text-center">
                <div className="p-3 bg-blue-600 rounded-2xl shadow-lg shadow-blue-900/30 mb-4">
                    <Dumbbell className="w-8 h-8 text-white" />
                </div>
                <h1 className="text-3xl font-bold text-white mb-2">
                  {isRegistering ? 'Criar Conta' : 'Bem-vindo ao FitAI'}
                </h1>
                <p className="text-slate-400">
                  {isRegistering ? 'Comece sua jornada hoje' : 'Sua plataforma de análise biomecânica'}
                </p>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                
                {/* Name Field - Only visible when registering */}
                {isRegistering && (
                  <div className="space-y-1 animate-in slide-in-from-top-4 duration-300">
                      <label className="text-sm font-medium text-slate-300 ml-1">Seu Nome</label>
                      <div className="relative">
                          <UserIcon className="absolute left-4 top-3.5 w-5 h-5 text-slate-500" />
                          <input 
                              type="text" 
                              required={isRegistering}
                              value={name}
                              onChange={(e) => setName(e.target.value)}
                              placeholder="ex: João Silva"
                              className="w-full bg-slate-800/50 border border-slate-700 rounded-xl py-3 pl-12 pr-4 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
                          />
                      </div>
                  </div>
                )}

                <div className="space-y-1">
                    <label className="text-sm font-medium text-slate-300 ml-1">E-mail de Acesso</label>
                    <div className="relative">
                        <Mail className="absolute left-4 top-3.5 w-5 h-5 text-slate-500" />
                        <input 
                            type="email" 
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="ex: aluno@email.com"
                            className="w-full bg-slate-800/50 border border-slate-700 rounded-xl py-3 pl-12 pr-4 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
                        />
                    </div>
                </div>

                <div className="space-y-1">
                     <label className="text-sm font-medium text-slate-300 ml-1">Senha</label>
                     <div className="relative">
                        <Lock className="absolute left-4 top-3.5 w-5 h-5 text-slate-500" />
                        <input 
                            type="password" 
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            className="w-full bg-slate-800/50 border border-slate-700 rounded-xl py-3 pl-12 pr-4 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
                        />
                    </div>
                </div>

                {error && (
                    <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-200 text-sm text-center animate-in fade-in">
                        {error}
                    </div>
                )}

                <button 
                    type="submit"
                    disabled={loading}
                    className={`
                      mt-2 w-full font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-blue-900/20 active:scale-[0.98] flex items-center justify-center gap-2
                      ${isRegistering 
                        ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white' 
                        : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white'}
                    `}
                >
                    {loading ? (
                      'Conectando...'
                    ) : (
                        <>
                           {isRegistering ? 'Cadastrar' : 'Entrar'} 
                           <ArrowRight className="w-5 h-5" />
                        </>
                    )}
                </button>
            </form>

            <div className="mt-6 flex flex-col items-center gap-4">
                <div className="w-full h-px bg-slate-700/50"></div>
                
                <button 
                  onClick={toggleMode}
                  className="text-slate-400 hover:text-white text-sm font-medium transition-colors flex items-center gap-2"
                >
                  {isRegistering ? 'Já tenho uma conta? Fazer Login' : 'Não tem conta? Criar nova conta'}
                </button>

                {!isRegistering && (
                  <div className="text-xs text-slate-500 mt-2 bg-slate-800/50 px-4 py-2 rounded-lg border border-slate-700/50">
                      <span className="block font-semibold text-slate-400 mb-1">Acesso Admin (Demo):</span>
                      <span className="font-mono">admin@fitai.com</span>
                  </div>
                )}
            </div>
        </div>
      </div>
    </div>
  );
};

export default Login;