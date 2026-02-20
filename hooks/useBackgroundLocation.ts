import { useEffect } from 'react';
import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useConfig } from '../context/ConfigContext';

const BACKGROUND_LOCATION_TASK = 'background-location-task';

TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async ({ data, error }) => {
  if (error) {
    console.error('Erro na tarefa de background:', error);
    return;
  }
  if (data) {
    const { locations } = data as { locations: Location.LocationObject[] };
    const location = locations[0];
    if (!location) return;

    try {
      const motoristaNome = await AsyncStorage.getItem('@motoristaNome');
      const apiUrl = await AsyncStorage.getItem('@apiUrl');
      if (!apiUrl || !motoristaNome) return;

      await fetch(`${apiUrl}/api/melicages/localizacoes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          motorista: motoristaNome,
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          timestamp: location.timestamp,
        }),
      });
    } catch (err) {
      console.error('Falha ao enviar localização em background:', err);
    }
  }
});

export const useBackgroundLocation = () => {
  const { apiUrl, intervaloEnvio } = useConfig();

  useEffect(() => {
    if (!apiUrl) return;

    let isActive = true;

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
      if (isActive) {
        // Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
      }
    };
  }, [apiUrl, intervaloEnvio]);
};