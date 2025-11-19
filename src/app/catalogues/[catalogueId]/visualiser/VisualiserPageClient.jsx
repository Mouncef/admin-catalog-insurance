"use client";

import {useParams} from 'next/navigation';
import {useRefCatalogues} from '@/providers/AppDataProvider';
import {normalizeRisk} from '@/lib/utils/StringUtil';
import VisualiserPageSante from './VisualiserPageSante';
import VisualiserPagePrevoyance from './VisualiserPagePrevoyance';

export default function VisualiserPageClient() {
    const params = useParams();
    const catalogueId = String(params?.catalogueId || '');
    const {refCatalogues} = useRefCatalogues();

    const catalogue = refCatalogues.find((c) => c.id === catalogueId);
    const catalogueRisk = normalizeRisk(catalogue?.risque);

    if (catalogueRisk === 'prevoyance') {
        return <VisualiserPagePrevoyance catalogueId={catalogueId} />;
    }
    return <VisualiserPageSante catalogueId={catalogueId} />;
}
