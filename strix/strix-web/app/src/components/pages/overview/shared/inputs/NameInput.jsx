import React, { useState, useEffect } from 'react';
import { TextField, FormControl } from '@mui/material';

const NameInput = ({ 
  label, 
  value, 
  onChange, 
  error, 
  disabled = false,
  required = true 
}) => {
  return (
    <FormControl fullWidth>
      <TextField
        spellCheck={false}
        error={error}
        label={label}
        disabled={disabled}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
      />
    </FormControl>
  );
};

export default NameInput;