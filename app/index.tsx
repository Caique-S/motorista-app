import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Alert,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { useMotoristas } from '../context/MotoristasContext';
import { useConfig } from '../context/ConfigContext';
import { requestForegroundPermission } from '../utils/permissions';
import { verificarLocalizacao } from '../utils/geofence'; // essa função usa as constantes do arquivo, mas vamos modificar para receber parâmetros
import ErrorModal from '../components/ErrorModal';

// Função auxiliar para calcular distância (já existe em geofence, mas vamos importar)
import { calcularDistancia } from '../utils/geofence';

export default function ChegadaScreen() {
  const [nome, setNome] = useState('');
  const [loadingLocal, setLoadingLocal] = useState(false); // loading específico do botão
  const { adicionarMotorista, motoristas, loading, error, clearError } = useMotoristas();
  const {
    apiUrl,
    carregado,
    geofenceLatitude,
    geofenceLongitude,
    geofenceRaio,
    error: configError,
    clearError: clearConfigError,
  } = useConfig();
  const router = useRouter();

  // Exibe modal se não houver URL configurada (quando o carregamento inicial terminar)
  useEffect(() => {
    if (carregado && !apiUrl) {
      // Mostra modal informativo e redireciona para config
      Alert.alert(
        'Configuração necessária',
        'Você precisa configurar a URL da API antes de usar o app.',
        [{ text: 'Ir para Configurações', onPress: () => router.push('/config') }]
      );
    }
  }, [carregado, apiUrl]);

  // Se ainda estiver carregando configurações, mostra loading geral
  if (!carregado) {
    return (
      <View style={styles.centralizado}>
        <ActivityIndicator size="large" color="#2A4BA0" />
        <Text>Carregando configurações...</Text>
      </View>
    );
  }

  // Se a URL não estiver configurada, já mostramos o Alert acima; mas a tela continua vazia? Melhor mostrar uma mensagem.
  if (!apiUrl) {
    return (
      <View style={styles.centralizado}>
        <Text style={styles.aviso}>API não configurada.</Text>
        <TouchableOpacity onPress={() => router.push('/config')}>
          <Text style={styles.link}>Ir para Configurações</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Função chamada ao pressionar "Cheguei para descarregar"
  const handleChegada = async () => {
    try {
      // Validação simples
      if (!nome.trim()) {
        Alert.alert('Erro', 'Informe seu nome');
        return;
      }

      setLoadingLocal(true);

      // 1. Solicitar permissão de localização (foreground)
      const hasPermission = await requestForegroundPermission();
      if (!hasPermission) {
        Alert.alert('Erro', 'Permissão de localização negada');
        setLoadingLocal(false);
        return;
      }

      // 2. Obter localização atual
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const { latitude, longitude } = location.coords;

      // 3. Verificar se está dentro do raio usando as coordenadas do contexto
      const distancia = calcularDistancia(
        latitude,
        longitude,
        geofenceLatitude,
        geofenceLongitude
      );
      const localCorreto = distancia <= geofenceRaio;

      // Logs para debug (podem ser substituídos por modal se preferir)
      console.log('📍 Sua posição:', latitude, longitude);
      console.log('🎯 Galpão:', geofenceLatitude, geofenceLongitude);
      console.log('📏 Distância:', distancia.toFixed(2), 'm (limite:', geofenceRaio, 'm)');

      if (!localCorreto) {
        Alert.alert(
          'Fora da área permitida',
          `Você está a ${distancia.toFixed(0)} metros do galpão. O limite é ${geofenceRaio} metros.`
        );
        setLoadingLocal(false);
        return;
      }

      // 4. Tudo ok, registra na fila
      await adicionarMotorista(nome.trim());

      // 5. Salva o nome no AsyncStorage para usar no background
      await AsyncStorage.setItem('@motoristaNome', nome.trim());

      // 6. Feedback e opção de ver fila
      Alert.alert('Sucesso', 'Registrado na fila de descarga.', [
        { text: 'Ver Fila', onPress: () => router.push('/fila') },
        { text: 'OK' },
      ]);

      setNome(''); // limpa o campo
    } catch (err: any) {
      // Erros já são tratados no contexto, mas podemos exibir um alerta adicional se necessário
      Alert.alert('Erro', err.message || 'Ocorreu um erro ao registrar.');
    } finally {
      setLoadingLocal(false);
    }
  };

  // Mostra os primeiros 3 aguardando para preview
  const aguardando = motoristas.filter(m => m.status === 'aguardando').slice(0, 3);

  return (
    <>
      {/* Modal de erro global do contexto de motoristas */}
      <ErrorModal visible={!!error} message={error || ''} onClose={clearError} />
      {/* Modal de erro global do contexto de configuração */}
      <ErrorModal visible={!!configError} message={configError || ''} onClose={clearConfigError} />

      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.card}>
          <Text style={styles.label}>Nome do Motorista</Text>
          <TextInput
            style={styles.input}
            value={nome}
            onChangeText={setNome}
            placeholder="Digite seu nome"
            placeholderTextColor="#999"
            editable={!loadingLocal && !loading}
          />
          <TouchableOpacity
            style={[styles.button, (loadingLocal || loading) && styles.buttonDisabled]}
            onPress={handleChegada}
            disabled={loadingLocal || loading}
          >
            {loadingLocal ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Cheguei para descarregar</Text>
            )}
          </TouchableOpacity>
        </View>

        {aguardando.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Próximos na fila</Text>
            {aguardando.map(item => (
              <View key={item.id} style={styles.previewItem}>
                <Text style={styles.previewNome}>{item.nome}</Text>
                <Text style={styles.previewHora}>{item.horaChegada}</Text>
              </View>
            ))}
            <TouchableOpacity onPress={() => router.push('/fila')}>
              <Text style={styles.link}>Ver fila completa →</Text>
            </TouchableOpacity>
          </View>
        )}

        <TouchableOpacity style={styles.configButton} onPress={() => router.push('/config')}>
          <Text style={styles.configText}>⚙️ Configurações</Text>
        </TouchableOpacity>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 20, backgroundColor: '#f5f5f5' },
  centralizado: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  aviso: { fontSize: 18, color: '#666', marginBottom: 10 },
  link: { color: '#2A4BA0', fontSize: 16, fontWeight: '600' },
  card: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  label: { fontSize: 16, marginBottom: 5, color: '#333', fontWeight: '600' },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
    fontSize: 16,
    backgroundColor: '#fafafa',
  },
  button: {
    backgroundColor: '#2A4BA0',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#99b4e0',
  },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  cardTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 10, color: '#2A4BA0' },
  previewItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  previewNome: { fontSize: 16, color: '#333' },
  previewHora: { fontSize: 14, color: '#666' },
  configButton: { alignItems: 'center', padding: 10 },
  configText: { fontSize: 16, color: '#2A4BA0' },
});