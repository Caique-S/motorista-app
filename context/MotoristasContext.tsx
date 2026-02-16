import React, { createContext, useState, useEffect, useContext, useCallback, useRef } from 'react';
import { Alert } from 'react-native';
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

  const fetchMotoristas = useCallback(async () => {
    if (!apiUrl) {
      setMotoristas([]);
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(`${apiUrl}/api/motoristas`);
      if (!response.ok) throw new Error('Erro ao buscar motoristas');
      const data = await response.json();
      // Converte _id para id
      const motoristasMapeados = data.map((item: any) => ({
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
    if (error) Alert.alert('Erro', error);
  }, [error]);

  // Evita recriação do intervalo a cada render
  const fetchRef = useRef(fetchMotoristas);
  useEffect(() => {
    fetchRef.current = fetchMotoristas;
  }, [fetchMotoristas]);

  useEffect(() => {
    if (!apiUrl) return;
    const interval = setInterval(() => fetchRef.current(), intervaloEnvio);
    return () => clearInterval(interval);
  }, [apiUrl, intervaloEnvio]);

  useEffect(() => {
    fetchMotoristas();
  }, [fetchMotoristas]);

  const adicionarMotorista = async (nome: string) => {
    if (!apiUrl) throw new Error('API não configurada');
    setLoading(true);
    try {
      const response = await fetch(`${apiUrl}/api/motoristas/chegada`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome }),
      });
      if (!response.ok) throw new Error('Erro ao registrar chegada');
      const novoMotorista = await response.json();
      // Converte _id para id
      const motoristaComId = { ...novoMotorista, id: novoMotorista._id };
      setMotoristas(prev => [...prev, motoristaComId].sort(
        (a, b) => new Date(a.timestampChegada).getTime() - new Date(b.timestampChegada).getTime()
      ));
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const iniciarDescarga = async (id: string) => {
    if (!apiUrl) throw new Error('API não configurada');
    setLoading(true);
    try {
      const response = await fetch(`${apiUrl}/api/motoristas/${id}/iniciar-descarga`, {
        method: 'PUT',
      });
      if (!response.ok) throw new Error('Erro ao iniciar descarga');
      const motoristaAtualizado = await response.json();
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
    if (!apiUrl) throw new Error('API não configurada');
    setLoading(true);
    try {
      const response = await fetch(`${apiUrl}/api/motoristas/${id}/finalizar-descarga`, {
        method: 'PUT',
      });
      if (!response.ok) throw new Error('Erro ao finalizar descarga');
      const motoristaAtualizado = await response.json();
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
        adicionarMotorista,
        iniciarDescarga,
        finalizarDescarga,
        refreshMotoristas: fetchMotoristas,
      }}>
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