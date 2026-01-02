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

    try {
      if (isRegistering) {
        
        if (!name.trim()) {
           throw new Error("Por favor, digite seu nome.");
        }
        if (!password.trim()) {
           throw new Error("Por favor, digite uma senha.");
        }

        // --- INTEGRAÇÃO COM BACKEND (CADASTRO) ---
        const url = "https://testeai-732767853162.us-west1.run.app/api/usuarios";
        
        const payload = {
            name: name,    // Backend mapeia para 'nome'
            email: email,
            senha: password
        };

        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            // Tenta ler o erro do backend se houver
            let errorMsg = "Erro ao cadastrar usuário.";
            try {
                const errData = await response.json();
                if (errData.message) errorMsg = errData.message;
            } catch (e) {}
            throw new Error(errorMsg);
        }

        const usuarioCriado = await response.json();
        alert("Cadastro realizado com sucesso! Faça login para continuar.");
        
        // Limpar formulário e mudar para login após sucesso
        setIsRegistering(false);
        setPassword('');
        
      } else {
        // --- INTEGRAÇÃO COM BACKEND (LOGIN) ---
        
        if (!email.trim() || !password.trim()) {
            throw new Error("Preencha e-mail e senha.");
        }

        const loginUrl = "https://testeai-732767853162.us-west1.run.app/api/usuarios/login";
        
        const loginPayload = {
            email: email,
            senha: password
        };

        const response = await fetch(loginUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(loginPayload),
        });

        if (response.status === 401 || response.status === 403) {
             throw new Error("E-mail ou senha incorretos.");
        }

        if (!response.ok) {
             throw new Error("Erro de conexão ao tentar realizar login.");
        }

        const usuarioLogado = await response.json();

        // Mapeamento de segurança para garantir que o formato User seja respeitado
        // Caso o backend retorne 'nome' ao invés de 'name', ajustamos aqui
        const appUser: User = {
            id: usuarioLogado.id ? String(usuarioLogado.id) : Date.now().toString(),
            name: usuarioLogado.name || usuarioLogado.nome || "Usuário",
            email: usuarioLogado.email,
            role: usuarioLogado.role || 'user',
            avatar: usuarioLogado.avatar,
            assignedExercises: usuarioLogado.assignedExercises || []
        };
        
        // Atualiza o MockDataService apenas para manter compatibilidade com funcionalidades locais (opcional)
        // localStorage.setItem("fitai_current_session", JSON.stringify(appUser)); 
        
        onLogin(appUser);
      }
    } catch (err: any) {
      const mensagemErro = err.message || 'Ocorreu um erro. Tente novamente.';
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
                      <span className="flex items-center gap-2">Conectando...</span>
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