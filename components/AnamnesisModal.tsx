import React, { useState, useEffect } from 'react';
import { X, User as UserIcon, Scale, Heart, Dumbbell, Utensils, Sparkles, Target, Save, Loader2, AlertCircle, ChevronRight, ChevronLeft, Upload, FileText, CheckCircle2 } from 'lucide-react';
import { User, Anamnesis } from '../types';
import { apiService } from '../services/apiService';
import { extractAnamnesisFromDocument, extractAnamnesisFromGoogleDocs } from '../services/geminiService';

interface AnamnesisModalProps {
    isOpen: boolean;
    onClose: () => void;
    user: User;
    onUpdate: (updatedUser: User) => void;
    isEditable?: boolean;
}

const SECTIONS = [
    { id: 'personal', label: 'Pessoal', icon: <UserIcon className="w-4 h-4" /> },
    { id: 'physical', label: 'Físico', icon: <Scale className="w-4 h-4" /> },
    { id: 'health', label: 'Saúde', icon: <Heart className="w-4 h-4" /> },
    { id: 'fitness', label: 'Exercício', icon: <Dumbbell className="w-4 h-4" /> },
    { id: 'nutrition', label: 'Nutrição', icon: <Utensils className="w-4 h-4" /> },
    { id: 'preferences', label: 'Preferências', icon: <Sparkles className="w-4 h-4" /> },
    { id: 'goals', label: 'Objetivos', icon: <Target className="w-4 h-4" /> },
];

export const AnamnesisModal: React.FC<AnamnesisModalProps> = ({ isOpen, onClose, user, onUpdate, isEditable = true }) => {
    const [activeSection, setActiveSection] = useState('personal');
    const [formData, setFormData] = useState<Anamnesis>(() => {
        // Deep Merge with defaults
        const defaults: Anamnesis = {
            userId: user.id,
            updatedAt: new Date().toISOString(),
            personal: {
                fullName: user.name || '',
                whatsapp: user.phone || '',
                birthDate: '',
                age: 0,
                location: { city: '', state: '', country: 'Brasil' },
                maritalStatus: 'Solteiro(a)',
                profession: '',
                gender: 'Masculino',
            },
            physical: {
                weight: 0,
                height: 0,
                targetWeight: 0,
                currentBodyShape: 5,
                desiredBodyShape: 3,
            },
            health: {
                conditions: [],
                injuries: '',
                dailyActivity: 'Moderada',
                sleepQuality: 'Boa',
                chestPain: false,
            },
            fitness: {
                currentlyExercising: false,
                trainingLocation: 'Academia',
                weeklyFrequency: 3,
                trainingTimeAvailable: '60 min',
            },
            nutrition: {
                nutritionalMonitoring: false,
                eatingHabits: '',
            },
            preferences: {
                likedExercises: '',
                dislikedExercises: '',
                bodyPartFocus: '',
                cardioPreference: '',
            },
            goals: {
                threeMonthGoal: '',
                mainObstacle: '',
            },
        };

        // Merge existing data if available
        const existing = user.anamnesis;
        if (!existing) return defaults;

        return {
            ...defaults,
            ...existing,
            personal: { ...defaults.personal, ...(existing.personal || {}) },
            physical: { ...defaults.physical, ...(existing.physical || {}) },
            health: { ...defaults.health, ...(existing.health || {}) },
            fitness: { ...defaults.fitness, ...(existing.fitness || {}) },
            nutrition: { ...defaults.nutrition, ...(existing.nutrition || {}) },
            preferences: { ...defaults.preferences, ...(existing.preferences || {}) },
            goals: { ...defaults.goals, ...(existing.goals || {}) },
        };
    });

    const [saving, setSaving] = useState(false);

    // --- AI EXTRACTION STATE ---
    const [documentFile, setDocumentFile] = useState<File | null>(null);
    const [isExtracting, setIsExtracting] = useState(false);
    const [extractionError, setExtractionError] = useState<string | null>(null);
    const [showGoogleDocsInput, setShowGoogleDocsInput] = useState(false);
    const [googleDocsUrl, setGoogleDocsUrl] = useState('');
    const [showExtractionSuccess, setShowExtractionSuccess] = useState(false);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    const handleDocumentUpload = async (file: File) => {
        setDocumentFile(file);
        setIsExtracting(true);
        setExtractionError(null);
        setShowExtractionSuccess(false);

        try {
            const { extractedData } = await extractAnamnesisFromDocument(file, user.id, user.role || 'user');
            applyExtractedData(extractedData);
        } catch (error: any) {
            console.error("Erro ao extrair dados do documento:", error);
            setExtractionError(error.message || "Erro ao processar documento.");
        } finally {
            setIsExtracting(false);
        }
    };

    const handleGoogleDocsSubmit = async () => {
        if (!googleDocsUrl.trim()) {
            setExtractionError("Por favor, insira a URL do Google Docs.");
            return;
        }

        setIsExtracting(true);
        setExtractionError(null);
        setShowExtractionSuccess(false);

        try {
            const { extractedData } = await extractAnamnesisFromGoogleDocs(googleDocsUrl, user.id, user.role || 'user');
            applyExtractedData(extractedData);
            setShowGoogleDocsInput(false);
            setGoogleDocsUrl('');
        } catch (error: any) {
            console.error("Erro ao extrair dados do Google Docs:", error);
            setExtractionError(error.message || "Erro ao processar Google Docs.");
        } finally {
            setIsExtracting(false);
        }
    };

    const applyExtractedData = (extracted: Partial<Anamnesis>) => {
        setFormData(prev => {
            const merged = { ...prev };

            if (extracted.personal) merged.personal = { ...prev.personal, ...extracted.personal, location: { ...prev.personal.location, ...extracted.personal.location } };
            if (extracted.physical) merged.physical = { ...prev.physical, ...extracted.physical };
            if (extracted.health) merged.health = { ...prev.health, ...extracted.health, conditions: extracted.health.conditions?.length ? extracted.health.conditions : prev.health.conditions };
            if (extracted.fitness) {
                merged.fitness = {
                    ...prev.fitness,
                    currentlyExercising: extracted.fitness.currentlyExercising ?? prev.fitness.currentlyExercising,
                    trainingLocation: (extracted.fitness.trainingLocation as any) || prev.fitness.trainingLocation,
                    weeklyFrequency: extracted.fitness.weeklyFrequency || prev.fitness.weeklyFrequency,
                    trainingTimeAvailable: extracted.fitness.trainingTimeAvailable || prev.fitness.trainingTimeAvailable,
                };
            }
            if (extracted.nutrition) merged.nutrition = { ...prev.nutrition, ...extracted.nutrition };
            if (extracted.preferences) merged.preferences = { ...prev.preferences, ...extracted.preferences };
            if (extracted.goals) merged.goals = { ...prev.goals, ...extracted.goals };

            return merged;
        });

        setShowExtractionSuccess(true);
        setTimeout(() => setShowExtractionSuccess(false), 5000);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const allowedTypes = [
                'application/pdf',
                'image/png', 'image/jpeg', 'image/jpg', 'image/webp',
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'application/vnd.ms-excel',
                'text/csv'
            ];
            // Basic validation
            if (!allowedTypes.includes(file.type) && !file.name.match(/\.(pdf|png|jpe?g|webp|xlsx|xls|csv)$/i)) {
                setExtractionError("Tipo de arquivo não suportado.");
                return;
            }
            if (file.size > 10 * 1024 * 1024) {
                setExtractionError("Arquivo muito grande (max 10MB).");
                return;
            }
            handleDocumentUpload(file);
        }
    };

    // Update formData if user prop changes (important for Personal switching students)
    useEffect(() => {
        if (user && isOpen) {
            const defaults: Anamnesis = {
                userId: user.id,
                updatedAt: new Date().toISOString(),
                personal: {
                    fullName: user.name || '',
                    whatsapp: user.phone || '',
                    birthDate: '',
                    age: 0,
                    location: { city: '', state: '', country: 'Brasil' },
                    maritalStatus: 'Solteiro(a)',
                    profession: '',
                    gender: 'Masculino',
                },
                physical: {
                    weight: 0,
                    height: 0,
                    targetWeight: 0,
                    currentBodyShape: 5,
                    desiredBodyShape: 3,
                },
                health: {
                    conditions: [],
                    injuries: '',
                    dailyActivity: 'Moderada',
                    sleepQuality: 'Boa',
                    chestPain: false,
                },
                fitness: {
                    currentlyExercising: false,
                    trainingLocation: 'Academia',
                    weeklyFrequency: 3,
                    trainingTimeAvailable: '60 min',
                },
                nutrition: {
                    nutritionalMonitoring: false,
                    eatingHabits: '',
                },
                preferences: {
                    likedExercises: '',
                    dislikedExercises: '',
                    bodyPartFocus: '',
                    cardioPreference: '',
                },
                goals: {
                    threeMonthGoal: '',
                    mainObstacle: '',
                },
            };

            const existing = user.anamnesis;
            if (existing) {
                setFormData({
                    ...defaults,
                    ...existing,
                    personal: { ...defaults.personal, ...(existing.personal || {}) },
                    physical: { ...defaults.physical, ...(existing.physical || {}) },
                    health: { ...defaults.health, ...(existing.health || {}) },
                    fitness: { ...defaults.fitness, ...(existing.fitness || {}) },
                    nutrition: { ...defaults.nutrition, ...(existing.nutrition || {}) },
                    preferences: { ...defaults.preferences, ...(existing.preferences || {}) },
                    goals: { ...defaults.goals, ...(existing.goals || {}) },
                });
            } else {
                setFormData(defaults);
            }
        }
    }, [user.id, isOpen]);

    if (!isOpen) return null;

    const handleSave = async () => {
        if (!isEditable) return;
        setSaving(true);
        try {
            const updatedData = { ...formData, updatedAt: new Date().toISOString() };
            await apiService.updateAnamnesis(user.id, updatedData);
            onUpdate({ ...user, anamnesis: updatedData });
            onClose();
        } catch (error) {
            console.error("Error saving anamnesis:", error);
            alert("Erro ao salvar dados. Tente novamente.");
        } finally {
            setSaving(false);
        }
    };

    const nextSection = () => {
        const currentIndex = SECTIONS.findIndex(s => s.id === activeSection);
        if (currentIndex < SECTIONS.length - 1) {
            setActiveSection(SECTIONS[currentIndex + 1].id);
        }
    };

    const prevSection = () => {
        const currentIndex = SECTIONS.findIndex(s => s.id === activeSection);
        if (currentIndex > 0) {
            setActiveSection(SECTIONS[currentIndex - 1].id);
        }
    };

    return (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-slate-900 border border-slate-700/50 rounded-3xl w-full max-w-4xl h-[90vh] flex flex-col overflow-hidden shadow-2xl">
                {/* Header */}
                <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-800/20">
                    <div>
                        <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                            <ClipboardList className="w-6 h-6 text-blue-400" />
                            Ficha de Avaliação (Anamnese)
                        </h2>
                        <p className="text-slate-400 text-sm mt-1">Dados de {user.name} para personalização via IA</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full transition-colors">
                        <X className="w-6 h-6 text-slate-400" />
                    </button>
                </div>

                <div className="flex-grow flex overflow-hidden">
                    {/* Sidebar Menu */}
                    <div className="w-20 md:w-48 bg-slate-950/50 border-r border-slate-800 p-2 md:p-4 overflow-y-auto hidden sm:block">
                        <div className="space-y-2">
                            {SECTIONS.map(section => (
                                <button
                                    key={section.id}
                                    onClick={() => setActiveSection(section.id)}
                                    className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${activeSection === section.id
                                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40'
                                        : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'
                                        }`}
                                >
                                    <div className="shrink-0">{section.icon}</div>
                                    <span className="text-sm font-medium hidden md:block">{section.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Content Area */}
                    <div className="flex-grow flex flex-col overflow-hidden bg-slate-900/50">
                        {/* Mobile Nav */}
                        <div className="sm:hidden flex overflow-x-auto p-2 border-b border-slate-800 no-scrollbar gap-2">
                            {SECTIONS.map(section => (
                                <button
                                    key={section.id}
                                    onClick={() => setActiveSection(section.id)}
                                    className={`shrink-0 flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all ${activeSection === section.id
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-slate-800 text-slate-400'
                                        }`}
                                >
                                    {section.icon}
                                    {section.label}
                                </button>
                            ))}
                        </div>

                        <div className="flex-grow overflow-y-auto p-6 custom-scrollbar">
                            {activeSection === 'personal' && (
                                <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">

                                    {/* Document Upload Section */}
                                    <div className="bg-gradient-to-r from-blue-600/10 to-indigo-600/10 border border-blue-500/20 rounded-2xl p-4">
                                        <div className="flex items-start gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400 border border-blue-500/20 shrink-0">
                                                <Sparkles size={20} />
                                            </div>
                                            <div className="flex-1">
                                                <h3 className="text-sm font-bold text-white mb-1">Preenchimento Inteligente (IA)</h3>
                                                <p className="text-xs text-slate-400 mb-3">
                                                    Envie um PDF, Imagem ou link do Google Docs. A IA extrairá os dados e preencherá a ficha para você.
                                                </p>

                                                <input
                                                    ref={fileInputRef}
                                                    type="file"
                                                    accept=".pdf,image/png,image/jpeg,image/jpg,image/webp,.xlsx,.xls,.csv"
                                                    onChange={handleFileChange}
                                                    className="hidden"
                                                />

                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <button
                                                        type="button"
                                                        onClick={() => fileInputRef.current?.click()}
                                                        disabled={isExtracting}
                                                        className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/50 text-white text-xs font-bold rounded-xl transition-all"
                                                    >
                                                        {isExtracting ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                                                        {isExtracting ? 'Extraindo...' : 'Enviar Arquivo'}
                                                    </button>

                                                    <button
                                                        type="button"
                                                        onClick={() => setShowGoogleDocsInput(!showGoogleDocsInput)}
                                                        disabled={isExtracting}
                                                        className="flex items-center gap-2 px-3 py-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-all"
                                                    >
                                                        <FileText size={14} />
                                                        Google Docs
                                                    </button>

                                                    {documentFile && !isExtracting && (
                                                        <div className="flex items-center gap-2 text-[10px] text-slate-400 bg-slate-800 px-2 py-1 rounded-lg">
                                                            <FileText size={12} />
                                                            {documentFile.name.length > 15 ? documentFile.name.slice(0, 15) + '...' : documentFile.name}
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Google Docs URL Input */}
                                                {showGoogleDocsInput && (
                                                    <div className="mt-3 flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
                                                        <input
                                                            type="url"
                                                            value={googleDocsUrl}
                                                            onChange={(e) => setGoogleDocsUrl(e.target.value)}
                                                            placeholder="Cole a URL do Google Docs..."
                                                            className="flex-1 bg-slate-900/50 border border-slate-700 text-white text-xs rounded-lg px-3 py-2 focus:border-blue-500 outline-none"
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={handleGoogleDocsSubmit}
                                                            disabled={isExtracting || !googleDocsUrl.trim()}
                                                            className="px-3 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-bold rounded-lg transition-all"
                                                        >
                                                            Extrair
                                                        </button>
                                                    </div>
                                                )}

                                                {/* Messages */}
                                                {extractionError && (
                                                    <p className="mt-2 text-xs text-red-400 flex items-center gap-1 animate-in fade-in">
                                                        <AlertCircle size={12} /> {extractionError}
                                                    </p>
                                                )}
                                                {showExtractionSuccess && (
                                                    <p className="mt-2 text-xs text-emerald-400 flex items-center gap-1 animate-in fade-in">
                                                        <CheckCircle2 size={12} /> Dados extraídos com sucesso!
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <SectionTitle title="Informações Pessoais" description="Dados básicos de identificação e contato." />
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <InputField
                                            label="Nome Completo"
                                            value={formData.personal.fullName}
                                            onChange={v => setFormData({ ...formData, personal: { ...formData.personal, fullName: v } })}
                                            disabled={!isEditable}
                                        />
                                        <InputField
                                            label="WhatsApp"
                                            value={formData.personal.whatsapp}
                                            onChange={v => setFormData({ ...formData, personal: { ...formData.personal, whatsapp: v } })}
                                            disabled={!isEditable}
                                            placeholder="(00) 00000-0000"
                                        />
                                        <InputField
                                            label="Data de Nascimento"
                                            type="date"
                                            value={formData.personal.birthDate}
                                            onChange={v => setFormData({ ...formData, personal: { ...formData.personal, birthDate: v } })}
                                            disabled={!isEditable}
                                        />
                                        <InputField
                                            label="Idade"
                                            type="number"
                                            value={formData.personal.age || ''}
                                            onChange={v => setFormData({ ...formData, personal: { ...formData.personal, age: parseInt(v) || 0 } })}
                                            disabled={!isEditable}
                                        />
                                        <div className="md:col-span-2 grid grid-cols-3 gap-3">
                                            <InputField
                                                label="Cidade"
                                                value={formData.personal.location.city}
                                                onChange={v => setFormData({ ...formData, personal: { ...formData.personal, location: { ...formData.personal.location, city: v } } })}
                                                disabled={!isEditable}
                                            />
                                            <InputField
                                                label="Estado"
                                                value={formData.personal.location.state}
                                                onChange={v => setFormData({ ...formData, personal: { ...formData.personal, location: { ...formData.personal.location, state: v } } })}
                                                disabled={!isEditable}
                                            />
                                            <InputField
                                                label="País"
                                                value={formData.personal.location.country}
                                                onChange={v => setFormData({ ...formData, personal: { ...formData.personal, location: { ...formData.personal.location, country: v } } })}
                                                disabled={!isEditable}
                                            />
                                        </div>
                                        <SelectField
                                            label="Estado Civil"
                                            options={['Solteiro(a)', 'Casado(a)', 'Divorciado(a)', 'Viúvo(a)']}
                                            value={formData.personal.maritalStatus}
                                            onChange={v => setFormData({ ...formData, personal: { ...formData.personal, maritalStatus: v as any } })}
                                            disabled={!isEditable}
                                        />
                                        <InputField
                                            label="Profissão"
                                            value={formData.personal.profession}
                                            onChange={v => setFormData({ ...formData, personal: { ...formData.personal, profession: v } })}
                                            disabled={!isEditable}
                                        />
                                        <SelectField
                                            label="Sexo"
                                            options={['Masculino', 'Feminino']}
                                            value={formData.personal.gender}
                                            onChange={v => setFormData({ ...formData, personal: { ...formData.personal, gender: v as any } })}
                                            disabled={!isEditable}
                                            highlight
                                        />
                                    </div>
                                </div>
                            )}

                            {activeSection === 'physical' && (
                                <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                                    <SectionTitle title="Parâmetros Físicos" description="Medidas atuais e metas corporais." />
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <InputField
                                            label="Peso Atual (kg)"
                                            type="number"
                                            value={formData.physical.weight || ''}
                                            onChange={v => setFormData({ ...formData, physical: { ...formData.physical, weight: parseFloat(v) || 0 } })}
                                            disabled={!isEditable}
                                        />
                                        <InputField
                                            label="Altura (cm)"
                                            type="number"
                                            value={formData.physical.height || ''}
                                            onChange={v => setFormData({ ...formData, physical: { ...formData.physical, height: parseFloat(v) || 0 } })}
                                            disabled={!isEditable}
                                        />
                                        <InputField
                                            label="Peso Meta (kg)"
                                            type="number"
                                            value={formData.physical.targetWeight || ''}
                                            onChange={v => setFormData({ ...formData, physical: { ...formData.physical, targetWeight: parseFloat(v) || 0 } })}
                                            disabled={!isEditable}
                                        />
                                        <div className="md:col-span-2 space-y-4 bg-slate-800/30 p-4 rounded-2xl border border-slate-700/50">
                                            <div>
                                                <label className="block text-sm font-bold text-slate-300 mb-2">Forma Física Atual (1-10)</label>
                                                <input
                                                    type="range"
                                                    min="1"
                                                    max="10"
                                                    step="1"
                                                    value={formData.physical.currentBodyShape}
                                                    onChange={e => setFormData({ ...formData, physical: { ...formData.physical, currentBodyShape: parseInt(e.target.value) } })}
                                                    disabled={!isEditable}
                                                    className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                                                />
                                                <div className="flex justify-between text-[10px] text-slate-500 mt-1 uppercase font-bold">
                                                    <span>Sedentário</span>
                                                    <span>Atleta</span>
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-bold text-slate-300 mb-2">Forma Física Desejada (1-10)</label>
                                                <input
                                                    type="range"
                                                    min="1"
                                                    max="10"
                                                    step="1"
                                                    value={formData.physical.desiredBodyShape}
                                                    onChange={e => setFormData({ ...formData, physical: { ...formData.physical, desiredBodyShape: parseInt(e.target.value) } })}
                                                    disabled={!isEditable}
                                                    className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeSection === 'health' && (
                                <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                                    <SectionTitle title="Histórico de Saúde" description="Condições médicas e segurança cardiovascular." />
                                    <div className="space-y-4">
                                        <div className={`p-4 rounded-2xl border transition-all ${formData.health.chestPain ? 'bg-red-500/10 border-red-500/50' : 'bg-slate-800/30 border-slate-700/50'}`}>
                                            <label className="flex items-center gap-3 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={formData.health.chestPain}
                                                    onChange={e => setFormData({ ...formData, health: { ...formData.health, chestPain: e.target.checked } })}
                                                    disabled={!isEditable}
                                                    className="w-5 h-5 rounded border-slate-700 text-red-600 focus:ring-red-500"
                                                />
                                                <div>
                                                    <p className="text-sm font-bold text-white">Sente dores no peito ao praticar atividade física?</p>
                                                    <p className="text-xs text-slate-400">Esta informação é crucial para sua segurança.</p>
                                                </div>
                                                {formData.health.chestPain && <AlertCircle className="w-5 h-5 text-red-500 shrink-0 ml-auto" />}
                                            </label>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="block text-sm font-bold text-slate-300">Condições Médicas / Patologias</label>
                                            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                                {['Hipertensão', 'Diabetes', 'Asma', 'Colesterol Alto', 'Cardiopatia', 'Outros'].map(cond => (
                                                    <label key={cond} className="flex items-center gap-2 p-2 bg-slate-800/50 rounded-lg border border-slate-700 text-xs text-slate-300 cursor-pointer hover:bg-slate-700">
                                                        <input
                                                            type="checkbox"
                                                            checked={formData.health.conditions.includes(cond)}
                                                            onChange={e => {
                                                                const newConds = e.target.checked
                                                                    ? [...formData.health.conditions, cond]
                                                                    : formData.health.conditions.filter(c => c !== cond);
                                                                setFormData({ ...formData, health: { ...formData.health, conditions: newConds } });
                                                            }}
                                                            disabled={!isEditable}
                                                        />
                                                        {cond}
                                                    </label>
                                                ))}
                                            </div>
                                        </div>

                                        <TextAreaField
                                            label="Lesões ou Restrições (ex: Hérnia de disco, Joelho)"
                                            value={formData.health.injuries}
                                            onChange={v => setFormData({ ...formData, health: { ...formData.health, injuries: v } })}
                                            disabled={!isEditable}
                                            placeholder="Descreva qualquer dor ou lesão que a IA deve respeitar..."
                                        />

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <SelectField
                                                label="Nível de Atividade Diária"
                                                options={['Sentado(a)', 'Em pé', 'Moderada', 'Intensa']}
                                                value={formData.health.dailyActivity}
                                                onChange={v => setFormData({ ...formData, health: { ...formData.health, dailyActivity: v as any } })}
                                                disabled={!isEditable}
                                            />
                                            <SelectField
                                                label="Qualidade do Sono"
                                                options={['Ruim', 'Regular', 'Boa', 'Excelente']}
                                                value={formData.health.sleepQuality}
                                                onChange={v => setFormData({ ...formData, health: { ...formData.health, sleepQuality: v as any } })}
                                                disabled={!isEditable}
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeSection === 'fitness' && (
                                <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                                    <SectionTitle title="Rotina de Exercícios" description="Sua experiência e disponibilidade atual." />
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between p-4 bg-slate-800/30 rounded-2xl border border-slate-700/50">
                                            <div>
                                                <p className="text-sm font-bold text-white">Pratica exercícios atualmente?</p>
                                                <p className="text-xs text-slate-400">Ajuda a definir o volume de treino inicial.</p>
                                            </div>
                                            <button
                                                onClick={() => isEditable && setFormData({ ...formData, fitness: { ...formData.fitness, currentlyExercising: !formData.fitness.currentlyExercising } })}
                                                disabled={!isEditable}
                                                className={`w-12 h-6 rounded-full p-1 transition-colors ${formData.fitness.currentlyExercising ? 'bg-blue-600' : 'bg-slate-700'}`}
                                            >
                                                <div className={`w-4 h-4 rounded-full bg-white transition-transform ${formData.fitness.currentlyExercising ? 'translate-x-6' : 'translate-x-0'}`} />
                                            </button>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <SelectField
                                                label="Onde costuma treinar?"
                                                options={['Academia', 'Casa', 'Ar Livre']}
                                                value={formData.fitness.trainingLocation}
                                                onChange={v => setFormData({ ...formData, fitness: { ...formData.fitness, trainingLocation: v as any } })}
                                                disabled={!isEditable}
                                            />
                                            <InputField
                                                label="Frequência Semanal (dias)"
                                                type="number"
                                                value={formData.fitness.weeklyFrequency || ''}
                                                onChange={v => setFormData({ ...formData, fitness: { ...formData.fitness, weeklyFrequency: parseInt(v) || 0 } })}
                                                disabled={!isEditable}
                                            />
                                            <InputField
                                                label="Tempo disponível por treino"
                                                value={formData.fitness.trainingTimeAvailable}
                                                onChange={v => setFormData({ ...formData, fitness: { ...formData.fitness, trainingTimeAvailable: v } })}
                                                disabled={!isEditable}
                                                placeholder="Ex: 45 min, 1 hora"
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeSection === 'nutrition' && (
                                <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                                    <SectionTitle title="Nutrição e Hábitos" description="Como é sua alimentação e acompanhamento." />
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between p-4 bg-slate-800/30 rounded-2xl border border-slate-700/50">
                                            <div>
                                                <p className="text-sm font-bold text-white">Possui acompanhamento nutricional?</p>
                                                <p className="text-xs text-slate-400">Nutricionista, endocrinologista, etc.</p>
                                            </div>
                                            <button
                                                onClick={() => isEditable && setFormData({ ...formData, nutrition: { ...formData.nutrition, nutritionalMonitoring: !formData.nutrition.nutritionalMonitoring } })}
                                                disabled={!isEditable}
                                                className={`w-12 h-6 rounded-full p-1 transition-colors ${formData.nutrition.nutritionalMonitoring ? 'bg-emerald-600' : 'bg-slate-700'}`}
                                            >
                                                <div className={`w-4 h-4 rounded-full bg-white transition-transform ${formData.nutrition.nutritionalMonitoring ? 'translate-x-6' : 'translate-x-0'}`} />
                                            </button>
                                        </div>

                                        <TextAreaField
                                            label="Hábitos Alimentares ou Restrições"
                                            value={formData.nutrition.eatingHabits}
                                            onChange={v => setFormData({ ...formData, nutrition: { ...formData.nutrition, eatingHabits: v } })}
                                            disabled={!isEditable}
                                            placeholder="Ex: Como de tudo, Vegano, Intolerante a lactose, Sem glúten..."
                                        />
                                    </div>
                                </div>
                            )}

                            {activeSection === 'preferences' && (
                                <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                                    <SectionTitle title="Preferências IA" description="Diga o que você gosta para a IA priorizar ou evitar." />
                                    <div className="space-y-4">
                                        <TextAreaField
                                            label="Exercícios que MAIS gosta"
                                            value={formData.preferences.likedExercises}
                                            onChange={v => setFormData({ ...formData, preferences: { ...formData.preferences, likedExercises: v } })}
                                            disabled={!isEditable}
                                            placeholder="A IA tentará incluir estes nos seus planos..."
                                        />
                                        <TextAreaField
                                            label="Exercícios que NÃO gosta (IA deve evitar)"
                                            value={formData.preferences.dislikedExercises}
                                            onChange={v => setFormData({ ...formData, preferences: { ...formData.preferences, dislikedExercises: v } })}
                                            disabled={!isEditable}
                                            placeholder="A IA evitará estes exercícios..."
                                        />
                                        <InputField
                                            label="Foco Muscular Principal"
                                            value={formData.preferences.bodyPartFocus}
                                            onChange={v => setFormData({ ...formData, preferences: { ...formData.preferences, bodyPartFocus: v } })}
                                            disabled={!isEditable}
                                            placeholder="Ex: Quadríceps, Costas, Abdômen..."
                                        />
                                        <SelectField
                                            label="Preferência de Cardio"
                                            options={['Nenhuma', 'Caminhada', 'Corrida', 'Pular Corda', 'Bicicleta', 'Escada']}
                                            value={formData.preferences.cardioPreference}
                                            onChange={v => setFormData({ ...formData, preferences: { ...formData.preferences, cardioPreference: v } })}
                                            disabled={!isEditable}
                                        />
                                    </div>
                                </div>
                            )}

                            {activeSection === 'goals' && (
                                <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                                    <SectionTitle title="Objetivos e Mente" description="Onde você quer chegar e o que te impede." />
                                    <div className="space-y-4">
                                        <TextAreaField
                                            label="Onde quer estar em 3 meses?"
                                            value={formData.goals.threeMonthGoal}
                                            onChange={v => setFormData({ ...formData, goals: { ...formData.goals, threeMonthGoal: v } })}
                                            disabled={!isEditable}
                                            placeholder="Seja específico: 'Quero reduzir 5kg', 'Quero fazer 10 barras'..."
                                        />
                                        <TextAreaField
                                            label="Qual seu principal obstáculo hoje?"
                                            value={formData.goals.mainObstacle}
                                            onChange={v => setFormData({ ...formData, goals: { ...formData.goals, mainObstacle: v } })}
                                            disabled={!isEditable}
                                            placeholder="Ex: Tempo, Preguiça, Alimentação fora de casa..."
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="p-4 sm:p-6 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between bg-slate-800/20 gap-4">
                            <div className="flex gap-2 w-full sm:w-auto">
                                <button
                                    onClick={prevSection}
                                    disabled={activeSection === SECTIONS[0].id}
                                    className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-3 sm:py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-all disabled:opacity-30"
                                >
                                    <ChevronLeft className="w-4 h-4" /> Anterior
                                </button>
                                <button
                                    onClick={nextSection}
                                    disabled={activeSection === SECTIONS[SECTIONS.length - 1].id}
                                    className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-3 sm:py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-all disabled:opacity-30"
                                >
                                    Próximo <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>

                            {isEditable && (
                                <button
                                    onClick={handleSave}
                                    disabled={saving}
                                    className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-4 sm:py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-lg shadow-blue-900/30 transition-all active:scale-95 disabled:opacity-70"
                                >
                                    {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                                    <span className="whitespace-nowrap">{saving ? 'Salvando...' : 'Salvar Alterações'}</span>
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- HELPER COMPONENTS ---

const SectionTitle: React.FC<{ title: string; description: string }> = ({ title, description }) => (
    <div>
        <h3 className="text-xl font-bold text-white">{title}</h3>
        <p className="text-sm text-slate-400">{description}</p>
        <div className="h-1 w-12 bg-blue-500 rounded-full mt-2" />
    </div>
);

const InputField: React.FC<{ label: string; value: string | number; onChange: (v: string) => void; type?: string; disabled?: boolean; placeholder?: string }> = ({ label, value, onChange, type = 'text', disabled = false, placeholder }) => (
    <div className="space-y-1.5">
        <label className="block text-sm font-bold text-slate-400 uppercase tracking-wider">{label}</label>
        <input
            type={type}
            value={value}
            onChange={e => onChange(e.target.value)}
            disabled={disabled}
            placeholder={placeholder}
            className="w-full bg-slate-800/50 border border-slate-700 rounded-xl p-3 text-white focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none transition-all disabled:opacity-50 placeholder-slate-600"
        />
    </div>
);

const TextAreaField: React.FC<{ label: string; value: string; onChange: (v: string) => void; disabled?: boolean; placeholder?: string }> = ({ label, value, onChange, disabled = false, placeholder }) => (
    <div className="space-y-1.5">
        <label className="block text-sm font-bold text-slate-400 uppercase tracking-wider">{label}</label>
        <textarea
            value={value}
            onChange={e => onChange(e.target.value)}
            disabled={disabled}
            placeholder={placeholder}
            rows={3}
            className="w-full bg-slate-800/50 border border-slate-700 rounded-xl p-3 text-white focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none transition-all disabled:opacity-50 resize-none placeholder-slate-600"
        />
    </div>
);

const SelectField: React.FC<{ label: string; options: string[]; value: string; onChange: (v: string) => void; disabled?: boolean; highlight?: boolean }> = ({ label, options, value, onChange, disabled = false, highlight = false }) => (
    <div className="space-y-1.5">
        <label className="block text-sm font-bold text-slate-400 uppercase tracking-wider">{label}</label>
        <select
            value={value}
            onChange={e => onChange(e.target.value)}
            disabled={disabled}
            className={`w-full bg-slate-800/50 border rounded-xl p-3 text-white focus:ring-2 focus:ring-blue-500/50 outline-none transition-all disabled:opacity-50 ${highlight ? 'border-blue-500/50 font-bold' : 'border-slate-700'}`}
        >
            {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
        </select>
    </div>
);

// Adicionando o ícone que faltou
const ClipboardList = ({ className }: { className?: string }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="8" height="4" x="8" y="2" rx="1" ry="1" /><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" /><path d="M12 11h4" /><path d="M12 16h4" /><path d="M8 11h.01" /><path d="M8 16h.01" /></svg>
);
