import React from 'react';
import {
  View,
  Text,
  SectionList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useMotoristas } from '../context/MotoristasContext';
import { useConfig } from '../context/ConfigContext';
import Toast from '../components/Toast';
import MotoristaItem from '../components/MotoristaItem';

export default function FilaScreen() {
  const { motoristas, loading, refreshMotoristas } = useMotoristas();
  const { toastVisible, toastMessage, toastType, hideToast } = useConfig();

  const secoes = [
    {
      title: '⏳ Aguardando',
      data: motoristas.filter(m => m.status === 'aguardando').sort((a, b) => new Date(a.timestampChegada).getTime() - new Date(b.timestampChegada).getTime()),
    },
    {
      title: '📦 Descarregando',
      data: motoristas.filter(m => m.status === 'descarregando').sort((a, b) => new Date(a.timestampChegada).getTime() - new Date(b.timestampChegada).getTime()),
    },
    {
      title: '✅ Finalizados',
      data: motoristas.filter(m => m.status === 'descarregado').sort((a, b) => new Date(b.timestampChegada).getTime() - new Date(a.timestampChegada).getTime()),
    },
  ].filter(section => section.data.length > 0);

  if (loading && motoristas.length === 0) {
    return (
      <View style={styles.centralizado}>
        <ActivityIndicator size="large" color="#2A4BA0" />
        <Text>Carregando fila...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SectionList
        sections={secoes}
        keyExtractor={item => item.id}
        renderItem={({ item }) => <MotoristaItem motorista={item} />}
        renderSectionHeader={({ section }) => (
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              {section.title} ({section.data.length})
            </Text>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.empty}>Nenhum motorista na fila.</Text>}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refreshMotoristas} />}
      />
      <Toast visible={toastVisible} message={toastMessage} type={toastType} onHide={hideToast} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  centralizado: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  sectionHeader: { backgroundColor: '#e0e0e0', padding: 10, marginTop: 10, marginHorizontal: 10, borderRadius: 5 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold' },
  empty: { textAlign: 'center', marginTop: 50, fontSize: 16, color: '#999' },
});