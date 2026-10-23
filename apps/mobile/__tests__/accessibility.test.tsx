import { fireEvent, render, screen } from '@testing-library/react-native'
import { Button, Select, TextField } from '../src/components'

describe('aksesibilitas komponen dasar', () => {
  it('memakai placeholder sebagai label saat label tidak diberikan', async () => {
    await render(<TextField placeholder="Cari siswa" value="" onChangeText={() => undefined} />)

    expect(screen.getByLabelText('Cari siswa')).toBeTruthy()
  })

  it('tetap memiliki nama aksesibel saat tombol dalam keadaan memuat', async () => {
    await render(<Button title="Simpan nilai" loading />)

    expect(screen.getByLabelText('Simpan nilai')).toBeTruthy()
    expect(screen.getByLabelText('Simpan nilai').props.accessibilityState).toMatchObject({
      disabled: true,
      busy: true,
    })
  })

  it('menandai pilihan radio dan meneruskan perubahan', async () => {
    const onChange = jest.fn()
    await render(
      <Select
        label="Status"
        value="draft"
        onChange={onChange}
        options={[
          { value: 'draft', label: 'Draf' },
          { value: 'finalized', label: 'Final' },
        ]}
      />,
    )

    const selected = screen.getByRole('radio', { name: 'Draf', selected: true })
    expect(selected).toBeTruthy()

    await fireEvent.press(screen.getByRole('radio', { name: 'Final' }))
    expect(onChange).toHaveBeenCalledWith('finalized')
  })
})
