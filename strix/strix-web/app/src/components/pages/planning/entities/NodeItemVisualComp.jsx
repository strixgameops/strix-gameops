import React from 'react'
import s from './css/nodesListItems.module.css';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import Tooltip from '@mui/material/Tooltip';
import FolderIcon from '@mui/icons-material/Folder';

import EntityBasic from "./css/entityBasic.svg?react";
import EntityCategory from "./css/entityCategory.svg?react";

const NodeItemVisualComp = ({item, isUncategorized, preview, isCategory}) => {
  // console.log('Item:', item)
  return (
    <div className={`${s.nodeListItemContainer} ${preview && s.nodeListItemContainerPreview}`}>
        {isUncategorized ? (
        <div className={s.folderIconContainer}><FolderIcon size='small'/></div>
        ) : [

        <div className={s.draggableIconContainer}><DragIndicatorIcon/></div>,

          isCategory ? (
            <div className={s.categoryIconContainer}><EntityCategory/></div>
          ) : (
            <div className={s.entityIconContainer}><EntityBasic/></div>
          )
        ]}


        <div className={s.title}>{item.Name}</div>

        {isUncategorized && (
        <Tooltip title={`Nodes inside "Uncategorized" folder are considered drafts. Any changes made to this nodes won't be accessible from game SDK. You can fix it by dragging a node outside of this folder.`}>
          <div className={s.uncategorizedIconContainer}><WarningAmberIcon/></div>
        </Tooltip>
        )}
    </div>
  )
}

export default NodeItemVisualComp