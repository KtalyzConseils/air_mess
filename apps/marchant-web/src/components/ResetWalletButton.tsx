import { useMutation, useQueryClient } from '@tanstack/react-query'
import { AxiosError } from 'axios'
import { useTranslation } from 'react-i18next'
import { resetDriverWallet, resetUserWallet, type WalletAdjustmentTarget } from '../api/admin'
import { AdminButton } from './admin/AdminToolbar'

interface Props {
  target: WalletAdjustmentTarget
  targetId: number
  targetName: string
  currentBalance: number
  onSuccessInvalidate?: ReadonlyArray<readonly unknown[]>
}

export default function ResetWalletButton({
  target,
  targetId,
  targetName,
  currentBalance,
  onSuccessInvalidate,
}: Props) {
  const { t, i18n } = useTranslation()
  const locale = i18n.language === 'en' ? 'en-US' : 'fr-FR'
  const queryClient = useQueryClient()

  function formatFcfa(value: number): string {
    return value.toLocaleString(locale) + ' FCFA'
  }

  const mutation = useMutation({
    mutationFn: (reason: string) =>
      target === 'driver'
        ? resetDriverWallet(targetId, reason)
        : resetUserWallet(targetId, reason),
    onSuccess: () => {
      onSuccessInvalidate?.forEach((key) => queryClient.invalidateQueries({ queryKey: key as readonly unknown[] }))
    },
    onError: (error) => {
      const message =
        error instanceof AxiosError
          ? error.response?.data?.message ?? t('resetWallet.genericError')
          : t('resetWallet.genericError')
      window.alert(message)
    },
  })

  function handleClick() {
    const reason = window.prompt(
      `${t('resetWallet.promptTitle', { name: targetName })}\n\n` +
      `${t('resetWallet.currentBalance')} : ${formatFcfa(currentBalance)}\n` +
      `${t('resetWallet.pendingWithdrawsNote')}`,
    )
    if (!reason) return
    if (reason.trim().length < 10) {
      window.alert(t('resetWallet.reasonTooShort'))
      return
    }

    const ok = window.confirm(
      `${t('resetWallet.confirmTitle')}\n\n` +
      `${t('resetWallet.confirmWallet')} : ${targetName}\n` +
      `${t('resetWallet.currentBalance')} : ${formatFcfa(currentBalance)}\n` +
      `${t('resetWallet.confirmAction')}\n\n` +
      `${t('resetWallet.confirmIrreversible')}`,
    )
    if (ok) mutation.mutate(reason.trim())
  }

  return (
    <AdminButton
      variant="danger"
      size="sm"
      onClick={handleClick}
      disabled={mutation.isPending}
    >
      {t('resetWallet.cta')}
    </AdminButton>
  )
}
