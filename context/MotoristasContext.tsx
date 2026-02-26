import React, { createContext, useState, useEffect, useContext, useCallback, useRef } from 'react';
import { useConfig } from './ConfigContext';
import * as Ably from 'ably';
import { Audio } from 'expo-av';

export interface Motorista {
  id: string;
  nome: string;
  destino: string;
  status: 'aguardando' | 'descarregando' | 'descarregado';
  dataChegada: string;
  horaChegada: string;
  timestampChegada: string;
  tempoFila: number;
  tempoDescarga: number;
  timestampInicioDescarga?: string;
  timestampFimDescarga?: string;
  doca?: number;
  gaiolas?: number;
  palets?: number;
  mangas?: number;
  chave_identificacao: string;
}

interface MotoristasContextData {
  motoristas: Motorista[];
  loading: boolean;
  error: string | null;
  adicionarMotorista: (cpf: string, retorno: string) => Promise<Motorista>;
  iniciarDescarga: (id: string) => Promise<void>;
  finalizarDescarga: (id: string, gaiolas: number, palets: number, mangas: number) => Promise<void>;
  refreshMotoristas: () => Promise<void>;
  motoristaAtivo: Motorista | null;
  notificacaoDoca: { doca: number; tempoResposta: number } | null;
  limparNotificacao: () => void;
}

const MotoristasContext = createContext<MotoristasContextData | undefined>(undefined);

export const MotoristasProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { apiUrl, refreshListInterval, showToast } = useConfig();
  const [motoristas, setMotoristas] = useState<Motorista[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [motoristaAtivo, setMotoristaAtivo] = useState<Motorista | null>(null);
  const [notificacaoDoca, setNotificacaoDoca] = useState<{ doca: number; tempoResposta: number } | null>(null);
  const ablyRef = useRef<Ably.Realtime | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);

  // Funções de áudio
  const pararAlarme = useCallback(async () => {
    if (soundRef.current) {
      try {
        await soundRef.current.stopAsync();
        await soundRef.current.unloadAsync();
        soundRef.current = null;
      } catch (err) {
        console.error('Erro ao parar som:', err);
      }
    }
  }, []);

  const tocarAlarme = useCallback(async () => {
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        staysActiveInBackground: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });

      const { sound } = await Audio.Sound.createAsync(
        require('../assets/sounds/alarme-doca.mp3'),
        { shouldPlay: true, isLooping: true }
      );
      soundRef.current = sound;
      await sound.playAsync();
    } catch (err) {
      showToast('Erro ao tocar alarme', 'error');
    }
  }, [showToast]);

  // Configurar Ably quando motorista ativo
  useEffect(() => {
    if (!apiUrl || !motoristaAtivo) return;

    const setupAbly = async () => {
      try {
        const tokenRes = await fetch(`${apiUrl}/api/melicages/ably-auth`);
        if (!tokenRes.ok) throw new Error('Falha ao obter token');
        const tokenRequest = await tokenRes.json();

        const ably = new Ably.Realtime({ authCallback: (_, cb) => cb(null, tokenRequest) });
        ablyRef.current = ably;

        ably.connection.on('connected', () => console.log('✅ Ably conectado'));
        ably.connection.on('failed', (err) => {
          console.error('❌ Ably connection failed:', err);
          showToast('Erro na conexão de notificações', 'error');
        });

        const channel = ably.channels.get(`motorista:${motoristaAtivo.id}`);
        await channel.subscribe('notificacao-doca', (message) => {
          const data = message.data;
          console.log('📩 Notificação recebida via Ably:', data);
          setNotificacaoDoca({ doca: data.doca, tempoResposta: data.tempoResposta });
          tocarAlarme();
        });

        await channel.subscribe('status-update', (msg) => {
          if (msg.data.status === 'descarregando') {
            pararAlarme();
            setNotificacaoDoca(null);
          }
        });

        console.log('📡 Ably configurado com sucesso');
      } catch (err) {
        console.error('Erro ao configurar Ably:', err);
        showToast('Erro ao conectar ao serviço de notificações', 'error');
      }
    };

    setupAbly();

    return () => {
      if (ablyRef.current) {
        ablyRef.current.close();
        ablyRef.current = null;
      }
      pararAlarme();
    };
  }, [apiUrl, motoristaAtivo, showToast, tocarAlarme, pararAlarme]);

  // Parar alarme quando status mudar para descarregando
  useEffect(() => {
    if (motoristaAtivo?.status === 'descarregando') {
      pararAlarme();
      setNotificacaoDoca(null);
    }
  }, [motoristaAtivo?.status, pararAlarme]);

  const limparNotificacao = useCallback(() => {
    setNotificacaoDoca(null);
    pararAlarme();
  }, [pararAlarme]);

  const fetchMotoristas = useCallback(async () => {
    if (!apiUrl) return;
    setLoading(true);
    try {
      const response = await fetch(`${apiUrl}/api/melicages/motoristas`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const json = await response.json();
      if (!json.success) throw new Error(json.erro || 'Erro desconhecido');
      setMotoristas(json.data);
      if (motoristaAtivo) {
        const atualizado = json.data.find((m: Motorista) => m.id === motoristaAtivo.id);
        if (atualizado) setMotoristaAtivo(atualizado);
      }
      setError(null);
    } catch (err: any) {
      setError(err.message);
      showToast('Erro ao atualizar lista', 'error');
    } finally {
      setLoading(false);
    }
  }, [apiUrl, motoristaAtivo, showToast]);

  // Polling de fallback
  useEffect(() => {
    if (!apiUrl) return;
    fetchMotoristas();
    const interval = setInterval(fetchMotoristas, refreshListInterval);
    return () => clearInterval(interval);
  }, [apiUrl, refreshListInterval, fetchMotoristas]);

  const adicionarMotorista = useCallback(async (cpf: string, retorno: string): Promise<Motorista> => {
    if (!apiUrl) throw new Error('API não configurada');
    setLoading(true);
    try {
      const response = await fetch(`${apiUrl}/api/melicages/motoristas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cpf, retorno }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.erro || 'Erro ao registrar chegada');
      }
      const json = await response.json();
      if (!json.success) throw new Error(json.erro || 'Erro desconhecido');

      const novoMotorista = json.data;
      setMotoristas(prev => [...prev, novoMotorista].sort(
        (a, b) => new Date(a.timestampChegada).getTime() - new Date(b.timestampChegada).getTime()
      ));
      setMotoristaAtivo(novoMotorista);
      showToast('Chegada registrada!', 'success');
      return novoMotorista;
    } catch (err: any) {
      showToast(err.message, 'error');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [apiUrl, showToast]);

  const iniciarDescarga = useCallback(async (id: string) => {
    if (!apiUrl) throw new Error('API não configurada');
    try {
      const response = await fetch(`${apiUrl}/api/melicages/motoristas/${id}/iniciar-descarga`, {
        method: 'PUT',
      });
      const json = await response.json();
      if (!response.ok || !json.success) throw new Error(json.erro || 'Erro ao iniciar descarga');
      setMotoristas(prev => prev.map(m => (m.id === id ? json.data : m)));
      if (motoristaAtivo?.id === id) setMotoristaAtivo(json.data);
      showToast('Descarga iniciada', 'success');
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  }, [apiUrl, motoristaAtivo, showToast]);

  const finalizarDescarga = useCallback(async (id: string, gaiolas: number, palets: number, mangas: number) => {
    if (!apiUrl) throw new Error('API não configurada');
    try {
      const response = await fetch(`${apiUrl}/api/melicages/motoristas/${id}/finalizar-descarga`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gaiolas, palets, mangas }),
      });
      const json = await response.json();
      if (!response.ok || !json.success) throw new Error(json.erro || 'Erro ao finalizar descarga');
      setMotoristas(prev => prev.map(m => (m.id === id ? json.data : m)));
      if (motoristaAtivo?.id === id) setMotoristaAtivo(json.data);
      showToast('Descarga finalizada', 'success');
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  }, [apiUrl, motoristaAtivo, showToast]);

  const value = {
    motoristas,
    loading,
    error,
    adicionarMotorista,
    iniciarDescarga,
    finalizarDescarga,
    refreshMotoristas: fetchMotoristas,
    motoristaAtivo,
    notificacaoDoca,
    limparNotificacao,
  };

  return <MotoristasContext.Provider value={value}>{children}</MotoristasContext.Provider>;
};

export const useMotoristas = () => {
  const context = useContext(MotoristasContext);
  if (!context) throw new Error('useMotoristas deve ser usado dentro de MotoristasProvider');
  return context;
};