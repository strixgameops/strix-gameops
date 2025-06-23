import React, { useState } from 'react';
import s from './css/collapsibleSection.module.css'
import Collapse from '@mui/material/Collapse';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';

export default function CollapsibleSection(props) {
    const duration = 300;
    const [isExpanded, setExpanded] = useState(true)

return (
    <div>
        <Button 
        sx={{
            border: '2px solid #615ff45e',
            backgroundColor: '#bdc0eb',
            textTransform: 'none', p: 0, height: '70px', width: '100%',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',

            borderRadius: "2rem",
            borderBottomLeftRadius: isExpanded ? 0 : "2rem",
            borderBottomRightRadius: isExpanded ? 0 : "2rem",
            transition: "border-radius 0.1s ease-in-out",

        }}
        onClick={() => setExpanded(!isExpanded)}
        >
            <Typography sx={{pl: 2, fontSize: 18}} variant='h6' color={"text.secondary"}>
            {props.name}
            </Typography>
            <Typography className={s.headerCardsAmount}>
            {props.cardsAmount}
            </Typography>
        </Button>
        <Collapse sx={{ width: '100%' }} in={isExpanded} timeout={duration}>
            <div>
                <div className={s.content}>
                    {props.children}
                </div>
            </div>
        </Collapse>
    </div>
    );
}