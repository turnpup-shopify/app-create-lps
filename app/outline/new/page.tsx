import { Workbench } from '@/components/Workbench'
import { emptyBrief } from '@/lib/outline/brief'

export default function NewOutlinePage() {
  return <Workbench initialId={null} initialName="" initialBrief={emptyBrief()} initialHeadings={{}} />
}
