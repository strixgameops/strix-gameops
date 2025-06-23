import React, { memo, useState, useMemo, useEffect } from "react";

import s from "./portableSegmentBuilder.module.css";
import { useDrag } from "react-dnd";
import DragIndicatorSharpIcon from "@mui/icons-material/DragIndicatorSharp";
import { Typography } from "@mui/material";
const TemplateItemDraggable = memo(function DraggableBox({
  template,
  onDragStateChange,
  type,
}) {
  const [{ isDragging }, drag, preview] = useDrag(
    () => ({
      type: type,
      item: template,
      collect: (monitor) => ({
        isDragging: monitor.isDragging(),
      }),
    }),
    [template]
  );
  useEffect(() => {
    onDragStateChange(isDragging);
    if (isDragging) {
      document.body.classList.add("grabbing");
    } else {
      document.body.classList.remove("grabbing");
    }

    return () => {
      document.body.classList.remove("grabbing");
    };
  }, [isDragging]);

  return (
    <div
      className={s.templateItem}
      ref={drag}
      onClick={(event) => event.stopPropagation()}
    >
      <DragIndicatorSharpIcon />
      <Typography className={s.templateItemName}>
        {template.templateName}
      </Typography>
    </div>
  );
});

export default TemplateItemDraggable;
