import React, { createContext, useState, useEffect, useContext, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface ConfigData {
  apiUrl: string;
  intervaloEnvio: number;
  refreshListInterval: number;
  geofenceLatitude: number;
  geofenceLongitude: number;
  geofenceRaio: number;
  monitoramento: boolean;
  trackingList: string[];
}

interface Destino {
  codigo: string;
  cidade: string;
  latitude?: number;
  longitude?: number;
  raio?: number;
}

interface ConfigContextData extends ConfigData {
  carregado: boolean;
  error: string | null;
  toastVisible: boolean;
  toastMessage: string;
  toastType: 'success' | 'error' | 'info';
  destinos: Destino[];
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  hideToast: () => void;
  salvarConfiguracoes: (novaConfig: Partial<ConfigData>) => Promise<boolean>;
  fetchConfiguracoes: () => Promise<void>;
  syncConfig: () => Promise<boolean>;
  setChaveMotorista: (chave: string | null) => void;
}

const ConfigContext = createContext<ConfigContextData | undefined>(undefined);

const STORAGE_KEY_API_URL = '@apiUrl';
const STORAGE_KEY_DESTINOS = '@destinos';

export const ConfigProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [apiUrl, setApiUrl] = useState('');
  const [intervaloEnvio, setIntervaloEnvio] = useState(60000);
  const [refreshListInterval, setRefreshListInterval] = useState(60000);
  const [geofenceLatitude, setGeofenceLatitude] = useState(-12.224350);
  const [geofenceLongitude, setGeofenceLongitude] = useState(-38.962962);
  const [geofenceRaio, setGeofenceRaio] = useState(300);
  const [monitoramento, setMonitoramento] = useState(true);
  const [trackingList, setTrackingList] = useState<string[]>([]);
  const [destinos, setDestinos] = useState<Destino[]>([]);
  const [carregado, setCarregado] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('info');
  const [chaveMotorista, setChaveMotorista] = useState<string | null>(null);

  // Controla duplicatas de toast
  const toastTimeoutRef = useRef<number | null>(null);

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    // Limpa timeout anterior para evitar sobreposição
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToastMessage(message);
    setToastType(type);
    setToastVisible(true);
    // Auto-hide após 3 segundos
    toastTimeoutRef.current = setTimeout(() => setToastVisible(false), 3000);
  }, []);

  const hideToast = useCallback(() => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToastVisible(false);
  }, []);

  // Carregar URL e destinos do AsyncStorage ao iniciar
  useEffect(() => {
    const carregarStorage = async () => {
      try {
        const [urlSalva, destinosSalvos] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEY_API_URL),
          AsyncStorage.getItem(STORAGE_KEY_DESTINOS)
        ]);
        if (urlSalva) setApiUrl(urlSalva);
        if (destinosSalvos) setDestinos(JSON.parse(destinosSalvos));
      } catch (err) {
        setError('Falha ao carregar dados: ' + (err as Error).message);
        showToast('Falha ao carregar dados', 'error');
      } finally {
        setCarregado(true);
      }
    };
    carregarStorage();
  }, [showToast]);

  const fetchConfiguracoes = useCallback(async () => {
    if (!apiUrl) return;
    try {
      const [localRes, motoristaRes] = await Promise.all([
        fetch(`${apiUrl}/api/melicages/config/localizacoes`),
        fetch(`${apiUrl}/api/melicages/config/motoristas`),
      ]);

      if (localRes.ok) {
        const localData = await localRes.json();
        if (localData.success) {
          setGeofenceLatitude(localData.data.coo_lat);
          setGeofenceLongitude(localData.data.coo_lon);
          setGeofenceRaio(localData.data.raio);
        }
      } else {
        showToast('Erro ao carregar localização', 'error');
      }

      if (motoristaRes.ok) {
        const motoristaData = await motoristaRes.json();
        if (motoristaData.success) {
          setIntervaloEnvio(motoristaData.data.refresh_route * 1000);
          setRefreshListInterval(motoristaData.data.refresh_list * 1000);
          setMonitoramento(motoristaData.data.monitoramento);
          setTrackingList(motoristaData.data.tracking_list || []);
        }
      } else {
        showToast('Erro ao carregar motoristas', 'error');
      }
    } catch (err) {
      showToast('Erro de conexão ao buscar configurações', 'error');
    }
  }, [apiUrl, showToast]);

  useEffect(() => {
    if (apiUrl) {
      fetchConfiguracoes();
    }
  }, [apiUrl, fetchConfiguracoes]);

  const syncConfig = useCallback(async (): Promise<boolean> => {
    if (!apiUrl) {
      showToast('URL da API não configurada', 'error');
      return false;
    }
    try {
      const response = await fetch(`${apiUrl}/api/melicages/config`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const json = await response.json();
      if (!json.success) throw new Error(json.erro || 'Erro na resposta');

      const data = json.data;
      if (data.destinos) {
        setDestinos(data.destinos);
        await AsyncStorage.setItem(STORAGE_KEY_DESTINOS, JSON.stringify(data.destinos));
      }
      if (data.geofence) {
        setGeofenceLatitude(data.geofence.latitude);
        setGeofenceLongitude(data.geofence.longitude);
        setGeofenceRaio(data.geofence.raio);
      }
      if (data.intervaloEnvio) setIntervaloEnvio(data.intervaloEnvio * 1000);
      if (data.refreshListInterval) setRefreshListInterval(data.refreshListInterval * 1000);
      if (data.monitoramento !== undefined) setMonitoramento(data.monitoramento);
      if (data.trackingList) setTrackingList(data.trackingList);
      if (data.tempoRespostaAlarme) {
        await AsyncStorage.setItem('@tempoRespostaAlarme', String(data.tempoRespostaAlarme));
      }
      showToast('Configurações sincronizadas', 'success');
      return true;
    } catch (err) {
      showToast('Falha ao sincronizar configurações', 'error');
      return false;
    }
  }, [apiUrl, showToast]);

  const salvarConfiguracoes = useCallback(async (novaConfig: Partial<ConfigData>) => {
    try {
      if (novaConfig.apiUrl !== undefined) {
        await AsyncStorage.setItem(STORAGE_KEY_API_URL, novaConfig.apiUrl);
        setApiUrl(novaConfig.apiUrl);
      }
      return true;
    } catch (err) {
      showToast('Erro ao salvar URL', 'error');
      return false;
    }
  }, [showToast]);

  const value = {
    apiUrl,
    intervaloEnvio,
    refreshListInterval,
    geofenceLatitude,
    geofenceLongitude,
    geofenceRaio,
    monitoramento,
    trackingList,
    destinos,
    carregado,
    error,
    toastVisible,
    toastMessage,
    toastType,
    showToast,
    hideToast,
    salvarConfiguracoes,
    fetchConfiguracoes,
    syncConfig,
    setChaveMotorista,
  };

  return <ConfigContext.Provider value={value}>{children}</ConfigContext.Provider>;
};

export const useConfig = () => {
  const context = useContext(ConfigContext);
  if (!context) throw new Error('useConfig deve ser usado dentro de ConfigProvider');
  return context;
};