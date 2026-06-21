import React from 'react';
import renderer, { act } from 'react-test-renderer';
import CitationCard, { Citation } from './CitationCard';

// Mock expo-symbols native components to prevent Jest from failing on native bindings
jest.mock('expo-symbols', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    SymbolView: (props: any) => React.createElement(View, props)
  };
});

function getTextContent(node: any): string {
  if (node.props.children === undefined || node.props.children === null) {
    return '';
  }
  if (Array.isArray(node.props.children)) {
    return node.props.children.map(child => (typeof child === 'object' ? '' : String(child))).join('');
  }
  return String(node.props.children);
}

describe('CitationCard Component', () => {
  const mockCitation: Citation = {
    id: 'test-123',
    jurisdiction: 'CDMX',
    code_name: 'Reglamento de Tránsito de la CDMX',
    article_number: 'Artículo 34',
    content: 'Artículo 34.- En la vía pública está prohibido colocar boyas o rejas...',
    similarity: 0.92
  };

  test('should render collapsed card with code name and article number', () => {
    let component: any;
    
    // Wrap mount inside act() to flush React 18/19 rendering pipeline synchronously
    act(() => {
      component = renderer.create(<CitationCard citation={mockCitation} />);
    });
    
    const root = component.root;

    // Verify it displays the title text
    const titleTexts = root.findAllByType('Text');
    const textsJoined = titleTexts.map(getTextContent).join(' ');

    expect(textsJoined).toContain('Reglamento de Tránsito de la CDMX');
    expect(textsJoined).toContain('Artículo 34');
    expect(textsJoined).toContain('CDMX');

    // Content should not be visible when collapsed
    expect(textsJoined).not.toContain('En la vía pública está prohibido colocar boyas');
  });

  test('should render expanded content when touchable is pressed', () => {
    let component: any;
    
    act(() => {
      component = renderer.create(<CitationCard citation={mockCitation} />);
    });
    
    const root = component.root;

    // Trigger toggle press inside act()
    const touchable = root.findByProps({ testID: 'citation-card-toggle' });
    act(() => {
      touchable.props.onPress();
    });

    const titleTexts = root.findAllByType('Text');
    const textsJoined = titleTexts.map(getTextContent).join(' ');

    // The content and match score should now be visible
    expect(textsJoined).toContain('En la vía pública está prohibido colocar boyas');
    expect(textsJoined).toContain('92%');
  });
});
