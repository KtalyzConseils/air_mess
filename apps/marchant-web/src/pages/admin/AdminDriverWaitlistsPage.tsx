import { useState } from 'react'
import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import AdminPageShell from '../../components/admin/AdminPageShell'
import AdminPageHeader from '../../components/admin/AdminPageHeader'
import AdminPagination from '../../components/admin/AdminPagination'
import { AdminSearchInput } from '../../components/admin/AdminToolbar'
import { fetchDriverWaitlists, type DriverWaitlistListParams } from '../../api/admin'

export default function AdminDriverWaitlistsPage() {
  const { t } = useTranslation()
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)

  const search = q.trim()
  const params: DriverWaitlistListParams = search ? { q: search, page } : { page }

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['admin', 'driver-waitlists', search, page],
    queryFn: () => fetchDriverWaitlists(params),
    placeholderData: keepPreviousData,
  })

  const waitlists = data?.data ?? []

  return (
    <AdminPageShell>
      <AdminPageHeader
        title={t('admin.driverWaitlists.title')}
        subtitle={t('admin.driverWaitlists.subtitle')}
        toolbar={
          <div className='flex flex-wrap items-center justify-end gap-3 w-full'>
            <AdminSearchInput
              value={q}
              onChange={(e) => {
                setQ(e.target.value)
                setPage(1)
              }}
              placeholder={t('admin.driverWaitlists.searchPlaceholder')}
              minWidthClass='min-w-[280px]'
            />
          </div>
        }
      />

      <div className='px-4 md:px-6 lg:px-8 py-5'>
        <div className='bg-off-white border border-warm-200 rounded-lg overflow-hidden'>
          {isLoading ? (
            <div className='p-10 text-center text-warm-500 text-body-s'>
              {t('admin.common.loading')}
            </div>
          ) : waitlists.length === 0 ? (
            <div className='p-10 text-center text-warm-500 text-body-s italic'>
              {t('admin.driverWaitlists.emptyResults')}
            </div>
          ) : (
            <div className='overflow-x-auto'>
              <table className='w-full text-body-s min-w-[960px]'>
                <thead className='bg-cream/60 text-[10px] uppercase tracking-wider font-bold text-warm-600 border-b border-warm-200'>
                  <tr>
                    <th className='px-5 py-2.5 text-left'>
                      {t('admin.driverWaitlists.colContact')}
                    </th>
                    <th className='px-5 py-2.5 text-left'>
                      {t('admin.driverWaitlists.colVehicle')}
                    </th>
                    <th className='px-5 py-2.5 text-left'>
                      {t('admin.driverWaitlists.colZone')}
                    </th>
                    <th className='px-5 py-2.5 text-left'>
                      {t('admin.driverWaitlists.colAvailability')}
                    </th>
                    <th className='px-5 py-2.5 text-left'>
                      {t('admin.driverWaitlists.colInterest')}
                    </th>
                    <th className='px-5 py-2.5 text-right'>
                      {t('admin.driverWaitlists.colDate')}
                    </th>
                  </tr>
                </thead>
                <tbody className='divide-y divide-warm-200'>
                  {waitlists.map((item) => (
                    <tr key={item.id} className='hover:bg-cream/40 transition-colors'>
                      <td className='px-5 py-2.5'>
                        <p className='text-ink truncate max-w-[220px]'>{item.full_name}</p>
                        <p className='text-caption text-warm-500 truncate max-w-[220px]'>
                          {item.email}
                        </p>
                        <p className='text-caption text-warm-500 truncate max-w-[220px]'>
                          {item.whatsapp}
                        </p>
                      </td>
                      <td className='px-5 py-2.5 text-warm-600'>{item.vehicle_type}</td>
                      <td className='px-5 py-2.5 text-warm-600'>
                        <p className='text-ink'>{item.zone}</p>
                        {item.zone_other && (
                          <p className='text-caption text-warm-500'>{item.zone_other}</p>
                        )}
                      </td>
                      <td className='px-5 py-2.5 text-warm-600'>{item.availability}</td>
                      <td className='px-5 py-2.5 text-warm-600'>{item.interest_level}</td>
                      <td className='px-5 py-2.5 text-right text-warm-600 tabular-nums whitespace-nowrap'>
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
            itemLabel={t('admin.driverWaitlists.itemLabel')}
            onChange={setPage}
            isFetching={isFetching}
          />
        )}
      </div>
    </AdminPageShell>
  )
}
