import React, { useState } from 'react';
import { View, Text, TextInput, Alert, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { useMotoristas } from '../context/MotoristasContext';
import { requestForegroundPermission } from '../utils/permissions';
import { verificarLocalizacao, GALPAO_LAT, GALPAO_LON, RAIO_PERMITIDO } from '../utils/geofence';
import { Ionicons } from '@expo/vector-icons';

export default function ChegadaScreen() {
  const [nome, setNome] = useState('');
  const [loading, setLoading] = useState(false);
  const { adicionarMotorista } = useMotoristas();

  const handleChegada = async () => {
    try {
      if (!nome.trim()) {
        Alert.alert('Erro', 'Informe seu nome');
        return;
      }

      setLoading(true);

      const hasPermission = await requestForegroundPermission();
      if (!hasPermission) {
        Alert.alert('Erro', 'Permissão de localização negada');
        setLoading(false);
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      // Logs para depuração
      console.log('📍 Localização atual:', location.coords.latitude, location.coords.longitude);
      console.log('🎯 Coordenadas do galpão:', GALPAO_LAT, GALPAO_LON);
      console.log('📏 Raio permitido:', RAIO_PERMITIDO, 'metros');

      const localCorreto = await verificarLocalizacao(
        location.coords.latitude,
        location.coords.longitude
      );

      if (!localCorreto) {
        Alert.alert('Fora da área', 'Você não está no local de descarga.');
        setLoading(false);
        return;
      }

      adicionarMotorista(nome.trim());
      await AsyncStorage.setItem('@motoristaNome', nome.trim());

      Alert.alert('Sucesso', 'Registrado na fila de descarga.');
      setNome('');
    } catch (error) {
      Alert.alert('Erro', 'Ocorreu um erro ao registrar.');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="log-in" size={50} color="#007AFF" />
        <Text style={styles.title}>Registrar Chegada</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Nome do Motorista</Text>
        <TextInput
          style={styles.input}
          value={nome}
          onChangeText={setNome}
          placeholder="Digite seu nome"
          placeholderTextColor="#999"
          editable={!loading}
        />

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleChegada}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Cheguei para descarregar</Text>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.infoContainer}>
        <Ionicons name="information-circle-outline" size={20} color="#007AFF" />
        <Text style={styles.infoText}>
          Sua localização será verificada para confirmar que você está no galpão.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
    marginTop: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 10,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  label: {
    fontSize: 16,
    color: '#333',
    marginBottom: 5,
    fontWeight: '500',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 15,
    fontSize: 16,
    marginBottom: 20,
    backgroundColor: '#fafafa',
  },
  button: {
    backgroundColor: '#007AFF',
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#99c4ff',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  infoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    paddingHorizontal: 10,
  },
  infoText: {
    color: '#666',
    marginLeft: 10,
    fontSize: 14,
    flex: 1,
  },
});