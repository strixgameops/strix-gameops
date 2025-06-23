import React, { useState, useEffect, useRef } from "react";
import {
  Typography,
  TextField,
  InputLabel,
  MenuItem,
  FormControl,
  Select,
  Box,
  Button,
  Modal,
  Tooltip,
  IconButton,
  Fade,
  Slide,
  Zoom,
  Paper,
  Card,
  CardContent,
  Avatar,
  Chip,
  alpha,
  useTheme,
  Stepper,
  Step,
  StepLabel,
  StepConnector,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import {
  CloudUpload as CloudUploadIcon,
  Person as PersonIcon,
  Business as BusinessIcon,
  CheckCircle as CheckCircleIcon,
  Edit as EditIcon,
  Close as CloseIcon,
  Rocket as RocketIcon,
} from "@mui/icons-material";
import SportsEsportsIcon from '@mui/icons-material/SportsEsports';
import uuid from "react-uuid";
import useApi from "@strix/api";
import imageCompression from "browser-image-compression";
import { useUser } from "@strix/userContext";
import LoadingButton from "@mui/lab/LoadingButton";
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';


// Styled Components
const StyledModal = styled(Modal)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  backdropFilter: "blur(12px)",
  backgroundColor: alpha(theme.palette.common.black, 0.7),
}));

const OnboardingContainer = styled(Paper)(({ theme }) => ({
  width: "90vw",
  maxWidth: "900px",
  maxHeight: "95vh",
  borderRadius: "24px",
  background: `linear-gradient(135deg, ${alpha(theme.palette.background.paper, 0.98)} 0%, ${alpha(theme.palette.background.default, 0.95)} 100%)`,
  backdropFilter: "blur(20px)",
  border: `1px solid ${alpha(theme.palette.divider, 0.2)}`,
  boxShadow: `0 32px 64px ${alpha(theme.palette.common.black, 0.25)}`,
  overflow: "hidden",
  position: "relative",
}));

const HeaderSection = styled(Box)(({ theme }) => ({
  background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
  padding: theme.spacing(5, 6),
  position: "relative",
  overflow: "hidden",
  "&::before": {
    content: '""',
    position: "absolute",
    top: "-50%",
    right: "-20%",
    width: "200px",
    height: "200px",
    borderRadius: "50%",
    background: alpha(theme.palette.common.white, 0.1),
    animation: "float 6s ease-in-out infinite",
  },
  "&::after": {
    content: '""',
    position: "absolute",
    bottom: "-30%",
    left: "-10%",
    width: "150px",
    height: "150px",
    borderRadius: "50%",
    background: alpha(theme.palette.common.white, 0.05),
    animation: "float 8s ease-in-out infinite reverse",
  },
  "@keyframes float": {
    "0%, 100%": { transform: "translateY(0px)" },
    "50%": { transform: "translateY(-20px)" },
  },
}));

const StepperContainer = styled(Box)(({ theme }) => ({
  padding: theme.spacing(4, 6, 2),
  "& .MuiStepLabel-root": {
    "& .MuiStepLabel-iconContainer": {
      transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
      "& .MuiSvgIcon-root": {
        fontSize: "2.2rem",
        color: alpha(theme.palette.text.disabled, 0.4),
        transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
      },
      "&.Mui-active .MuiSvgIcon-root": {
        color: theme.palette.primary.main,
        transform: "scale(1.3)",
        filter: `drop-shadow(0 4px 8px ${alpha(theme.palette.primary.main, 0.4)})`,
      },
      "&.Mui-completed .MuiSvgIcon-root": {
        color: theme.palette.success.main,
        transform: "scale(1.2)",
      },
    },
    "& .MuiStepLabel-label": {
      fontSize: "0.9rem",
      fontWeight: 500,
      transition: "all 0.3s ease",
      "&.Mui-active": {
        color: theme.palette.primary.main,
        fontWeight: 700,
        transform: "translateY(-2px)",
      },
      "&.Mui-completed": {
        color: theme.palette.success.main,
        fontWeight: 600,
      },
    },
  },
}));

const CustomStepConnector = styled(StepConnector)(({ theme }) => ({
  "& .MuiStepConnector-line": {
    borderColor: alpha(theme.palette.divider, 0.3),
    borderTopWidth: 3,
    transition: "all 0.4s ease",
    borderRadius: "2px",
  },
  "&.Mui-completed .MuiStepConnector-line": {
    borderColor: theme.palette.success.main,
    background: `linear-gradient(90deg, ${theme.palette.success.main} 0%, ${theme.palette.success.light} 100%)`,
    borderWidth: 0,
    height: "3px",
  },
  "&.Mui-active .MuiStepConnector-line": {
    borderColor: theme.palette.primary.main,
  },
}));

const ContentContainer = styled(Box)(({ theme }) => ({
  padding: theme.spacing(3, 6, 5),
  minHeight: "450px",
  display: "flex",
  flexDirection: "column",
  position: "relative",
}));

const StepCard = styled(Card)(({ theme }) => ({
  background: `linear-gradient(135deg, ${alpha(theme.palette.background.paper, 0.9)} 0%, ${alpha(theme.palette.background.default, 0.7)} 100%)`,
  backdropFilter: "blur(15px)",
  border: `1px solid ${alpha(theme.palette.divider, 0.15)}`,
  borderRadius: "20px",
  transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
  boxShadow: `0 8px 32px ${alpha(theme.palette.common.black, 0.08)}`,
  "&:hover": {
    transform: "translateY(-4px)",
    boxShadow: `0 16px 40px ${alpha(theme.palette.common.black, 0.12)}`,
  },
}));

const StyledTextField = styled(TextField)(({ theme }) => ({
  "& .MuiOutlinedInput-root": {
    borderRadius: "16px",
    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
    backgroundColor: alpha(theme.palette.background.paper, 0.6),
    border: `1px solid ${alpha(theme.palette.divider, 0.2)}`,
    "&:hover": {
      backgroundColor: alpha(theme.palette.background.paper, 0.8),
      borderColor: alpha(theme.palette.primary.main, 0.3),
      transform: "translateY(-1px)",
    },
    "&.Mui-focused": {
      backgroundColor: theme.palette.background.paper,
      transform: "translateY(-2px)",
      boxShadow: `0 8px 24px ${alpha(theme.palette.primary.main, 0.15)}`,
      "& .MuiOutlinedInput-notchedOutline": {
        borderColor: theme.palette.primary.main,
        borderWidth: "2px",
      },
    },
  },
  "& .MuiInputLabel-root": {
    fontWeight: 500,
    "&.Mui-focused": {
      fontWeight: 600,
    },
  },
}));

const StyledFormControl = styled(FormControl)(({ theme }) => ({
  "& .MuiOutlinedInput-root": {
    borderRadius: "16px",
    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
    backgroundColor: alpha(theme.palette.background.paper, 0.6),
    border: `1px solid ${alpha(theme.palette.divider, 0.2)}`,
    "&:hover": {
      backgroundColor: alpha(theme.palette.background.paper, 0.8),
      borderColor: alpha(theme.palette.primary.main, 0.3),
      transform: "translateY(-1px)",
    },
    "&.Mui-focused": {
      backgroundColor: theme.palette.background.paper,
      transform: "translateY(-2px)",
      boxShadow: `0 8px 24px ${alpha(theme.palette.primary.main, 0.15)}`,
    },
  },
}));

const UploadCard = styled(Card)(({ theme }) => ({
  width: 200,
  height: 200,
  borderRadius: "24px",
  border: `3px dashed ${alpha(theme.palette.primary.main, 0.4)}`,
  background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.03)} 0%, ${alpha(theme.palette.secondary.main, 0.02)} 100%)`,
  cursor: "pointer",
  position: "relative",
  overflow: "hidden",
  transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  "&:hover": {
    borderColor: theme.palette.primary.main,
    background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.08)} 0%, ${alpha(theme.palette.secondary.main, 0.05)} 100%)`,
    transform: "scale(1.05) rotate(1deg)",
    boxShadow: `0 12px 32px ${alpha(theme.palette.primary.main, 0.2)}`,
  },
}));

const ImagePreview = styled(Box)({
  width: "100%",
  height: "100%",
  position: "relative",
  borderRadius: "21px",
  overflow: "hidden",
  "& img": {
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },
});

const ImageOverlay = styled(Box)(({ theme }) => ({
  position: "absolute",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  background: alpha(theme.palette.common.black, 0.7),
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  opacity: 0,
  transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
  "&:hover": {
    opacity: 1,
  },
}));

const ActionButton = styled(Button)(({ theme }) => ({
  borderRadius: "16px",
  padding: theme.spacing(2, 5),
  textTransform: "none",
  fontWeight: 700,
  fontSize: "1.1rem",
  minHeight: "56px",
  minWidth: "140px",
  transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
  boxShadow: `0 4px 16px ${alpha(theme.palette.primary.main, 0.2)}`,
  "&:hover": {
    transform: "translateY(-3px)",
    boxShadow: `0 12px 32px ${alpha(theme.palette.primary.main, 0.3)}`,
  },
  "&.MuiButton-outlined": {
    borderWidth: "2px",
    "&:hover": {
      borderWidth: "2px",
    },
  },
}));

const StepIcon = styled(Avatar)(({ theme, active, completed }) => ({
  backgroundColor: completed 
    ? theme.palette.success.main 
    : active 
    ? theme.palette.primary.main 
    : alpha(theme.palette.text.disabled, 0.2),
  color: theme.palette.common.white,
  width: 64,
  height: 64,
  fontSize: "1.5rem",
  transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
  boxShadow: active 
    ? `0 8px 24px ${alpha(theme.palette.primary.main, 0.4)}`
    : completed
    ? `0 8px 24px ${alpha(theme.palette.success.main, 0.3)}`
    : "none",
  ...(active && {
    transform: "scale(1.15)",
  }),
  ...(completed && {
    transform: "scale(1.1)",
  }),
}));

const FinishCard = styled(Card)(({ theme }) => ({
  background: `linear-gradient(135deg, ${alpha(theme.palette.success.main, 0.1)} 0%, ${alpha(theme.palette.primary.main, 0.1)} 50%, ${alpha(theme.palette.secondary.main, 0.1)} 100%)`,
  border: `2px solid ${alpha(theme.palette.success.main, 0.3)}`,
  borderRadius: "24px",
  textAlign: "center",
  padding: theme.spacing(5),
  position: "relative",
  paddingBottom: 0,
  overflow: "hidden",
  "&::before": {
    content: '""',
    position: "absolute",
    top: "-50%",
    right: "-50%",
    width: "200%",
    height: "200%",
    background: `conic-gradient(from 0deg, transparent, ${alpha(theme.palette.primary.main, 0.1)}, transparent)`,
    animation: "rotate 20s linear infinite",
  },
  "@keyframes rotate": {
    from: { transform: "rotate(0deg)" },
    to: { transform: "rotate(360deg)" },
  },
}));

const AnimatedChip = styled(Chip)(({ theme }) => ({
  transition: "all 0.3s ease",
  "&:hover": {
    transform: "scale(1.05)",
  },
}));

function InitialSetup({ onFinish }) {
  const theme = useTheme();
  const { userState, refreshProfile } = useUser();
  const [page, setPage] = useState(0);
  const { finishInitialOnboarding } = useApi();

  // Form state
  const [name, setName] = useState("");
  const [nameError, setNameError] = useState(false);
  const [jobTitle, setJobTitle] = useState("");
  const [jobTitleError, setJobTitleError] = useState(false);
  const [publisherName, setPublisherName] = useState("");
  const [publisherNameError, setPublisherNameError] = useState(false);
  const [studioName, setStudioName] = useState("");
  const [studioNameError, setStudioNameError] = useState(false);
  const [studioApiKey, setStudioApiKey] = useState(uuid());
  const [studioIcon, setStudioIcon] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [slideDirection, setSlideDirection] = useState("left");

  const fileInputRef = useRef(null);

  const steps = [
    { label: "About You", icon: PersonIcon },
    { label: "Publisher", icon: BusinessIcon },
    { label: "Studio", icon: SportsEsportsIcon },
    { label: "Complete", icon: CheckCircleIcon },
  ];

  const jobTitles = [
    "Data Scientist",
    "Live-Ops Manager", 
    "Game Designer",
    "Software / Game Developer",
    "Sales & Marketing",
    "Producer",
    "CEO / Founder / Investor",
    "Other"
  ];

  const getStepContent = () => {
    const slideProps = {
      direction: slideDirection,
      in: true,
      timeout: {
        enter: 500,
        exit: 300,
      },
      mountOnEnter: true,
      unmountOnExit: true,
    };

    switch (page) {
      case 0:
        return (
          <Slide {...slideProps}>
            <StepCard>
              <CardContent sx={{ p: 5 }}>
                <Box sx={{ display: "flex", alignItems: "center", mb: 4 }}>
                  <StepIcon active="true">
                    <PersonIcon />
                  </StepIcon>
                  <Box sx={{ ml: 3 }}>
                    <Typography variant="h4" fontWeight="700" gutterBottom>
                      Tell us about yourself
                    </Typography>
                    <Typography variant="body1" color="text.secondary" sx={{ fontSize: "1.1rem" }}>
                      Let's start with your basic information
                    </Typography>
                  </Box>
                </Box>

                <Box sx={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <StyledTextField
                    fullWidth
                    label="Your name"
                    variant="outlined"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    error={nameError}
                    helperText={nameError ? "Name is required" : "This will be displayed in the app"}
                    autoFocus
                  />

                  <StyledFormControl fullWidth error={jobTitleError}>
                    <InputLabel>Job title</InputLabel>
                    <Select
                      value={jobTitle}
                      label="Job title"
                      onChange={(e) => setJobTitle(e.target.value)}
                    >
                      {jobTitles.map((title) => (
                        <MenuItem key={title} value={title}>
                          {title}
                        </MenuItem>
                      ))}
                    </Select>
                    {jobTitleError && (
                      <Typography variant="caption" color="error" sx={{ mt: 1, ml: 2 }}>
                        Job title is required
                      </Typography>
                    )}
                  </StyledFormControl>
                </Box>
              </CardContent>
            </StepCard>
          </Slide>
        );

      case 1:
        return (
          <Slide {...slideProps}>
            <StepCard>
              <CardContent sx={{ p: 5 }}>
                <Box sx={{ display: "flex", alignItems: "center", mb: 4 }}>
                  <StepIcon active="true">
                    <BusinessIcon />
                  </StepIcon>
                  <Box sx={{ ml: 3 }}>
                    <Typography variant="h4" fontWeight="700" gutterBottom>
                      Create Publisher
                    </Typography>
                    <Typography variant="body1" color="text.secondary" sx={{ fontSize: "1.1rem" }}>
                      Set up your publisher organization
                    </Typography>
                  </Box>
                </Box>

                <StyledTextField
                  fullWidth
                  label="Publisher name"
                  variant="outlined"
                  value={publisherName}
                  onChange={(e) => setPublisherName(e.target.value)}
                  error={publisherNameError}
                  helperText={publisherNameError ? "Publisher name is required" : "This can be your publisher, parent organization, or studio name"}
                  autoFocus
                />
              </CardContent>
            </StepCard>
          </Slide>
        );

      case 2:
        return (
          <Slide {...slideProps}>
            <StepCard>
              <CardContent sx={{ p: 5 }}>
                <Box sx={{ display: "flex", alignItems: "center", mb: 4 }}>
                  <StepIcon active="true">
                    <SportsEsportsIcon />
                  </StepIcon>
                  <Box sx={{ ml: 3 }}>
                    <Typography variant="h4" fontWeight="700" gutterBottom>
                      Create Studio
                    </Typography>
                    <Typography variant="body1" color="text.secondary" sx={{ fontSize: "1.1rem" }}>
                      Set up your development studio
                    </Typography>
                  </Box>
                </Box>

                <Box sx={{ display: "flex", gap: 5, alignItems: "flex-start" }}>
                  <Box sx={{ flex: 1 }}>
                    <StyledTextField
                      fullWidth
                      label="Studio name"
                      variant="outlined"
                      value={studioName}
                      onChange={(e) => setStudioName(e.target.value)}
                      error={studioNameError}
                      helperText={studioNameError ? "Studio name is required" : ""}
                      autoFocus
                    />
                  </Box>

                  <Box sx={{ position: "relative" }}>
                    <UploadCard onClick={handleFileUpload}>
                      {studioIcon ? (
                        <ImagePreview>
                          <img src={studioIcon} alt="Studio icon" />
                          <ImageOverlay>
                            <EditIcon sx={{ color: "white", fontSize: "3rem" }} />
                          </ImageOverlay>
                        </ImagePreview>
                      ) : (
                        <Box
                          sx={{
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            justifyContent: "center",
                            height: "100%",
                            p: 3,
                          }}
                        >
                          <CloudUploadIcon
                            sx={{ 
                              fontSize: "4rem", 
                              color: "primary.main", 
                              mb: 2,
                              transition: "all 0.3s ease",
                            }}
                          />
                          <Typography variant="h6" textAlign="center" color="primary.main" fontWeight="700">
                            Upload Icon
                          </Typography>
                          <Typography variant="body2" textAlign="center" color="text.secondary">
                            PNG, JPG, SVG
                          </Typography>
                        </Box>
                      )}
                    </UploadCard>

                    {studioIcon && (
                      <Zoom in>
                        <IconButton
                          onClick={clearImage}
                          sx={{
                            position: "absolute",
                            top: -12,
                            right: -12,
                            backgroundColor: "error.main",
                            color: "white",
                            width: 40,
                            height: 40,
                            "&:hover": { 
                              backgroundColor: "error.dark",
                              transform: "scale(1.1)",
                            },
                          }}
                        >
                          <CloseIcon />
                        </IconButton>
                      </Zoom>
                    )}

                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      accept=".png,.jpg,.jpeg,.svg"
                      style={{ display: "none" }}
                    />
                  </Box>
                </Box>
              </CardContent>
            </StepCard>
          </Slide>
        );

      case 3:
        return (
          <Fade in timeout={800}>
            <FinishCard>
              <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", position: "relative", zIndex: 1 }}>
                <Zoom in timeout={1000}>
                  <StepIcon
                    sx={{
                      width: 100,
                      height: 100,
                      mb: 4,
                      background: `linear-gradient(135deg, ${theme.palette.success.main} 0%, ${theme.palette.primary.main} 100%)`,
                      boxShadow: `0 16px 40px ${alpha(theme.palette.success.main, 0.4)}`,
                    }}
                  >
                    <RocketIcon sx={{ fontSize: "3rem" }} />
                  </StepIcon>
                </Zoom>

                <Typography variant="h3" fontWeight="800" gutterBottom sx={{ 
                  background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                  backgroundClip: "text",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}>
                  You're all set!
                </Typography>
                
                <Typography variant="h6" color="text.secondary" sx={{ mb: 4, maxWidth: 500, lineHeight: 1.6 }}>
                  Welcome to your analytics platform! You can explore the demo game to see all our features in action.
                </Typography>

                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2, justifyContent: "center", mb: 4 }}>
                  <AnimatedChip label={name} color="primary" size="large" />
                  <AnimatedChip label={jobTitle} color="primary" variant="outlined" size="large" />
                  <AnimatedChip label={publisherName} color="secondary" size="large" />
                  <AnimatedChip label={studioName} color="secondary" variant="outlined" size="large" />
                </Box>
              </Box>
            </FinishCard>
          </Fade>
        );

      default:
        return null;
    }
  };

  async function increasePage() {
    switch (page) {
      case 0:
        if (name !== "" && jobTitle !== "") {
          setSlideDirection("left");
          setPage(page + 1);
        } else {
          setNameError(name === "");
          setJobTitleError(jobTitle === "");
        }
        break;
      case 1:
        if (publisherName !== "") {
          setSlideDirection("left");
          setPage(page + 1);
        } else {
          setPublisherNameError(publisherName === "");
        }
        break;
      case 2:
        if (studioName !== "") {
          setSlideDirection("left");
          setPage(page + 1);
        } else {
          setStudioNameError(studioName === "");
        }
        break;
      case 3:
        setIsLoading(true);
        const resp = await finishInitialOnboarding({
          publisherName,
          email: userState.uid,
          username: name,
          jobTitle: jobTitle,
          studioName,
          studioApiKey,
          studioIcon,
        });
        if (resp.success) {
          refreshProfile();
          onFinish();
        }
        setIsLoading(false);
        break;
    }
  }

  function decreasePage() {
    setSlideDirection("right");
    setPage(page - 1);
  }

  const handleFileUpload = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event) => {
    const selectedFile = event.target.files[0];
    if (selectedFile) {
      try {
        const reader = new FileReader();
        reader.onload = async (e) => {
          const base64File = e.target.result;
          const compressedImage = await compressImage(base64File);
          setStudioIcon(compressedImage);
        };
        reader.readAsDataURL(selectedFile);
      } catch (error) {
        console.error("Error processing file:", error);
      }
    }
  };

  function clearImage() {
    setStudioIcon("");
    if (fileInputRef.current) {
      fileInputRef.current.value = null;
    }
  }

  const compressImage = async (base64Image) => {
    const byteCharacters = atob(base64Image.split(",")[1]);
    const byteArrays = [];
    for (let offset = 0; offset < byteCharacters.length; offset += 512) {
      const slice = byteCharacters.slice(offset, offset + 512);
      const byteNumbers = new Array(slice.length);
      for (let i = 0; i < slice.length; i++) {
        byteNumbers[i] = slice.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      byteArrays.push(byteArray);
    }
    const blob = new Blob(byteArrays, { type: "image/png" });

    const compressedImage = await imageCompression(blob, {
      maxWidthOrHeight: 250,
    });

    return await blobToBase64(compressedImage);
  };

  const blobToBase64 = (blob) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onloadend = () => {
        const base64data = reader.result;
        resolve(base64data);
      };
      reader.onerror = (error) => {
        reject(error);
      };
    });
  };

  return (
    <StyledModal open>
      <Fade in timeout={600}>
        <OnboardingContainer elevation={24}>
          <HeaderSection>
            <Typography
              variant="h3"
              component="h1"
              fontWeight="800"
              color="white"
              sx={{ 
                position: "relative", 
                zIndex: 1,
                textShadow: `0 4px 8px ${alpha(theme.palette.common.black, 0.3)}`,
              }}
            >
              Welcome to Strix!
            </Typography>
            <Typography
              variant="h6"
              color="rgba(255, 255, 255, 0.9)"
              sx={{ 
                mt: 1, 
                position: "relative", 
                zIndex: 1,
                fontWeight: 500,
              }}
            >
              {page < 3 ? "Let's set up your account and organization." : "Live-Ops Analytics Platform"}
            </Typography>
          </HeaderSection>

          <StepperContainer>
            <Stepper 
              activeStep={page} 
              connector={<CustomStepConnector />}
              sx={{ mb: 2 }}
            >
              {steps.map((step, index) => {
                const IconComponent = step.icon;
                return (
                  <Step key={step.label}>
                    <StepLabel
                      StepIconComponent={() => (
                        <IconComponent 
                          sx={{ 
                            fontSize: "2.2rem",
                            color: index === page 
                              ? theme.palette.primary.main
                              : index < page 
                              ? theme.palette.success.main
                              : alpha(theme.palette.text.disabled, 0.4),
                            transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
                            transform: index === page ? "scale(1.3)" : index < page ? "scale(1.2)" : "scale(1)",
                            filter: index === page 
                              ? `drop-shadow(0 4px 8px ${alpha(theme.palette.primary.main, 0.4)})`
                              : "none",
                          }}
                        />
                      )}
                    >
                      {step.label}
                    </StepLabel>
                  </Step>
                );
              })}
            </Stepper>
          </StepperContainer>

          <ContentContainer>
            {getStepContent()}

            <Box sx={{ 
              mt: "auto", 
              pt: 4, 
              display: "flex", 
              justifyContent: "space-between",
              alignItems: "center",
            }}>
              {page > 0 ? (
                <ActionButton
                  variant="outlined"
                  onClick={decreasePage}
                  startIcon={<ArrowBackIcon />}
                  sx={{ mr: 2 }}
                >
                  Back
                </ActionButton>
              ) : (
                <Box />
              )}
              
              {page === 3 ? (
                <LoadingButton
                  loading={isLoading}
                  variant="contained"
                  onClick={increasePage}
                  size="large"
                  sx={{
                    borderRadius: "16px",
                    padding: theme.spacing(2, 6),
                    fontSize: "1.2rem",
                    fontWeight: 700,
                    minHeight: "56px",
                    background: `linear-gradient(135deg, ${theme.palette.success.main} 0%, ${theme.palette.primary.main} 100%)`,
                    boxShadow: `0 8px 24px ${alpha(theme.palette.success.main, 0.4)}`,
                    "&:hover": {
                      transform: "translateY(-3px)",
                      boxShadow: `0 12px 32px ${alpha(theme.palette.success.main, 0.5)}`,
                    },
                  }}
                  startIcon={<RocketIcon />}
                >
                  Explore Demo
                </LoadingButton>
              ) : (
                <ActionButton
                  variant="contained"
                  onClick={increasePage}
                  endIcon={<ArrowForwardIcon />}
                  size="large"
                >
                  Next
                </ActionButton>
              )}
            </Box>
          </ContentContainer>
        </OnboardingContainer>
      </Fade>
    </StyledModal>
  );
}

export default InitialSetup;