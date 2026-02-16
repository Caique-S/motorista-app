import * as Location from 'expo-location';
import { requestLocationPermission } from '../utils/permissions';
import { calcularDistancia } from '../utils/geofence';

const GALPAO_LAT = -23.5505; // Substituir pela coordenada real
const GALPAO_LON = -46.6333;
const RAIO_PERMITIDO = 100; // metros

export const verificarLocalizacao = async () => {
  try {
    const hasPermission = await requestLocationPermission(false);
    if (!hasPermission) throw new Error('Permissão negada');

    const position = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });

    const { latitude, longitude } = position.coords;
    const distancia = calcularDistancia(latitude, longitude, GALPAO_LAT, GALPAO_LON);
    return distancia <= RAIO_PERMITIDO;
  } catch (error) {
    console.error('Erro ao verificar localização:', error);
    return false;
  }
};