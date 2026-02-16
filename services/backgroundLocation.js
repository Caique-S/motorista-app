import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BACKGROUND_LOCATION_TASK = 'background-location-task';

export const configurarBackgroundLocation = async (apiUrl, intervaloMinutos) => {
  // Primeiro, verificar permissões de background
  const { status } = await Location.requestBackgroundPermissionsAsync();
  if (status !== 'granted') {
    console.error('Permissão de localização em background negada');
    return;
  }

  // Registrar a tarefa
  TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async ({ data, error }) => {
    if (error) {
      console.error('Erro na tarefa de localização:', error);
      return;
    }
    if (data) {
      const { locations } = data;
      const location = locations[0];
      const motoristaNome = await AsyncStorage.getItem('@motoristaNome');
      const url = await AsyncStorage.getItem('@apiUrl');
      if (motoristaNome && url) {
        try {
          await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              motorista: motoristaNome,
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
              timestamp: location.timestamp,
            }),
          });
        } catch (e) {
          console.error('Erro ao enviar localização:', e);
        }
      }
    }
  });

  // Iniciar o rastreamento em background
  await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
    accuracy: Location.Accuracy.High,
    distanceInterval: 10, // mínimo deslocamento em metros
    timeInterval: intervaloMinutos * 60 * 1000, // intervalo em ms
    foregroundService: {
      notificationTitle: 'Enviando localização',
      notificationBody: 'Seu app está enviando localização em segundo plano.',
    },
  });
};

export const pararBackgroundLocation = async () => {
  if (await TaskManager.isTaskRegisteredAsync(BACKGROUND_LOCATION_TASK)) {
    await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
    await TaskManager.unregisterTaskAsync(BACKGROUND_LOCATION_TASK);
  }
};