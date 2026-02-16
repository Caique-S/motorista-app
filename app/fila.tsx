import React from 'react';
import { View, Text, SectionList, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
import { useMotoristas, Motorista } from '../context/MotoristasContext';
import MotoristaItem from '../components/MotoristaItem';

export default function FilaScreen() {
  const { motoristas, loading, refreshMotoristas } = useMotoristas();

  const secoes = [
    { 
      title: 'Aguardando', 
      icon: '⏳', 
      data: motoristas.filter(m => m.status === 'aguardando') 
    },
    { 
      title: 'Descarregando', 
      icon: '📦', 
      data: motoristas.filter(m => m.status === 'descarregando') 
    },
    { 
      title: 'Descarregados', 
      icon: '✅', 
      data: motoristas.filter(m => m.status === 'descarregado') 
    },
  ].filter(section => section.data.length > 0);

  const renderSectionHeader = ({ section }: { 
    section: { title: string; icon: string; data: Motorista[] } 
  }) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionIcon}>{section.icon}</Text>
      <Text style={styles.sectionTitle}>
        {section.title} ({section.data.length})
      </Text>
    </View>
  );

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
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <MotoristaItem motorista={item} />}
        renderSectionHeader={renderSectionHeader}
        ListEmptyComponent={
          <Text style={styles.empty}>Nenhum motorista na fila.</Text>
        }
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={refreshMotoristas} />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 10, backgroundColor: '#f5f5f5' },
  centralizado: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e0e0e0',
    padding: 10,
    marginTop: 10,
    borderRadius: 5,
  },
  sectionIcon: { fontSize: 18, marginRight: 8 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold' },
  empty: { textAlign: 'center', marginTop: 50, fontSize: 16, color: '#999' },
});