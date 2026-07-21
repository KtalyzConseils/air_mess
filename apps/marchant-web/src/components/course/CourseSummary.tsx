import { useTranslation } from 'react-i18next'
import {
  MapPinIcon,
  UserIcon,
  PhoneIcon,
  PackageIcon,
  BankIcon,
  ArrowRightIcon,
} from '../ui/icons'

export interface CourseSummaryData {
  // Expéditeur
  originName: string
  originPhone: string
  originQuartier: string
  originCity: string
  originStreet?: string
  // Destinataire
  destName: string
  destPhone: string
  destQuartier: string
  destCity: string
  destStreet?: string
  destLandmark?: string
  destInstructions?: string
  // Colis
  packageCategoryLabel?: string
  packageDescription: string
  packageSize: 'S' | 'M' | 'L' | 'XL'
  packageWeight?: number
  packageDeclaredValue?: number
  // Livraison
  urgency: 'standard' | 'express'
  paidBy: 'sender' | 'recipient'
  // Encaissement
  hasCollection: boolean
  collectionAmount?: number
  collectionMethod?: 'cash' | 'mobile_money' | 'prepaid'
}

interface Props {
  data: CourseSummaryData
}

/**
 * Résumé complet de la course. Utilisé dans le panneau récap (desktop)
 * et dans la bottom-sheet (mobile).
 *
 * Progressive disclosure : les champs facultatifs (rue, landmark,
 * instructions, poids, valeur déclarée) ne s'affichent que s'ils sont
 * renseignés — pas de "—" ou de placeholder qui charge visuellement le
 * bloc pour rien.
 */
export default function CourseSummary({ data }: Props) {
  const { t } = useTranslation()

  const sizeLabel = t(`courses.new.size${data.packageSize}`)
  const urgencyLabel =
    data.urgency === 'express'
      ? t('courses.new.urgencyExpress')
      : t('courses.new.urgencyStandard')
  const methodKey =
    data.collectionMethod === 'mobile_money'
      ? 'collectionMobileMoney'
      : data.collectionMethod === 'prepaid'
        ? 'collectionPrepaid'
        : 'collectionCash'

  return (
    <div className="divide-y divide-warm-100">
      {/* ============ EXPÉDITEUR ============ */}
      <PartyBlock
        pinColor="A"
        eyebrow={t('courses.new.summary.senderEyebrow')}
        name={data.originName || t('courses.new.summary.namePending')}
        phone={data.originPhone}
        quartier={data.originQuartier}
        city={data.originCity}
        street={data.originStreet}
      />

      {/* ============ FLÈCHE ============ */}
      <div className="px-5 py-2 flex items-center gap-2 text-warm-400 text-caption">
        <ArrowRightIcon size={14} />
        <span>{t('courses.new.summary.deliveredTo')}</span>
      </div>

      {/* ============ DESTINATAIRE ============ */}
      <PartyBlock
        pinColor="B"
        eyebrow={t('courses.new.summary.recipientEyebrow')}
        name={data.destName || t('courses.new.summary.namePending')}
        phone={data.destPhone}
        quartier={data.destQuartier}
        city={data.destCity}
        street={data.destStreet}
        landmark={data.destLandmark}
        instructions={data.destInstructions}
      />

      {/* ============ COLIS ============ */}
      <div className="px-5 py-3 space-y-1">
        <p className="text-caption text-warm-500 uppercase tracking-wide flex items-center gap-1.5">
          <PackageIcon size={12} />
          {t('courses.new.summary.packageEyebrow')}
        </p>
        <p className="text-body-s font-medium text-ink">
          {data.packageDescription || t('courses.new.summary.packageDescPending')}
        </p>
        <p className="text-caption text-warm-500">
          {[
            data.packageCategoryLabel,
            `${t('courses.new.summary.size')} ${data.packageSize} · ${sizeLabel}`,
            urgencyLabel,
          ]
            .filter(Boolean)
            .join(' · ')}
        </p>
        {(data.packageWeight || data.packageDeclaredValue) && (
          <p className="text-caption text-warm-500">
            {[
              data.packageWeight &&
                t('courses.new.summary.weightValue', {
                  weight: data.packageWeight,
                }),
              data.packageDeclaredValue &&
                t('courses.new.summary.declaredValueLine', {
                  amount: data.packageDeclaredValue.toLocaleString('fr-FR'),
                }),
            ]
              .filter(Boolean)
              .join(' · ')}
          </p>
        )}
      </div>

      {/* ============ QUI PAIE (uniquement si "recipient") ============ */}
      {data.paidBy === 'recipient' && (
        <div className="px-5 py-3">
          <p className="text-caption text-warm-500 uppercase tracking-wide">
            {t('courses.new.summary.paidByEyebrow')}
          </p>
          <p className="text-body-s font-medium text-ink mt-0.5">
            {t('courses.new.summary.paidByRecipient')}
          </p>
        </div>
      )}

      {/* ============ ENCAISSEMENT (uniquement si activé) ============ */}
      {data.hasCollection && data.collectionAmount ? (
        <div className="px-5 py-3">
          <p className="text-caption text-warm-500 uppercase tracking-wide flex items-center gap-1.5">
            <BankIcon size={12} />
            {t('courses.new.summary.collectionEyebrow')}
          </p>
          <p className="text-body-s font-medium text-ink mt-0.5 tabular-nums">
            {data.collectionAmount.toLocaleString('fr-FR')} FCFA ·{' '}
            {t(`courses.new.${methodKey}`)}
          </p>
        </div>
      ) : null}
    </div>
  )
}

/* ---------- Sous-blocs ---------- */

function PartyBlock({
  pinColor,
  eyebrow,
  name,
  phone,
  quartier,
  city,
  street,
  landmark,
  instructions,
}: {
  pinColor: 'A' | 'B'
  eyebrow: string
  name: string
  phone: string
  quartier: string
  city: string
  street?: string
  landmark?: string
  instructions?: string
}) {
  const address = [street, quartier, city].filter(Boolean).join(', ')
  const pinStyle =
    pinColor === 'A'
      ? { background: '#F4C41F', boxShadow: 'inset 0 0 0 1.5px #1F1D1A' }
      : { background: '#1F1D1A', boxShadow: 'inset 0 0 0 1.5px #F4C41F' }

  return (
    <div className="px-5 py-3">
      <p className="text-caption text-warm-500 uppercase tracking-wide flex items-center gap-1.5">
        <span
          className="inline-block w-2.5 h-2.5 rounded-full"
          style={pinStyle}
          aria-hidden
        />
        {eyebrow}
      </p>
      <p className="text-body-s font-semibold text-ink mt-1 flex items-center gap-1.5">
        <UserIcon size={13} className="text-warm-500 shrink-0" />
        <span className="truncate">{name}</span>
      </p>
      {phone && (
        <p className="text-caption text-warm-500 flex items-center gap-1.5 mt-0.5">
          <PhoneIcon size={11} className="shrink-0" />
          <a
            href={`tel:${phone}`}
            className="hover:text-ink hover:underline tabular-nums"
          >
            {phone}
          </a>
        </p>
      )}
      {address && (
        <p className="text-caption text-warm-500 flex items-start gap-1.5 mt-0.5">
          <MapPinIcon size={11} className="mt-0.5 shrink-0" />
          <span className="min-w-0">{address}</span>
        </p>
      )}
      {landmark && (
        <p className="text-caption text-warm-500 mt-0.5 pl-4 italic">
          « {landmark} »
        </p>
      )}
      {instructions && (
        <p className="text-caption text-warm-600 mt-1.5 ml-4 pl-2 italic border-l-2 border-airmess-yellow/50">
          « {instructions} »
        </p>
      )}
    </div>
  )
}
