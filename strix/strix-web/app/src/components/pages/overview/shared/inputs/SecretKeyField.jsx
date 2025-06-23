import React, { useState } from 'react';
import {
  FormControl,
  InputLabel,
  OutlinedInput,
  InputAdornment,
  IconButton,
  Tooltip
} from '@mui/material';
import { ContentCopy as ContentCopyIcon } from '@mui/icons-material';
import { CopyToClipboard } from 'react-copy-to-clipboard';

const SecretKeyField = ({ value, label = "API Secret Key" }) => {
  const [showTooltip, setShowTooltip] = useState(false);

  const handleCopy = () => {
    setShowTooltip(true);
    setTimeout(() => setShowTooltip(false), 1000);
  };

  return (
    <FormControl disabled sx={{ width: "100%" }}>
      <InputLabel htmlFor="secretKey">{label}</InputLabel>
      <OutlinedInput
        spellCheck={false}
        endAdornment={
          <InputAdornment position="end">
            <Tooltip
              open={showTooltip}
              title="Copied"
              disableInteractive
            >
              <IconButton
                sx={{ borderRadius: 0 }}
                edge="end"
                color="primary"
                onClick={handleCopy}
              >
                <CopyToClipboard text={value} onCopy={handleCopy}>
                  <ContentCopyIcon />
                </CopyToClipboard>
              </IconButton>
            </Tooltip>
          </InputAdornment>
        }
        sx={{ width: "100%" }}
        fullWidth
        label={label}
        id="secretKey"
        value="***************************************************"
      />
    </FormControl>
  );
};

export default SecretKeyField;