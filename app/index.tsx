import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import * as Location from 'expo-location';
import { useRouter, usePathname } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import QRCode from 'react-native-qrcode-svg';
import { Audio } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import Ably from 'ably';

import { useMotoristas } from '../context/MotoristasContext';
import { useConfig } from '../context/ConfigContext';
import { requestForegroundPermission } from '../utils/permissions';
import { calcularDistancia } from '../utils/geofence';
import { cpfMask } from '../utils/masks';
import Toast from '../components/Toast';

export default function LoginScreen() {
  const [cpf, setCpf] = useState('');
  const [retorno, setRetorno] = useState('');
  const [loading, setLoading] = useState(false);
  const [splash, setSplash] = useState(true);
  const [modalNotificacao, setModalNotificacao] = useState(false);
  const [docaNotificada, setDocaNotificada] = useState<number | null>(null);
  const [tempoRestante, setTempoRestante] = useState(300);
  const [som, setSom] = useState<Audio.Sound | null>(null);
  const [destinos, setDestinos] = useState<any[]>([]);
  const [carregandoDestinos, setCarregandoDestinos] = useState(false);
  const [ablyClient, setAblyClient] = useState<Ably.Realtime | null>(null);
  const [tempoFila, setTempoFila] = useState(0);

  const { motoristaAtivo, motoristas, adicionarMotorista, refreshMotoristas, loading: motoristasLoading } = useMotoristas();
  const {
    apiUrl,
    carregado,
    geofenceLatitude,
    geofenceLongitude,
    geofenceRaio,
    toastVisible,
    toastMessage,
    toastType,
    hideToast,
    showToast,
    setChaveMotorista,
    syncConfig,
  } = useConfig();

  const router = useRouter();
  const pathname = usePathname();

  // Splash inicial
  useEffect(() => {
    const timer = setTimeout(() => setSplash(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  // Redirecionar para config se não houver URL (apenas uma vez)
  const jaRedirecionouRef = useRef(false);
  useEffect(() => {
    if (carregado && !apiUrl && pathname !== '/config' && !jaRedirecionouRef.current) {
      jaRedirecionouRef.current = true;
      showToast('Configure a URL da API', 'info');
      router.push('/config');
    }
  }, [carregado, apiUrl, pathname, router, showToast]);

  // Carregar destinos da API
  const carregarDestinos = useCallback(async () => {
    if (!apiUrl) return;
    setCarregandoDestinos(true);
    try {
      const response = await fetch(`${apiUrl}/api/melicages/xpts`);
      const json = await response.json();
      if (json.success) {
        const lista = json.data.map((item: any) => ({
          codigo: item.codigo,
          cidade: item.cidade,
          latitude: item.latitude,
          longitude: item.longitude,
          raio: item.raio,
        }));
        setDestinos(lista);
        await AsyncStorage.setItem('@destinos', JSON.stringify(lista));
      } else {
        showToast('Erro ao carregar cidades', 'error');
      }
    } catch (error) {
      showToast('Falha ao carregar lista de cidades', 'error');
    } finally {
      setCarregandoDestinos(false);
    }
  }, [apiUrl, showToast]);

  useEffect(() => {
    if (apiUrl) {
      carregarDestinos();
    }
  }, [apiUrl, carregarDestinos]);

  // Carregar destinos do storage como fallback
  useEffect(() => {
    const loadFromStorage = async () => {
      const stored = await AsyncStorage.getItem('@destinos');
      if (stored) setDestinos(JSON.parse(stored));
    };
    loadFromStorage();
  }, []);

  // Configurar Ably quando motorista ativo
  useEffect(() => {
    if (!motoristaAtivo || !apiUrl) return;

    const setupAbly = async () => {
      try {
        const tokenRes = await fetch(`${apiUrl}/api/melicages/ably-auth`);
        if (!tokenRes.ok) throw new Error('Falha ao obter token');
        const tokenRequest = await tokenRes.json();

        const ably = new Ably.Realtime({ authCallback: (_, cb) => cb(null, tokenRequest) });
        setAblyClient(ably);

        const channel = ably.channels.get(`motorista:${motoristaAtivo.id}`);
        await channel.subscribe('notificacao-doca', (msg) => {
          const doca = msg.data.doca;
          const tempoResposta = msg.data.tempoResposta || 300;
          setDocaNotificada(doca);
          setTempoRestante(tempoResposta);
          tocarAlarme();
          setModalNotificacao(true);
        });

        return () => {
          channel.unsubscribe();
          ably.close();
        };
      } catch (err) {
        showToast('Erro ao conectar para notificações', 'error');
      }
    };

    setupAbly();

    return () => {
      if (ablyClient) {
        ablyClient.close();
      }
    };
  }, [motoristaAtivo, apiUrl, showToast]);

  // Timer do modal
  useEffect(() => {
    if (modalNotificacao && tempoRestante > 0) {
      const timer = setInterval(() => setTempoRestante(prev => prev - 1), 1000);
      return () => clearInterval(timer);
    } else if (tempoRestante === 0) {
      pararAlarme();
      setModalNotificacao(false);
    }
  }, [modalNotificacao, tempoRestante]);

  // Timer da fila
  useEffect(() => {
    if (!motoristaAtivo) return;
    const interval = setInterval(() => {
      const chegada = new Date(motoristaAtivo.timestampChegada).getTime();
      const agora = Date.now();
      setTempoFila(Math.floor((agora - chegada) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [motoristaAtivo]);

  // Funções de áudio
  const tocarAlarme = useCallback(async () => {
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        staysActiveInBackground: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });

      const { sound } = await Audio.Sound.createAsync(
        require('../assets/sounds/alarme-doca.mp3'),
        { shouldPlay: true, isLooping: true }
      );
      setSom(sound);
      await sound.playAsync();
    } catch (err) {
      showToast('Erro ao tocar alarme', 'error');
    }
  }, [showToast]);

  const pararAlarme = useCallback(async () => {
    if (som) {
      await som.stopAsync();
      await som.unloadAsync();
      setSom(null);
    }
  }, [som]);

  // Validação de localização
  const validarLocalizacao = useCallback(async (): Promise<boolean> => {
    try {
      const hasPermission = await requestForegroundPermission();
      if (!hasPermission) {
        showToast('Permissão de localização negada', 'error');
        return false;
      }

      const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const { latitude, longitude } = location.coords;
      const distancia = calcularDistancia(latitude, longitude, geofenceLatitude, geofenceLongitude);

      if (distancia > geofenceRaio) {
        showToast(`Fora da área permitida (${distancia.toFixed(0)}m / ${geofenceRaio}m)`, 'error');
        return false;
      }
      return true;
    } catch (error) {
      showToast('Erro ao obter localização', 'error');
      return false;
    }
  }, [geofenceLatitude, geofenceLongitude, geofenceRaio, showToast]);

  // Entrar na fila
  const handleEntrar = useCallback(async () => {
    const cpfLimpo = cpf.replace(/\D/g, '');
    if (cpfLimpo.length !== 11) {
      showToast('CPF inválido', 'error');
      return;
    }
    if (!retorno) {
      showToast('Selecione a cidade de origem', 'error');
      return;
    }

    setLoading(true);
    try {
      const dentro = await validarLocalizacao();
      if (!dentro) return;

      const motorista = await adicionarMotorista(cpfLimpo, retorno);
      await AsyncStorage.setItem('@chaveMotorista', motorista.chave_identificacao);
      setChaveMotorista(motorista.chave_identificacao);
      setCpf('');
      setRetorno('');
    } catch (err) {
      // erro já tratado no contexto
    } finally {
      setLoading(false);
    }
  }, [cpf, retorno, validarLocalizacao, adicionarMotorista, setChaveMotorista, showToast]);

  // Sincronizar configurações manualmente
  const handleSyncConfig = useCallback(async () => {
    const sucesso = await syncConfig();
    if (sucesso) {
      await carregarDestinos();
    }
  }, [syncConfig, carregarDestinos]);

  // Formatação de tempo
  const formatarTempo = (segundos: number) => {
    const mins = Math.floor(segundos / 60);
    const secs = segundos % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Pré-visualização da fila
  const aguardando = motoristas.filter(m => m.status === 'aguardando').slice(0, 3);

  if (!carregado || splash) {
    return (
      <View style={styles.centralizado}>
        <ActivityIndicator size="large" color="#2A4BA0" />
        <Text style={styles.splashText}>Carregando...</Text>
      </View>
    );
  }

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

  return (
    <>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.card}>
          {!motoristaAtivo ? (
            <>
              <View style={styles.headerRow}>
                <Text style={styles.title}>🚛 Entrar na Fila</Text>
                <TouchableOpacity onPress={handleSyncConfig} style={styles.syncButton} disabled={carregandoDestinos}>
                  {carregandoDestinos ? (
                    <ActivityIndicator size="small" color="#2A4BA0" />
                  ) : (
                    <Ionicons name="sync" size={24} color="#2A4BA0" />
                  )}
                </TouchableOpacity>
              </View>
              <Text style={styles.subtitle}>Informe seu CPF e local de origem</Text>

              <TextInput
                style={styles.input}
                value={cpf}
                onChangeText={(text) => setCpf(cpfMask(text))}
                placeholder="000.000.000-00"
                keyboardType="numeric"
                maxLength={14}
                editable={!loading}
              />

              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={retorno}
                  onValueChange={setRetorno}
                  enabled={!loading && destinos.length > 0}
                  style={styles.picker}
                >
                  <Picker.Item label="Selecione a cidade de origem" value="" />
                  {destinos.map((destino) => (
                    <Picker.Item key={destino.codigo} label={destino.cidade} value={destino.cidade} />
                  ))}
                </Picker>
              </View>

              <TouchableOpacity
                style={[styles.button, loading && styles.buttonDisabled]}
                onPress={handleEntrar}
                disabled={loading}
              >
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Entrar na Fila</Text>}
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={styles.nomeAtivo}>{motoristaAtivo.nome}</Text>
              <Text style={styles.statusAtivo}>Status: {motoristaAtivo.status}</Text>
              <View style={styles.qrContainer}>
                <QRCode value={motoristaAtivo.id} size={180} backgroundColor="white" color="black" />
              </View>
              <View style={styles.timerContainer}>
                <Ionicons name="time-outline" size={28} color="#2A4BA0" />
                <Text style={styles.timerText}>{formatarTempo(tempoFila)}</Text>
              </View>
              <TouchableOpacity
                style={styles.refreshButton}
                onPress={() => refreshMotoristas()}
                disabled={motoristasLoading}
              >
                {motoristasLoading ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.refreshButtonText}>Atualizar Fila</Text>}
              </TouchableOpacity>
            </>
          )}
        </View>

        <TouchableOpacity style={styles.card} onPress={() => router.push('/fila')} activeOpacity={0.7}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>📋 Fila de Descarga</Text>
            <Ionicons name="chevron-forward" size={20} color="#2A4BA0" />
          </View>
          {aguardando.length > 0 ? (
            aguardando.map(item => (
              <View key={item.id} style={styles.previewItem}>
                <Text style={styles.previewNome}>{item.nome}</Text>
                <Text style={styles.previewHora}>
                  {new Date(item.timestampChegada).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>Ninguém na fila</Text>
          )}
          <Text style={styles.verMais}>Toque para ver a fila completa →</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Modal de notificação */}
      <Modal animationType="slide" transparent visible={modalNotificacao} onRequestClose={() => { pararAlarme(); setModalNotificacao(false); }}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalView}>
            <Ionicons name="alert-circle" size={60} color="#ff9500" />
            <Text style={styles.modalTitle}>Dirija-se à Doca</Text>
            <Text style={styles.modalDoca}>{docaNotificada}</Text>
            <Text style={styles.modalTimer}>Tempo restante: {formatarTempo(tempoRestante)}</Text>
            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => { setModalNotificacao(false); pararAlarme(); }}
            >
              <Text style={styles.modalButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Toast visible={toastVisible} message={toastMessage} type={toastType} onHide={hideToast} />
    </>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 20, backgroundColor: '#f5f5f5' },
  centralizado: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  splashText: { marginTop: 10, color: '#666' },
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
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  syncButton: { padding: 8 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#2A4BA0' },
  subtitle: { fontSize: 14, color: '#666', marginBottom: 20 },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 15,
    fontSize: 18,
    backgroundColor: '#fafafa',
    marginBottom: 15,
    textAlign: 'center',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#fafafa',
    marginBottom: 20,
  },
  picker: { height: 50, width: '100%' },
  button: { backgroundColor: '#2A4BA0', borderRadius: 8, padding: 15, alignItems: 'center' },
  buttonDisabled: { backgroundColor: '#99b4e0' },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  nomeAtivo: { fontSize: 24, fontWeight: 'bold', color: '#333', textAlign: 'center', marginBottom: 5 },
  statusAtivo: { fontSize: 16, color: '#666', textAlign: 'center', marginBottom: 20 },
  qrContainer: { alignItems: 'center', marginBottom: 20 },
  timerContainer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  timerText: { fontSize: 32, fontWeight: 'bold', marginLeft: 10, color: '#2A4BA0' },
  refreshButton: { backgroundColor: '#6c757d', borderRadius: 8, padding: 10, marginTop: 15, alignItems: 'center' },
  refreshButtonText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  cardTitle: { fontSize: 18, fontWeight: 'bold', color: '#2A4BA0' },
  previewItem: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#eee' },
  previewNome: { fontSize: 16, color: '#333' },
  previewHora: { fontSize: 14, color: '#666' },
  emptyText: { textAlign: 'center', color: '#999', paddingVertical: 20 },
  verMais: { color: '#2A4BA0', marginTop: 10, textAlign: 'right', fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalView: {
    width: '80%',
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: { fontSize: 22, fontWeight: 'bold', marginTop: 10, color: '#333' },
  modalDoca: { fontSize: 48, fontWeight: 'bold', color: '#2A4BA0', marginVertical: 10 },
  modalTimer: { fontSize: 18, color: '#666', marginBottom: 20 },
  modalButton: { backgroundColor: '#2A4BA0', borderRadius: 8, padding: 12, width: '100%', alignItems: 'center' },
  modalButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});