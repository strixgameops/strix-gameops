import React, {useState, useEffect, useRef} from 'react'
import s from './ConfirmationModal.module.css'
import { Box, Typography, Button, TextField } from '@mui/material';

function ConfirmationModal({onConfirm, onCancel, bodyText, title, confirmString}) {
    const style = {
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 400,
        bgcolor: 'background.paper',
        border: '2px solid #692121',
        boxShadow: 24,
        p: 4,
    };

    const [inputString, setInputString] = useState('');


  return (
    <Box sx={style}>
        <Typography variant="h4" color={'text.secondary'} 
        sx={{
          fontSize: '16px', fontWeight: 'regular', textAlign: 'start', mb: 2 }}>
            {title}
        </Typography>

        <Typography variant="body1" color={'text.secondary'} 
        sx={{fontSize: '13px', fontWeight: 'regular', textAlign: 'start', mb: 2 }}>
            {bodyText}
        </Typography>

        <TextField spellCheck={false}
          id="standard-basic"
          label=""
          variant="standard"
          value={inputString}
          onChange={(e) => setInputString(e.target.value)}
          sx={{ width: 300 }}
        />

        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
        <Button
          variant="outlined"
          color="primary"
          onClick={onConfirm}
          disabled={inputString.toString() !== confirmString.toString()}
          sx={{ mt: 2 }}
        >
          Confirm
        </Button>
        
        <Button
          variant="contained"
          onClick={onCancel}
          sx={{ mt: 2 }}
        >
          Cancel
        </Button>
        </Box>
    </Box>
  )
}

export default ConfirmationModal