'use client'

export const UNGROUPED_CATEGORY_PREFIX = '__ungrouped__'

export const makeUngroupedCategoryId = (moduleId) => `${UNGROUPED_CATEGORY_PREFIX}:${moduleId}`

export const isUngroupedCategoryId = (categoryId) =>
    typeof categoryId === 'string' && categoryId.startsWith(`${UNGROUPED_CATEGORY_PREFIX}:`)

export function buildVirtualCategory(module) {
    if (!module) return null
    return {
        id: makeUngroupedCategoryId(module.id),
        ref_module_id: module.id,
        code: 'SANS_GROUPE',
        libelle: 'Sans groupe',
        risque: module.risque,
        isVirtual: true,
        ordre: Number.MAX_SAFE_INTEGER / 2,
    }
}
