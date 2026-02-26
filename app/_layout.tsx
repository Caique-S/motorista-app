import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { TouchableOpacity } from 'react-native';
import { ConfigProvider } from '../context/ConfigContext';
import { MotoristasProvider } from '../context/MotoristasContext';
import { useBackgroundLocation } from '../hooks/useBackgroundLocation';

function BackgroundInitializer() {
  useBackgroundLocation();
  return null;
}

export default function RootLayout() {
  const router = useRouter();

  return (
    <ConfigProvider>
      <MotoristasProvider>
        <BackgroundInitializer />
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: '#2A4BA0' },
            headerTintColor: '#fff',
            headerTitleStyle: { fontWeight: 'bold' },
          }}
        >
          <Stack.Screen
            name="index"
            options={{
              title: 'Chegada',
              headerRight: () => (
                <TouchableOpacity onPress={() => router.push('/config')}>
                  <Ionicons name="settings-outline" size={24} color="white" />
                </TouchableOpacity>
              ),
            }}
          />
          <Stack.Screen name="fila" options={{ title: 'Fila de Descarga' }} />
          <Stack.Screen name="config" options={{ title: 'Configurações' }} />
        </Stack>
      </MotoristasProvider>
    </ConfigProvider>
  );
}