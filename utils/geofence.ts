// Coordenadas do galpão (exemplo)
export const GALPAO_LAT = -12.2243674; //-12.2243674, -38.9630476
export const GALPAO_LON = -38.9630476;
export const RAIO_PERMITIDO = 500; // metros

export const calcularDistancia = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371e3; // metros
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
};

export const verificarLocalizacao = async (latitude: number, longitude: number) => {
  const distancia = calcularDistancia(latitude, longitude, GALPAO_LAT, GALPAO_LON);
  return distancia <= RAIO_PERMITIDO;
};