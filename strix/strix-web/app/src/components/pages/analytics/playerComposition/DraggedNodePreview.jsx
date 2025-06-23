import { memo, useEffect, useState } from 'react'
import TemplateItemDraggable from './TemplateItemDraggable'
import s from './css/playerComposition.module.css'
import { Typography } from '@mui/material';

export const BoxDragPreview = memo(function BoxDragPreview({ title }) {
  const [tickTock, setTickTock] = useState(false)
  useEffect(
    function subscribeToIntervalTick() {
      const interval = setInterval(() => setTickTock(!tickTock), 500)
      return () => clearInterval(interval)
    },
    [tickTock],
  )
  return (
    <div className={`${s.templateItemPreview} ${s.templateItemPreviewAnimation}`}>
      <Typography className={s.templateItemName}>
        {title}
      </Typography>
    </div>
  )
})
