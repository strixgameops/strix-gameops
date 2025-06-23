import React from 'react'
import s from './customCharts.module.css'
import Button from '@mui/material/Button';

const ChartSelectionItem = ({
    disabled, 
    type, 
    selectedChartType, 
    onSelect, 
    editingChart
}) => {

    function getName() {
        switch (type) {
            case 'simple':
                return 'Simple chart'
            case 'advanced':
                return 'ADvanced chart'
            default:
                return 'Unknown'
        }
    }

  return (
    <Button
    disabled={disabled}
    className={
        `${s.chartCard} ${editingChart ? s.chartCardMinimized : ''} ${selectedChartType === type ? s.chartCardActive : ''}`
    }
    variant={selectedChartType === type ? 'contained' : 'outlined'}
    sx={{
        backgroundColor: selectedChartType === type ? '#3e3e73' : 'none',
    }}
    onClick={() => onSelect(type)}>
        {getName()}
    </Button>
  )
}

export default ChartSelectionItem