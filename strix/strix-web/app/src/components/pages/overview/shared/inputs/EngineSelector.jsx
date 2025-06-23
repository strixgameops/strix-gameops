import React from 'react';
import { 
  FormControl, 
  InputLabel, 
  Select, 
  MenuItem 
} from '@mui/material';

const ENGINE_OPTIONS = ['Unity', 'Unreal Engine'];

const EngineSelector = ({ 
  value, 
  onChange, 
  error, 
  disabled = false 
}) => {
  return (
    <FormControl fullWidth error={error}>
      <InputLabel>Game Engine</InputLabel>
      <Select
        value={value}
        label="Game Engine"
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
      >
        {ENGINE_OPTIONS.map((engine) => (
          <MenuItem key={engine} value={engine}>
            {engine}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
};

export default EngineSelector;