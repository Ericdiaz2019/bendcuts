'use client'

import type {
  Feature,
  FeatureConfig,
  FeatureConfigMap,
} from '@/lib/types/configuration'

import BendToleranceSheet from './BendToleranceSheet'
import EndCutSheet from './EndCutSheet'
import TappingSheet from './TappingSheet'

interface FeatureConfigSheetProps {
  feature: Feature | null
  allFeatures: Feature[]
  configs: FeatureConfigMap
  onApplyOne: (entry: FeatureConfig) => void
  onApplyMany: (entries: FeatureConfig[]) => void
  onClose: () => void
}

/**
 * Dispatcher — picks the right per-feature sheet based on the feature's kind.
 * Renders nothing when no feature is active.
 */
export default function FeatureConfigSheet({
  feature,
  allFeatures,
  configs,
  onApplyOne,
  onApplyMany,
  onClose,
}: FeatureConfigSheetProps) {
  if (!feature) return null

  switch (feature.kind) {
    case 'hole':
      return (
        <TappingSheet
          open
          hole={feature}
          allFeatures={allFeatures}
          configs={configs}
          onApply={onApplyMany}
          onClose={onClose}
        />
      )
    case 'bend':
      return (
        <BendToleranceSheet
          open
          bend={feature}
          configs={configs}
          onApply={onApplyOne}
          onClose={onClose}
        />
      )
    case 'end-cut':
      return (
        <EndCutSheet
          open
          endCut={feature}
          configs={configs}
          onApply={onApplyOne}
          onClose={onClose}
        />
      )
  }
}
