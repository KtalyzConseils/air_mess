import { useState } from 'react'
import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import AdminPageShell from '../../components/admin/AdminPageShell'
import AdminPageHeader from '../../components/admin/AdminPageHeader'
import AdminPagination from '../../components/admin/AdminPagination'
import { AdminSearchInput } from '../../components/admin/AdminToolbar'
import { fetchMerchantWaitlists, type MerchantWaitlistListParams } from '../../api/admin'

export default function AdminMerchantWaitlistsPage() {
  const { t } = useTranslation()
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)

  const search = q.trim()
  const params: MerchantWaitlistListParams = search ? { q: search, page } : { page }

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['admin', 'merchant-waitlists', search, page],
    queryFn: () => fetchMerchantWaitlists(params),
    placeholderData: keepPreviousData,
  })

  const waitlists = data?.data ?? []

  return (
    <AdminPageShell>
      <AdminPageHeader
        title={t('admin.merchantWaitlists.title')}
        subtitle={t('admin.merchantWaitlists.subtitle')}
        toolbar={
          <div className="flex flex-wrap items-center justify-end gap-3 w-full">
            <AdminSearchInput
              value={q}
              onChange={(e) => {
                setQ(e.target.value)
                setPage(1)
              }}
              placeholder={t('admin.merchantWaitlists.searchPlaceholder')}
              minWidthClass="min-w-[280px]"
            />
          </div>
        }
      />

      <div className="px-4 md:px-6 lg:px-8 py-5">
        <div className="bg-off-white border border-warm-200 rounded-lg overflow-hidden">
          {isLoading ? (
            <div className="p-10 text-center text-warm-500 text-body-s">
              {t('admin.common.loading')}
            </div>
          ) : waitlists.length === 0 ? (
            <div className="p-10 text-center text-warm-500 text-body-s italic">
              {t('admin.merchantWaitlists.emptyResults')}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-body-s min-w-[860px]">
                <thead className="bg-cream/60 text-[10px] uppercase tracking-wider font-bold text-warm-600 border-b border-warm-200">
                  <tr>
                    <th className="px-5 py-2.5 text-left">
                      {t('admin.merchantWaitlists.colCommerce')}
                    </th>
                    <th className="px-5 py-2.5 text-left">
                      {t('admin.merchantWaitlists.colShop')}
                    </th>
                    <th className="px-5 py-2.5 text-left">
                      {t('admin.merchantWaitlists.colZone')}
                    </th>
                    <th className="px-5 py-2.5 text-left">
                      {t('admin.merchantWaitlists.colContact')}
                    </th>
                    <th className="px-5 py-2.5 text-left">
                      {t('admin.merchantWaitlists.colBonus')}
                    </th>
                    <th className="px-5 py-2.5 text-right">
                      {t('admin.merchantWaitlists.colDate')}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-warm-200">
                  {waitlists.map((item) => (
                    <tr key={item.id} className="hover:bg-cream/40 transition-colors">
                      <td className="px-5 py-2.5 text-ink">{item.commerce_type}</td>
                      <td className="px-5 py-2.5 text-warm-600 truncate max-w-[180px]">
                        {item.shop_name || t('admin.common.unknown')}
                      </td>
                      <td className="px-5 py-2.5 text-warm-600">
                        <p className="text-ink">{item.zone}</p>
                        {item.zone_other && (
                          <p className="text-caption text-warm-500">{item.zone_other}</p>
                        )}
                      </td>
                      <td className="px-5 py-2.5">
                        <p className="text-ink truncate max-w-[200px]">{item.contact_name || '—'}</p>
                        <p className="text-caption text-warm-500 truncate max-w-[200px]">
                          {item.whatsapp || '—'}
                        </p>
                      </td>
                      <td className="px-5 py-2.5">
                        <span className="font-bold text-ink">{item.bonus_amount} F CFA</span>
                        <p className="text-caption text-warm-500">{item.bonus_code}</p>
                      </td>
                      <td className="px-5 py-2.5 text-right text-warm-600 tabular-nums whitespace-nowrap">
                        {new Date(item.created_at).toLocaleDateString('fr-FR')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {data && (
          <AdminPagination
            currentPage={data.current_page}
            lastPage={data.last_page}
            total={data.total}
            itemLabel={t('admin.merchantWaitlists.itemLabel')}
            onChange={setPage}
            isFetching={isFetching}
          />
        )}
      </div>
    </AdminPageShell>
  )
}
