import React, { useState, useEffect } from 'react';
import { StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { router } from 'expo-router';
import { supabase } from '@/utils/supabase';

import { Text, View, CardView, useThemeColor } from '@/components/Themed';
import { LocationStore } from '@/components/LocationStore';
import { AuthStore } from '@/components/AuthStore';

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
  const [session, setSession] = useState(AuthStore.getSession());
  
  const primaryColor = useThemeColor({}, 'primary');
  const accentColor = useThemeColor({}, 'accent');
  const textMutedColor = useThemeColor({}, 'textMuted');

  // Subscribe to LocationStore updates
  useEffect(() => {
    const unsubscribe = LocationStore.subscribe((newState) => {
      setCurrentState(newState);
    });
    return unsubscribe;
  }, []);

  // Subscribe to AuthStore updates
  useEffect(() => {
    const unsubscribe = AuthStore.subscribe((newSession) => {
      setSession(newSession);
    });
    return unsubscribe;
  }, []);

  const selectState = (stateName: string) => {
    LocationStore.setState(stateName);
  };

  const handleAuthPress = () => {
    if (session) {
      // Logout
      AuthStore.setSession(null);
    } else {
      // Go to Login Screen
      router.push('/auth');
    }
  };

  const handleDeleteAccountPress = () => {
    Alert.alert(
      '¿Eliminar tu cuenta?',
      'Esta acción es completamente irreversible. Se borrarán todas tus consultas de derechos guardadas y reportes de evidencia permanentemente.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Continuar', 
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Confirmar Eliminación',
              '¿Estás absolutamente seguro de que deseas eliminar tu cuenta de Tengo Derechos? No se podrán recuperar tus datos.',
              [
                { text: 'Cancelar', style: 'cancel' },
                { 
                  text: 'Eliminar Cuenta', 
                  style: 'destructive',
                  onPress: executeAccountDeletion
                }
              ]
            );
          }
        }
      ]
    );
  };

  const executeAccountDeletion = async () => {
    if (!session || !session.user) return;
    
    if (!supabase || session.user.id.startsWith('mock-')) {
      AuthStore.setSession(null);
      Alert.alert('Cuenta Eliminada (Modo Demo)', 'Tu sesión demostrativa ha sido eliminada y tus datos locales se han borrado.');
      router.replace('/');
      return;
    }

    try {
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', session.user.id);

      if (error) throw error;

      AuthStore.setSession(null);
      Alert.alert('Cuenta Eliminada', 'Tu cuenta y todos tus datos personales han sido completamente eliminados del sistema.');
      router.replace('/');
    } catch (err: any) {
      console.error('❌ Failed to delete account:', err);
      Alert.alert('Error', 'No pudimos procesar la eliminación de tu cuenta en este momento. Inténtalo de nuevo.');
    }
  };

  // Helper to extract display name safely from either real or mock session
  const getUserName = () => {
    if (!session || !session.user) return 'Modo Invitado';
    
    // Check real Supabase user_metadata
    const userMetadata = (session.user as any).user_metadata;
    if (userMetadata && userMetadata.display_name) {
      return userMetadata.display_name;
    }

    // Check mock display name
    if ('display_name' in session.user) {
      return (session.user as any).display_name;
    }

    return session.user.email || 'Usuario';
  };

  // Helper to extract email safely
  const getUserEmail = () => {
    if (!session || !session.user) return 'Las búsquedas son anónimas y locales.';
    return session.user.email || '';
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

      {/* 2. Profile / Account Settings */}
      <Text style={styles.sectionTitle}>Perfil y Sincronización</Text>
      <CardView style={styles.card}>
        <View style={styles.authHeader}>
          <View style={styles.avatarPlaceholder} lightColor="#E2E8F0" darkColor="#334155">
            <SymbolView 
              name={session ? "person.crop.circle.fill" : "person.fill"} 
              size={24} 
              tintColor={primaryColor} 
            />
          </View>
          <View style={styles.authHeaderInfo}>
            <Text style={styles.authTitle}>{getUserName()}</Text>
            <Text style={styles.authSubtitle}>{getUserEmail()}</Text>
          </View>
        </View>
        
        <Text style={styles.authDescription}>
          {session
            ? 'Has iniciado sesión correctamente. Tu historial legal y cargas de evidencias están sincronizados y resguardados en tu bóveda privada.'
            : 'Crea una cuenta para guardar tus consultas, sincronizar tu historial legal y habilitar la cámara para realizar análisis multimedia ("¿Es esto legal?").'
          }
        </Text>

        <TouchableOpacity 
          style={[
            styles.authButton, 
            { backgroundColor: session ? '#EF4444' : primaryColor }
          ]}
          onPress={handleAuthPress}
          activeOpacity={0.8}
        >
          <Text style={styles.authButtonText}>
            {session ? 'Cerrar Sesión' : 'Registrarse / Iniciar Sesión'}
          </Text>
        </TouchableOpacity>

        {session && (
          <TouchableOpacity 
            style={styles.deleteAccountButton}
            onPress={handleDeleteAccountPress}
            activeOpacity={0.8}
          >
            <Text style={styles.deleteAccountButtonText}>Eliminar Cuenta de forma permanente</Text>
          </TouchableOpacity>
        )}
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
  deleteAccountButton: {
    marginHorizontal: 16,
    marginBottom: 16,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  deleteAccountButtonText: {
    color: '#EF4444',
    fontSize: 13,
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
