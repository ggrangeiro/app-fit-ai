import React, { useState } from 'react';
import { AppStep, ExerciseType, AnalysisResult } from './types';
import { analyzeVideo } from './services/geminiService';
import ExerciseCard from './components/ExerciseCard';
import ResultView from './components/ResultView';
import { Video, UploadCloud, Loader2, ArrowRight } from 'lucide-react';

const App: React.FC = () => {
  const [step, setStep] = useState<AppStep>(AppStep.SELECT_EXERCISE);
  const [selectedExercise, setSelectedExercise] = useState<ExerciseType | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 20 * 1024 * 1024) { // 20MB limit for demo inline data
        setError("O vídeo deve ter menos de 20MB para esta demonstração.");
        return;
      }
      setVideoFile(file);
      setVideoPreview(URL.createObjectURL(file));
      setError(null);
    }
  };

  const handleAnalysis = async () => {
    if (!videoFile || !selectedExercise) return;

    setStep(AppStep.ANALYZING);
    try {
      const result = await analyzeVideo(videoFile, selectedExercise);
      setAnalysisResult(result);
      setStep(AppStep.RESULTS);
    } catch (err: any) {
      console.error(err);
      setError("Ocorreu um erro ao processar o vídeo. Tente novamente.");
      setStep(AppStep.UPLOAD_VIDEO);
    }
  };

  const resetApp = () => {
    setStep(AppStep.SELECT_EXERCISE);
    setSelectedExercise(null);
    setVideoFile(null);
    setVideoPreview(null);
    setAnalysisResult(null);
    setError(null);
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-slate-900/80 backdrop-blur-md border-b border-slate-800 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-blue-500">
            <Video className="w-8 h-8" />
            <h1 className="text-2xl font-bold tracking-tight text-white">FitAI <span className="text-blue-500">Analyzer</span></h1>
          </div>
          {step !== AppStep.SELECT_EXERCISE && (
            <button onClick={resetApp} className="text-sm text-slate-400 hover:text-white transition-colors">
              Reiniciar
            </button>
          )}
        </div>
      </header>

      <main className="flex-grow flex items-center justify-center p-4 md:p-8">
        
        {/* Step 1: Select Exercise */}
        {step === AppStep.SELECT_EXERCISE && (
          <div className="w-full max-w-5xl animate-fade-in">
            <h2 className="text-4xl font-bold text-center mb-4 text-white">Qual exercício você vai treinar?</h2>
            <p className="text-center text-slate-400 mb-12 text-lg">Selecione o movimento para que a IA possa avaliar sua técnica.</p>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {Object.values(ExerciseType).map((type) => (
                <ExerciseCard
                  key={type}
                  type={type}
                  selected={selectedExercise === type}
                  onClick={() => setSelectedExercise(type)}
                />
              ))}
            </div>

            <div className="flex justify-center mt-12">
              <button
                disabled={!selectedExercise}
                onClick={() => setStep(AppStep.UPLOAD_VIDEO)}
                className={`
                  flex items-center gap-2 px-8 py-4 rounded-full text-lg font-bold transition-all
                  ${selectedExercise 
                    ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/30 translate-y-0' 
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed'}
                `}
              >
                Continuar <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Upload Video */}
        {step === AppStep.UPLOAD_VIDEO && (
          <div className="w-full max-w-2xl animate-fade-in">
            <div className="bg-slate-800 rounded-3xl p-8 border border-slate-700 shadow-xl">
              <h2 className="text-2xl font-bold mb-6 text-center text-white">Carregar Vídeo de {selectedExercise}</h2>
              
              <div className="mb-8">
                <label 
                  htmlFor="video-upload" 
                  className={`
                    flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-2xl cursor-pointer transition-all
                    ${videoFile ? 'border-blue-500 bg-blue-500/10' : 'border-slate-600 bg-slate-700/50 hover:bg-slate-700 hover:border-slate-500'}
                  `}
                >
                  {videoPreview ? (
                    <video 
                      src={videoPreview} 
                      className="h-full w-full object-contain rounded-xl" 
                      controls={false} 
                      autoPlay 
                      muted 
                      loop 
                    />
                  ) : (
                    <div className="flex flex-col items-center pt-5 pb-6">
                      <UploadCloud className="w-12 h-12 mb-4 text-slate-400" />
                      <p className="mb-2 text-sm text-slate-300"><span className="font-semibold">Clique para carregar</span> ou arraste o vídeo</p>
                      <p className="text-xs text-slate-500">MP4, WebM (Max 20MB)</p>
                    </div>
                  )}
                  <input 
                    id="video-upload" 
                    type="file" 
                    accept="video/*" 
                    className="hidden" 
                    onChange={handleFileChange} 
                  />
                </label>
                {error && <p className="mt-4 text-red-400 text-center text-sm">{error}</p>}
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => setStep(AppStep.SELECT_EXERCISE)}
                  className="flex-1 px-6 py-3 rounded-xl font-semibold bg-slate-700 text-white hover:bg-slate-600 transition-colors"
                >
                  Voltar
                </button>
                <button
                  disabled={!videoFile}
                  onClick={handleAnalysis}
                  className={`
                    flex-1 px-6 py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2
                    ${videoFile
                      ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/30' 
                      : 'bg-slate-700 text-slate-500 cursor-not-allowed'}
                  `}
                >
                  Analisar Execução
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Analyzing */}
        {step === AppStep.ANALYZING && (
          <div className="text-center animate-fade-in">
            <div className="relative inline-flex items-center justify-center mb-8">
              <div className="absolute inset-0 bg-blue-500 rounded-full opacity-20 blur-xl animate-pulse"></div>
              <div className="relative bg-slate-800 rounded-full p-8 border border-slate-700">
                <Loader2 className="w-16 h-16 text-blue-500 animate-spin" />
              </div>
            </div>
            <h2 className="text-3xl font-bold text-white mb-2">Analisando movimentos...</h2>
            <p className="text-slate-400 max-w-md mx-auto">
              A IA do Gemini está processando seu vídeo, contando repetições e verificando sua biomecânica.
            </p>
          </div>
        )}

        {/* Step 4: Results */}
        {step === AppStep.RESULTS && analysisResult && selectedExercise && (
          <ResultView 
            result={analysisResult} 
            exercise={selectedExercise} 
            onReset={resetApp} 
          />
        )}

      </main>
    </div>
  );
};

export default App;