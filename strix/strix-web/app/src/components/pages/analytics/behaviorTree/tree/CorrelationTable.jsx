import React, { useState, useEffect } from "react";
import {
  Paper,
  Typography,
  Button,
  ButtonGroup,
  Card,
  CardContent,
  Box,
  Slide,
  Fade,
  Chip,
  IconButton,
  Tooltip,
  useTheme,
} from "@mui/material";
import {
  ArrowDownward,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Timeline,
} from "@mui/icons-material";
import { styled, keyframes } from "@mui/material/styles";

// Animations using app's easing
const slideIn = keyframes`
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
`;

// Styled components using app's CSS variables
const StyledPaper = styled(Paper)(({ expanded }) => ({
  position: "absolute",
  top: 0,
  right: expanded ? 0 : -370,
  height: "100%",
  width: 370,
  zIndex: 1000,
  display: "flex",
  flexDirection: "column",
  transition: "right var(--transition-duration) var(--transition-easing)",
  backgroundColor: "var(--bg-color3)",
  borderLeft: "1px solid #615ff449",
  overflow: "visible",
  backdropFilter: "blur(10px)",
  zIndex: 3,
}));

const StyledCard = styled(Card)(({ index }) => ({
  margin: "8px",
  marginBottom: "12px",
  backgroundColor: "var(--regular-card-bg-color)",
  border: "1px solid #615ff41e",
  borderRadius: "12px",
  overflow: "hidden",
  animation: `${slideIn} 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94) ${index * 0.1}s both`,
  transition: "all var(--transition-duration) var(--transition-easing)",
  "&:hover": {
    transform: "translateY(-4px) scale(1.02)",
    boxShadow: "0 8px 32px rgba(101, 107, 255, 0.2)",
    backgroundColor: "var(--regular-card-bg-color2, var(--regular-card-bg-color))",
  },
}));

const CorrelationBar = styled(Box)(({ value, animated }) => ({
  position: "relative",
  height: 8,
  backgroundColor: "rgba(101, 107, 255, 0.1)",
  borderRadius: 4,
  overflow: "hidden",
  "&::before": {
    content: '""',
    position: "absolute",
    top: 0,
    left: "50%",
    width: 1,
    height: "100%",
    backgroundColor: "var(--text-primary-color)",
    opacity: 0.5,
    transform: "translateX(-50%)",
    zIndex: 2,
  },
  "&::after": animated
    ? {
        content: '""',
        position: "absolute",
        top: 0,
        left: value >= 0 ? "50%" : `${50 - Math.abs(value) * 50}%`,
        width: `${Math.abs(value) * 50}%`,
        height: "100%",
        background: value >= 0 
          ? "linear-gradient(90deg, #00aa00, #00cc00)" 
          : "linear-gradient(90deg, #cc0000, #aa0000)",
        borderRadius: 4,
        transition: "width 1s cubic-bezier(0.25, 0.46, 0.45, 0.94), left 1s cubic-bezier(0.25, 0.46, 0.45, 0.94)",
        backgroundSize: "200px 100%",
        backgroundRepeat: "no-repeat",
        zIndex: 1,
      }
    : {},
}));

const HeaderContainer = styled(Box)(() => ({
  background: "var(--upperbar-bg-color)",
  padding: "24px 16px 16px 16px",
  borderBottom: "1px solid #615ff449",
}));

const ToggleButton = styled(IconButton)(({ expanded }) => ({
  position: "absolute",
  top: "20%",
  left: -28,
  width: 28,
  height: 80,
  backgroundColor: "#32325c",
  color: "white",
  borderRadius: "5rem",
  border: "1px solid #5750d2",
  borderTopRightRadius: 0,
  borderBottomRightRadius: 0,
  zIndex: 2,
  transition: "all var(--transition-duration) var(--transition-easing)",
  "&:hover": {
    backgroundColor: "#4a44c4",
    transform: "scale(1.05)",
    boxShadow: "0 4px 16px rgba(87, 80, 210, 0.4)",
  },
}));

const CorrelationTable = ({ correlationData, allAnalyticsEvents }) => {
  const [correlationItems, setCorrelationItems] = useState([]);
  const [expandTable, setExpandTable] = useState(false);
  const [sortType, setSortType] = useState("conversion");
  const [animatedValues, setAnimatedValues] = useState(new Set());
  const theme = useTheme();

  useEffect(() => {
    const items = Object.keys(correlationData).map((eventId) => ({
      id: eventId,
      data: correlationData[eventId],
    }));
    setCorrelationItems(items);
    
    setTimeout(() => {
      setAnimatedValues(new Set(items.map(item => item.id)));
    }, 100);
  }, [correlationData]);

  const sortedItems = correlationItems.sort((a, b) =>
    sortType === "conversion" ? b.data - a.data : a.data - b.data
  );

  const CorrelationItem = ({ event, index }) => {
    const eventName = allAnalyticsEvents.find((e) => e.id === event.id)?.name || "Unknown event";
    const isPositive = event.data > 0;
    const isNeutral = event.data === 0;
    const normalizedValue = Math.abs(event.data);

    return (
      <Fade in timeout={600 + index * 100}>
        <StyledCard index={index}>
          <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
            <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
              <Typography
                variant="subtitle2"
                sx={{
                  fontWeight: 600,
                  color: "var(--text-primary-color)",
                  fontSize: "0.875rem",
                  flex: 1,
                }}
              >
                {eventName}
              </Typography>
              <Tooltip title={`${isPositive ? "Positive" : isNeutral ? "Neutral" : "Negative"} correlation`}>
                <Chip
                  icon={
                    isNeutral ? (
                      <Timeline />
                    ) : isPositive ? (
                      <TrendingUp />
                    ) : (
                      <TrendingDown />
                    )
                  }
                  label={`${event.data > 0 ? "+" : ""}${event.data.toFixed(3)}`}
                  size="small"
                  color={isNeutral ? "default" : isPositive ? "success" : "error"}
                  variant="outlined"
                  sx={{
                    fontWeight: 700,
                    fontSize: "0.75rem",
                    minWidth: 80,
                    backgroundColor: isNeutral 
                      ? "transparent" 
                      : isPositive 
                        ? "rgba(0, 170, 0, 0.1)" 
                        : "rgba(197, 30, 0, 0.1)",
                    color: isNeutral 
                      ? "var(--text-primary-color)" 
                      : isPositive 
                        ? "#00aa00" 
                        : "#c51e00",
                    borderColor: isNeutral 
                      ? "var(--text-primary-color)" 
                      : isPositive 
                        ? "#00aa00" 
                        : "#c51e00",
                  }}
                />
              </Tooltip>
            </Box>
            
            <CorrelationBar
              value={normalizedValue}
              animated={animatedValues.has(event.id)}
              // animated={true}
            />
            
            <Box display="flex" justifyContent="space-between" mt={1}>
              <Typography 
                variant="caption" 
                sx={{ color: "var(--text-primary-color)", opacity: 0.7 }}
              >
                Drop-off
              </Typography>
              <Typography 
                variant="caption" 
                sx={{ color: "var(--text-primary-color)", opacity: 0.7 }}
              >
                Conversion
              </Typography>
            </Box>
          </CardContent>
        </StyledCard>
      </Fade>
    );
  };

  return (
    <StyledPaper elevation={8} expanded={expandTable}>
      <ToggleButton
        expanded={expandTable}
        onClick={() => setExpandTable(!expandTable)}
      >
        {expandTable ? <ChevronRight /> : <ChevronLeft />}
      </ToggleButton>

      <HeaderContainer>
        <Box display="flex" alignItems="center" justifyContent="center" mb={2}>
          <Timeline sx={{ mr: 1, color: "#5750d2" }} />
          <Typography
            variant="h6"
            sx={{
              fontWeight: 700,
              color: "var(--text-primary-color)",
              textAlign: "center",
            }}
          >
            Correlation Table
          </Typography>
        </Box>

        <ButtonGroup
          variant="outlined"
          size="small"
          fullWidth
          sx={{
            "& .MuiButton-root": {
              textTransform: "none",
              fontWeight: 600,
              borderRadius: "8px",
              transition: "all var(--transition-duration) var(--transition-easing)",
              color: "var(--text-primary-color)",
              borderColor: "#5750d2",
            },
          }}
        >
          <Button
            variant={sortType === "conversion" ? "contained" : "outlined"}
            onClick={() => setSortType("conversion")}
            startIcon={sortType === "conversion" ? <ArrowDownward /> : null}
            sx={{
              mr: 0.5,
              ...(sortType === "conversion" && {
                backgroundColor: "#00aa00",
                borderColor: "#00aa00",
                "&:hover": {
                  backgroundColor: "#009900",
                },
              }),
            }}
          >
            Conversion
          </Button>
          <Button
            variant={sortType === "dropoff" ? "contained" : "outlined"}
            onClick={() => setSortType("dropoff")}
            startIcon={sortType === "dropoff" ? <ArrowDownward /> : null}
            sx={{
              ml: 0.5,
              ...(sortType === "dropoff" && {
                backgroundColor: "#c51e00",
                borderColor: "#c51e00",
                "&:hover": {
                  backgroundColor: "#aa1800",
                },
              }),
            }}
          >
            Drop-off
          </Button>
        </ButtonGroup>
      </HeaderContainer>

      <Box
        sx={{
          flex: 1,
          overflowY: "auto",
          p: 1,
          "&::-webkit-scrollbar": {
            width: 6,
          },
          "&::-webkit-scrollbar-track": {
            backgroundColor: "transparent",
          },
          "&::-webkit-scrollbar-thumb": {
            backgroundColor: "rgba(101, 107, 255, 0.3)",
            borderRadius: 3,
            "&:hover": {
              backgroundColor: "rgba(101, 107, 255, 0.5)",
            },
          },
        }}
      >
        {sortedItems.length > 0 ? (
          sortedItems.map((event, index) => (
            <CorrelationItem key={event.id} event={event} index={index} />
          ))
        ) : (
          <Box
            display="flex"
            alignItems="center"
            justifyContent="center"
            height="50%"
            flexDirection="column"
          >
            <Timeline sx={{ 
              fontSize: 48, 
              color: "var(--text-primary-color)", 
              opacity: 0.3, 
              mb: 2 
            }} />
            <Typography 
              variant="body2" 
              sx={{ 
                color: "var(--text-primary-color)", 
                opacity: 0.7,
                textAlign: "center" 
              }}
            >
              No correlation data available.
              <br />
              Build funnel to see results.
            </Typography>
          </Box>
        )}
      </Box>
    </StyledPaper>
  );
};

export default CorrelationTable;