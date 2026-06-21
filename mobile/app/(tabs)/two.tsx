import React, { useState, useEffect } from 'react';
import { StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SymbolView } from 'expo-symbols';

import { Text, View, CardView, useThemeColor } from '@/components/Themed';
import { LocationStore } from '@/components/LocationStore';

const MEXICAN_STATES = [
  'CDMX',
  'Jalisco',
  'Nuevo León',
  'Estado de México',
  'Puebla',
  'Yucatán',
  'Baja California'
];

export default function SettingsScreen() {
  const [currentState, setCurrentState] = useState(LocationStore.getState());
  
  const primaryColor = useThemeColor({}, 'primary');
  const accentColor = useThemeColor({}, 'accent');
  const textMutedColor = useThemeColor({}, 'textMuted');

  useEffect(() => {
    const unsubscribe = LocationStore.subscribe((newState) => {
      setCurrentState(newState);
    });
    return unsubscribe;
  }, []);

  const selectState = (stateName: string) => {
    LocationStore.setState(stateName);
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* 1. Jurisdiction Selector */}
      <Text style={styles.sectionTitle}>Jurisdicción de Búsqueda</Text>
      <Text style={styles.sectionSubtitle}>
        Selecciona tu estado para priorizar reglamentos y códigos penales/civiles locales.
      </Text>
      
      <CardView style={styles.card}>
        {MEXICAN_STATES.map((state) => {
          const isSelected = currentState === state;
          return (
            <TouchableOpacity
              key={state}
              style={[
                styles.stateRow,
                isSelected && { backgroundColor: useThemeColor({ light: '#EEF2F6', dark: '#1E293B' }, 'background') }
              ]}
              onPress={() => selectState(state)}
              activeOpacity={0.7}
            >
              <View style={styles.stateLeft}>
                <SymbolView 
                  name="mappin.circle" 
                  size={18} 
                  tintColor={isSelected ? primaryColor : textMutedColor} 
                />
                <Text style={[styles.stateName, isSelected && styles.stateNameSelected]}>
                  {state}
                </Text>
              </View>
              {isSelected && (
                <SymbolView name="checkmark.seal.fill" size={18} tintColor={primaryColor} />
              )}
            </TouchableOpacity>
          );
        })}
      </CardView>

      {/* 2. Login Account Sandbox */}
      <Text style={styles.sectionTitle}>Perfil y Sincronización</Text>
      <CardView style={styles.card}>
        <View style={styles.authHeader}>
          <View style={styles.avatarPlaceholder} lightColor="#E2E8F0" darkColor="#334155">
            <SymbolView name="person.fill" size={24} tintColor={primaryColor} />
          </View>
          <View style={styles.authHeaderInfo}>
            <Text style={styles.authTitle}>Modo Invitado</Text>
            <Text style={styles.authSubtitle}>Las búsquedas son anónimas y locales.</Text>
          </View>
        </View>
        
        <Text style={styles.authDescription}>
          Crea una cuenta para guardar tus consultas, sincronizar tu historial legal y habilitar la cámara para realizar análisis multimedia ("¿Es esto legal?").
        </Text>

        <TouchableOpacity 
          style={[styles.authButton, { backgroundColor: primaryColor }]}
          onPress={() => alert('Próximamente: El módulo de autenticación con Supabase Auth se habilitará en la siguiente fase.')}
          activeOpacity={0.8}
        >
          <Text style={styles.authButtonText}>Registrarse / Iniciar Sesión</Text>
        </TouchableOpacity>
      </CardView>

      {/* 3. Legal Warning Disclaimer */}
      <Text style={styles.sectionTitle}>Términos y Responsabilidad</Text>
      <CardView style={[styles.disclaimerCard, { borderColor: accentColor }]}>
        <View style={styles.disclaimerHeader}>
          <SymbolView name="exclamationmark.triangle.fill" size={20} tintColor={accentColor} />
          <Text style={[styles.disclaimerTitle, { color: accentColor }]}>Advertencia Legal</Text>
        </View>
        <Text style={styles.disclaimerText}>
          La información proporcionada por **Tengo Derechos** es de carácter estrictamente educativo e informativo.
          Esta aplicación utiliza inteligencia artificial RAG y bases de datos oficiales, pero **no constituye asesoría jurídica profesional ni representación legal**. El uso de esta información es responsabilidad exclusiva del usuario.
        </Text>
      </CardView>

      <Text style={styles.versionText}>Versión Alpha 1.0.0 • Tengo Derechos México</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    paddingBottom: 40,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginTop: 20,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18,
    marginBottom: 12,
  },
  card: {
    padding: 0,
    overflow: 'hidden',
    marginBottom: 20,
  },
  stateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    backgroundColor: 'transparent',
  },
  stateLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  stateName: {
    fontSize: 15,
    marginLeft: 10,
    fontWeight: '500',
  },
  stateNameSelected: {
    fontWeight: '700',
  },
  authHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'transparent',
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  authHeaderInfo: {
    marginLeft: 12,
    backgroundColor: 'transparent',
  },
  authTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  authSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  authDescription: {
    paddingHorizontal: 16,
    fontSize: 13,
    lineHeight: 19,
    color: '#64748B',
    marginBottom: 16,
  },
  authButton: {
    marginHorizontal: 16,
    marginBottom: 16,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  authButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
  disclaimerCard: {
    borderWidth: 1,
    borderStyle: 'solid',
    padding: 16,
    marginBottom: 30,
  },
  disclaimerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    backgroundColor: 'transparent',
  },
  disclaimerTitle: {
    fontSize: 15,
    fontWeight: '800',
    marginLeft: 8,
  },
  disclaimerText: {
    fontSize: 13,
    lineHeight: 20,
    color: '#64748B',
  },
  versionText: {
    fontSize: 11,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 10,
  },
});
