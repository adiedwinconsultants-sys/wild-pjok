import { Tabs } from 'expo-router'
import { type ColorValue, StyleSheet, Text } from 'react-native'
import { colors, typography } from '../../../src/theme/tokens'

function TabIcon({ symbol, color }: { symbol: string; color: ColorValue }) {
  return <Text style={[styles.icon, { color }]}>{symbol}</Text>
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: styles.bar,
        tabBarLabelStyle: styles.label,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Kelas',
          tabBarIcon: ({ color }) => <TabIcon symbol="▦" color={color} />,
        }}
      />
      <Tabs.Screen
        name="assessments"
        options={{
          title: 'Asesmen',
          tabBarIcon: ({ color }) => <TabIcon symbol="✓" color={color} />,
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'Riwayat',
          tabBarIcon: ({ color }) => <TabIcon symbol="↺" color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profil',
          tabBarIcon: ({ color }) => <TabIcon symbol="◍" color={color} />,
        }}
      />
    </Tabs>
  )
}

const styles = StyleSheet.create({
  bar: {
    backgroundColor: colors.surface,
    borderTopColor: colors.border,
    height: 64,
    paddingTop: 6,
    paddingBottom: 8,
  },
  label: { ...typography.small, fontWeight: '600' },
  icon: { fontSize: 18 },
})
