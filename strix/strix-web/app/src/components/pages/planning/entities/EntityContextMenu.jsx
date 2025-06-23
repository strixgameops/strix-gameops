import React, { useEffect, useState } from "react";
import "./css/contextMenu.css";

const EntityContextMenu = ({
  x,
  y,
  isVisible,
  onClose,
  onMenuItemClick,
  isRootNode,
  targetNode,
}) => {
  // const [coordX, setCoordX] = useState(x);
  // const [coordY, setCoordY] = useState(y);
  // const [isMenuVisible, setIsMenuVisible] = useState(isVisible);
  // const [targetIsRoot, setTargetIsRoot] = useState(false);

  function onItemSelected(itemNum) {
    return () => {
      onMenuItemClick(itemNum, targetNode);
      console.log(itemNum);
    };
  }

  // useEffect(() => {
  //     setIsMenuVisible(isVisible)
  //     setCoordX(x)
  //     setCoordY(y)
  //     setTargetIsRoot(isRootNode)
  // }, [isVisible, x, y, onClose, isRootNode])

  return (
    isVisible && (
      <div
        className={isRootNode ? "context-menu disabled" : "context-menu"}
        style={{ top: `${y}px`, left: `${x}px` }}
      >
        <ul>
          <li
            onClick={onItemSelected(1)}
            className={isRootNode ? "disabled" : ""}
          >
            {isRootNode ? (
              <span>Root has no node</span>
            ) : (
              <span>Open Node</span>
            )}
          </li>
          <li
            onClick={onItemSelected(2)}
            className={isRootNode ? "disabled" : ""}
          >
            {isRootNode ? (
              <span>Root can't be removed</span>
            ) : (
              <span>Remove from parent</span>
            )}
          </li>
          {/*    ,   */}
        </ul>
      </div>
    )
  );
};

export default EntityContextMenu;
