import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import { useConfig } from './ConfigContext';

export interface Motorista {
  id: string;
  nome: string;
  status: 'aguardando' | 'descarregando' | 'descarregado';
  dataChegada: string;
  horaChegada: string;
  timestampChegada: string;
  tempoFila: number;
  tempoDescarga: number;
  timestampInicioDescarga?: string;
  timestampFimDescarga?: string;
}

interface MotoristasContextData {
  motoristas: Motorista[];
  loading: boolean;
  error: string | null;
  clearError: () => void;
  adicionarMotorista: (nome: string) => Promise<void>;
  iniciarDescarga: (id: string) => Promise<void>;
  finalizarDescarga: (id: string) => Promise<void>;
  refreshMotoristas: () => Promise<void>;
}

const MotoristasContext = createContext<MotoristasContextData | undefined>(undefined);

export const MotoristasProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { apiUrl, intervaloEnvio } = useConfig();
  const [motoristas, setMotoristas] = useState<Motorista[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = () => setError(null);

  const fetchMotoristas = useCallback(async () => {
    if (!apiUrl) {
      setMotoristas([]);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${apiUrl}/api/melicages/motoristas`);
      if (!response.ok) throw new Error(`Erro HTTP ${response.status}`);
      const json = await response.json();
      if (!json.success) throw new Error(json.erro || 'Erro desconhecido');
      const motoristasMapeados = json.data.map((item: any) => ({
        ...item,
        id: item._id,
      }));
      setMotoristas(motoristasMapeados);
      setError(null);
    } catch (err: any) {
      setError(err.message);
      console.error('Erro no fetchMotoristas:', err);
    } finally {
      setLoading(false);
    }
  }, [apiUrl]);

  useEffect(() => {
    fetchMotoristas();
  }, [fetchMotoristas]);

  useEffect(() => {
    if (!apiUrl) return;
    const intervalId = setInterval(() => {
      fetchMotoristas();
    }, intervaloEnvio);
    return () => clearInterval(intervalId);
  }, [apiUrl, intervaloEnvio, fetchMotoristas]);

  const adicionarMotorista = async (nome: string) => {
    if (!apiUrl) {
      setError('API não configurada');
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(`${apiUrl}/api/melicages/motoristas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome }),
      });
      if (!response.ok) throw new Error('Erro ao registrar chegada');
      const json = await response.json();
      if (!json.success) throw new Error(json.erro || 'Erro desconhecido');
      const novoMotorista = json.data;
      const motoristaComId = { ...novoMotorista, id: novoMotorista._id };
      setMotoristas(prev => [...prev, motoristaComId].sort(
        (a, b) => new Date(a.timestampChegada).getTime() - new Date(b.timestampChegada).getTime()
      ));
      setError(null);
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const iniciarDescarga = async (id: string) => {
    if (!apiUrl) {
      setError('API não configurada');
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(`${apiUrl}/api/melicages/motoristas/${id}/iniciar-descarga`, {
        method: 'PUT',
      });
      if (!response.ok) throw new Error('Erro ao iniciar descarga');
      const json = await response.json();
      if (!json.success) throw new Error(json.erro || 'Erro desconhecido');
      const motoristaAtualizado = json.data;
      const motoristaComId = { ...motoristaAtualizado, id: motoristaAtualizado._id };
      setMotoristas(prev => prev.map(m => m.id === id ? motoristaComId : m));
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const finalizarDescarga = async (id: string) => {
    if (!apiUrl) {
      setError('API não configurada');
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(`${apiUrl}/api/melicages/motoristas/${id}/finalizar-descarga`, {
        method: 'PUT',
      });
      if (!response.ok) throw new Error('Erro ao finalizar descarga');
      const json = await response.json();
      if (!json.success) throw new Error(json.erro || 'Erro desconhecido');
      const motoristaAtualizado = json.data;
      const motoristaComId = { ...motoristaAtualizado, id: motoristaAtualizado._id };
      setMotoristas(prev => prev.map(m => m.id === id ? motoristaComId : m));
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return (
    <MotoristasContext.Provider
      value={{
        motoristas,
        loading,
        error,
        clearError,
        adicionarMotorista,
        iniciarDescarga,
        finalizarDescarga,
        refreshMotoristas: fetchMotoristas,
      }}
    >
      {children}
    </MotoristasContext.Provider>
  );
};

export const useMotoristas = () => {
  const context = useContext(MotoristasContext);
  if (context === undefined) {
    throw new Error('useMotoristas deve ser usado dentro de um MotoristasProvider');
  }
  return context;
};