import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface ConfigContextData {
  apiUrl: string;
  intervaloEnvio: number; // em milissegundos
  salvarConfiguracoes: (url: string, intervalo: number) => Promise<boolean>;
  carregado: boolean;
}

const ConfigContext = createContext<ConfigContextData | undefined>(undefined);

export const ConfigProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [apiUrl, setApiUrl] = useState('');
  const [intervaloEnvio, setIntervaloEnvio] = useState(300000); // 5 minutos padrão
  const [carregado, setCarregado] = useState(false);

  useEffect(() => {
    carregarConfiguracoes();
  }, []);

  const carregarConfiguracoes = async () => {
    try {
      const url = await AsyncStorage.getItem('@apiUrl');
      if (url) setApiUrl(url);
      const intervalo = await AsyncStorage.getItem('@intervaloEnvio');
      if (intervalo) setIntervaloEnvio(parseInt(intervalo, 10));
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
    } finally {
      setCarregado(true);
    }
  };

  const salvarConfiguracoes = async (url: string, intervalo: number) => {
    try {
      await AsyncStorage.setItem('@apiUrl', url);
      await AsyncStorage.setItem('@intervaloEnvio', intervalo.toString());
      setApiUrl(url);
      setIntervaloEnvio(intervalo);
      return true;
    } catch (error) {
      console.error('Erro ao salvar configurações:', error);
      return false;
    }
  };

  return (
    <ConfigContext.Provider value={{ apiUrl, intervaloEnvio, salvarConfiguracoes, carregado }}>
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