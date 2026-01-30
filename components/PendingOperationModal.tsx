import React from 'react';
import { AlertTriangle, RefreshCw, X, Clock, Wifi, WifiOff } from 'lucide-react';
import { PersistentOperationState, OperationType, ErrorType } from '../hooks/useAsyncOperation';

interface PendingOperationModalProps {
  isOpen: boolean;
  operation: PersistentOperationState | null;
  onRetry: () => void;
  onDismiss: () => void;
  isRetrying?: boolean;
}

const getOperationLabel = (type: OperationType): string => {
  switch (type) {
    case 'WORKOUT':
      return 'Treino';
    case 'DIET':
      return 'Dieta';
    case 'ANALYSIS':
      return 'Análise';
    default:
      return 'Operação';
  }
};

const getErrorIcon = (errorType?: ErrorType) => {
  switch (errorType) {
    case 'NETWORK_ERROR':
      return <WifiOff className="w-8 h-8 text-red-400" />;
    case 'TIMEOUT':
      return <Clock className="w-8 h-8 text-yellow-400" />;
    default:
      return <AlertTriangle className="w-8 h-8 text-yellow-400" />;
  }
};

const getErrorMessage = (operation: PersistentOperationState): string => {
  if (operation.error) {
    return operation.error.message;
  }

  if (operation.status === 'interrupted') {
    const elapsed = Date.now() - operation.startedAt;
    const minutes = Math.floor(elapsed / 60000);

    if (minutes > 5) {
      return `A geração foi iniciada há ${minutes} minutos e pode ter sido interrompida. Deseja tentar novamente?`;
    }

    return 'O app foi fechado durante a geração. Deseja tentar novamente com os mesmos dados?';
  }

  if (operation.status === 'running') {
    return 'Uma operação estava em andamento quando o app foi fechado. Deseja tentar novamente?';
  }

  return 'Houve um problema com a operação anterior. Deseja tentar novamente?';
};

const getTimeElapsed = (startedAt: number): string => {
  const elapsed = Date.now() - startedAt;
  const minutes = Math.floor(elapsed / 60000);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `há ${hours}h ${minutes % 60}min`;
  }
  if (minutes > 0) {
    return `há ${minutes} min`;
  }
  return 'agora mesmo';
};

export const PendingOperationModal: React.FC<PendingOperationModalProps> = ({
  isOpen,
  operation,
  onRetry,
  onDismiss,
  isRetrying = false,
}) => {
  if (!isOpen || !operation) return null;

  const operationLabel = getOperationLabel(operation.type);
  const errorIcon = getErrorIcon(operation.error?.type);
  const errorMessage = getErrorMessage(operation);
  const timeElapsed = getTimeElapsed(operation.startedAt);

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl p-8 w-full max-w-md relative shadow-2xl">
        {/* Close Button */}
        <button
          onClick={onDismiss}
          disabled={isRetrying}
          className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors disabled:opacity-50"
        >
          <X className="w-6 h-6" />
        </button>

        {/* Icon */}
        <div className="flex flex-col items-center mb-6">
          <div className="p-4 bg-yellow-500/20 rounded-full mb-4">
            {errorIcon}
          </div>

          <h3 className="text-xl font-bold text-white text-center">
            {operation.status === 'failed' ? 'Erro na Geração' : 'Operação Pendente'}
          </h3>

          <p className="text-slate-400 text-sm mt-1">
            {operationLabel} iniciado {timeElapsed}
          </p>
        </div>

        {/* Message */}
        <div className="bg-slate-800/50 rounded-xl p-4 mb-6">
          <p className="text-slate-300 text-sm text-center leading-relaxed">
            {errorMessage}
          </p>

          {/* Show form data summary if available */}
          {operation.formData && (
            <div className="mt-3 pt-3 border-t border-slate-700">
              <p className="text-xs text-slate-500 uppercase font-bold mb-2">Dados Salvos:</p>
              <div className="flex flex-wrap gap-2">
                {operation.formData.goal && (
                  <span className="text-xs bg-slate-700 px-2 py-1 rounded-full text-slate-300">
                    Objetivo: {operation.formData.goal}
                  </span>
                )}
                {operation.formData.weight && (
                  <span className="text-xs bg-slate-700 px-2 py-1 rounded-full text-slate-300">
                    {operation.formData.weight}kg
                  </span>
                )}
                {operation.formData.height && (
                  <span className="text-xs bg-slate-700 px-2 py-1 rounded-full text-slate-300">
                    {operation.formData.height}cm
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onDismiss}
            disabled={isRetrying}
            className="flex-1 py-3 px-4 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-xl transition-all disabled:opacity-50"
          >
            Descartar
          </button>
          <button
            onClick={onRetry}
            disabled={isRetrying}
            className="flex-1 py-3 px-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isRetrying ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin" />
                Gerando...
              </>
            ) : (
              <>
                <RefreshCw className="w-5 h-5" />
                Tentar Novamente
              </>
            )}
          </button>
        </div>

        {/* Network status hint */}
        {operation.error?.type === 'NETWORK_ERROR' && (
          <div className="mt-4 flex items-center justify-center gap-2 text-xs text-slate-500">
            <Wifi className="w-4 h-4" />
            <span>Verifique sua conexão antes de tentar novamente</span>
          </div>
        )}
      </div>
    </div>
  );
};
