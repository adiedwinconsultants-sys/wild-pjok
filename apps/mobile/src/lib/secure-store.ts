import AsyncStorage from '@react-native-async-storage/async-storage'
import * as SecureStore from 'expo-secure-store'
import { Platform } from 'react-native'

const ACCESS_KEY = 'pjok.accessToken'
const REFRESH_KEY = 'pjok.refreshToken'

async function read(key: string): Promise<string | null> {
  if (Platform.OS === 'web') return AsyncStorage.getItem(key)
  return SecureStore.getItemAsync(key)
}

async function write(key: string, value: string): Promise<void> {
  if (Platform.OS === 'web') {
    await AsyncStorage.setItem(key, value)
    return
  }
  await SecureStore.setItemAsync(key, value)
}

async function remove(key: string): Promise<void> {
  if (Platform.OS === 'web') {
    await AsyncStorage.removeItem(key)
    return
  }
  await SecureStore.deleteItemAsync(key)
}

export const tokenStore = {
  async load(): Promise<{ accessToken: string | null; refreshToken: string | null }> {
    const [accessToken, refreshToken] = await Promise.all([read(ACCESS_KEY), read(REFRESH_KEY)])
    return { accessToken, refreshToken }
  },
  async save(tokens: { accessToken: string; refreshToken: string }): Promise<void> {
    await Promise.all([
      write(ACCESS_KEY, tokens.accessToken),
      write(REFRESH_KEY, tokens.refreshToken),
    ])
  },
  async clear(): Promise<void> {
    await Promise.all([remove(ACCESS_KEY), remove(REFRESH_KEY)])
  },
}
