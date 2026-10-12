import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { AxiosError } from 'axios'
import { useTranslation } from 'react-i18next'
import {
  adjustDriverWallet,
  adjustUserWallet,
  type WalletAdjustmentDirection,
  type WalletAdjustmentTarget,
} from '../api/admin'

interface Props {
  open: boolean
  onClose: () => void
  target: WalletAdjustmentTarget
  targetId: number
  /** Nom affiché du destinataire dans le read-back (ex: "Marie Dupont", "ACME SARL"). */
  targetName: string
  /** Balance actuelle pour info contextuelle dans le modal. */
  currentBalance: number
  /** Invalidations à déclencher après succès (liste de queryKeys à invalider). */
  onSuccessInvalidate?: ReadonlyArray<readonly unknown[]>
}

/**
 * Modal d'ajustement manuel d'un wallet (driver OU user marchand/particulier).
 *
 * Garde-fous UX :
 *  1. Direction explicite (radio crédit/débit) — pas de signe à déduire
 *  2. Raison obligatoire (min 10 chars) — pas de validation possible sans
 *  3. Read-back avant validation : popup "tu vas faire X sur Y pour Z, confirmer ?"
 *  4. Erreur 422 backend (ex: débit > balance) → message inline
 */
export default function WalletAdjustmentModal({
  open,
  onClose,
  target,
  targetId,
  targetName,
  currentBalance,
  onSuccessInvalidate,
}: Props) {
  const { t, i18n } = useTranslation()
  const locale = i18n.language === 'en' ? 'en-US' : 'fr-FR'
  const queryClient = useQueryClient()
  const [direction, setDirection] = useState<WalletAdjustmentDirection>('credit')
  const [amount, setAmount] = useState<string>('')
  const [reason, setReason] = useState('')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  function formatFcfa(n: number): string {
    return n.toLocaleString(locale) + ' FCFA'
  }

  const mutation = useMutation({
    mutationFn: () => {
      const n = parseInt(amount, 10)
      const payload = { direction, amount: n, reason: reason.trim() }
      return target === 'driver'
        ? adjustDriverWallet(targetId, payload)
        : adjustUserWallet(targetId, payload)
    },
    onSuccess: () => {
      onSuccessInvalidate?.forEach((key) => queryClient.invalidateQueries({ queryKey: key as readonly unknown[] }))
      handleClose()
    },
    onError: (err) => {
      const msg =
        err instanceof AxiosError
          ? err.response?.data?.message ?? t('admin.walletAdjustment.adjustError')
          : t('admin.walletAdjustment.unexpectedError')
      setErrorMsg(msg)
    },
  })

  function handleClose() {
    setDirection('credit')
    setAmount('')
    setReason('')
    setErrorMsg(null)
    onClose()
  }

  function attemptSubmit() {
    setErrorMsg(null)
    const n = parseInt(amount, 10)
    if (!n || n <= 0) {
      setErrorMsg(t('admin.walletAdjustment.amountMustBePositive'))
      return
    }
    if (reason.trim().length < 10) {
      setErrorMsg(t('admin.walletAdjustment.reasonTooShort'))
      return
    }

    // Read-back confirmation
    const verb = direction === 'credit' ? t('admin.walletAdjustment.confirmVerbCredit') : t('admin.walletAdjustment.confirmVerbDebit')
    const symbol = direction === 'credit' ? '+' : '-'
    const projected = direction === 'credit' ? currentBalance + n : currentBalance - n
    const ok = window.confirm(
      `${t('admin.walletAdjustment.confirmTitle')}\n\n` +
      `${t('admin.walletAdjustment.youWill')} ${verb} ${symbol}${formatFcfa(n)} ${t('admin.walletAdjustment.confirmOnWalletOf')} :\n` +
      `   ${targetName}\n\n` +
      `${t('admin.walletAdjustment.currentBalance')} : ${formatFcfa(currentBalance)}\n` +
      `${t('admin.walletAdjustment.projectedBalance')} : ${formatFcfa(projected)}\n\n` +
      `${t('admin.walletAdjustment.confirmReason')} : « ${reason.trim()} »\n\n` +
      `${t('admin.walletAdjustment.confirmIrreversible')}`
    )
    if (ok) mutation.mutate()
  }

  if (!open) return null

  const parsedAmount = parseInt(amount, 10) || 0
  const projected = direction === 'credit' ? currentBalance + parsedAmount : currentBalance - parsedAmount
  const willGoNegative = direction === 'debit' && parsedAmount > currentBalance

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl p-6">
        <h3 className="text-xl font-bold text-airmess-dark mb-1">{t('admin.walletAdjustment.title')}</h3>
        <p className="text-sm text-gray-500 mb-4">
          {t('admin.walletAdjustment.subtitle')}
        </p>

        <div className="bg-gray-50 rounded-lg p-3 mb-4 text-sm">
          <p><span className="text-gray-500">{t('admin.walletAdjustment.recipient')} :</span> <strong>{targetName}</strong></p>
          <p><span className="text-gray-500">{t('admin.walletAdjustment.currentBalance')} :</span> <strong>{formatFcfa(currentBalance)}</strong></p>
        </div>

        {/* Direction */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">{t('admin.walletAdjustment.adjustmentType')}</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setDirection('credit')}
              className={`px-3 py-2 rounded-lg text-sm font-semibold border transition ${
                direction === 'credit'
                  ? 'bg-green-50 border-green-500 text-green-800'
                  : 'border-gray-200 text-gray-600 hover:border-gray-300'
              }`}
            >
              {t('admin.walletAdjustment.credit')}
            </button>
            <button
              type="button"
              onClick={() => setDirection('debit')}
              className={`px-3 py-2 rounded-lg text-sm font-semibold border transition ${
                direction === 'debit'
                  ? 'bg-red-50 border-red-500 text-red-800'
                  : 'border-gray-200 text-gray-600 hover:border-gray-300'
              }`}
            >
              {t('admin.walletAdjustment.debit')}
            </button>
          </div>
        </div>

        {/* Montant */}
        <label className="block text-sm font-medium text-gray-700 mb-1">{t('admin.walletAdjustment.amount')}</label>
        <div className="relative mb-1">
          <input
            type="number"
            min={1}
            step={100}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="2500"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-16 focus:ring-2 focus:ring-airmess-yellow outline-none"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">FCFA</span>
        </div>
        {parsedAmount > 0 && (
          <p className={`text-xs mb-3 ${willGoNegative ? 'text-red-600 font-semibold' : 'text-gray-600'}`}>
            {t('admin.walletAdjustment.projectedBalance')} : <strong>{formatFcfa(projected)}</strong>
            {willGoNegative && ` ${t('admin.walletAdjustment.insufficientBalance')}`}
          </p>
        )}

        {/* Raison */}
        <label className="block text-sm font-medium text-gray-700 mb-1 mt-3">
          {t('admin.walletAdjustment.reason')} <span className="text-red-500">*</span>
        </label>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder={t('admin.walletAdjustment.reasonPlaceholder')}
          rows={3}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-airmess-yellow outline-none"
        />
        <p className="text-xs text-gray-500 mt-1">
          {t('admin.walletAdjustment.reasonHint')}
        </p>

        {errorMsg && (
          <div className="mt-3 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-800">
            ⚠️ {errorMsg}
          </div>
        )}

        <div className="flex gap-3 mt-5">
          <button
            onClick={handleClose}
            disabled={mutation.isPending}
            className="flex-1 px-4 py-2.5 rounded-lg border border-gray-300 hover:bg-gray-50 font-medium disabled:opacity-50"
          >
            {t('admin.walletAdjustment.cancel')}
          </button>
          <button
            onClick={attemptSubmit}
            disabled={mutation.isPending || willGoNegative}
            className={`flex-1 text-white px-4 py-2.5 rounded-lg font-semibold disabled:opacity-50 ${
              direction === 'credit' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
            }`}
          >
            {mutation.isPending ? t('admin.walletAdjustment.sending') : t('admin.walletAdjustment.submit')}
          </button>
        </div>
      </div>
    </div>
  )
}
