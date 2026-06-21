import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  ActivityIndicator, 
  Keyboard 
} from 'react-native';
import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';

import { Text, View, TextInput, CardView, useThemeColor } from '@/components/Themed';
import { LocationStore } from '@/components/LocationStore';
import { supabase } from '@/utils/supabase';

interface PopularQuery {
  id: string;
  query_text: string;
  category: string;
}

const FALLBACK_POPULAR_QUERIES: PopularQuery[] = [
  { id: '1', query_text: '¿Qué pasa legalmente si choco mi auto por detrás a otro?', category: 'Tránsito' },
  { id: '2', query_text: '¿Qué obligaciones de pensión alimenticia tengo como padre?', category: 'Civil' },
  { id: '3', query_text: '¿Cuáles son mis derechos ante un despido injustificado?', category: 'Laboral' },
  { id: '4', query_text: '¿Qué hacer si un policía me detiene sin una orden?', category: 'Constitucional' }
];

export default function SearchHomeScreen() {
  const [query, setQuery] = useState('');
  const [jurisdiction, setJurisdiction] = useState(LocationStore.getState());
  const [popularQueries, setPopularQueries] = useState<PopularQuery[]>([]);
  const [loadingQueries, setLoadingQueries] = useState(false);

  const primaryColor = useThemeColor({}, 'primary');
  const accentColor = useThemeColor({}, 'accent');
  const textMutedColor = useThemeColor({}, 'textMuted');

  // Subscribe to changes in active jurisdiction from LocationStore
  useEffect(() => {
    const unsubscribe = LocationStore.subscribe((newState) => {
      setJurisdiction(newState);
    });
    return unsubscribe;
  }, []);

  // Fetch popular queries from Supabase on mount
  useEffect(() => {
    async function loadQueries() {
      setLoadingQueries(true);
      if (!supabase) {
        setPopularQueries(FALLBACK_POPULAR_QUERIES);
        setLoadingQueries(false);
        return;
      }
      try {
        const { data, error } = await supabase
          .from('popular_queries')
          .select('id, query_text, category')
          .order('search_count', { ascending: false })
          .limit(4);

        if (error || !data || data.length === 0) {
          setPopularQueries(FALLBACK_POPULAR_QUERIES);
        } else {
          setPopularQueries(data);
        }
      } catch (err) {
        setPopularQueries(FALLBACK_POPULAR_QUERIES);
      } finally {
        setLoadingQueries(false);
      }
    }
    loadQueries();
  }, []);

  const handleSearchSubmit = (searchQuery = query) => {
    if (!searchQuery.trim()) return;
    Keyboard.dismiss();
    router.push({
      pathname: '/results',
      params: { 
        query: searchQuery.trim(), 
        jurisdiction: jurisdiction 
      }
    });
  };

  return (
    <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
      {/* 1. Header Location Badge */}
      <View style={styles.locationRow}>
        <TouchableOpacity 
          style={styles.locationBadge} 
          onPress={() => router.push('/two')}
          activeOpacity={0.7}
        >
          <SymbolView name="mappin.circle.fill" size={16} tintColor={accentColor} />
          <Text style={styles.locationText}>📍 Jurisdicción: {jurisdiction}</Text>
          <Text style={styles.changeText} lightColor="#4F46E5" darkColor="#818CF8">(Cambiar)</Text>
        </TouchableOpacity>
      </View>

      {/* 2. App Hero / Logo */}
      <View style={styles.heroSection}>
        <View style={styles.logoBadge} lightColor="#EEF2F6" darkColor="#1E293B">
          <SymbolView name="scale.3d" size={48} tintColor={primaryColor} />
        </View>
        <Text style={styles.appName}>Tengo Derechos</Text>
        <Text style={styles.tagline}>
          Busca tus derechos y obligaciones constitucionales de forma sencilla y rápida.
        </Text>
      </View>

      {/* 3. Search Bar Area */}
      <View style={styles.searchSection}>
        <View style={styles.searchBarContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Ej. ¿Qué pasa si choco por detrás?"
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={() => handleSearchSubmit()}
            returnKeyType="search"
          />
          <TouchableOpacity 
            style={[styles.searchButton, { backgroundColor: primaryColor }]} 
            onPress={() => handleSearchSubmit()}
            activeOpacity={0.8}
          >
            <SymbolView name="magnifyingglass" size={20} tintColor="#FFF" />
          </TouchableOpacity>
        </View>
      </View>

      {/* 4. Popular Queries Grid */}
      <View style={styles.popularSection}>
        <Text style={styles.sectionTitle}>Preguntas Frecuentes en México</Text>
        
        {loadingQueries ? (
          <ActivityIndicator size="small" color={primaryColor} style={{ marginTop: 20 }} />
        ) : (
          <View style={styles.queriesGrid}>
            {popularQueries.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.queryCardContainer}
                onPress={() => handleSearchSubmit(item.query_text)}
                activeOpacity={0.7}
              >
                <CardView style={styles.queryCard}>
                  <View style={styles.categoryBadge} lightColor="#E2E8F0" darkColor="#334155">
                    <Text style={styles.categoryText}>{item.category}</Text>
                  </View>
                  <Text style={styles.queryText} numberOfLines={3}>
                    {item.query_text}
                  </Text>
                  <View style={styles.cardFooter}>
                    <Text style={styles.readMoreText} lightColor="#4F46E5" darkColor="#818CF8">
                      Consultar
                    </Text>
                    <SymbolView name="arrow.right" size={12} tintColor={primaryColor} />
                  </View>
                </CardView>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 1,
    padding: 20,
    justifyContent: 'center',
    paddingBottom: 40,
  },
  locationRow: {
    alignSelf: 'center',
    marginBottom: 30,
    backgroundColor: 'transparent',
  },
  locationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: 'transparent',
  },
  locationText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
    marginRight: 6,
  },
  changeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: 35,
    backgroundColor: 'transparent',
  },
  logoBadge: {
    padding: 16,
    borderRadius: 24,
    marginBottom: 16,
  },
  appName: {
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  tagline: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 20,
    color: '#64748B',
  },
  searchSection: {
    marginBottom: 40,
    backgroundColor: 'transparent',
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  searchInput: {
    flex: 1,
    marginRight: 10,
    height: 52,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  searchButton: {
    width: 52,
    height: 52,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
  popularSection: {
    backgroundColor: 'transparent',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 16,
  },
  queriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    backgroundColor: 'transparent',
  },
  queryCardContainer: {
    width: '48%',
    marginBottom: 16,
  },
  queryCard: {
    height: 150,
    justifyContent: 'space-between',
    padding: 12,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  categoryText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#475569',
  },
  queryText: {
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
    marginVertical: 8,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    backgroundColor: 'transparent',
  },
  readMoreText: {
    fontSize: 11,
    fontWeight: '700',
    marginRight: 4,
  },
});
