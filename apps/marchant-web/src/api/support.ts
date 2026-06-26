import api from './client'

export type NotableType = 'course' | 'user' | 'incident'
export type EscalatedTo = 'ops' | 'commercial' | 'super'

export interface SupportNote {
  id: number
  body: string
  escalated_to: EscalatedTo | null
  created_at: string
  author: {
    id: number | null
    name: string
    sub_role: 'super' | 'ops' | 'commercial' | 'support' | null
  }
}

// =============== NOTES (ouvert à tous les rôles admin) ===============

export async function fetchNotes(notableType: NotableType, notableId: number): Promise<SupportNote[]> {
  const { data } = await api.get<{ notes: SupportNote[] }>('/admin/notes', {
    params: { notable_type: notableType, notable_id: notableId },
  })
  return data.notes
}

export async function createNote(
  notableType: NotableType,
  notableId: number,
  body: string,
  escalatedTo: EscalatedTo | null = null,
): Promise<SupportNote> {
  const { data } = await api.post<{ note: SupportNote }>('/admin/notes', {
    notable_type: notableType,
    notable_id: notableId,
    body,
    escalated_to: escalatedTo,
  })
  return data.note
}

export async function deleteNote(noteId: number): Promise<void> {
  await api.delete(`/admin/notes/${noteId}`)
}

// =============== ACTIONS SUPPORT (support uniquement) ===============

export async function sendPasswordReset(userId: number): Promise<{ message: string }> {
  const { data } = await api.post<{ message: string }>(`/admin/users/${userId}/send-password-reset`)
  return data
}

export async function sendNotificationToUser(
  userId: number,
  title: string,
  body: string,
): Promise<{ message: string }> {
  const { data } = await api.post<{ message: string }>(
    `/admin/users/${userId}/send-notification`,
    { title, body },
  )
  return data
}

export async function cancelCourseAsSupport(
  courseId: number,
  reason: string,
): Promise<{ message: string }> {
  const { data } = await api.post<{ message: string }>(
    `/admin/courses/${courseId}/cancel-support`,
    { reason },
  )
  return data
}
