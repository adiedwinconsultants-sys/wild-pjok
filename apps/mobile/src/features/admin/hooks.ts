import type { AdminUser, UserRole } from '@pjok/shared'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiRequest, apiRequestPaginated } from '../../lib/api'

export function useAdminUsers(query = '') {
  return useQuery({
    queryKey: ['admin-users', query],
    queryFn: () =>
      apiRequestPaginated<AdminUser>(
        `/admin/users?perPage=100${query ? `&q=${encodeURIComponent(query)}` : ''}`,
      ),
  })
}

export function useUpdateUserRole() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: UserRole }) =>
      apiRequest<AdminUser>(`/admin/users/${userId}`, {
        method: 'PATCH',
        body: JSON.stringify({ role }),
      }),
    onSuccess: () => client.invalidateQueries({ queryKey: ['admin-users'] }),
  })
}
