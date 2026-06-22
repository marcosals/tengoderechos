import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  ScrollView, 
  ActivityIndicator, 
  TouchableOpacity, 
  Share, 
  Clipboard,
  Alert
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { SymbolView } from 'expo-symbols';

import { Text, View, CardView, useThemeColor } from '@/components/Themed';
import CitationCard, { Citation } from '@/components/CitationCard';
import { supabase } from '@/utils/supabase';
import { AuthStore } from '@/components/AuthStore';

// Mock Databases for testing RAG flows locally without Supabase keys
const MOCK_ANSWERS: Record<string, { answer: string; citations: Citation[] }> = {
  transito: {
    answer: "Si sufres una colisión por detrás en la Ciudad de México y únicamente resultan daños materiales (bienes privados), el Reglamento de Tránsito de la CDMX (Artículo 50) estipula que debes encender las luces intermitentes y detenerte de inmediato. Si ambos conductores cuentan con seguro vigente, pueden mover voluntariamente los vehículos a una zona segura para no obstruir el tráfico mientras esperan a los ajustadores. Si no hay acuerdo o alguna parte carece de seguro, se llamará a un oficial para remitirlos ante un Juez Cívico. Recuerda que el Artículo 34 prohíbe bloquear o colocar objetos sin autorización en la vía pública.",
    citations: [
      {
        id: 'mock-t1',
        jurisdiction: 'CDMX',
        code_name: 'Reglamento de Tránsito de la CDMX',
        article_number: 'Artículo 50',
        content: 'Artículo 50.- En caso de hechos de tránsito en los que únicamente se produzcan daños materiales a bienes de propiedad privada, los conductores involucrados deberán: I. Detener inmediatamente los vehículos, sin obstruir la circulación en la medida de lo posible; II. Encender las luces de advertencia (intermitentes) y colocar los dispositivos de señalamiento necesarios para alertar a otros conductores; III. Si ambos vehículos cuentan con seguro de responsabilidad civil vigente, y los conductores están de acuerdo en las circunstancias, podrán mover sus vehículos a una zona segura para no obstruir el tránsito, en espera de los ajustadores de seguros; IV. Si alguna de las partes no cuenta con seguro de responsabilidad civil, o si no se llega a un acuerdo mutuo, se deberá solicitar la intervención inmediata del agente de tránsito para que remita los vehículos y a los conductores ante el Juez Cívico competente.',
        similarity: 0.94
      },
      {
        id: 'mock-t2',
        jurisdiction: 'CDMX',
        code_name: 'Reglamento de Tránsito de la CDMX',
        article_number: 'Artículo 34',
        content: 'Artículo 34.- En la vía pública está prohibido: I. Colocar boyas, topes, cadenas, plumas o rejas, así como cualquier otro elemento que impida el libre tránsito de peatones y vehículos, sin la autorización correspondiente; II. Colocar objetos que obstaculicen el estacionamiento de vehículos en la vía pública, o de alguna forma reserven cajones de estacionamiento sin la autorización correspondiente; III. Colocar anuncios publicitarios o cualquier otro elemento que pueda distraer a los conductores o peatones; IV. Abandonar vehículos que se encuentren inservibles, destruidos o inutilizados por accidentes de tránsito en la vía pública por más de 72 horas.',
        similarity: 0.78
      }
    ]
  },
  civil: {
    answer: "De acuerdo con el Código Civil Federal de México, ambos padres tienen la obligación legal ineludible de dar alimentos a sus hijos (Artículo 303). El término 'alimentos' engloba comida, vestido, vivienda, asistencia médica y gastos educativos. La pensión se calcula de forma proporcional: atendiendo tanto a las capacidades económicas de quien la proporciona como a las necesidades reales de quien la recibe (Artículo 311). Si los padres están imposibilitados, la obligación puede ascender a abuelos u otros familiares consanguíneos cercanos.",
    citations: [
      {
        id: 'mock-c1',
        jurisdiction: 'Federal',
        code_name: 'Código Civil Federal',
        article_number: 'Artículo 303',
        content: 'Artículo 303.- Los padres están obligados a dar alimentos a sus hijos. A falta o por imposibilidad de los padres, la obligación recae en los demás ascendientes por ambas líneas que estuvieren más próximos en grado.',
        similarity: 0.92
      },
      {
        id: 'mock-c2',
        jurisdiction: 'Federal',
        code_name: 'Código Civil Federal',
        article_number: 'Artículo 311',
        content: 'Artículo 311.- Los alimentos han de ser proporcionados a la posibilidad del que los debe dar y a la necesidad del que los debe recibir. Si se fija en un porcentaje, este se aplicará sobre los ingresos totales del deudor alimentario.',
        similarity: 0.88
      }
    ]
  },
  general: {
    answer: "En los Estados Unidos Mexicanos, toda persona goza de los derechos humanos y garantías constitucionales para su protección. Según el Artículo 16 de la Constitución Federal, ninguna autoridad o agente de policía puede molestarte en tu persona, posesiones o familia sin un mandamiento escrito firmado por autoridad competente (como un juez) que funde y motive debidamente la causa del procedimiento. Asimismo, el Artículo 14 resguarda el derecho al debido proceso: nadie puede ser privado de su libertad o propiedades sino mediante un juicio formal ante tribunales preestablecidos.",
    citations: [
      {
        id: 'mock-g1',
        jurisdiction: 'Federal',
        code_name: 'Constitución Política de los Estados Unidos Mexicanos',
        article_number: 'Artículo 16',
        content: 'Artículo 16.- Nadie puede ser molestado en su persona, familia, domicilio, papeles o posesiones, sino en virtud de mandamiento escrito de la autoridad competente, que funde y motive la causa legal del procedimiento. No podrá librarse orden de aprehensión sino por la autoridad judicial y sin que preceda denuncia o querella de un hecho que la ley señale como delito...',
        similarity: 0.89
      },
      {
        id: 'mock-g2',
        jurisdiction: 'Federal',
        code_name: 'Constitución Política de los Estados Unidos Mexicanos',
        article_number: 'Artículo 14',
        content: 'Artículo 14.- A ninguna ley se dará efecto retroactivo en perjuicio de persona alguna. Nadie podrá ser privado de la libertad o de sus propiedades, posesiones o derechos, sino mediante juicio seguido ante los tribunales previamente establecidos, en el que se cumplan las formalidades esenciales del procedimiento y conforme a las leyes expedidas con anterioridad al hecho.',
        similarity: 0.85
      }
    ]
  }
};

export default function SearchResultsScreen() {
  const { query, jurisdiction, savedId: routeSavedId } = useLocalSearchParams<{ query: string; jurisdiction: string; savedId?: string }>();
  const [loading, setLoading] = useState(true);
  const [answer, setAnswer] = useState('');
  const [citations, setCitations] = useState<Citation[]>([]);
  const [saved, setSaved] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [session, setSession] = useState(AuthStore.getSession());

  const primaryColor = useThemeColor({}, 'primary');
  const accentColor = useThemeColor({}, 'accent');
  const textMutedColor = useThemeColor({}, 'textMuted');

  // Subscribe to AuthStore updates
  useEffect(() => {
    const unsubscribe = AuthStore.subscribe((newSession) => {
      setSession(newSession);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    async function performSearch() {
      setLoading(true);

      // Scenario 1: Loading an already bookmarked right by savedId directly from the DB
      if (routeSavedId && supabase) {
        try {
          const { data, error } = await supabase
            .from('saved_rights')
            .select(`
              id,
              title,
              query_text,
              ai_answer,
              saved_rights_citations (
                legal_document_id,
                legal_documents (
                  id,
                  jurisdiction,
                  code_name,
                  article_number,
                  content
                )
              )
            `)
            .eq('id', routeSavedId)
            .single();

          if (error) throw error;
          if (data) {
            setAnswer(data.ai_answer);
            setSaved(true);
            setSavedId(data.id);

            const fetchedCitations = (data.saved_rights_citations || [])
              .map((src: any) => src.legal_documents)
              .filter(Boolean)
              .map((doc: any) => ({
                id: doc.id,
                jurisdiction: doc.jurisdiction,
                code_name: doc.code_name,
                article_number: doc.article_number,
                content: doc.content,
                similarity: 1.0
              }));

            setCitations(fetchedCitations);
            setLoading(false);
            return;
          }
        } catch (err) {
          console.error('❌ Failed to fetch saved right details from database:', err);
        }
      }
      
      // Scenario 2: Standard search flow
      // Fallback search logic if Supabase client is not available or unset
      if (!supabase) {
        // Wait 1.5 seconds to simulate API lag
        await new Promise((resolve) => setTimeout(resolve, 1500));
        
        const lowercaseQuery = (query || '').toLowerCase();
        let result = MOCK_ANSWERS.general;

        if (lowercaseQuery.includes('choco') || lowercaseQuery.includes('tránsito') || lowercaseQuery.includes('detrás') || lowercaseQuery.includes('auto')) {
          result = MOCK_ANSWERS.transito;
        } else if (lowercaseQuery.includes('pensión') || lowercaseQuery.includes('hijo') || lowercaseQuery.includes('alimento') || lowercaseQuery.includes('padre')) {
          result = MOCK_ANSWERS.civil;
        }

        setAnswer(result.answer);
        setCitations(result.citations);
        setLoading(false);
        return;
      }

      // If Supabase client IS configured, call the search Edge Function
      try {
        const { data, error } = await supabase.functions.invoke('search', {
          body: { query: query, jurisdiction: jurisdiction }
        });

        if (error || !data) {
          throw new Error(error?.message || 'Empty response from Edge Function.');
        }

        setAnswer(data.answer);
        setCitations(data.citations || []);

        const activeSession = AuthStore.getSession();
        if (activeSession?.user?.id) {
          await checkSavedStatus(activeSession.user.id);
        }
      } catch (err) {
        console.error('❌ Edge Function search failed. Falling back to local mock data:', err);
        // Fallback to local mock data on failure
        const lowercaseQuery = (query || '').toLowerCase();
        let result = MOCK_ANSWERS.general;
        if (lowercaseQuery.includes('choco') || lowercaseQuery.includes('tránsito')) result = MOCK_ANSWERS.transito;
        else if (lowercaseQuery.includes('pensión') || lowercaseQuery.includes('hijo')) result = MOCK_ANSWERS.civil;
        
        setAnswer(result.answer + '\n\n⚠️ (Nota: Mostrando resultados locales fuera de línea debido a un fallo de red)');
        setCitations(result.citations);
      } finally {
        setLoading(false);
      }
    }

    performSearch();
  }, [query, jurisdiction]);

  const checkSavedStatus = async (currentUserId: string) => {
    if (!supabase || !query) return;
    try {
      const { data, error } = await supabase
        .from('saved_rights')
        .select('id')
        .eq('user_id', currentUserId)
        .eq('query_text', query.trim())
        .maybeSingle();

      if (data) {
        setSaved(true);
        setSavedId(data.id);
      }
    } catch (err) {
      console.error('Error checking saved status:', err);
    }
  };

  const handleToggleSave = async () => {
    if (!session || !session.user) {
      Alert.alert(
        'Iniciar Sesión',
        'Necesitas una cuenta para guardar tus derechos y consultarlos sin conexión.',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Iniciar Sesión', onPress: () => router.push('/auth') }
        ]
      );
      return;
    }

    if (!supabase) {
      // Local fallback toggle in mock mode
      setSaved(!saved);
      return;
    }

    try {
      if (saved && savedId) {
        // Unsave / Delete
        const { error } = await supabase
          .from('saved_rights')
          .delete()
          .eq('id', savedId);

        if (error) throw error;
        setSaved(false);
        setSavedId(null);
      } else {
        // Save / Insert
        const { data: newSave, error: saveError } = await supabase
          .from('saved_rights')
          .insert({
            user_id: session.user.id,
            title: query || 'Consulta sin título',
            query_text: query || '',
            ai_answer: answer
          })
          .select()
          .single();

        if (saveError) throw saveError;

        // Insert related citations
        if (citations && citations.length > 0) {
          const citationInserts = citations
            .filter(c => c.id && (typeof c.id === 'number' || !isNaN(Number(c.id))))
            .map(c => ({
              saved_right_id: newSave.id,
              legal_document_id: Number(c.id)
            }));

          if (citationInserts.length > 0) {
            const { error: citError } = await supabase
              .from('saved_rights_citations')
              .insert(citationInserts);
            if (citError) {
              console.error('Error saving citations:', citError);
            }
          }
        }

        setSaved(true);
        setSavedId(newSave.id);
      }
    } catch (err: any) {
      console.error('❌ Failed to toggle save status:', err);
      Alert.alert('Error', 'No pudimos actualizar tus derechos guardados.');
    }
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Tengo Derechos - Consulta: "${query}"\n\nRespuesta:\n${answer}\n\nDescarga la app para consultar las citas de ley completas.`,
      });
    } catch (error: any) {
      console.error(error.message);
    }
  };

  const handleCopy = () => {
    Clipboard.setString(answer);
    alert('Respuesta copiada al portapapeles.');
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Search Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <SymbolView name="chevron.left" size={20} tintColor={primaryColor} />
          <Text style={styles.backText}>Volver</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Consulta Legal</Text>
        <View style={{ width: 60, backgroundColor: 'transparent' }} />
      </View>

      {/* User Query Display */}
      <View style={styles.querySection}>
        <Text style={styles.queryLabel}>Preguntaste:</Text>
        <Text style={styles.queryText}>"{query}"</Text>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={primaryColor} />
          <Text style={styles.loadingText}>Consultando leyes oficiales...</Text>
          <Text style={styles.loadingSubtext}>Analizando jurisprudencia de {jurisdiction}</Text>
        </View>
      ) : (
        <View style={styles.resultsContainer}>
          {/* AI Explanation Card */}
          <Text style={styles.sectionHeading}>Respuesta Ciudadana</Text>
          <CardView style={styles.answerCard}>
            <Text style={styles.answerText}>{answer}</Text>
            
            <View style={styles.actionRow}>
              <TouchableOpacity style={styles.actionButton} onPress={handleShare}>
                <SymbolView name="square.and.arrow.up" size={18} tintColor={primaryColor} />
                <Text style={styles.actionText}>Compartir</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.actionButton} onPress={handleCopy}>
                <SymbolView name="doc.on.doc" size={18} tintColor={primaryColor} />
                <Text style={styles.actionText}>Copiar</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.actionButton} 
                onPress={handleToggleSave}
              >
                <SymbolView 
                  name={saved ? "bookmark.fill" : "bookmark"} 
                  size={18} 
                  tintColor={saved ? accentColor : primaryColor} 
                />
                <Text style={[styles.actionText, saved && { color: accentColor }]}>
                  {saved ? "Guardado" : "Guardar"}
                </Text>
              </TouchableOpacity>
            </View>
          </CardView>

          {/* Legal Citations List */}
          <Text style={styles.sectionHeading}>Fundamentos de Ley ({citations.length})</Text>
          {citations.length === 0 ? (
            <Text style={styles.noCitationsText}>
              No se encontraron artículos explícitos citados en la respuesta.
            </Text>
          ) : (
            citations.map((doc) => (
              <CitationCard key={doc.id} citation={doc} />
            ))
          )}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
    width: 60,
  },
  backText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  querySection: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  queryLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94A3B8',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  queryText: {
    fontSize: 17,
    fontWeight: '700',
    fontStyle: 'italic',
    lineHeight: 24,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    marginTop: 40,
    backgroundColor: 'transparent',
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 20,
    marginBottom: 4,
  },
  loadingSubtext: {
    fontSize: 13,
    color: '#64748B',
  },
  resultsContainer: {
    padding: 20,
    backgroundColor: 'transparent',
  },
  sectionHeading: {
    fontSize: 15,
    fontWeight: '800',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
    marginTop: 8,
  },
  answerCard: {
    padding: 18,
    marginBottom: 24,
  },
  answerText: {
    fontSize: 15,
    lineHeight: 23,
    marginBottom: 20,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 16,
    backgroundColor: 'transparent',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  actionText: {
    fontSize: 13,
    fontWeight: '700',
    marginLeft: 6,
    color: '#64748B',
  },
  noCitationsText: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    marginVertical: 20,
  },
});
