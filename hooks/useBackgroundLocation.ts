import { useEffect } from 'react';
import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useConfig } from '../context/ConfigContext';
import { useMotoristas } from '../context/MotoristasContext';

const BACKGROUND_LOCATION_TASK = 'background-location-task';

TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async ({ data, error }) => {
  if (error) {
    console.error('Erro na tarefa de background:', error);
    return;
  }
  try {
    if (data) {
      const { locations } = data as { locations: Location.LocationObject[] };
      const location = locations[0];
      if (!location) return;

      const chave = await AsyncStorage.getItem('@chaveMotorista');
      const apiUrl = await AsyncStorage.getItem('@apiUrl');
      if (!apiUrl || !chave) return;

      await fetch(`${apiUrl}/api/melicages/localizacoes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          motorista: chave,
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          timestamp: location.timestamp,
        }),
      });
      console.log('Localização enviada em background');
    }
  } catch (err) {
    console.error('Falha ao enviar localização em background:', err);
  }
});

export const useBackgroundLocation = () => {
  const { apiUrl, intervaloEnvio, monitoramento, trackingList } = useConfig();
  const { motoristaAtivo } = useMotoristas();

  useEffect(() => {
    if (!apiUrl || !monitoramento || !motoristaAtivo) return;

    const deveRastrear = trackingList.includes(motoristaAtivo.chave_identificacao);
    if (!deveRastrear) return;

    const startBackground = async () => {
      try {
        const { status } = await Location.requestBackgroundPermissionsAsync();
        if (status !== 'granted') {
          console.log('Permissão de background negada');
          return;
        }

        const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_LOCATION_TASK);
        if (!isRegistered) {
          await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
            accuracy: Location.Accuracy.High,
            timeInterval: intervaloEnvio,
            distanceInterval: 10,
            foregroundService: {
              notificationTitle: 'Localização em segundo plano',
              notificationBody: 'Enviando posição para a central',
            },
          });
          console.log('✅ Rastreamento em background iniciado');
        }
      } catch (err) {
        console.error('Erro ao iniciar background location:', err);
      }
    };

    startBackground();

    return () => {
      // Opcional: parar a tarefa ao desmontar se desejar
    };
  }, [apiUrl, intervaloEnvio, monitoramento, trackingList, motoristaAtivo]);
};