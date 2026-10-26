import { DateTimePickerAndroid } from '@react-native-community/datetimepicker'
import { fireEvent, render, screen } from '@testing-library/react-native'
import { Platform } from 'react-native'
import { DateField } from '../src/components/DateField'
import { dateOnlyValue, parseDateOnly } from '../src/lib/date-only'
import { todayIso } from '../src/lib/format'

describe('pemilih tanggal lahir', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.replaceProperty(Platform, 'OS', 'android')
  })
  afterEach(() => jest.restoreAllMocks())

  it('membuka pemilih tanggal dengan nilai lama dan menyimpan tanggal tanpa pergeseran zona waktu', async () => {
    const change = jest.fn()
    await render(<DateField label="Tanggal lahir" value="2012-01-31" onChange={change} />)
    expect(screen.getByText('31 Januari 2012')).toBeTruthy()
    await fireEvent.press(screen.getByRole('button', { name: 'Tanggal lahir' }))
    const options = jest.mocked(DateTimePickerAndroid.open).mock.calls[0]?.[0]
    expect(options?.mode).toBe('date')
    expect(options?.display).toBe('spinner')
    expect(options?.value && dateOnlyValue(options.value)).toBe('2012-01-31')
    expect(options?.maximumDate && dateOnlyValue(options.maximumDate)).toBe(todayIso())
    const selected = new Date(2012, 1, 29, 12)
    options?.onValueChange?.(
      { nativeEvent: { timestamp: selected.getTime(), utcOffset: 420 } },
      selected,
    )
    expect(change).toHaveBeenCalledWith('2012-02-29')
  })

  it('batal tidak mengubah nilai dan tanggal masa depan tidak disimpan', async () => {
    const change = jest.fn()
    const blur = jest.fn()
    await render(<DateField label="Tanggal lahir" value="" onChange={change} onBlur={blur} />)
    await fireEvent.press(screen.getByRole('button', { name: 'Tanggal lahir' }))
    const options = jest.mocked(DateTimePickerAndroid.open).mock.calls[0]?.[0]
    options?.onDismiss?.()
    expect(change).not.toHaveBeenCalled()
    expect(blur).toHaveBeenCalled()
    const future = new Date(2999, 0, 1)
    options?.onValueChange?.(
      { nativeEvent: { timestamp: future.getTime(), utcOffset: 420 } },
      future,
    )
    expect(change).not.toHaveBeenCalled()
  })

  it('iOS menyimpan pilihan hanya setelah konfirmasi', async () => {
    jest.replaceProperty(Platform, 'OS', 'ios')
    const change = jest.fn()
    await render(<DateField label="Tanggal lahir" value="2012-01-31" onChange={change} />)
    await fireEvent.press(screen.getByRole('button', { name: 'Tanggal lahir' }))
    const selected = new Date(2012, 1, 29, 12)
    await fireEvent(
      screen.getByTestId('native-date-picker'),
      'valueChange',
      { nativeEvent: { timestamp: selected.getTime(), utcOffset: 420 } },
      selected,
    )
    expect(change).not.toHaveBeenCalled()
    await fireEvent.press(screen.getByText('Gunakan tanggal'))
    expect(change).toHaveBeenCalledWith('2012-02-29')
  })

  it('menolak tanggal kalender yang tidak valid', () => {
    expect(parseDateOnly('2012-02-29')).not.toBeNull()
    expect(parseDateOnly('2011-02-29')).toBeNull()
    expect(parseDateOnly('')).toBeNull()
  })
})
