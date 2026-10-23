import Ionicons from '@expo/vector-icons/Ionicons'
import { Tabs } from 'expo-router'
import type { ComponentProps } from 'react'
import { type ColorValue, StyleSheet } from 'react-native'
import { colors, fonts } from '../../../src/theme/tokens'

type IconName = ComponentProps<typeof Ionicons>['name']

function iconName(name: IconName, focused: boolean): IconName {
  return (focused ? name.replace('-outline', '') : name) as IconName
}

function tint(color: ColorValue | undefined): string {
  return typeof color === 'string' ? color : colors.text
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSubtle,
        tabBarStyle: styles.bar,
        tabBarLabelStyle: styles.label,
        tabBarItemStyle: styles.item,
        sceneStyle: { backgroundColor: colors.background },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Kelas',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={iconName('school-outline', focused)} size={22} color={tint(color)} />
          ),
        }}
      />
      <Tabs.Screen
        name="assessments"
        options={{
          title: 'Asesmen',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={iconName('clipboard-outline', focused)} size={22} color={tint(color)} />
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'Riwayat',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={iconName('time-outline', focused)} size={22} color={tint(color)} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profil',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={iconName('person-outline', focused)} size={22} color={tint(color)} />
          ),
        }}
      />
    </Tabs>
  )
}

const styles = StyleSheet.create({
  bar: {
    backgroundColor: colors.surface,
    borderTopColor: colors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
    height: 82,
    paddingTop: 8,
    paddingBottom: 12,
    elevation: 0,
    shadowOpacity: 0,
  },
  item: { paddingTop: 2 },
  label: {
    fontFamily: fonts.bodyMedium,
    fontSize: 10,
    letterSpacing: 0,
  },
})
