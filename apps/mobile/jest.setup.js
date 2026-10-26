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
      multiRemove: async (keys) => {
        for (const key of keys) store.delete(key)
      },
      getAllKeys: async () => [...store.keys()],
      clear: async () => {
        store.clear()
      },
    },
  }
})

jest.mock('expo-font', () => ({
  useFonts: () => [true, null],
}))

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async () => null),
  setItemAsync: jest.fn(async () => undefined),
  deleteItemAsync: jest.fn(async () => undefined),
}))

jest.mock('@react-native-community/datetimepicker', () => ({
  __esModule: true,
  default: (props) =>
    require('react').createElement(require('react-native').View, {
      ...props,
      testID: 'native-date-picker',
    }),
  DateTimePickerAndroid: { open: jest.fn() },
}))
