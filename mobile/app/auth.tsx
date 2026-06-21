import React, { useState } from 'react';
import { 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  ActivityIndicator, 
  Alert, 
  KeyboardAvoidingView, 
  Platform 
} from 'react-native';
import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';

import { Text, View, TextInput, CardView, useThemeColor } from '@/components/Themed';
import { AuthStore } from '@/components/AuthStore';
import { supabase } from '@/utils/supabase';

export default function AuthScreen() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);

  const primaryColor = useThemeColor({}, 'primary');
  const accentColor = useThemeColor({}, 'accent');
  const textMutedColor = useThemeColor({}, 'textMuted');

  const handleAuthAction = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Campos Incompletos', 'Por favor ingresa tu correo y contraseña.');
      return;
    }

    if (isSignUp && !displayName.trim()) {
      Alert.alert('Campo Incompleto', 'Por favor ingresa tu nombre para el registro.');
      return;
    }

    setLoading(true);

    // MOCK AUTH PIPELINE (if Supabase credentials are missing or unset)
    if (!supabase) {
      await new Promise(resolve => setTimeout(resolve, 1200)); // Simulating network lag
      
      if (isSignUp) {
        Alert.alert(
          'Registro Exitoso (Demo)', 
          'Tu cuenta demostrativa ha sido creada. Ahora puedes iniciar sesión con tus credenciales.',
          [
            { 
              text: 'Entendido', 
              onPress: () => {
                setIsSignUp(false);
                setLoading(false);
              } 
            }
          ]
        );
      } else {
        // Log in with mock session
        AuthStore.setSession({
          user: {
            id: 'mock-user-uuid-12345',
            email: email.trim().toLowerCase(),
            display_name: displayName.trim() || email.split('@')[0]
          },
          access_token: 'mock-jwt-auth-token-98765'
        });
        setLoading(false);
        router.back();
      }
      return;
    }

    // REAL SUPABASE AUTH PIPELINE
    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim().toLowerCase(),
          password: password,
          options: {
            data: {
              display_name: displayName.trim(),
            }
          }
        });

        if (error) throw error;
        
        Alert.alert(
          'Confirmación Requerida', 
          'Se ha enviado un correo de confirmación. Por favor verifica tu bandeja de entrada antes de ingresar.',
          [{ text: 'Ok', onPress: () => setIsSignUp(false) }]
        );
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim().toLowerCase(),
          password: password
        });

        if (error) throw error;

        if (data.session) {
          AuthStore.setSession(data.session);
          router.back();
        }
      }
    } catch (err: any) {
      Alert.alert('Fallo de Autenticación', err.message || 'Ocurrió un error inesperado.');
    } finally {
      setLoading(false);
    }
  };

  const handleSocialLogin = async (provider: 'google' | 'apple') => {
    setLoading(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Set mock social login session
    AuthStore.setSession({
      user: {
        id: `mock-${provider}-uuid`,
        email: `${provider}-user@example.com`,
        display_name: `Invitado ${provider.charAt(0).toUpperCase() + provider.slice(1)}`
      },
      access_token: `mock-social-jwt-${provider}`
    });
    
    setLoading(false);
    router.back();
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
      style={styles.keyboardContainer}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        {/* Header */}
        <TouchableOpacity style={styles.closeButton} onPress={() => router.back()}>
          <SymbolView name="xmark" size={20} tintColor={primaryColor} />
        </TouchableOpacity>

        {/* Hero title */}
        <View style={styles.logoSection}>
          <SymbolView name="scale.3d" size={44} tintColor={primaryColor} />
          <Text style={styles.appName}>Tengo Derechos</Text>
          <Text style={styles.tagline}>
            {isSignUp ? 'Regístrate para guardar tu historial legal' : 'Inicia sesión para sincronizar tus consultas'}
          </Text>
        </View>

        {/* Form Fields */}
        <CardView style={styles.formCard}>
          {isSignUp && (
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Nombre Completo</Text>
              <TextInput
                style={styles.input}
                placeholder="Juan Pérez"
                value={displayName}
                onChangeText={setDisplayName}
                autoCapitalize="words"
              />
            </View>
          )}

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Correo Electrónico</Text>
            <TextInput
              style={styles.input}
              placeholder="correo@ejemplo.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Contraseña</Text>
            <TextInput
              style={styles.input}
              placeholder="••••••••"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          {loading ? (
            <ActivityIndicator size="large" color={primaryColor} style={styles.loader} />
          ) : (
            <TouchableOpacity 
              style={[styles.submitButton, { backgroundColor: primaryColor }]} 
              onPress={handleAuthAction}
              activeOpacity={0.8}
            >
              <Text style={styles.submitButtonText}>
                {isSignUp ? 'Crear Cuenta' : 'Entrar'}
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity 
            style={styles.toggleMode} 
            onPress={() => setIsSignUp(!isSignUp)}
            disabled={loading}
          >
            <Text style={styles.toggleText}>
              {isSignUp ? '¿Ya tienes cuenta? Inicia Sesión' : '¿No tienes cuenta? Regístrate'}
            </Text>
          </TouchableOpacity>
        </CardView>

        {/* Separator */}
        <View style={styles.separatorContainer}>
          <View style={styles.separatorLine} />
          <Text style={styles.separatorText}>O CONTINÚA CON</Text>
          <View style={styles.separatorLine} />
        </View>

        {/* Social Buttons */}
        <View style={styles.socialContainer}>
          <TouchableOpacity 
            style={styles.socialButton} 
            onPress={() => handleSocialLogin('google')}
            disabled={loading}
            activeOpacity={0.8}
          >
            <SymbolView name="g.circle.fill" size={20} tintColor={primaryColor} />
            <Text style={styles.socialButtonText}>Google</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.socialButton} 
            onPress={() => handleSocialLogin('apple')}
            disabled={loading}
            activeOpacity={0.8}
          >
            <SymbolView name="apple.logo" size={20} tintColor={primaryColor} />
            <Text style={styles.socialButtonText}>Apple</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardContainer: {
    flex: 1,
  },
  container: {
    flexGrow: 1,
    padding: 24,
    justifyContent: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 40,
    right: 24,
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'transparent',
    zIndex: 10,
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: 30,
    backgroundColor: 'transparent',
  },
  appName: {
    fontSize: 26,
    fontWeight: '900',
    marginTop: 10,
  },
  tagline: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 6,
    textAlign: 'center',
  },
  formCard: {
    padding: 20,
    marginBottom: 25,
  },
  inputGroup: {
    marginBottom: 16,
    backgroundColor: 'transparent',
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 6,
  },
  input: {
    height: 48,
  },
  loader: {
    marginVertical: 14,
  },
  submitButton: {
    height: 48,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  submitButtonText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
  },
  toggleMode: {
    alignItems: 'center',
    marginTop: 18,
    backgroundColor: 'transparent',
  },
  toggleText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  separatorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 15,
    backgroundColor: 'transparent',
  },
  separatorLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E2E8F0',
  },
  separatorText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94A3B8',
    marginHorizontal: 12,
  },
  socialContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: 'transparent',
  },
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '48%',
    height: 48,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
  },
  socialButtonText: {
    fontSize: 14,
    fontWeight: '700',
    marginLeft: 8,
  },
});
