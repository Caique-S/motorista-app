import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface ConfigData {
  apiUrl: string;
  intervaloEnvio: number;
  geofenceLatitude: number;
  geofenceLongitude: number;
  geofenceRaio: number;
}

interface ConfigContextData extends ConfigData {
  carregado: boolean;
  error: string | null;
  clearError: () => void;
  salvarConfiguracoes: (novaConfig: Partial<ConfigData>) => Promise<boolean>;
}

const ConfigContext = createContext<ConfigContextData | undefined>(undefined);

const STORAGE_KEYS = {
  API_URL: '@apiUrl',
  INTERVALO: '@intervaloEnvio',
  GEOFENCE_LAT: '@geofenceLat',
  GEOFENCE_LON: '@geofenceLon',
  GEOFENCE_RAIO: '@geofenceRaio',
};

export const ConfigProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [apiUrl, setApiUrl] = useState('');
  const [intervaloEnvio, setIntervaloEnvio] = useState(300000);
  const [geofenceLatitude, setGeofenceLatitude] = useState(-12.2243674);
  const [geofenceLongitude, setGeofenceLongitude] = useState(-38.9630476);
  const [geofenceRaio, setGeofenceRaio] = useState(500);
  const [carregado, setCarregado] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = () => setError(null);

  useEffect(() => {
    const carregarConfiguracoesLocais = async () => {
      try {
        const urlSalva = await AsyncStorage.getItem(STORAGE_KEYS.API_URL);
        if (urlSalva) setApiUrl(urlSalva);

        const intervaloSaved = await AsyncStorage.getItem(STORAGE_KEYS.INTERVALO);
        if (intervaloSaved) setIntervaloEnvio(parseInt(intervaloSaved, 10));

        const latSalva = await AsyncStorage.getItem(STORAGE_KEYS.GEOFENCE_LAT);
        const lonSalva = await AsyncStorage.getItem(STORAGE_KEYS.GEOFENCE_LON);
        const raioSalvo = await AsyncStorage.getItem(STORAGE_KEYS.GEOFENCE_RAIO);
        if (latSalva) setGeofenceLatitude(parseFloat(latSalva));
        if (lonSalva) setGeofenceLongitude(parseFloat(lonSalva));
        if (raioSalvo) setGeofenceRaio(parseFloat(raioSalvo));

        console.log('✅ Configurações locais carregadas');
      } catch (err) {
        setError('Falha ao carregar configurações locais: ' + (err as Error).message);
      } finally {
        setCarregado(true);
      }
    };

    carregarConfiguracoesLocais();
  }, []);

  const salvarConfiguracoes = async (novaConfig: Partial<ConfigData>) => {
    try {
      if (novaConfig.apiUrl !== undefined) {
        await AsyncStorage.setItem(STORAGE_KEYS.API_URL, novaConfig.apiUrl);
        setApiUrl(novaConfig.apiUrl);
      }
      if (novaConfig.intervaloEnvio !== undefined) {
        await AsyncStorage.setItem(STORAGE_KEYS.INTERVALO, novaConfig.intervaloEnvio.toString());
        setIntervaloEnvio(novaConfig.intervaloEnvio);
      }
      if (novaConfig.geofenceLatitude !== undefined) {
        setGeofenceLatitude(novaConfig.geofenceLatitude);
        await AsyncStorage.setItem(STORAGE_KEYS.GEOFENCE_LAT, novaConfig.geofenceLatitude.toString());
      }
      if (novaConfig.geofenceLongitude !== undefined) {
        setGeofenceLongitude(novaConfig.geofenceLongitude);
        await AsyncStorage.setItem(STORAGE_KEYS.GEOFENCE_LON, novaConfig.geofenceLongitude.toString());
      }
      if (novaConfig.geofenceRaio !== undefined) {
        setGeofenceRaio(novaConfig.geofenceRaio);
        await AsyncStorage.setItem(STORAGE_KEYS.GEOFENCE_RAIO, novaConfig.geofenceRaio.toString());
      }
      return true;
    } catch (err) {
      setError('Erro ao salvar configurações: ' + (err as Error).message);
      return false;
    }
  };

  return (
    <ConfigContext.Provider
      value={{
        apiUrl,
        intervaloEnvio,
        geofenceLatitude,
        geofenceLongitude,
        geofenceRaio,
        carregado,
        error,
        clearError,
        salvarConfiguracoes,
      }}
    >
      {children}
    </ConfigContext.Provider>
  );
};

export const useConfig = () => {
  const context = useContext(ConfigContext);
  if (context === undefined) {
    throw new Error('useConfig deve ser usado dentro de um ConfigProvider');
  }
  return context;
};