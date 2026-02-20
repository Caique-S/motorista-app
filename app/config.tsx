import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Alert,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import * as Location from 'expo-location';
import { useConfig } from '../context/ConfigContext';
import { requestForegroundPermission } from '../utils/permissions';
import ErrorModal from '../components/ErrorModal';

const ADMIN_PASSWORD = 'admin123';

export default function ConfigScreen() {
  const {
    apiUrl,
    intervaloEnvio,
    geofenceLatitude,
    geofenceLongitude,
    geofenceRaio,
    salvarConfiguracoes,
    carregado,
    error,
    clearError,
  } = useConfig();

  const [url, setUrl] = useState('');
  const [intervalo, setIntervalo] = useState('');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [raio, setRaio] = useState('');

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [showPasswordInput, setShowPasswordInput] = useState(false);

  const [salvando, setSalvando] = useState(false);
  const [obtendoLocalizacao, setObtendoLocalizacao] = useState(false);

  useEffect(() => {
    if (carregado) {
      setUrl(apiUrl);
      setIntervalo((intervaloEnvio / 1000 / 60).toString());
      setLat(geofenceLatitude.toString());
      setLng(geofenceLongitude.toString());
      setRaio(geofenceRaio.toString());
    }
  }, [carregado, apiUrl, intervaloEnvio, geofenceLatitude, geofenceLongitude, geofenceRaio]);

  const obterLocalizacaoAtual = async () => {
    try {
      setObtendoLocalizacao(true);
      const hasPermission = await requestForegroundPermission();
      if (!hasPermission) {
        Alert.alert('Erro', 'Permissão de localização negada');
        return;
      }
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      setLat(location.coords.latitude.toString());
      setLng(location.coords.longitude.toString());
    } catch (err: any) {
      Alert.alert('Erro', 'Não foi possível obter localização: ' + err.message);
    } finally {
      setObtendoLocalizacao(false);
    }
  };

  const handleSalvarBasico = async () => {
    if (!url.trim()) {
      Alert.alert('Erro', 'Informe a URL da API');
      return;
    }
    const intervaloMin = parseFloat(intervalo);
    if (isNaN(intervaloMin) || intervaloMin <= 0) {
      Alert.alert('Erro', 'Informe um intervalo válido em minutos');
      return;
    }

    setSalvando(true);
    try {
      const sucesso = await salvarConfiguracoes({
        apiUrl: url.trim(),
        intervaloEnvio: intervaloMin * 60 * 1000,
      });
      if (sucesso) {
        Alert.alert('Sucesso', 'Configurações básicas salvas com sucesso!');
      } else {
        Alert.alert('Erro', 'Falha ao salvar configurações.');
      }
    } catch (err: any) {
      Alert.alert('Erro', err.message);
    } finally {
      setSalvando(false);
    }
  };

  const handleSalvarGeofence = async () => {
    if (!isAuthenticated) {
      setShowPasswordInput(true);
      return;
    }

    const latNum = parseFloat(lat);
    const lngNum = parseFloat(lng);
    const raioNum = parseFloat(raio);

    if (isNaN(latNum) || isNaN(lngNum) || isNaN(raioNum)) {
      Alert.alert('Erro', 'Latitude, longitude e raio devem ser números válidos');
      return;
    }

    setSalvando(true);
    try {
      const sucesso = await salvarConfiguracoes({
        geofenceLatitude: latNum,
        geofenceLongitude: lngNum,
        geofenceRaio: raioNum,
      });
      if (sucesso) {
        Alert.alert('Sucesso', 'Geofence atualizada!');
        setIsAuthenticated(false);
        setShowPasswordInput(false);
        setPassword('');
      } else {
        Alert.alert('Erro', 'Falha ao salvar geofence localmente.');
      }
    } catch (err: any) {
      Alert.alert('Erro', err.message);
    } finally {
      setSalvando(false);
    }
  };

  const verificarSenha = () => {
    if (password === ADMIN_PASSWORD) {
      setIsAuthenticated(true);
      setShowPasswordInput(false);
      setPassword('');
    } else {
      Alert.alert('Acesso negado', 'Senha incorreta');
    }
  };

  if (!carregado) {
    return (
      <View style={styles.centralizado}>
        <ActivityIndicator size="large" color="#2A4BA0" />
        <Text>Carregando configurações...</Text>
      </View>
    );
  }

  return (
    <>
      <ErrorModal visible={!!error} message={error || ''} onClose={clearError} />

      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Configurações</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>🔧 Configurações da API</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>URL da API</Text>
            <TextInput
              style={styles.input}
              value={url}
              onChangeText={setUrl}
              placeholder="https://meusite.vercel.app"
              autoCapitalize="none"
              keyboardType="url"
              placeholderTextColor="#999"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Intervalo de envio (minutos)</Text>
            <TextInput
              style={styles.input}
              value={intervalo}
              onChangeText={setIntervalo}
              placeholder="5"
              keyboardType="numeric"
              placeholderTextColor="#999"
            />
          </View>

          <TouchableOpacity
            style={[styles.button, salvando && styles.buttonDisabled]}
            onPress={handleSalvarBasico}
            disabled={salvando}
          >
            {salvando ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Salvar Configurações Básicas</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>📍 Área do Galpão</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Latitude</Text>
            <TextInput
              style={styles.input}
              value={lat}
              onChangeText={setLat}
              placeholder="-12.2243674"
              keyboardType="numeric"
              placeholderTextColor="#999"
              editable={isAuthenticated}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Longitude</Text>
            <TextInput
              style={styles.input}
              value={lng}
              onChangeText={setLng}
              placeholder="-38.9630476"
              keyboardType="numeric"
              placeholderTextColor="#999"
              editable={isAuthenticated}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Raio (metros)</Text>
            <TextInput
              style={styles.input}
              value={raio}
              onChangeText={setRaio}
              placeholder="500"
              keyboardType="numeric"
              placeholderTextColor="#999"
              editable={isAuthenticated}
            />
          </View>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={obterLocalizacaoAtual}
            disabled={obtendoLocalizacao || !isAuthenticated}
          >
            {obtendoLocalizacao ? (
              <ActivityIndicator color="#2A4BA0" />
            ) : (
              <Text style={styles.secondaryButtonText}>📱 Usar minha localização atual</Text>
            )}
          </TouchableOpacity>

          {showPasswordInput && (
            <View style={styles.passwordContainer}>
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder="Senha de administrador"
                secureTextEntry
              />
              <View style={styles.passwordButtons}>
                <TouchableOpacity style={styles.smallButton} onPress={verificarSenha}>
                  <Text style={styles.smallButtonText}>OK</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.smallButton, styles.cancelButton]}
                  onPress={() => {
                    setShowPasswordInput(false);
                    setPassword('');
                  }}
                >
                  <Text style={styles.smallButtonText}>Cancelar</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {!isAuthenticated && !showPasswordInput && (
            <TouchableOpacity style={styles.button} onPress={() => setShowPasswordInput(true)}>
              <Text style={styles.buttonText}>🔒 Autenticar para editar geofence</Text>
            </TouchableOpacity>
          )}

          {isAuthenticated && (
            <TouchableOpacity
              style={[styles.button, styles.saveButton, salvando && styles.buttonDisabled]}
              onPress={handleSalvarGeofence}
              disabled={salvando}
            >
              {salvando ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Salvar Geofence</Text>
              )}
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.infoContainer}>
          <Text style={styles.infoText}>
            A localização será enviada no intervalo configurado. A geofence define a área permitida para registrar chegada.
          </Text>
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: '#f5f5f5', padding: 20 },
  centralizado: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { alignItems: 'center', marginBottom: 20, marginTop: 10 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#333' },
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
  cardTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15, color: '#2A4BA0' },
  inputGroup: { marginBottom: 15 },
  label: { fontSize: 14, color: '#666', marginBottom: 5 },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fafafa',
  },
  button: {
    backgroundColor: '#2A4BA0',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonDisabled: { backgroundColor: '#99b4e0' },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  secondaryButton: {
    backgroundColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginTop: 5,
  },
  secondaryButtonText: { color: '#333', fontSize: 14 },
  saveButton: { backgroundColor: '#34c759', marginTop: 15 },
  passwordContainer: { marginTop: 15 },
  passwordButtons: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 10 },
  smallButton: {
    backgroundColor: '#2A4BA0',
    borderRadius: 5,
    padding: 10,
    width: '40%',
    alignItems: 'center',
  },
  cancelButton: { backgroundColor: '#ff3b30' },
  smallButtonText: { color: '#fff', fontWeight: 'bold' },
  infoContainer: { padding: 10 },
  infoText: { color: '#666', textAlign: 'center', fontSize: 14 },
});