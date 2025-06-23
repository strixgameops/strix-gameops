import { styled } from '@mui/material/styles';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Card,
  Box,
  Tabs,
  Accordion,
  TextField,
  Typography,
  Chip,
  LinearProgress
} from '@mui/material';

// Styled Components redesigned for vibrant light theme
export const StyledDialog = styled(Dialog)(({ theme }) => ({
  '& .MuiDialog-paper': {
    background: '#ffffff',
    borderRadius: '20px',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.15)',
    border: '1px solid #e1e5e9',
  },
}));

export const StyledDialogTitle = styled(DialogTitle)(({ theme }) => ({
  background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
  borderBottom: '2px solid #e1e5e9',
  padding: '24px 32px',
  position: 'relative',
  '&::after': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    width: '4px',
    height: '100%',
    background: `linear-gradient(180deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.main}dd 100%)`,
  }
}));

export const StyledDialogContent = styled(DialogContent)(({ theme }) => ({
  padding: '32px',
  background: '#fafbfc',
  position: 'relative',
}));

export const GradientCard = styled(Card)(({ theme, variant = 'default', clickable = false }) => {
  const variants = {
    default: {
      background: '#ffffff',
      border: `2px solid ${theme.palette.primary.main}30`,
      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
    },
    success: {
      background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
      border: '2px solid #22c55e40',
      boxShadow: '0 4px 20px rgba(34, 197, 94, 0.15)',
    },
    error: {
      background: 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)',
      border: '2px solid #ef444440',
      boxShadow: '0 4px 20px rgba(239, 68, 68, 0.15)',
    },
    warning: {
      background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
      border: '2px solid #f59e0b40',
      boxShadow: '0 4px 20px rgba(245, 158, 11, 0.15)',
    }
  };

  return {
    ...variants[variant],
    borderRadius: '16px',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    position: 'relative',
    overflow: 'hidden',
    cursor: clickable ? 'pointer' : 'default',
    '&:hover': {
      transform: clickable ? 'translateY(-8px) scale(1.02)' : 'translateY(-4px)',
      boxShadow: clickable 
        ? `0 16px 40px ${theme.palette.primary.main}25` 
        : '0 12px 30px rgba(0, 0, 0, 0.12)',
      border: clickable 
        ? `2px solid ${theme.palette.primary.main}60` 
        : `2px solid ${theme.palette.primary.main}40`,
    },
  };
});

export const IconContainer = styled(Box)(({ theme, color = 'primary', size = 'medium' }) => {
  const colors = {
    primary: theme.palette.primary.main,
    success: '#22c55e',
    error: '#ef4444',
    warning: '#f59e0b',
  };

  const sizes = {
    small: { width: '36px', height: '36px', fontSize: '18px' },
    medium: { width: '44px', height: '44px', fontSize: '22px' },
    large: { width: '52px', height: '52px', fontSize: '26px' },
  };

  return {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    ...sizes[size],
    borderRadius: '12px',
    background: `${colors[color]}15`,
    color: colors[color],
    border: `2px solid ${colors[color]}30`,
    transition: 'all 0.3s ease',
    '&:hover': {
      background: colors[color],
      color: '#ffffff',
      transform: 'scale(1.1)',
      boxShadow: `0 8px 25px ${colors[color]}40`,
    },
  };
});

export const StyledTabs = styled(Tabs)(({ theme }) => ({
  '& .MuiTabs-root': {
    background: '#ffffff',
    borderRadius: '12px',
    border: `2px solid ${theme.palette.primary.main}20`,
    boxShadow: '0 2px 10px rgba(0, 0, 0, 0.05)',
  },
  '& .MuiTabs-indicator': {
    display: 'none',
  },
  '& .MuiTabs-flexContainer': {
    padding: '6px',
  },
  '& .MuiTab-root': {
    borderRadius: '8px',
    margin: '0 4px',
    textTransform: 'none',
    fontWeight: 600,
    minHeight: '44px',
    color: '#475569',
    transition: 'all 0.2s ease',
    '&:hover': {
      background: `${theme.palette.primary.main}10`,
      color: theme.palette.primary.main,
    },
    '&.Mui-selected': {
      background: theme.palette.primary.main,
      color: '#ffffff',
      boxShadow: `0 4px 12px ${theme.palette.primary.main}30`,
    }
  }
}));

export const MetricCard = styled(Box)(({ theme, highlight = false, clickable = false }) => ({
  padding: '20px',
  borderRadius: '12px',
  background: '#ffffff',
  border: highlight 
    ? `2px solid ${theme.palette.primary.main}50`
    : '2px solid #e2e8f0',
  transition: 'all 0.3s ease',
  cursor: clickable ? 'pointer' : 'default',
  boxShadow: highlight 
    ? `0 4px 20px ${theme.palette.primary.main}20`
    : '0 2px 10px rgba(0, 0, 0, 0.05)',
  '&:hover': {
    transform: clickable ? 'translateY(-4px)' : 'translateY(-2px)',
    boxShadow: highlight 
      ? `0 8px 30px ${theme.palette.primary.main}25`
      : '0 6px 20px rgba(0, 0, 0, 0.08)',
    border: highlight 
      ? `2px solid ${theme.palette.primary.main}70`
      : `2px solid ${theme.palette.primary.main}30`,
  },
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    width: '4px',
    height: '100%',
    background: highlight 
      ? theme.palette.primary.main
      : '#e2e8f0',
    borderRadius: '2px 0 0 2px',
  }
}));

export const StyledAccordion = styled(Accordion)(({ theme }) => ({
  background: '#ffffff',
  border: '2px solid #e2e8f0',
  borderRadius: '12px !important',
  marginBottom: '12px !important',
  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
  '&:hover': {
    background: '#fafbfc',
    border: `2px solid ${theme.palette.primary.main}30`,
    boxShadow: '0 4px 15px rgba(0, 0, 0, 0.08)',
  },
  '&.Mui-expanded': {
    background: '#ffffff',
    border: `2px solid ${theme.palette.primary.main}50`,
    boxShadow: `0 6px 25px ${theme.palette.primary.main}15`,
  },
  '&::before': {
    display: 'none',
  },
}));

export const SearchField = styled(TextField)(({ theme }) => ({
  '& .MuiOutlinedInput-root': {
    background: '#ffffff',
    borderRadius: '12px',
    '& fieldset': {
      borderColor: '#d1d5db',
      borderWidth: '2px',
    },
    '&:hover fieldset': {
      borderColor: `${theme.palette.primary.main}60`,
    },
    '&.Mui-focused fieldset': {
      borderColor: theme.palette.primary.main,
      borderWidth: '2px',
      boxShadow: `0 0 0 3px ${theme.palette.primary.main}20`,
    },
  },
  '& .MuiInputBase-input': {
    color: '#1f2937',
    '&::placeholder': {
      color: '#6b7280',
      opacity: 1,
    }
  }
}));

export const GradientTypography = styled(Typography)(({ theme, type = 'primary' }) => {
  const variants = {
    primary: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.main}dd 100%)`,
    success: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
    error: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
    warning: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
  };

  return {
    background: variants[type],
    backgroundClip: 'text',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    fontWeight: 700,
  };
});

export const FeatureChip = styled(Chip)(({ theme, impact = 'low' }) => {
  const impactStyles = {
    low: {
      background: '#f1f5f9',
      color: '#475569',
      border: '1px solid #cbd5e1',
    },
    medium: {
      background: '#fef3c7',
      color: '#d97706',
      border: '1px solid #fbbf24',
    },
    high: {
      background: '#fee2e2',
      color: '#dc2626',
      border: '1px solid #f87171',
    }
  };

  return {
    ...impactStyles[impact],
    borderRadius: '8px',
    fontWeight: 600,
    fontSize: '12px',
    height: '28px',
    transition: 'all 0.2s ease',
    '&:hover': {
      transform: 'scale(1.05)',
    }
  };
});

export const GlowingLinearProgress = styled(LinearProgress)(({ theme, color = 'primary' }) => {
  const colors = {
    primary: theme.palette.primary.main,
    error: '#ef4444',
    warning: '#f59e0b',
    success: '#22c55e',
  };

  return {
    height: '8px',
    borderRadius: '4px',
    background: '#e5e7eb',
    '& .MuiLinearProgress-bar': {
      borderRadius: '4px',
      background: colors[color],
      boxShadow: `0 0 10px ${colors[color]}60`,
    }
  };
});

export const ChartContainer = styled(Box)(({ theme }) => ({
  background: '#ffffff',
  borderRadius: '12px',
  padding: '20px',
  border: '2px solid #e5e7eb',
  boxShadow: '0 2px 10px rgba(0, 0, 0, 0.05)',
  position: 'relative',
  '&:hover': {
    border: `2px solid ${theme.palette.primary.main}30`,
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
  }
}));