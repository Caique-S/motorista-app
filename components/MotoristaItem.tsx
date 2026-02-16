import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Motorista , useMotoristas } from '../context/MotoristasContext';
import { Ionicons } from '@expo/vector-icons';

const LIMITE_LARANJA = 1800; // 30 min
const LIMITE_VERMELHO = 3600; // 60 min

interface Props {
  motorista: Motorista;
}

const MotoristaItem: React.FC<Props> = ({ motorista }) => {
  const { iniciarDescarga, finalizarDescarga } = useMotoristas();
  const [agora, setAgora] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => {
      setAgora(new Date());
    }, 1000);
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
    } else if (motorista.status === 'descarregado') {
      tempoFila = motorista.tempoFila;
      tempoDescarga = motorista.tempoDescarga;
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

  const corPorTempo = (tempo: number) => {
    if (tempo >= LIMITE_VERMELHO) return '#ff3b30';
    if (tempo >= LIMITE_LARANJA) return '#ff9500';
    return '#333';
  };

  const corFila = corPorTempo(tempoFila);
  const corDescarga = corPorTempo(tempoDescarga);

  const getStatusIcon = () => {
    switch (motorista.status) {
      case 'aguardando': return 'time-outline';
      case 'descarregando': return 'refresh-outline';
      case 'descarregado': return 'checkmark-circle-outline';
    }
  };

  const getStatusColor = () => {
    switch (motorista.status) {
      case 'aguardando': return '#007AFF';
      case 'descarregando': return '#ff9500';
      case 'descarregado': return '#34c759';
    }
  };

  const borderColor = motorista.status === 'descarregando' ? '#ff9500' : motorista.status === 'descarregado' ? '#34c759' : '#ddd';

  return (
    <View style={[styles.container, { borderColor }]}>
      <View style={styles.header}>
        <View style={styles.nameContainer}>
          <Ionicons name={getStatusIcon()} size={20} color={getStatusColor()} />
          <Text style={styles.nome}>{motorista.nome}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor() + '20' }]}>
          <Text style={[styles.statusText, { color: getStatusColor() }]}>{motorista.status}</Text>
        </View>
      </View>

      <View style={styles.row}>
        <Text style={styles.label}>Chegada: {motorista.dataChegada} {motorista.horaChegada}</Text>
      </View>

      <View style={styles.timerContainer}>
        <View style={styles.timerItem}>
          <Text style={styles.timerLabel}>Fila</Text>
          <Text style={[styles.timerValue, { color: corFila }]}>{formatarTempo(tempoFila)}</Text>
        </View>
        {motorista.status !== 'aguardando' && (
          <View style={styles.timerItem}>
            <Text style={styles.timerLabel}>Descarga</Text>
            <Text style={[styles.timerValue, { color: corDescarga }]}>{formatarTempo(tempoDescarga)}</Text>
          </View>
        )}
      </View>

      {motorista.status === 'aguardando' && (
        <TouchableOpacity style={styles.actionButton} onPress={() => iniciarDescarga(motorista.id)}>
          <Text style={styles.actionButtonText}>Iniciar Descarga</Text>
        </TouchableOpacity>
      )}
      {motorista.status === 'descarregando' && (
        <TouchableOpacity style={[styles.actionButton, styles.finishButton]} onPress={() => finalizarDescarga(motorista.id)}>
          <Text style={styles.actionButtonText}>Finalizar Descarga</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginVertical: 5,
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  nameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  nome: {
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
    color: '#333',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  row: {
    marginBottom: 10,
  },
  label: {
    fontSize: 14,
    color: '#666',
  },
  timerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginVertical: 10,
  },
  timerItem: {
    alignItems: 'center',
  },
  timerLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
  timerValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  actionButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginTop: 5,
  },
  finishButton: {
    backgroundColor: '#34c759',
  },
  actionButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default MotoristaItem;