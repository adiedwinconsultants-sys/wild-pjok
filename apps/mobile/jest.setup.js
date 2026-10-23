jest.mock('@react-native-async-storage/async-storage', () => {
  const store = new Map()
  return {
    __esModule: true,
    default: {
      getItem: async (key) => store.get(key) ?? null,
      setItem: async (key, value) => {
        store.set(key, value)
      },
      removeItem: async (key) => {
        store.delete(key)
      },
      removeMany: async (keys) => {
        for (const key of keys) store.delete(key)
      },
      getAllKeys: async () => [...store.keys()],
      clear: async () => {
        store.clear()
      },
    },
  }
})

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async () => null),
  setItemAsync: jest.fn(async () => undefined),
  deleteItemAsync: jest.fn(async () => undefined),
}))
