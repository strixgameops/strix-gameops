import { memo, useEffect, useState } from 'react'
import NodeItemVisualComp from './NodeItemVisualComp'

export const BoxDragPreview = memo(function BoxDragPreview({ item }) {
  const [tickTock, setTickTock] = useState(false)
  useEffect(
    function subscribeToIntervalTick() {
      const interval = setInterval(() => setTickTock(!tickTock), 500)
      return () => clearInterval(interval)
    },
    [tickTock],
  )
  return (
    <div>
      <NodeItemVisualComp item={item} preview />
    </div>
  )
})
