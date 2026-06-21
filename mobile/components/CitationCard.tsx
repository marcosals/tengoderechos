import React, { useState } from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import { SymbolView } from 'expo-symbols';

import { Text, View, CardView, useThemeColor } from './Themed';

export interface Citation {
  id: number | string;
  jurisdiction: string;
  code_name: string;
  article_number: string;
  content: string;
  similarity?: number;
}

interface CitationCardProps {
  citation: Citation;
}

export default function CitationCard({ citation }: CitationCardProps) {
  const [expanded, setExpanded] = useState(false);
  const accentColor = useThemeColor({}, 'accent');
  const textMutedColor = useThemeColor({}, 'textMuted');

  return (
    <CardView style={styles.card}>
      <TouchableOpacity 
        testID="citation-card-toggle"
        style={styles.header} 
        onPress={() => setExpanded(!expanded)}
        activeOpacity={0.7}
      >
        <View style={styles.headerInfo}>
          <Text style={styles.codeName}>{citation.code_name}</Text>
          <Text style={styles.articleNum} lightColor="#4F46E5" darkColor="#818CF8">
            {citation.article_number} ({citation.jurisdiction})
          </Text>
        </View>
        
        <SymbolView
          name={{
            ios: expanded ? 'chevron.up' : 'chevron.down',
            android: expanded ? 'expand_less' : 'expand_more',
            web: expanded ? 'expand_less' : 'expand_more',
          }}
          size={20}
          tintColor={accentColor}
        />
      </TouchableOpacity>

      {expanded && (
        <View style={styles.contentContainer}>
          <View style={styles.divider} />
          <Text style={styles.contentText}>{citation.content}</Text>
          {citation.similarity !== undefined && (
            <Text style={styles.matchScore}>
              Relevancia de coincidencia: {(citation.similarity * 100).toFixed(0)}%
            </Text>
          )}
        </View>
      )}
    </CardView>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'transparent',
  },
  headerInfo: {
    flex: 1,
    marginRight: 10,
    backgroundColor: 'transparent',
  },
  codeName: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  articleNum: {
    fontSize: 14,
    fontWeight: '500',
  },
  contentContainer: {
    marginTop: 12,
    backgroundColor: 'transparent',
  },
  divider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginBottom: 12,
    marginTop: 4,
    opacity: 0.5,
  },
  contentText: {
    fontSize: 15,
    lineHeight: 22,
  },
  matchScore: {
    marginTop: 10,
    fontSize: 12,
    fontStyle: 'italic',
    color: '#94A3B8',
  },
});
