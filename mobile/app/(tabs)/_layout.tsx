import { SymbolView } from 'expo-symbols';
import { Tabs } from 'expo-router';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme].tint,
        tabBarInactiveTintColor: Colors[colorScheme].tabIconDefault,
        tabBarStyle: {
          backgroundColor: Colors[colorScheme].cardBackground,
          borderTopColor: Colors[colorScheme].border,
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        headerStyle: {
          backgroundColor: Colors[colorScheme].cardBackground,
          shadowColor: 'transparent',
          borderBottomWidth: 1,
          borderBottomColor: Colors[colorScheme].border,
        },
        headerTitleStyle: {
          fontWeight: '700',
          fontSize: 18,
          color: Colors[colorScheme].text,
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Buscar',
          tabBarIcon: ({ color }) => (
            <SymbolView
              name={{
                ios: 'magnifyingglass',
                android: 'search',
                web: 'search',
              }}
              tintColor={color}
              size={24}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="multimedia"
        options={{
          title: 'Evidencia',
          tabBarIcon: ({ color }) => (
            <SymbolView
              name={{
                ios: 'camera.fill',
                android: 'photo_camera',
                web: 'photo_camera',
              }}
              tintColor={color}
              size={24}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="two"
        options={{
          title: 'Configuración',
          tabBarIcon: ({ color }) => (
            <SymbolView
              name={{
                ios: 'gearshape',
                android: 'settings',
                web: 'settings',
              }}
              tintColor={color}
              size={24}
            />
          ),
        }}
      />
    </Tabs>
  );
}
