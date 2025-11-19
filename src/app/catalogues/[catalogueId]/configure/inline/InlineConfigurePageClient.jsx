"use client"

import {useMemo} from 'react'
import {useParams, useSearchParams} from 'next/navigation'
import {normalizeRisk} from '@/lib/utils/StringUtil'
import {useRefCatalogues} from '@/providers/AppDataProvider'
import ConfigureInlineSante from './ConfigureInlineSante'
import ConfigureInlinePrevoyance from './ConfigureInlinePrevoyance'

export default function InlineConfigurePageClient() {
    const params = useParams()
    const searchParams = useSearchParams()
    const {refCatalogues} = useRefCatalogues()

    const routeCatalogueId = params?.catalogueId || ''
    const queryCatalogueId = searchParams.get('catalogueId') || ''
    const catalogueId = String(routeCatalogueId || queryCatalogueId || '')

    const catalogue = useMemo(
        () => refCatalogues.find((c) => c.id === catalogueId),
        [refCatalogues, catalogueId]
    )
    const catalogueRisk = normalizeRisk(catalogue?.risque)

    if (catalogueRisk === 'prevoyance') {
        return <ConfigureInlinePrevoyance catalogueId={catalogueId} />
    }
    return <ConfigureInlineSante catalogueId={catalogueId} />
}
