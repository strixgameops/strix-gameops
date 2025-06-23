import React from 'react';
import {
  Popover,
  Paper,
  Typography,
  Box,
  Chip
} from '@mui/material';
import styles from '../css/countryPopover.module.css';

const CountryPopover = ({ 
  open, 
  anchorPosition, 
  onClose, 
  countryName, 
  countryData 
}) => {
  return (
    <Popover
      open={open}
      onClose={onClose}
      anchorReference="anchorPosition"
      anchorPosition={anchorPosition}
      transformOrigin={{
        vertical: 'top',
        horizontal: 'left',
      }}
      PaperProps={{
        className: styles.popoverPaper,
        elevation: 8
      }}
    >
      <Paper className={styles.popoverContent}>
        <Box className={styles.header}>
          <Typography variant="h6" className={styles.countryName}>
            {countryName}
          </Typography>
        </Box>
        
        <Box className={styles.content}>
          <Typography variant="body2" className={styles.placeholder}>
            Country analytics will be displayed here
          </Typography>
          
          <Box className={styles.statsPreview}>
            <Chip 
              label={`${countryData?.installs || 0} installs`}
              size="small"
              className={styles.statChip}
            />
          </Box>
        </Box>
      </Paper>
    </Popover>
  );
};

export default CountryPopover;