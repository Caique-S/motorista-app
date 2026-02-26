import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import * as Location from 'expo-location';
import { useConfig } from '../context/ConfigContext';
import { requestForegroundPermission } from '../utils/permissions';
import Toast from '../components/Toast';

export default function ConfigScreen() {
  const {
    apiUrl,
    intervaloEnvio,
    refreshListInterval,
    geofenceLatitude,
    geofenceLongitude,
    geofenceRaio,
    monitoramento,
    salvarConfiguracoes,
    fetchConfiguracoes,
    carregado,
    toastVisible,
    toastMessage,
    toastType,
    hideToast,
    showToast,
  } = useConfig();

  const [url, setUrl] = useState('');
  const [obtendoLocalizacao, setObtendoLocalizacao] = useState(false);

  useEffect(() => {
    if (carregado) setUrl(apiUrl);
  }, [carregado, apiUrl]);

  const obterLocalizacaoAtual = async () => {
    try {
      setObtendoLocalizacao(true);
      const hasPermission = await requestForegroundPermission();
      if (!hasPermission) {
        showToast('Permissão de localização negada', 'error');
        return;
      }
      const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      Alert.alert(
        'Coordenadas atuais',
        `Lat: ${location.coords.latitude.toFixed(6)}\nLon: ${location.coords.longitude.toFixed(6)}`
      );
    } catch (err: any) {
      showToast('Erro ao obter localização', err);
    } finally {
      setObtendoLocalizacao(false);
    }
  };

  const handleSalvarUrl = async () => {
    if (!url.trim()) {
      showToast('Informe a URL da API', 'error');
      return;
    }
    const sucesso = await salvarConfiguracoes({ apiUrl: url.trim() });
    if (sucesso) {
      showToast('URL salva com sucesso!', 'success');
      fetchConfiguracoes();
    }
  };

  if (!carregado) {
    return (
      <View style={styles.centralizado}>
        <ActivityIndicator size="large" color="#2A4BA0" />
        <Text>Carregando...</Text>
      </View>
    );
  }

  return (
    <>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>🔧 Configurações da API</Text>
          <Text style={styles.label}>URL da API</Text>
          <TextInput
            style={styles.input}
            value={url}
            onChangeText={setUrl}
            placeholder="https://meusite.vercel.app"
            autoCapitalize="none"
            keyboardType="url"
          />
          <TouchableOpacity style={styles.button} onPress={handleSalvarUrl}>
            <Text style={styles.buttonText}>Salvar URL</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>📍 Configurações Atuais</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Latitude:</Text>
            <Text style={styles.infoValue}>{geofenceLatitude.toFixed(6)}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Longitude:</Text>
            <Text style={styles.infoValue}>{geofenceLongitude.toFixed(6)}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Raio (m):</Text>
            <Text style={styles.infoValue}>{geofenceRaio}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Refresh Lista (s):</Text>
            <Text style={styles.infoValue}>{refreshListInterval / 1000}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Envio Localização (s):</Text>
            <Text style={styles.infoValue}>{intervaloEnvio / 1000}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Monitoramento:</Text>
            <Text style={styles.infoValue}>{monitoramento ? 'Ativo' : 'Inativo'}</Text>
          </View>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={obterLocalizacaoAtual}
            disabled={obtendoLocalizacao}
          >
            {obtendoLocalizacao ? (
              <ActivityIndicator color="#2A4BA0" />
            ) : (
              <Text style={styles.secondaryButtonText}>📱 Obter localização atual</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>

      <Toast visible={toastVisible} message={toastMessage} type={toastType} onHide={hideToast} />
    </>
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
  cardTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15, color: '#2A4BA0' },
  label: { fontSize: 14, color: '#666', marginBottom: 5 },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 15,
    backgroundColor: '#fafafa',
  },
  button: { backgroundColor: '#2A4BA0', borderRadius: 8, padding: 15, alignItems: 'center' },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  secondaryButton: {
    backgroundColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginTop: 15,
  },
  secondaryButtonText: { color: '#333', fontSize: 14 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#eee' },
  infoLabel: { fontSize: 14, color: '#666' },
  infoValue: { fontSize: 14, fontWeight: '600', color: '#333' },
});