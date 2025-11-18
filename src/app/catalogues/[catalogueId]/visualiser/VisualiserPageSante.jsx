'use client';

import VisualiserPageBase from './VisualiserPageBase';

export default function VisualiserPageSante({catalogueId}) {
    return <VisualiserPageBase catalogueId={catalogueId} targetRisk="sante" />;
}
