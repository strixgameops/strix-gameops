import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { Modal, Box, Typography, Button, Tooltip, IconButton, Fade, Slide, Zoom } from '@mui/material';
import { styled } from '@mui/material/styles';
import { 
  LiveHelp as LiveHelpIcon, 
  Close as CloseIcon,
  ArrowBack as ArrowBackIcon,
  ArrowForward as ArrowForwardIcon,
  CheckCircle as CheckCircleIcon
} from '@mui/icons-material';
import { useLocation } from 'react-router-dom';
import StrixStepper from '../../shared/stepper/StrixStepper.jsx';
import useApi from '@strix/hooks/useApi';
import { useUser } from '@strix/userContext';
import { useOnboardingStatus } from '@strix/hooks/useOnboardingStatus';
import tutorials from './tutorials.js';

const AUTO_SHOW_DELAY = 5000;
const MIN_SHOW_DURATION = 2000;

// Styled Components
const TutorialDialog = styled(Modal)(({ theme }) => ({
  '& .MuiBackdrop-root': {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    backdropFilter: 'blur(8px)',
  }
}));

const ModalContainer = styled(Box)(({ theme }) => ({
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: '90%',
  maxWidth: '800px',
  background: '#ffffff',
  borderRadius: '20px',
  boxShadow: '0 20px 60px rgba(0, 0, 0, 0.15)',
  border: '1px solid #e1e5e9',
  overflow: 'hidden',
  position: 'relative',
  '&::before': {
    content: '""',
    position: 'absolute',
    top: '-2px',
    left: '-2px',
    right: '-2px',
    bottom: '-2px',
    background: 'linear-gradient(45deg, #6f63ff20, #22c55e20, #f59e0b20, #ef444420)',
    borderRadius: '22px',
    zIndex: -1,
    animation: 'gradient-shift 3s ease-in-out infinite',
    '@keyframes gradient-shift': {
      '0%, 100%': { opacity: 0.3 },
      '50%': { opacity: 0.8 }
    }
  }
}));

const ModalHeader = styled(Box)(({ theme }) => ({
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
    background: 'linear-gradient(180deg, #6f63ff 0%, #6f63ffdd 100%)',
  }
}));

const ModalContent = styled(Box)(({ theme }) => ({
  padding: '32px',
  background: '#fafbfc',
}));

const GradientCard = styled(Box)(({ theme, variant = 'default' }) => {
  const variants = {
    default: {
      background: '#ffffff',
      border: '2px solid #6f63ff30',
      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
    },
    success: {
      background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
      border: '2px solid #22c55e40',
      boxShadow: '0 4px 20px rgba(34, 197, 94, 0.15)',
    },
    primary: {
      background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
      border: '2px solid #6f63ff40',
      boxShadow: '0 4px 20px rgba(111, 99, 255, 0.15)',
    }
  };

  return {
    ...variants[variant],
    borderRadius: '16px',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    position: 'relative',
    overflow: 'hidden',
    '&:hover': {
      transform: 'translateY(-4px)',
      boxShadow: '0 12px 30px rgba(0, 0, 0, 0.12)',
      border: '2px solid #6f63ff60',
    },
  };
});

const IconContainer = styled(Box)(({ theme, color = 'primary', size = 'medium' }) => {
  const colors = {
    primary: '#6f63ff',
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
    cursor: 'pointer',
    '&:hover': {
      background: colors[color],
      color: '#ffffff',
      transform: 'scale(1.1)',
      boxShadow: `0 8px 25px ${colors[color]}40`,
    },
  };
});

const GradientText = styled(Typography)(({ theme, type = 'primary' }) => {
  const variants = {
    primary: 'linear-gradient(135deg, #6f63ff 0%, #6f63ffdd 100%)',
    success: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
    error: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
  };

  return {
    background: variants[type],
    backgroundClip: 'text',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    fontWeight: 700,
  };
});

const StyledButton = styled(Button)(({ theme, variant: buttonVariant = 'primary' }) => {
  const variants = {
    primary: {
      background: 'linear-gradient(135deg, #6f63ff 0%, #5b52d4 100%)',
      '&:hover': {
        background: 'linear-gradient(135deg, #5b52d4 0%, #4c46b8 100%)',
        boxShadow: '0 6px 20px rgba(111, 99, 255, 0.4)',
      }
    },
    success: {
      background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
      '&:hover': {
        background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
        boxShadow: '0 6px 20px rgba(34, 197, 94, 0.4)',
      }
    }
  };

  return {
    ...variants[buttonVariant],
    color: '#ffffff',
    fontWeight: 600,
    borderRadius: '8px',
    textTransform: 'none',
    transition: 'all 0.3s ease',
    '&:hover': {
      ...variants[buttonVariant]['&:hover'],
      transform: 'translateY(-2px)',
    },
    '&:disabled': {
      opacity: 0.6,
      transform: 'none',
    }
  };
});

const ProgressCard = styled(Box)(({ theme }) => ({
  padding: '20px',
  borderRadius: '12px',
  background: '#ffffff',
  border: '2px solid #6f63ff50',
  boxShadow: '0 4px 20px rgba(111, 99, 255, 0.20)',
  position: 'relative',
  overflow: 'hidden',
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    width: '4px',
    height: '100%',
    background: '#6f63ff',
    borderRadius: '2px 0 0 2px',
  }
}));

const TutorialModal = () => {
  const location = useLocation();
  const { markUserTutorialState } = useApi();
  const { userProfile, refreshProfile } = useUser();
  const { isOnboarding, isCheckingOnboarding } = useOnboardingStatus();
  
  const [showTutorial, setShowTutorial] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [canClose, setCanClose] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  
  const autoShowTimeoutRef = useRef(null);
  const minDurationTimeoutRef = useRef(null);

  const currentTutorial = useMemo(() => 
    tutorials.find(t => t.page === location.pathname),
    [location.pathname]
  );

  const isCompleted = useMemo(() => {
    if (!currentTutorial || !userProfile?.tutorialsWatched) return false;
    
    return userProfile.tutorialsWatched.find(
      t => t.tutorialPage === location.pathname
    )?.newState === 'done';
  }, [currentTutorial, userProfile?.tutorialsWatched, location.pathname]);

  // shouldAutoShow to check onboarding status
  const shouldAutoShow = useMemo(() => {
    // Don't show if we're still checking onboarding status
    if (isCheckingOnboarding) return false;
    
    // Don't show during onboarding
    if (isOnboarding) return false;
    
    // Only show if we have a tutorial, user is logged in, and it's not completed
    return currentTutorial && userProfile?.email && !isCompleted;
  }, [currentTutorial, userProfile?.email, isCompleted, isOnboarding, isCheckingOnboarding]);

  useEffect(() => {
    if (!shouldAutoShow) {
      // Clear any existing timeout if conditions no longer met
      if (autoShowTimeoutRef.current) {
        clearTimeout(autoShowTimeoutRef.current);
        autoShowTimeoutRef.current = null;
      }
      return;
    }

    autoShowTimeoutRef.current = setTimeout(() => {
      setCanClose(false);
      setCurrentStep(0);
      setShowTutorial(true);
      
      minDurationTimeoutRef.current = setTimeout(() => {
        setCanClose(true);
      }, MIN_SHOW_DURATION);
    }, AUTO_SHOW_DELAY);

    return () => {
      if (autoShowTimeoutRef.current) clearTimeout(autoShowTimeoutRef.current);
      if (minDurationTimeoutRef.current) clearTimeout(minDurationTimeoutRef.current);
    };
  }, [shouldAutoShow]);

  const clampStep = useCallback((value) => 
    Math.max(0, Math.min(value, currentTutorial?.steps.length - 1 || 0)),
    [currentTutorial?.steps.length]
  );

  const handleClose = useCallback(async (markAsComplete = false) => {
    if (!canClose) return;

    setShowTutorial(false);
    setImageLoaded(false);
    
    if (markAsComplete && currentTutorial) {
      try {
        await markUserTutorialState({
          tutorialPage: currentTutorial.page,
          newState: 'done',
        });
        await refreshProfile();
      } catch (error) {
        console.error('Failed to mark tutorial as complete:', error);
      }
    }
  }, [canClose, currentTutorial, markUserTutorialState, refreshProfile]);

  const handleNext = useCallback(() => {
    setImageLoaded(false);
    setCurrentStep(prev => clampStep(prev + 1));
  }, [clampStep]);

  const handleBack = useCallback(() => {
    setImageLoaded(false);
    setCurrentStep(prev => clampStep(prev - 1));
  }, [clampStep]);

  const handleManualShow = useCallback(() => {
    // Don't allow manual show during onboarding
    if (isOnboarding) return;
    
    setCurrentStep(0);
    setCanClose(true);
    setShowTutorial(true);
    setImageLoaded(false);
  }, [isOnboarding]);

  const isLastStep = currentStep === (currentTutorial?.steps.length - 1);

  // Don't render anything during onboarding
  if (isOnboarding || isCheckingOnboarding || !currentTutorial) return null;

  return (
    <>
      <Tooltip title="Show tips" disableInteractive>
        <Box sx={{ position: 'relative' }}>
          <IconContainer 
            color="primary" 
            size="small"
            onClick={handleManualShow}
            sx={{ 
              mr: 2,
              animation: shouldAutoShow ? 'pulse 2s infinite' : 'none',
              '@keyframes pulse': {
                '0%': { transform: 'scale(1)', boxShadow: '0 0 0 0 rgba(111, 99, 255, 0.7)' },
                '70%': { transform: 'scale(1.05)', boxShadow: '0 0 0 10px rgba(111, 99, 255, 0)' },
                '100%': { transform: 'scale(1)', boxShadow: '0 0 0 0 rgba(111, 99, 255, 0)' }
              }
            }}
          >
            <LiveHelpIcon />
          </IconContainer>
        </Box>
      </Tooltip>

      <TutorialDialog
        open={showTutorial}
        onClose={() => handleClose(true)}
        disableEscapeKeyDown={!canClose}
      >
        <Fade in={showTutorial} timeout={600}>
          <ModalContainer>
            <ModalHeader>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <IconContainer color="primary" size="large">
                    <LiveHelpIcon />
                  </IconContainer>
                  <GradientText variant="h4" type="primary">
                    Quickstart: {currentTutorial.title}
                  </GradientText>
                </Box>
                
                <IconButton
                  onClick={() => handleClose(true)}
                  disabled={!canClose}
                  sx={{
                    opacity: canClose ? 1 : 0.3,
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      transform: 'scale(1.1)',
                      bgcolor: '#ef444420'
                    }
                  }}
                >
                  <CloseIcon />
                </IconButton>
              </Box>
            </ModalHeader>

            <ModalContent>
              {currentTutorial.steps.length > 1 && (
                <Slide in={true} direction="down" timeout={800}>
                  <ProgressCard sx={{ mb: 4 }}>
                    <Box sx={{ position: 'relative', mb: 2 }}>
                      <Box
                        sx={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: `${((currentStep + 1) / currentTutorial.steps.length) * 100}%`,
                          height: '4px',
                          background: 'linear-gradient(90deg, #6f63ff, #22c55e)',
                          borderRadius: '2px',
                          transition: 'width 0.5s ease'
                        }}
                      />
                    </Box>
                    <StrixStepper
                      borderActiveStyle={{ borderColor: '#cbcbcb' }}
                      borderCompletedStyle={{ borderColor: '#cbcbcb' }}
                      dotColorDefault="500"
                      dotColorActive="#6f63ff"
                      lineColorDefault="600"
                      lineColorActive="800"
                      steps={currentTutorial.steps.map(s => s.title)}
                      activeStep={currentStep}
                      labelUnderDot
                    />
                  </ProgressCard>
                </Slide>
              )}

              <Zoom in={true} timeout={1000}>
                <GradientCard variant="default" sx={{ mb: 4, p: 3 }}>
                  <Box
                    sx={{
                      height: 300,
                      maxHeight: 300,
                      width: '100%',
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      borderRadius: '12px',
                      overflow: 'hidden',
                      bgcolor: '#fafbfc',
                      position: 'relative'
                    }}
                  >
                    <Fade in={imageLoaded} timeout={500}>
                      <img
                        src={currentTutorial.steps[currentStep]?.image}
                        alt={currentTutorial.steps[currentStep]?.title}
                        onLoad={() => setImageLoaded(true)}
                        style={{
                          maxWidth: '100%',
                          maxHeight: '100%',
                          objectFit: 'contain',
                          borderRadius: '8px',
                          transition: 'transform 0.3s ease',
                          transform: imageLoaded ? 'scale(1)' : 'scale(0.95)'
                        }}
                      />
                    </Fade>
                  </Box>
                </GradientCard>
              </Zoom>

              <Slide in={imageLoaded} direction="up" timeout={600}>
                <GradientCard variant="success" sx={{ mb: 4, p: 3, textAlign: 'center' }}>
                  <Typography
                    variant="body1"
                    sx={{
                      fontWeight: 500,
                      fontSize: '1.1rem',
                      lineHeight: 1.6,
                      color: '#1f2937'
                    }}
                  >
                    {currentTutorial.steps[currentStep]?.description}
                  </Typography>
                </GradientCard>
              </Slide>

              <Slide in={true} direction="up" timeout={1000}>
                <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
                  <Button 
                    onClick={() => handleClose(true)}
                    disabled={!canClose}
                    sx={{ 
                      mr: 'auto',
                      opacity: canClose ? 1 : 0.5,
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        bgcolor: '#f1f5f9',
                        transform: 'translateY(-2px)'
                      }
                    }}
                  >
                    Skip Tutorial
                  </Button>
                  
                  <Button
                    variant="outlined"
                    onClick={handleBack}
                    disabled={currentStep === 0}
                    startIcon={<ArrowBackIcon />}
                    sx={{
                      borderWidth: '2px',
                      borderColor: '#e2e8f0',
                      '&:hover': {
                        borderWidth: '2px',
                        borderColor: '#6f63ff',
                        transform: 'translateY(-2px)',
                        boxShadow: '0 4px 12px rgba(111, 99, 255, 0.25)'
                      },
                      '&:disabled': { opacity: 0.4 }
                    }}
                  >
                    Back
                  </Button>
                  
                  {isLastStep ? (
                    <StyledButton
                      variant="success"
                      onClick={() => handleClose(true)}
                      disabled={!canClose}
                      startIcon={<CheckCircleIcon />}
                      sx={{ minWidth: 120 }}
                    >
                      Complete
                    </StyledButton>
                  ) : (
                    <StyledButton
                      variant="primary"
                      onClick={handleNext}
                      endIcon={<ArrowForwardIcon />}
                      sx={{ minWidth: 120 }}
                    >
                      Next
                    </StyledButton>
                  )}
                </Box>
              </Slide>
            </ModalContent>
          </ModalContainer>
        </Fade>
      </TutorialDialog>
    </>
  );
};

export default React.memo(TutorialModal);