import {
  getPipelineLeadStatus,
  PIPELINE_LEAD_STATUS_LABEL,
  PIPELINE_LEAD_STATUS_COLOR,
  type LeadStatus,
} from '@/constants/clientStatus'

interface Props {
  leadStatus: LeadStatus | string
}

export function PipelineStatusBadge({ leadStatus }: Props) {
  const pipeline = getPipelineLeadStatus(leadStatus)
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full border text-xs font-medium ${PIPELINE_LEAD_STATUS_COLOR[pipeline]}`}
    >
      {PIPELINE_LEAD_STATUS_LABEL[pipeline]}
    </span>
  )
}
