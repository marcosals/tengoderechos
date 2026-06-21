import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  ActivityIndicator, 
  Image, 
  Alert,
  Dimensions
} from 'react-native';
import { SymbolView } from 'expo-symbols';
import * as ImagePicker from 'expo-image-picker';
import { useCameraPermissions } from 'expo-camera';
import { router } from 'expo-router';

import { Text, View, CardView, TextInput, useThemeColor } from '@/components/Themed';
import { AuthStore } from '@/components/AuthStore';

const { width } = Dimensions.get('window');

interface AnalysisReport {
  title: string;
  risk: 'Bajo' | 'Moderado' | 'Alto';
  description: string;
  laws: string[];
  recommendation: string;
}

export default function MultimediaScreen() {
  const [session, setSession] = useState(AuthStore.getSession());
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [contextText, setContextText] = useState('');
  
  // Permissions hooks
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [libraryPermission, requestLibraryPermission] = ImagePicker.useMediaLibraryPermissions();

  // Loading / Processing States
  const [processing, setProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState(0);
  const [report, setReport] = useState<AnalysisReport | null>(null);

  const primaryColor = useThemeColor({}, 'primary');
  const accentColor = useThemeColor({}, 'accent');
  const textMutedColor = useThemeColor({}, 'textMuted');

  const steps = [
    'Removiendo metadatos EXIF y ubicación GPS...',
    'Difuminando rostros y matrículas de vehículos...',
    'Enviando imagen a análisis de inteligencia artificial...',
    'Contrastando con Códigos Civiles y Penales...'
  ];

  // Subscribe to AuthStore changes
  useEffect(() => {
    const unsubscribe = AuthStore.subscribe((newSession) => {
      setSession(newSession);
    });
    return unsubscribe;
  }, []);

  const isLoggedIn = !!session;

  // Request Camera Permission
  const verifyCameraPermission = async () => {
    if (!cameraPermission || !cameraPermission.granted) {
      const response = await requestCameraPermission();
      return response.granted;
    }
    return true;
  };

  // Request Library Permission
  const verifyLibraryPermission = async () => {
    if (!libraryPermission || !libraryPermission.granted) {
      const response = await requestLibraryPermission();
      return response.granted;
    }
    return true;
  };

  // Launch native camera
  const handleLaunchCamera = async () => {
    const hasPermission = await verifyCameraPermission();
    if (!hasPermission) {
      Alert.alert('Permiso Requerido', 'Necesitamos acceso a tu cámara para capturar la evidencia.');
      return;
    }

    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setImageUri(result.assets[0].uri);
        setReport(null);
      }
    } catch (error) {
      console.error('Camera launch error:', error);
      Alert.alert('Simulador Detectado', 'La cámara no está disponible en este dispositivo. Cargaremos una imagen de demostración.', [
        {
          text: 'Ok',
          onPress: () => {
            setImageUri('https://images.unsplash.com/photo-1594122230689-486b6cd824ce?q=80&w=600');
            setReport(null);
          }
        }
      ]);
    }
  };

  // Launch photo library selector
  const handleSelectFromLibrary = async () => {
    const hasPermission = await verifyLibraryPermission();
    if (!hasPermission) {
      Alert.alert('Permiso Requerido', 'Necesitamos acceso a tu biblioteca para cargar imágenes.');
      return;
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setImageUri(result.assets[0].uri);
        setReport(null);
      }
    } catch (error) {
      console.error('Library picker error:', error);
    }
  };

  // Trigger analysis pipeline simulation
  const handleAnalyzeEvidence = async () => {
    if (!imageUri) return;
    setProcessing(true);
    setProcessingStep(0);
    setReport(null);

    // Simulated stepping increments
    for (let step = 0; step < steps.length; step++) {
      await new Promise(resolve => setTimeout(resolve, 1200));
      setProcessingStep(step + 1);
    }

    // Generate Mock Report based on context keyword match
    const lowerContext = contextText.toLowerCase();
    let finalReport: AnalysisReport = {
      title: 'Reporte General de Legalidad',
      risk: 'Moderado',
      description: 'Se ha analizado la imagen provista. Corresponde a una interacción física o suceso material en la vía pública. De acuerdo al Artículo 16 de la Constitución de los Estados Unidos Mexicanos, todo acto de molestia debe provenir de autoridad competente fundada y motivada.',
      laws: ['Artículo 16 - Constitución Federal', 'Artículo 14 - Debido Proceso'],
      recommendation: 'Asegúrate de registrar los números de identificación de los agentes involucrados y guarda esta evidencia en un lugar seguro. Evita confrontaciones físicas.'
    };

    if (lowerContext.includes('soborno') || lowerContext.includes('mordida') || lowerContext.includes('dinero') || lowerContext.includes('policía')) {
      finalReport = {
        title: 'Posible Cohecho / Extorsión Policial',
        risk: 'Alto',
        description: 'La evidencia muestra a un agente del orden público solicitando o aceptando dádivas (dinero). El Código Penal tipifica esto como Cohecho. El Reglamento de Tránsito prohíbe explícitamente a los oficiales solicitar prebendas económicas a cambio de condonar multas.',
        laws: ['Artículo 222 - Código Penal Federal (Cohecho)', 'Artículo 50 - Reglamento de Tránsito de la CDMX'],
        recommendation: 'Tienes derecho a rehusarte a pagar un soborno. Denuncia de inmediato a la unidad o patrulla ante el Órgano de Control Interno (Asuntos Internos) o la App Mi Policía en CDMX. No entregues documentos originales.'
      };
    } else if (lowerContext.includes('choque') || lowerContext.includes('accidente') || lowerContext.includes('tránsito')) {
      finalReport = {
        title: 'Hecho de Tránsito (Daños Materiales)',
        risk: 'Bajo',
        description: 'La imagen documenta una colisión de tránsito que involucra únicamente daños materiales en propiedad privada. El Artículo 50 de tránsito permite el retiro de los autos a zona de resguardo si los conductores están de acuerdo y tienen seguro.',
        laws: ['Artículo 50 - Reglamento de Tránsito CDMX', 'Artículo 2100 - Código Civil CDMX (Daños)'],
        recommendation: 'Espera la llegada del ajustador de seguros. Toma fotos de los ángulos de impacto y placas de ambos vehículos. No muevas el auto si hay lesionados.'
      };
    }

    setReport(finalReport);
    setProcessing(false);
  };

  const handleClear = () => {
    setImageUri(null);
    setContextText('');
    setReport(null);
  };

  const handleLogout = () => {
    AuthStore.setSession(null);
    handleClear();
  };

  // Screen 1: Guest Mode view (Login Required)
  if (!isLoggedIn) {
    return (
      <ScrollView contentContainerStyle={styles.centeredScroll}>
        <CardView style={styles.authPromptCard}>
          <View style={styles.lockBadge} lightColor="#EEF2F6" darkColor="#1E293B">
            <SymbolView name="lock.fill" size={32} tintColor={primaryColor} />
          </View>
          <Text style={styles.authPromptTitle}>Inicio de Sesión Requerido</Text>
          <Text style={styles.authPromptSubtitle}>
            Para subir fotos y videos con evidencias de posibles infracciones civiles o viales (por ejemplo, abuso de autoridad o accidentes) y obtener análisis de legalidad respaldados por IA, es necesario iniciar sesión.
          </Text>
          
          <CardView style={styles.benefitsCard} lightColor="#F8FAFC" darkColor="#111827">
            <Text style={styles.benefitsTitle}>Beneficios de tu Cuenta:</Text>
            <Text style={styles.benefitItem}>🔒 Evidencias guardadas de manera privada y encriptada.</Text>
            <Text style={styles.benefitItem}>👁️ Limpieza automática de metadatos GPS e imágenes.</Text>
            <Text style={styles.benefitItem}>⚖️ Generación de reportes PDF compartibles con tu abogado.</Text>
          </CardView>

          <TouchableOpacity 
            style={[styles.loginButton, { backgroundColor: primaryColor }]} 
            onPress={() => router.push('/auth')}
            activeOpacity={0.8}
          >
            <Text style={styles.loginButtonText}>Registrarse / Iniciar Sesión</Text>
          </TouchableOpacity>
        </CardView>
      </ScrollView>
    );
  }

  // Screen 2: Interactive Upload Interface
  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutText}>Cerrar Sesión</Text>
      </TouchableOpacity>

      <Text style={styles.screenHeading}>Pregunta con Evidencia</Text>
      <Text style={styles.screenSubheading}>
        Sube una fotografía o captura un video corto para recibir un diagnóstico de legalidad preliminar.
      </Text>

      {/* Media Selection Area */}
      {!imageUri ? (
        <View style={styles.uploadOptionsRow}>
          <TouchableOpacity 
            style={styles.pickerBox} 
            onPress={handleLaunchCamera}
            activeOpacity={0.7}
          >
            <SymbolView name="camera" size={36} tintColor={primaryColor} />
            <Text style={styles.pickerLabel}>Tomar Foto / Video</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.pickerBox} 
            onPress={handleSelectFromLibrary}
            activeOpacity={0.7}
          >
            <SymbolView name="photo" size={36} tintColor={primaryColor} />
            <Text style={styles.pickerLabel}>Galería de Fotos</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <CardView style={styles.previewContainer}>
          <Image source={{ uri: imageUri }} style={styles.previewImage} />
          
          <TouchableOpacity style={styles.clearButton} onPress={handleClear}>
            <SymbolView name="xmark.circle.fill" size={24} tintColor="#EF4444" />
          </TouchableOpacity>

          <Text style={styles.previewMeta}>Evidencia lista para moderación</Text>
        </CardView>
      )}

      {/* Context Input */}
      {imageUri && !report && !processing && (
        <View style={styles.inputSection}>
          <Text style={styles.inputLabel}>Describe la situación u omisión legal (Opcional):</Text>
          <TextInput
            style={styles.multilineInput}
            multiline
            numberOfLines={4}
            placeholder="Ej. Oficial me pide $500 pesos por no tener la tarjeta física..."
            value={contextText}
            onChangeText={setContextText}
          />

          <TouchableOpacity 
            style={[styles.analyzeBtn, { backgroundColor: primaryColor }]} 
            onPress={handleAnalyzeEvidence}
            activeOpacity={0.85}
          >
            <SymbolView name="shield.fill" size={18} tintColor="#FFF" />
            <Text style={styles.analyzeBtnText}>Analizar Evidencia</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Loading Steps Overlay */}
      {processing && (
        <CardView style={styles.processingCard}>
          <ActivityIndicator size="large" color={primaryColor} />
          <Text style={styles.processingTitle}>Limpiando y Analizando...</Text>
          
          <View style={styles.stepsContainer}>
            {steps.map((step, idx) => {
              const isDone = processingStep > idx;
              const isCurrent = processingStep === idx;
              return (
                <View key={idx} style={styles.stepRow}>
                  <SymbolView 
                    name={isDone ? "checkmark.circle.fill" : isCurrent ? "arrow.right.circle.fill" : "circle"} 
                    size={16} 
                    tintColor={isDone ? "#10B981" : isCurrent ? primaryColor : textMutedColor} 
                  />
                  <Text style={[
                    styles.stepText, 
                    isCurrent && { fontWeight: '700', color: primaryColor },
                    isDone && { color: '#64748B' }
                  ]}>
                    {step}
                  </Text>
                </View>
              );
            })}
          </View>
        </CardView>
      )}

      {/* Ingestion Report Display */}
      {report && (
        <View style={styles.reportSection}>
          <View style={styles.reportHeaderRow}>
            <Text style={styles.reportSectionHeading}>Diagnóstico de Legalidad</Text>
            <TouchableOpacity style={styles.resetLink} onPress={handleClear}>
              <Text style={{ color: primaryColor, fontWeight: '700' }}>Nuevo Análisis</Text>
            </TouchableOpacity>
          </View>

          <CardView style={[
            styles.reportCard, 
            report.risk === 'Alto' && { borderColor: '#EF4444' },
            report.risk === 'Moderado' && { borderColor: '#F59E0B' },
            report.risk === 'Bajo' && { borderColor: '#10B981' }
          ]}>
            <View style={styles.reportHeader}>
              <Text style={styles.reportTitle}>{report.title}</Text>
              <View style={[
                styles.riskBadge,
                report.risk === 'Alto' && { backgroundColor: '#FEE2E2' },
                report.risk === 'Moderado' && { backgroundColor: '#FEF3C7' },
                report.risk === 'Bajo' && { backgroundColor: '#D1FAE5' }
              ]}>
                <Text style={[
                  styles.riskText,
                  report.risk === 'Alto' && { color: '#EF4444' },
                  report.risk === 'Moderado' && { color: '#D97706' },
                  report.risk === 'Bajo' && { color: '#059669' }
                ]}>
                  Riesgo: {report.risk}
                </Text>
              </View>
            </View>

            <Text style={styles.reportDesc}>{report.description}</Text>

            <Text style={styles.subHeading}>Artículos de Ley Vinculados:</Text>
            <View style={styles.lawsList}>
              {report.laws.map((law, idx) => (
                <View key={idx} style={styles.lawItem}>
                  <SymbolView name="doc.text.fill" size={14} tintColor={primaryColor} />
                  <Text style={styles.lawText}>{law}</Text>
                </View>
              ))}
            </View>

            <Text style={styles.subHeading}>Recomendación del Asistente:</Text>
            <Text style={styles.recommendationText}>{report.recommendation}</Text>

            <Text style={styles.disclaimerText}>
              *Este análisis multimedia es simulado y puramente indicativo en base a inteligencia artificial general. No representa un dictamen legal oficial.
            </Text>
          </CardView>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    paddingBottom: 40,
  },
  centeredScroll: {
    flexGrow: 1,
    padding: 20,
    justifyContent: 'center',
  },
  authPromptCard: {
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  lockBadge: {
    padding: 18,
    borderRadius: 24,
    marginBottom: 20,
  },
  authPromptTitle: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 10,
    textAlign: 'center',
  },
  authPromptSubtitle: {
    fontSize: 14,
    color: '#64748B',
    lineHeight: 21,
    textAlign: 'center',
    marginBottom: 20,
  },
  benefitsCard: {
    width: '100%',
    padding: 16,
    borderWidth: 0,
    marginBottom: 24,
    borderRadius: 8,
  },
  benefitsTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 10,
  },
  benefitItem: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 8,
    fontWeight: '500',
  },
  loginButton: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loginButtonText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
  },
  logoutButton: {
    alignSelf: 'flex-end',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 10,
  },
  logoutText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#EF4444',
  },
  screenHeading: {
    fontSize: 22,
    fontWeight: '900',
    marginBottom: 8,
  },
  screenSubheading: {
    fontSize: 14,
    color: '#64748B',
    lineHeight: 20,
    marginBottom: 24,
  },
  uploadOptionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    backgroundColor: 'transparent',
  },
  pickerBox: {
    width: '48%',
    height: 120,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerLabel: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 10,
    textAlign: 'center',
  },
  previewContainer: {
    padding: 10,
    alignItems: 'center',
    marginBottom: 20,
  },
  previewImage: {
    width: '100%',
    height: width * 0.5,
    borderRadius: 8,
  },
  clearButton: {
    position: 'absolute',
    top: 18,
    right: 18,
    backgroundColor: '#FFF',
    borderRadius: 12,
  },
  previewMeta: {
    fontSize: 12,
    fontWeight: '600',
    color: '#10B981',
    marginTop: 8,
  },
  inputSection: {
    backgroundColor: 'transparent',
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
  },
  multilineInput: {
    height: 100,
    textAlignVertical: 'top',
    padding: 12,
    marginBottom: 20,
  },
  analyzeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 8,
  },
  analyzeBtnText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
    marginLeft: 8,
  },
  processingCard: {
    padding: 24,
    alignItems: 'center',
    marginTop: 10,
  },
  processingTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginTop: 16,
    marginBottom: 20,
  },
  stepsContainer: {
    width: '100%',
    backgroundColor: 'transparent',
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    backgroundColor: 'transparent',
  },
  stepText: {
    fontSize: 13,
    marginLeft: 10,
    color: '#94A3B8',
  },
  reportSection: {
    marginTop: 10,
    backgroundColor: 'transparent',
  },
  reportHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    backgroundColor: 'transparent',
  },
  reportSectionHeading: {
    fontSize: 15,
    fontWeight: '800',
    color: '#64748B',
    textTransform: 'uppercase',
  },
  resetLink: {
    backgroundColor: 'transparent',
  },
  reportCard: {
    borderWidth: 2,
    padding: 18,
  },
  reportHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
    backgroundColor: 'transparent',
  },
  reportTitle: {
    fontSize: 17,
    fontWeight: '800',
    flex: 1,
    marginRight: 8,
  },
  riskBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  riskText: {
    fontSize: 11,
    fontWeight: '800',
  },
  reportDesc: {
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 16,
  },
  subHeading: {
    fontSize: 13,
    fontWeight: '800',
    textTransform: 'uppercase',
    color: '#64748B',
    marginBottom: 8,
  },
  lawsList: {
    marginBottom: 16,
    backgroundColor: 'transparent',
  },
  lawItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    backgroundColor: 'transparent',
  },
  lawText: {
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 8,
  },
  recommendationText: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
    marginBottom: 16,
  },
  disclaimerText: {
    fontSize: 11,
    color: '#94A3B8',
    fontStyle: 'italic',
    lineHeight: 16,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 12,
  },
});
