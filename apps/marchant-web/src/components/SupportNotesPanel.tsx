import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '../stores/authStore'
import {
  createNote,
  deleteNote,
  fetchNotes,
  type EscalatedTo,
  type NotableType,
  type SupportNote,
} from '../api/support'

interface Props {
  notableType: NotableType
  notableId: number
  /** Titre court affiché en haut du panneau (ex: "Notes internes") */
  title?: string
}

const ROLE_BADGE: Record<string, string> = {
  super:      'bg-gray-800 text-white',
  ops:        'bg-blue-100 text-blue-700',
  commercial: 'bg-purple-100 text-purple-700',
  support:    'bg-emerald-100 text-emerald-700',
}

export default function SupportNotesPanel({ notableType, notableId, title }: Props) {
  const { t, i18n } = useTranslation()
  const locale = i18n.language === 'en' ? 'en-US' : 'fr-FR'
  const { user } = useAuthStore()
  const myAdminId = user?.admin?.id ?? null
  const isSuper = user?.admin?.sub_role === 'super'

  const ESCALATION_BADGE: Record<EscalatedTo, { label: string; cls: string }> = {
    ops:        { label: t('admin.supportNotes.escalatedOps'),        cls: 'bg-red-100 text-red-700 border-red-300' },
    commercial: { label: t('admin.supportNotes.escalatedCommercial'), cls: 'bg-purple-100 text-purple-700 border-purple-300' },
    super:      { label: t('admin.supportNotes.escalatedSuper'),      cls: 'bg-gray-800 text-white border-gray-900' },
  }

  const queryClient = useQueryClient()
  const queryKey = ['support-notes', notableType, notableId] as const

  const { data: notes = [], isLoading, error } = useQuery({
    queryKey,
    queryFn: () => fetchNotes(notableType, notableId),
  })

  const [body, setBody] = useState('')
  const [escalation, setEscalation] = useState<EscalatedTo | ''>('')

  const createMut = useMutation({
    mutationFn: () => createNote(notableType, notableId, body.trim(), escalation || null),
    onSuccess: () => {
      setBody('')
      setEscalation('')
      queryClient.invalidateQueries({ queryKey })
    },
  })

  const deleteMut = useMutation({
    mutationFn: (noteId: number) => deleteNote(noteId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  })

  const canSubmit = body.trim().length >= 3 && !createMut.isPending

  function canDelete(note: SupportNote): boolean {
    return isSuper || (myAdminId !== null && note.author.id === myAdminId)
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-800">{title ?? t('admin.supportNotes.defaultTitle')}</h3>
        <span className="text-xs text-gray-500">{notes.length} {notes.length > 1 ? t('admin.supportNotes.notes') : t('admin.supportNotes.note')}</span>
      </div>

      {/* Form de création */}
      <div className="mb-4 border border-gray-200 rounded-md p-3 bg-gray-50">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={t('admin.supportNotes.placeholder')}
          rows={3}
          maxLength={2000}
          className="w-full text-sm border border-gray-300 rounded p-2 resize-y focus:outline-none focus:ring-1 focus:ring-airmess-yellow"
        />
        <div className="flex items-center justify-between mt-2 gap-2">
          <select
            value={escalation}
            onChange={(e) => setEscalation(e.target.value as EscalatedTo | '')}
            className="text-xs border border-gray-300 rounded px-2 py-1 bg-white"
          >
            <option value="">{t('admin.supportNotes.noEscalation')}</option>
            <option value="ops">{t('admin.supportNotes.escalateOps')}</option>
            <option value="commercial">{t('admin.supportNotes.escalateCommercial')}</option>
            <option value="super">{t('admin.supportNotes.escalateSuper')}</option>
          </select>
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-500">{body.length}/2000</span>
            <button
              type="button"
              disabled={!canSubmit}
              onClick={() => createMut.mutate()}
              className="px-3 py-1.5 rounded text-sm bg-airmess-dark text-white hover:bg-black disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {createMut.isPending ? t('admin.supportNotes.sending') : t('admin.supportNotes.add')}
            </button>
          </div>
        </div>
        {createMut.isError && (
          <p className="text-xs text-red-600 mt-2">{t('admin.supportNotes.error')} : {(createMut.error as Error).message}</p>
        )}
      </div>

      {/* Liste */}
      {isLoading && <p className="text-sm text-gray-500">{t('admin.supportNotes.loading')}</p>}
      {error && <p className="text-sm text-red-600">{t('admin.supportNotes.loadError')}</p>}
      {!isLoading && notes.length === 0 && (
        <p className="text-sm text-gray-500 italic">{t('admin.supportNotes.empty')}</p>
      )}

      <ul className="space-y-3">
        {notes.map((note) => (
          <li key={note.id} className="border-l-2 border-airmess-yellow pl-3 py-1">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2 text-xs">
                <span className="font-medium text-gray-800">{note.author.name || t('admin.supportNotes.admin')}</span>
                {note.author.sub_role && (
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${ROLE_BADGE[note.author.sub_role] ?? 'bg-gray-100 text-gray-600'}`}>
                    {note.author.sub_role}
                  </span>
                )}
                {note.escalated_to && (
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium border ${ESCALATION_BADGE[note.escalated_to].cls}`}>
                    {ESCALATION_BADGE[note.escalated_to].label}
                  </span>
                )}
                <span className="text-gray-400">· {new Date(note.created_at).toLocaleString(locale)}</span>
              </div>
              {canDelete(note) && (
                <button
                  type="button"
                  onClick={() => {
                    if (confirm(t('admin.supportNotes.deleteConfirm'))) {
                      deleteMut.mutate(note.id)
                    }
                  }}
                  disabled={deleteMut.isPending}
                  className="text-xs text-gray-400 hover:text-red-600 disabled:opacity-50"
                  title={t('admin.supportNotes.deleteTitle')}
                >
                  🗑
                </button>
              )}
            </div>
            <p className="text-sm text-gray-700 whitespace-pre-wrap mt-1">{note.body}</p>
          </li>
        ))}
      </ul>
    </div>
  )
}
