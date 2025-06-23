import React, { useState } from 'react';
import {useCollapse} from 'react-collapsed';
import s from './eventSearcher.module.css'

export default function CollapsibleCategory(props) {
    const duration = 150;
    const [isExpanded, setExpanded] = useState(true)
    const { getCollapseProps, getToggleProps } = useCollapse({isExpanded, duration});
return (
    <div className={s.category}>
        <div className={s.header} {...getToggleProps({onClick: () => setExpanded((prevExpanded) => !prevExpanded),})}>
            {isExpanded ? props.name : props.name}
        </div>
        <div {...getCollapseProps()}>
            <div className={s.content}>
                {props.children}
            </div>
        </div>
    </div>
    );
}