import React, { useState } from 'react';
import { 
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Button,
  TextField,
  Box,
  Alert
} from '@mui/material';
import { Warning as WarningIcon } from '@mui/icons-material';

const ConfirmationModal = ({ 
  open,
  onConfirm, 
  onCancel, 
  bodyText, 
  title, 
  confirmString 
}) => {
  const [inputString, setInputString] = useState('');

  const isConfirmDisabled = inputString.toString() !== confirmString.toString();

  const handleConfirm = () => {
    if (!isConfirmDisabled) {
      onConfirm();
      setInputString('');
    }
  };

  const handleCancel = () => {
    onCancel();
    setInputString('');
  };

  return (
    <Dialog
      open={open}
      onClose={handleCancel}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          border: 2,
          borderColor: 'error.main'
        }
      }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Box display="flex" alignItems="center" gap={1.5}>
          <WarningIcon color="error" />
          <Typography variant="h6" fontWeight={600}>
            {title}
          </Typography>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        <Alert severity="warning" sx={{ mb: 3, borderRadius: 2 }}>
          <Typography variant="body2">
            {bodyText}
          </Typography>
        </Alert>

        <TextField
          fullWidth
          label="Type to confirm"
          variant="outlined"
          value={inputString}
          onChange={(e) => setInputString(e.target.value)}
          autoFocus
          placeholder={confirmString}
          helperText={`Type "${confirmString}" to enable confirmation`}
        />
      </DialogContent>

      <DialogActions sx={{ p: 2.5 }}>
        <Button
          onClick={handleCancel}
          variant="outlined"
          size="large"
          sx={{ minWidth: 100 }}
        >
          Cancel
        </Button>
        <Button
          onClick={handleConfirm}
          disabled={isConfirmDisabled}
          variant="contained"
          color="error"
          size="large"
          sx={{ minWidth: 100 }}
        >
          Confirm
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ConfirmationModal;