import { useEffect } from 'react';
import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import { useConfig } from '../context/ConfigContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { enviarLocalizacao } from '../services/api';

const BACKGROUND_LOCATION_TASK = 'background-location-task';

// Define a tarefa de localização em segundo plano
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
      const apiUrl = await AsyncStorage.getItem('@apiUrl'); // Pega a URL atualizada
      if (!apiUrl || !motoristaNome) return;

      await enviarLocalizacao(apiUrl, {
        motorista: motoristaNome,
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        timestamp: location.timestamp,
      });
    } catch (err) {
      console.error('Falha ao enviar localização:', err);
    }
  }
});

export const useBackgroundLocation = () => {
  const { apiUrl, intervaloEnvio } = useConfig();

  useEffect(() => {
    if (!apiUrl) return; // Só inicia se a URL estiver configurada

    const startBackground = async () => {
      const { status } = await Location.requestBackgroundPermissionsAsync();
      if (status !== 'granted') {
        console.log('Permissão de background negada');
        return;
      }

      // Verifica se a tarefa já está registrada
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
      }
    };

    startBackground();

    return () => {
      // Para a tarefa se o componente desmontar (opcional)
      // Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
    };
  }, [apiUrl, intervaloEnvio]);
};