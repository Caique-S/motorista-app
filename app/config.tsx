import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Alert, StyleSheet, ActivityIndicator, TouchableOpacity, ScrollView } from 'react-native';
import { useConfig } from '../context/ConfigContext';
import { Ionicons } from '@expo/vector-icons';

export default function ConfigScreen() {
  const { apiUrl, intervaloEnvio, salvarConfiguracoes, carregado } = useConfig();
  const [url, setUrl] = useState('');
  const [intervalo, setIntervalo] = useState('');
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (carregado) {
      setUrl(apiUrl);
      setIntervalo((intervaloEnvio / 1000 / 60).toString());
    }
  }, [carregado, apiUrl, intervaloEnvio]);

  const handleSalvar = async () => {
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
    const sucesso = await salvarConfiguracoes(url, intervaloMin * 60 * 1000);
    setSalvando(false);
    if (sucesso) {
      Alert.alert('Sucesso', 'Configurações salvas com sucesso!');
    } else {
      Alert.alert('Erro', 'Falha ao salvar configurações.');
    }
  };

  if (!carregado) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Ionicons name="settings-outline" size={50} color="#007AFF" />
        <Text style={styles.title}>Configurações</Text>
      </View>

      <View style={styles.card}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>URL da API</Text>
          <TextInput
            style={styles.input}
            value={url}
            onChangeText={setUrl}
            placeholder="https://suaapi.com/localizacoes"
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
          onPress={handleSalvar}
          disabled={salvando}
        >
          {salvando ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Salvar Configurações</Text>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.infoContainer}>
        <Ionicons name="information-circle-outline" size={20} color="#007AFF" />
        <Text style={styles.infoText}>
          A localização será enviada no intervalo configurado para a URL fornecida.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  inputGroup: {
    marginBottom: 20,
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
    backgroundColor: '#fafafa',
  },
  button: {
    backgroundColor: '#007AFF',
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
    marginTop: 10,
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