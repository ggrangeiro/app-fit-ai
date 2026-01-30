import { useState, useEffect, useCallback, useRef } from 'react';
import { App as CapApp } from '@capacitor/app';
import { secureStorage } from '../utils/secureStorage';

// Tipos de operação suportadas
export type OperationType = 'WORKOUT' | 'DIET' | 'ANALYSIS';

// Status da operação
export type OperationStatus = 'idle' | 'pending' | 'running' | 'completed' | 'failed' | 'interrupted';

// Tipos de erro específicos
export type ErrorType =
  | 'NETWORK_ERROR'
  | 'TIMEOUT'
  | 'API_ERROR'
  | 'CREDIT_ERROR'
  | 'UNKNOWN';

// Estado persistido
export interface PersistentOperationState {
  id: string;
  type: OperationType;
  status: OperationStatus;
  startedAt: number;
  formData?: any;
  userId?: string | number;
  result?: any;
  error?: {
    type: ErrorType;
    message: string;
  };
}

// Storage key para operações pendentes
const PENDING_OPERATIONS_KEY = 'fitai_pending_operations';

// Timeout padrão (2 minutos)
const DEFAULT_TIMEOUT = 120000;

/**
 * Hook para gerenciar operações assíncronas com:
 * - Persistência de estado
 * - Detecção de ciclo de vida do app (pause/resume)
 * - Timeout com AbortController
 * - Recuperação de operações interrompidas
 */
export function useAsyncOperation<TResult = any, TFormData = any>(
  operationType: OperationType,
  options?: {
    timeout?: number;
    onInterrupt?: () => void;
    onResume?: (state: PersistentOperationState) => void;
  }
) {
  const [status, setStatus] = useState<OperationStatus>('idle');
  const [error, setError] = useState<{ type: ErrorType; message: string } | null>(null);
  const [result, setResult] = useState<TResult | null>(null);
  const [pendingOperation, setPendingOperation] = useState<PersistentOperationState | null>(null);
  const [isAppInBackground, setIsAppInBackground] = useState(false);

  const abortControllerRef = useRef<AbortController | null>(null);
  const operationIdRef = useRef<string | null>(null);
  const timeoutIdRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Gera ID único para operação
  const generateOperationId = () => `${operationType}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Salva estado da operação no storage
  const persistState = useCallback((state: PersistentOperationState) => {
    try {
      const operations = secureStorage.getItem<PersistentOperationState[]>(PENDING_OPERATIONS_KEY) || [];
      const existingIndex = operations.findIndex(op => op.id === state.id);

      if (existingIndex >= 0) {
        operations[existingIndex] = state;
      } else {
        operations.push(state);
      }

      secureStorage.setItem(PENDING_OPERATIONS_KEY, operations);
    } catch (e) {
      console.error('Erro ao persistir estado da operação:', e);
    }
  }, []);

  // Remove operação do storage
  const clearPersistedState = useCallback((operationId: string) => {
    try {
      const operations = secureStorage.getItem<PersistentOperationState[]>(PENDING_OPERATIONS_KEY) || [];
      const filtered = operations.filter(op => op.id !== operationId);
      secureStorage.setItem(PENDING_OPERATIONS_KEY, filtered);
    } catch (e) {
      console.error('Erro ao limpar estado persistido:', e);
    }
  }, []);

  // Verifica operações pendentes ao montar
  useEffect(() => {
    const checkPendingOperations = () => {
      try {
        const operations = secureStorage.getItem<PersistentOperationState[]>(PENDING_OPERATIONS_KEY) || [];
        const pending = operations.find(
          op => op.type === operationType && (op.status === 'running' || op.status === 'pending')
        );

        if (pending) {
          // Verifica se a operação expirou (mais de 5 minutos)
          const elapsed = Date.now() - pending.startedAt;
          if (elapsed > 5 * 60 * 1000) {
            // Marca como interrompida
            pending.status = 'interrupted';
            persistState(pending);
          }
          setPendingOperation(pending);
        }
      } catch (e) {
        console.error('Erro ao verificar operações pendentes:', e);
      }
    };

    checkPendingOperations();
  }, [operationType, persistState]);

  // Configura listeners de ciclo de vida do app
  useEffect(() => {
    let pauseListener: any;
    let resumeListener: any;

    const setupListeners = async () => {
      try {
        // Listener para quando o app vai para background
        pauseListener = await CapApp.addListener('pause', () => {
          setIsAppInBackground(true);

          if (status === 'running' && operationIdRef.current) {
            // Marca operação como possivelmente interrompida
            const state: PersistentOperationState = {
              id: operationIdRef.current,
              type: operationType,
              status: 'running',
              startedAt: Date.now(),
            };
            persistState(state);
            options?.onInterrupt?.();
          }
        });

        // Listener para quando o app volta ao foreground
        resumeListener = await CapApp.addListener('resume', () => {
          setIsAppInBackground(false);

          // Verifica se há operação pendente para recuperar
          const operations = secureStorage.getItem<PersistentOperationState[]>(PENDING_OPERATIONS_KEY) || [];
          const pending = operations.find(
            op => op.type === operationType && op.status === 'running'
          );

          if (pending) {
            setPendingOperation(pending);
            options?.onResume?.(pending);
          }
        });
      } catch (e) {
        // Capacitor não disponível (web browser)
        console.log('App lifecycle listeners não disponíveis (ambiente web)');
      }
    };

    setupListeners();

    return () => {
      pauseListener?.remove?.();
      resumeListener?.remove?.();
    };
  }, [operationType, status, persistState, options]);

  // Executa operação com timeout e persistência
  const execute = useCallback(async <T>(
    asyncFn: (signal: AbortSignal) => Promise<T>,
    formData?: TFormData,
    userId?: string | number
  ): Promise<{ success: boolean; data?: T; error?: { type: ErrorType; message: string } }> => {
    // Cancela operação anterior se existir
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Cria novo AbortController
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    // Gera ID para esta operação
    const operationId = generateOperationId();
    operationIdRef.current = operationId;

    // Persiste estado inicial
    const initialState: PersistentOperationState = {
      id: operationId,
      type: operationType,
      status: 'running',
      startedAt: Date.now(),
      formData,
      userId,
    };
    persistState(initialState);

    setStatus('running');
    setError(null);
    setResult(null);

    // Configura timeout
    const timeout = options?.timeout || DEFAULT_TIMEOUT;

    return new Promise((resolve) => {
      // Setup timeout
      timeoutIdRef.current = setTimeout(() => {
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
        }

        const timeoutError = { type: 'TIMEOUT' as ErrorType, message: 'A operação demorou muito. Tente novamente.' };
        setError(timeoutError);
        setStatus('failed');

        // Atualiza estado persistido
        persistState({ ...initialState, status: 'failed', error: timeoutError });

        resolve({ success: false, error: timeoutError });
      }, timeout);

      // Executa função assíncrona
      asyncFn(signal)
        .then((data) => {
          // Limpa timeout
          if (timeoutIdRef.current) {
            clearTimeout(timeoutIdRef.current);
            timeoutIdRef.current = null;
          }

          setResult(data as unknown as TResult);
          setStatus('completed');

          // Remove do storage (operação concluída com sucesso)
          clearPersistedState(operationId);

          resolve({ success: true, data });
        })
        .catch((err) => {
          // Limpa timeout
          if (timeoutIdRef.current) {
            clearTimeout(timeoutIdRef.current);
            timeoutIdRef.current = null;
          }

          // Ignora erros de abort (timeout já tratado ou cancelamento manual)
          if (err.name === 'AbortError') {
            return;
          }

          // Classifica o tipo de erro
          let errorType: ErrorType = 'UNKNOWN';
          let errorMessage = err.message || 'Erro desconhecido';

          if (err.message?.includes('network') || err.message?.includes('fetch') || err.message?.includes('Network')) {
            errorType = 'NETWORK_ERROR';
            errorMessage = 'Erro de conexão. Verifique sua internet e tente novamente.';
          } else if (err.message?.includes('API key') || err.message?.includes('401') || err.message?.includes('403')) {
            errorType = 'API_ERROR';
            errorMessage = 'Erro de autenticação com o serviço. Tente novamente.';
          } else if (err.message?.includes('402') || err.message?.includes('CREDIT')) {
            errorType = 'CREDIT_ERROR';
            errorMessage = 'Créditos insuficientes para esta operação.';
          }

          const errorObj = { type: errorType, message: errorMessage };
          setError(errorObj);
          setStatus('failed');

          // Atualiza estado persistido
          persistState({ ...initialState, status: 'failed', error: errorObj });

          resolve({ success: false, error: errorObj });
        });
    });
  }, [operationType, options, persistState, clearPersistedState]);

  // Cancela operação em andamento
  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    if (timeoutIdRef.current) {
      clearTimeout(timeoutIdRef.current);
      timeoutIdRef.current = null;
    }
    if (operationIdRef.current) {
      clearPersistedState(operationIdRef.current);
    }
    setStatus('idle');
    setError(null);
  }, [clearPersistedState]);

  // Descarta operação pendente
  const dismissPendingOperation = useCallback(() => {
    if (pendingOperation) {
      clearPersistedState(pendingOperation.id);
      setPendingOperation(null);
    }
  }, [pendingOperation, clearPersistedState]);

  // Recupera operação pendente (para retry)
  const getPendingFormData = useCallback((): TFormData | null => {
    return pendingOperation?.formData || null;
  }, [pendingOperation]);

  // Reset estado
  const reset = useCallback(() => {
    setStatus('idle');
    setError(null);
    setResult(null);
  }, []);

  return {
    // Estado
    status,
    error,
    result,
    isLoading: status === 'running',
    isAppInBackground,

    // Operação pendente (para modal de recuperação)
    pendingOperation,
    hasPendingOperation: !!pendingOperation,

    // Ações
    execute,
    cancel,
    reset,
    dismissPendingOperation,
    getPendingFormData,
  };
}

/**
 * Wrapper para funções assíncronas com suporte a AbortSignal
 */
export function withAbortSignal<T extends any[], R>(
  fn: (...args: T) => Promise<R>
): (signal: AbortSignal, ...args: T) => Promise<R> {
  return async (signal: AbortSignal, ...args: T): Promise<R> => {
    // Verifica se já foi abortado
    if (signal.aborted) {
      throw new DOMException('Operação cancelada', 'AbortError');
    }

    // Cria promise que será rejeitada se o signal for abortado
    const abortPromise = new Promise<never>((_, reject) => {
      signal.addEventListener('abort', () => {
        reject(new DOMException('Operação cancelada', 'AbortError'));
      });
    });

    // Race entre a função original e o abort
    return Promise.race([fn(...args), abortPromise]);
  };
}
