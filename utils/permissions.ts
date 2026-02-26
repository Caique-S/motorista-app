import * as Location from 'expo-location';

export const requestForegroundPermission = async () => {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    console.log('Permissão foreground:', status);
    return status === 'granted';
  } catch (error) {
    console.error('Erro requestForegroundPermission:', error);
    return false;
  }
};

export const requestBackgroundPermission = async () => {
  try {
    const { status } = await Location.requestBackgroundPermissionsAsync();
    console.log('Permissão background:', status);
    return status === 'granted';
  } catch (error) {
    console.error('Erro requestBackgroundPermission:', error);
    return false;
  }
};