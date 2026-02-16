import React, { useState } from 'react';
import { View, Text, TextInput, Alert, StyleSheet, ActivityIndicator, ScrollView, TouchableOpacity } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { useMotoristas } from '../context/MotoristasContext';
import { requestForegroundPermission } from '../utils/permissions';
import { verificarLocalizacao, GALPAO_LAT, GALPAO_LON, RAIO_PERMITIDO } from '../utils/geofence';

export default function ChegadaScreen() {
  const [nome, setNome] = useState('');
  const { adicionarMotorista, motoristas, loading } = useMotoristas();
  const router = useRouter();

  const aguardando = motoristas.filter(m => m.status === 'aguardando').slice(0, 3);

  const handleChegada = async () => {
    try {
      if (!nome.trim()) {
        Alert.alert('Erro', 'Informe seu nome');
        return;
      }

      const hasPermission = await requestForegroundPermission();
      if (!hasPermission) {
        Alert.alert('Erro', 'Permissão de localização negada');
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      // Logs
      console.log('📍 Localização atual:', location.coords.latitude, location.coords.longitude);
      console.log('🎯 Galpão:', GALPAO_LAT, GALPAO_LON);
      console.log('📏 Raio:', RAIO_PERMITIDO);

      const localCorreto = verificarLocalizacao(
        location.coords.latitude,
        location.coords.longitude
      );

      if (!localCorreto) {
        Alert.alert('Fora da área', 'Você não está no local de descarga.');
        return;
      }

      await adicionarMotorista(nome.trim());
      await AsyncStorage.setItem('@motoristaNome', nome.trim());

      Alert.alert('Sucesso', 'Registrado na fila de descarga.', [
        { text: 'Ver Fila', onPress: () => router.push('/fila') },
        { text: 'OK' }
      ]);
      setNome('');
    } catch (error) {
      Alert.alert('Erro', 'Ocorreu um erro ao registrar.');
      console.error(error);
    }
  };

  if (loading && motoristas.length === 0) {
    return (
      <View style={styles.centralizado}>
        <ActivityIndicator size="large" color="#2A4BA0" />
        <Text>Sincronizando fila...</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.card}>
        <Text style={styles.label}>Nome do Motorista</Text>
        <TextInput
          style={styles.input}
          value={nome}
          onChangeText={setNome}
          placeholder="Digite seu nome"
          placeholderTextColor="#999"
        />
        <TouchableOpacity style={styles.button} onPress={handleChegada}>
          <Text style={styles.buttonText}>Cheguei para descarregar</Text>
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
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 20, backgroundColor: '#f5f5f5' },
  centralizado: { flex: 1, justifyContent: 'center', alignItems: 'center' },
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
  link: { color: '#2A4BA0', textAlign: 'right', marginTop: 10, fontSize: 14, fontWeight: '600' },
  configButton: { alignItems: 'center', padding: 10 },
  configText: { fontSize: 16, color: '#2A4BA0' },
});