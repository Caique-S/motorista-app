import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface Props {
  motorista: {
    id: string;
    nome: string;
    destino: string;
    status: 'aguardando' | 'descarregando' | 'descarregado';
    timestampChegada: string;
    timestampInicioDescarga?: string;
    tempoFila: number;
    tempoDescarga: number;
    gaiolas?: number;
    palets?: number;
    mangas?: number;
  };
}

export default function MotoristaItem({ motorista }: Props) {
  const [agora, setAgora] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setAgora(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const calcularTempos = () => {
    let tempoFila = motorista.tempoFila || 0;
    let tempoDescarga = motorista.tempoDescarga || 0;

    if (motorista.status === 'aguardando') {
      tempoFila = Math.floor((agora.getTime() - new Date(motorista.timestampChegada).getTime()) / 1000);
    } else if (motorista.status === 'descarregando' && motorista.timestampInicioDescarga) {
      tempoFila = motorista.tempoFila;
      tempoDescarga = Math.floor((agora.getTime() - new Date(motorista.timestampInicioDescarga).getTime()) / 1000);
    }
    return { tempoFila, tempoDescarga };
  };

  const { tempoFila, tempoDescarga } = calcularTempos();

  const formatarTempo = (segundos: number) => {
    const hrs = Math.floor(segundos / 3600);
    const mins = Math.floor((segundos % 3600) / 60);
    const secs = segundos % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusIcon = () => {
    switch (motorista.status) {
      case 'aguardando': return 'time-outline';
      case 'descarregando': return 'refresh-outline';
      case 'descarregado': return 'checkmark-circle-outline';
    }
  };

  const getStatusColor = () => {
    switch (motorista.status) {
      case 'aguardando': return '#856404';
      case 'descarregando': return '#084298';
      case 'descarregado': return '#0f5132';
    }
  };

  const getStatusBg = () => {
    switch (motorista.status) {
      case 'aguardando': return '#fff3cd';
      case 'descarregando': return '#cfe2ff';
      case 'descarregado': return '#d1e7dd';
    }
  };

  return (
    <View style={[styles.container, { borderLeftColor: getStatusColor(), borderLeftWidth: 4 }]}>
      <View style={styles.header}>
        <View style={styles.nameContainer}>
          <Ionicons name={getStatusIcon()} size={20} color={getStatusColor()} />
          <Text style={styles.nome}>{motorista.nome}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusBg() }]}>
          <Text style={[styles.statusText, { color: getStatusColor() }]}>{motorista.status}</Text>
        </View>
      </View>

      <Text style={styles.destino}>
        Destino: {motorista.destino} • Chegada: {new Date(motorista.timestampChegada).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </Text>

      {motorista.timestampInicioDescarga && (
        <Text style={styles.horario}>
          Início: {new Date(motorista.timestampInicioDescarga).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>
      )}

      <View style={styles.timerContainer}>
        <View style={styles.timerItem}>
          <Text style={styles.timerLabel}>Fila</Text>
          <Text style={styles.timerValue}>{formatarTempo(tempoFila)}</Text>
        </View>
        {motorista.status !== 'aguardando' && (
          <View style={styles.timerItem}>
            <Text style={styles.timerLabel}>Descarga</Text>
            <Text style={styles.timerValue}>{formatarTempo(tempoDescarga)}</Text>
          </View>
        )}
      </View>

      {motorista.status === 'descarregado' && motorista.gaiolas !== undefined && (
        <View style={styles.producao}>
          <Text style={styles.producaoLabel}>Devolução:</Text>
          <Text style={styles.producaoValue}>
            Gaiolas {motorista.gaiolas} | Palets {motorista.palets} | Mangas {motorista.mangas}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginHorizontal: 10,
    marginVertical: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  nameContainer: { flexDirection: 'row', alignItems: 'center' },
  nome: { fontSize: 16, fontWeight: 'bold', marginLeft: 8, color: '#333' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 },
  statusText: { fontSize: 11, fontWeight: '600' },
  destino: { fontSize: 13, color: '#666', marginBottom: 4 },
  horario: { fontSize: 12, color: '#666', marginBottom: 6 },
  timerContainer: { flexDirection: 'row', justifyContent: 'space-around', marginVertical: 8 },
  timerItem: { alignItems: 'center' },
  timerLabel: { fontSize: 11, color: '#999', marginBottom: 2 },
  timerValue: { fontSize: 15, fontWeight: 'bold', color: '#333' },
  producao: { marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#eee' },
  producaoLabel: { fontSize: 12, fontWeight: '600', color: '#333' },
  producaoValue: { fontSize: 12, color: '#666', marginTop: 2 },
});