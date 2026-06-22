import React, { useState, useCallback } from 'react';
import { 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  ActivityIndicator, 
  Alert, 
  Image, 
  Dimensions 
} from 'react-native';
import { SymbolView } from 'expo-symbols';
import { router, useFocusEffect } from 'expo-router';

import { Text, View, CardView, useThemeColor } from '@/components/Themed';
import { AuthStore } from '@/components/AuthStore';
import { supabase } from '@/utils/supabase';

const { width } = Dimensions.get('window');

// Mock Data for offline or guest/demo mode
const MOCK_SAVED_RIGHTS = [
  {
    id: 'mock-saved-1',
    title: '¿Qué hacer si choco por detrás?',
    query_text: '¿Qué hacer si choco por detrás?',
    ai_answer: 'Si sufres una colisión por detrás en la CDMX...',
    saved_at: new Date(Date.now() - 3600000 * 2).toISOString(),
    jurisdiction: 'CDMX'
  },
  {
    id: 'mock-saved-2',
    title: 'Obligaciones de pensión alimenticia',
    query_text: 'Obligaciones de pensión alimenticia',
    ai_answer: 'De acuerdo con el Código Civil Federal...',
    saved_at: new Date(Date.now() - 3600000 * 24).toISOString(),
    jurisdiction: 'Federal'
  }
];

const MOCK_MEDIA_ANALYSES = [
  {
    id: 'mock-media-1',
    storage_path: 'mock/image1.jpg',
    context_text: 'Oficial de tránsito pidiendo dinero en CDMX',
    status: 'completed',
    analysis_report: {
      title: 'Posible Cohecho / Extorsión Policial',
      risk: 'Alto',
      description: 'La evidencia muestra una solicitud indebida de prebenda económica por parte de un servidor público. El Código Penal tipifica esto como Cohecho. El Reglamento de Tránsito prohíbe explícitamente a los oficiales solicitar prebendas económicas.',
      laws: ['Artículo 222 - Código Penal Federal (Cohecho)', 'Artículo 50 - Reglamento de Tránsito de la CDMX'],
      recommendation: 'Tienes derecho a rehusarte a pagar un soborno. Denuncia ante la unidad de Asuntos Internos de tu localidad. No entregues documentos originales.'
    },
    created_at: new Date(Date.now() - 3600000 * 48).toISOString()
  }
];

export default function SavedScreen() {
  const [activeTab, setActiveTab] = useState<'rights' | 'media'>('rights');
  const [session, setSession] = useState(AuthStore.getSession());
  const [loading, setLoading] = useState(false);
  const [savedRights, setSavedRights] = useState<any[]>([]);
  const [mediaAnalyses, setMediaAnalyses] = useState<any[]>([]);
  const [expandedMediaId, setExpandedMediaId] = useState<string | null>(null);
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});

  const primaryColor = useThemeColor({}, 'primary');
  const accentColor = useThemeColor({}, 'accent');
  const textMutedColor = useThemeColor({}, 'textMuted');
  const cardBg = useThemeColor({}, 'cardBackground');
  const borderCol = useThemeColor({}, 'border');

  // Reload history data when the screen is focused
  useFocusEffect(
    useCallback(() => {
      const currentSession = AuthStore.getSession();
      setSession(currentSession);

      if (currentSession?.user) {
        loadUserData(currentSession.user.id);
      } else {
        setSavedRights([]);
        setMediaAnalyses([]);
      }
    }, [])
  );

  const loadUserData = async (userId: string) => {
    setLoading(true);

    if (!supabase || userId.startsWith('mock-')) {
      // Mock flow
      setSavedRights(MOCK_SAVED_RIGHTS);
      setMediaAnalyses(MOCK_MEDIA_ANALYSES);
      setLoading(false);
      return;
    }

    try {
      // Load Saved Rights
      const { data: rightsData, error: rightsError } = await supabase
        .from('saved_rights')
        .select('*')
        .eq('user_id', userId)
        .order('saved_at', { ascending: false });

      if (rightsError) throw rightsError;
      setSavedRights(rightsData || []);

      // Load Media Analyses
      const { data: mediaData, error: mediaError } = await supabase
        .from('media_analyses')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (mediaError) throw mediaError;
      setMediaAnalyses(mediaData || []);
    } catch (err) {
      console.error('❌ Error fetching user saved data:', err);
      Alert.alert('Error', 'No pudimos cargar tu historial guardado de la base de datos.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRight = (id: string) => {
    Alert.alert(
      'Eliminar Consulta',
      '¿Estás seguro de que quieres eliminar esta consulta guardada de tu historial?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            if (!supabase || id.startsWith('mock-')) {
              setSavedRights(prev => prev.filter(item => item.id !== id));
              return;
            }

            try {
              const { error } = await supabase
                .from('saved_rights')
                .delete()
                .eq('id', id);

              if (error) throw error;
              setSavedRights(prev => prev.filter(item => item.id !== id));
            } catch (err: any) {
              console.error('Error deleting saved right:', err.message);
              Alert.alert('Error', 'No se pudo eliminar de la base de datos.');
            }
          }
        }
      ]
    );
  };

  const handleDeleteMedia = (id: string, storagePath: string) => {
    Alert.alert(
      'Eliminar Reporte',
      '¿Estás seguro de que quieres eliminar permanentemente este caso y su archivo asociado?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            if (!supabase || id.startsWith('mock-')) {
              setMediaAnalyses(prev => prev.filter(item => item.id !== id));
              return;
            }

            try {
              // Delete database entry
              const { error: dbError } = await supabase
                .from('media_analyses')
                .delete()
                .eq('id', id);

              if (dbError) throw dbError;

              // Delete file from storage
              const { error: storageError } = await supabase.storage
                .from('media-uploads')
                .remove([storagePath]);

              if (storageError) {
                console.warn('Storage file deletion failed or file already deleted:', storageError.message);
              }

              setMediaAnalyses(prev => prev.filter(item => item.id !== id));
              if (expandedMediaId === id) setExpandedMediaId(null);
            } catch (err: any) {
              console.error('Error deleting media analysis:', err.message);
              Alert.alert('Error', 'No se pudo eliminar el reporte.');
            }
          }
        }
      ]
    );
  };

  const handleMediaCardPress = async (id: string, storagePath: string) => {
    if (expandedMediaId === id) {
      setExpandedMediaId(null);
      return;
    }

    setExpandedMediaId(id);

    // If signed URL is not yet generated, create one
    if (!signedUrls[storagePath]) {
      if (!supabase || id.startsWith('mock-')) {
        // Mock image fallback (placeholder from web or local asset)
        setSignedUrls(prev => ({
          ...prev,
          [storagePath]: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&q=80&w=400'
        }));
        return;
      }

      try {
        const { data, error } = await supabase.storage
          .from('media-uploads')
          .createSignedUrl(storagePath, 3600); // 1 hour token

        if (error) throw error;
        if (data?.signedUrl) {
          setSignedUrls(prev => ({
            ...prev,
            [storagePath]: data.signedUrl
          }));
        }
      } catch (err) {
        console.error('❌ Failed to create signed URL:', err);
      }
    }
  };

  const getRiskBadgeStyles = (risk: string) => {
    const r = (risk || '').toLowerCase();
    if (r === 'alto') {
      return { bg: '#FEE2E2', text: '#EF4444', label: 'Riesgo Alto' };
    } else if (r === 'moderado') {
      return { bg: '#FEF3C7', text: '#D97706', label: 'Riesgo Moderado' };
    }
    return { bg: '#D1FAE5', text: '#10B981', label: 'Riesgo Bajo' };
  };

  // 1. GUEST / UNAUTHENTICATED PLACEHOLDER
  if (!session || !session.user) {
    return (
      <View style={styles.guestContainer}>
        <View style={styles.lockIllustration} lightColor="#F1F5F9" darkColor="#1E293B">
          <SymbolView name="lock.shield" size={48} tintColor={primaryColor} />
        </View>
        <Text style={styles.guestTitle}>Historial Personal</Text>
        <Text style={styles.guestSubtitle}>
          Regístrate o inicia sesión para resguardar tus consultas de derechos y reportes de evidencia multimedia en la nube de forma segura.
        </Text>
        <TouchableOpacity
          style={[styles.authBtn, { backgroundColor: primaryColor }]}
          onPress={() => router.push('/auth')}
          activeOpacity={0.8}
        >
          <Text style={styles.authBtnText}>Iniciar Sesión / Registrarse</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.mainContainer}>
      {/* Sleek Segment Selector */}
      <View style={[styles.tabsHeader, { borderBottomColor: borderCol }]} lightColor="#FFF" darkColor="#0B132B">
        <View style={[styles.segmentContainer, { borderColor: borderCol }]} lightColor="#F1F5F9" darkColor="#1E293B">
          <TouchableOpacity
            style={[
              styles.segmentBtn,
              activeTab === 'rights' && [styles.segmentBtnActive, { backgroundColor: cardBg }]
            ]}
            onPress={() => setActiveTab('rights')}
            activeOpacity={0.9}
          >
            <SymbolView 
              name="bookmark.fill" 
              size={14} 
              tintColor={activeTab === 'rights' ? primaryColor : textMutedColor} 
            />
            <Text style={[styles.segmentText, activeTab === 'rights' && styles.segmentTextActive]}>
              Derechos
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.segmentBtn,
              activeTab === 'media' && [styles.segmentBtnActive, { backgroundColor: cardBg }]
            ]}
            onPress={() => setActiveTab('media')}
            activeOpacity={0.9}
          >
            <SymbolView 
              name="doc.text.fill" 
              size={14} 
              tintColor={activeTab === 'media' ? primaryColor : textMutedColor} 
            />
            <Text style={[styles.segmentText, activeTab === 'media' && styles.segmentTextActive]}>
              Evidencia
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={primaryColor} />
          <Text style={styles.loadingText}>Cargando tu bóveda privada...</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          {activeTab === 'rights' ? (
            // RIGHTS TAB
            savedRights.length === 0 ? (
              <View style={styles.emptyContainer}>
                <SymbolView name="bookmark" size={36} tintColor={textMutedColor} />
                <Text style={styles.emptyText}>No tienes consultas guardadas</Text>
                <Text style={styles.emptySubtext}>
                  Busca tus dudas en la pantalla de inicio y toca el marcador para guardarlas aquí.
                </Text>
              </View>
            ) : (
              savedRights.map((item) => (
                <CardView key={item.id} style={styles.rightCard}>
                  <TouchableOpacity
                    style={styles.rightCardPressable}
                    onPress={() => router.push({
                      pathname: '/results',
                      params: {
                        query: item.query_text,
                        jurisdiction: item.jurisdiction || 'Federal',
                        savedId: item.id
                      }
                    })}
                    activeOpacity={0.7}
                  >
                    <View style={styles.rightInfo}>
                      <Text style={styles.rightTitle} numberOfLines={2}>{item.title}</Text>
                      <View style={styles.rightFooter}>
                        <SymbolView name="calendar" size={12} tintColor={textMutedColor} />
                        <Text style={styles.rightDate}>
                          {new Date(item.saved_at).toLocaleDateString('es-MX', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </Text>
                      </View>
                    </View>
                    <TouchableOpacity
                      style={styles.trashBtn}
                      onPress={() => handleDeleteRight(item.id)}
                      activeOpacity={0.6}
                    >
                      <SymbolView name="trash" size={18} tintColor="#EF4444" />
                    </TouchableOpacity>
                  </TouchableOpacity>
                </CardView>
              ))
            )
          ) : (
            // MEDIA TAB
            mediaAnalyses.length === 0 ? (
              <View style={styles.emptyContainer}>
                <SymbolView name="photo.on.rectangle" size={36} tintColor={textMutedColor} />
                <Text style={styles.emptyText}>No tienes reportes de evidencia</Text>
                <Text style={styles.emptySubtext}>
                  Sube fotografías de incidentes en el módulo de Evidencia para analizar legalidades con IA.
                </Text>
              </View>
            ) : (
              mediaAnalyses.map((item) => {
                const report = item.analysis_report || {};
                const isExpanded = expandedMediaId === item.id;
                const badge = getRiskBadgeStyles(report.risk);
                const imageUrl = signedUrls[item.storage_path];

                return (
                  <CardView key={item.id} style={styles.mediaCard}>
                    <TouchableOpacity
                      style={styles.mediaHeader}
                      onPress={() => handleMediaCardPress(item.id, item.storage_path)}
                      activeOpacity={0.8}
                    >
                      <View style={styles.mediaHeaderLeft}>
                        <View style={styles.mediaThumbContainer}>
                          {imageUrl ? (
                            <Image source={{ uri: imageUrl }} style={styles.mediaThumb} />
                          ) : (
                            <View style={styles.mediaThumbPlaceholder} lightColor="#E2E8F0" darkColor="#334155">
                              <SymbolView name="photo" size={16} tintColor={primaryColor} />
                            </View>
                          )}
                        </View>
                        <View style={styles.mediaHeaderText}>
                          <Text style={styles.mediaTitle} numberOfLines={1}>
                            {report.title || 'Análisis Multimedia'}
                          </Text>
                          <Text style={styles.mediaDate}>
                            {new Date(item.created_at).toLocaleDateString('es-MX', {
                              day: 'numeric',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </Text>
                        </View>
                      </View>
                      
                      <View style={styles.mediaHeaderRight}>
                        <View style={[styles.badge, { backgroundColor: badge.bg }]}>
                          <Text style={[styles.badgeText, { color: badge.text }]}>
                            {badge.label}
                          </Text>
                        </View>
                        <SymbolView
                          name={isExpanded ? 'chevron.up' : 'chevron.down'}
                          size={16}
                          tintColor={textMutedColor}
                        />
                      </View>
                    </TouchableOpacity>

                    {isExpanded && (
                      <View style={styles.expandedContent}>
                        <View style={styles.divider} />
                        
                        {/* Context info */}
                        {item.context_text && (
                          <View style={styles.contextBox} lightColor="#F8FAFC" darkColor="#1E293B">
                            <Text style={styles.contextLabel}>Contexto Ciudadano:</Text>
                            <Text style={styles.contextText}>"{item.context_text}"</Text>
                          </View>
                        )}

                        {/* Full Image */}
                        {imageUrl && (
                          <View style={styles.imageWrapper}>
                            <Image source={{ uri: imageUrl }} style={styles.fullImage} resizeMode="cover" />
                          </View>
                        )}

                        {/* Legal Assessment */}
                        <Text style={styles.expandedSectionLabel}>Análisis Jurídico</Text>
                        <Text style={styles.analysisDesc}>{report.description}</Text>

                        {/* Laws Cited */}
                        {report.laws && report.laws.length > 0 && (
                          <View style={styles.lawsSection}>
                            <Text style={styles.expandedSectionLabel}>Fundamento Legal</Text>
                            {report.laws.map((law: string, idx: number) => (
                              <View key={idx} style={styles.lawRow}>
                                <SymbolView name="checkmark.circle.fill" size={14} tintColor={primaryColor} />
                                <Text style={styles.lawText}>{law}</Text>
                              </View>
                            ))}
                          </View>
                        )}

                        {/* Recommendations */}
                        {report.recommendation && (
                          <View style={styles.recommendationBox} lightColor="#EEF2F6" darkColor="#1E293B">
                            <View style={styles.recHeader}>
                              <SymbolView name="lightbulb.fill" size={16} tintColor={accentColor} />
                              <Text style={[styles.recTitle, { color: accentColor }]}>Recomendación del Asistente</Text>
                            </View>
                            <Text style={styles.recText}>{report.recommendation}</Text>
                          </View>
                        )}

                        {/* Delete action */}
                        <TouchableOpacity
                          style={styles.deleteCaseBtn}
                          onPress={() => handleDeleteMedia(item.id, item.storage_path)}
                          activeOpacity={0.8}
                        >
                          <SymbolView name="trash.fill" size={14} tintColor="#FFF" />
                          <Text style={styles.deleteCaseText}>Eliminar Caso de la Bóveda</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </CardView>
                );
              })
            )
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
  },
  guestContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  lockIllustration: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  guestTitle: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 8,
  },
  guestSubtitle: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  authBtn: {
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 8,
  },
  authBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
  tabsHeader: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
  },
  segmentContainer: {
    flexDirection: 'row',
    borderRadius: 8,
    borderWidth: 1,
    padding: 3,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 6,
  },
  segmentBtnActive: {
    // shadow is handled by CardView themes
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  segmentText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
    marginLeft: 6,
  },
  segmentTextActive: {
    fontWeight: '700',
    color: '#4F46E5', // Accentuate the text label color
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
  },
  scrollContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 15,
    fontWeight: '700',
    marginTop: 16,
    marginBottom: 6,
  },
  emptySubtext: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 20,
  },
  rightCard: {
    marginBottom: 12,
    padding: 0,
    overflow: 'hidden',
  },
  rightCardPressable: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  rightInfo: {
    flex: 1,
    marginRight: 10,
    backgroundColor: 'transparent',
  },
  rightTitle: {
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 20,
    marginBottom: 6,
  },
  rightFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  rightDate: {
    fontSize: 11,
    color: '#94A3B8',
    marginLeft: 4,
    fontWeight: '500',
  },
  trashBtn: {
    padding: 8,
    borderRadius: 20,
  },
  mediaCard: {
    marginBottom: 12,
    padding: 0,
  },
  mediaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    backgroundColor: 'transparent',
  },
  mediaHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    backgroundColor: 'transparent',
  },
  mediaThumbContainer: {
    width: 40,
    height: 40,
    borderRadius: 6,
    overflow: 'hidden',
  },
  mediaThumb: {
    width: '100%',
    height: '100%',
  },
  mediaThumbPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mediaHeaderText: {
    marginLeft: 10,
    flex: 1,
    backgroundColor: 'transparent',
  },
  mediaTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  mediaDate: {
    fontSize: 11,
    color: '#94A3B8',
  },
  mediaHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    marginRight: 8,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  expandedContent: {
    padding: 12,
    paddingTop: 0,
    backgroundColor: 'transparent',
  },
  divider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginBottom: 12,
    opacity: 0.5,
  },
  contextBox: {
    padding: 10,
    borderRadius: 6,
    marginBottom: 12,
  },
  contextLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
    marginBottom: 2,
  },
  contextText: {
    fontSize: 13,
    fontStyle: 'italic',
    lineHeight: 18,
  },
  imageWrapper: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 16,
  },
  fullImage: {
    width: '100%',
    height: '100%',
  },
  expandedSectionLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  analysisDesc: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  lawsSection: {
    marginBottom: 16,
    backgroundColor: 'transparent',
  },
  lawRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    backgroundColor: 'transparent',
  },
  lawText: {
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 6,
  },
  recommendationBox: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  recHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    backgroundColor: 'transparent',
  },
  recTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginLeft: 6,
  },
  recText: {
    fontSize: 13,
    lineHeight: 19,
  },
  deleteCaseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EF4444',
    paddingVertical: 10,
    borderRadius: 6,
  },
  deleteCaseText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 6,
  },
});
