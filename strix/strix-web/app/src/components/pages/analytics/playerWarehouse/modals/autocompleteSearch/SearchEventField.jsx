import React, { useEffect, useRef, useState } from "react";
import { styled } from "@mui/material/styles";
import {
  TextField,
  Typography,
  Box,
  Fade,
  Slide,
  Chip,
  Paper,
} from "@mui/material";
import {
  Search as SearchIcon,
  Analytics as AnalyticsIcon,
} from "@mui/icons-material";
import useApi from "@strix/api";
import { useBranch, useGame } from "@strix/gameContext";

// Styled Components
const SearchContainer = styled(Box)(({ theme, isOpen }) => ({
  position: "relative",
  marginBottom: isOpen ? "370px" : "24px", // Add space when dropdown is open
  transition: "margin-bottom 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
}));

const StyledTextField = styled(TextField)(({ theme }) => ({
  "& .MuiOutlinedInput-root": {
    background: "#ffffff",
    borderRadius: "16px",
    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
    "& fieldset": {
      borderColor: "#d1d5db",
      borderWidth: "2px",
    },
    "&:hover fieldset": {
      borderColor: "#6f63ff60",
      boxShadow: "0 2px 8px rgba(111, 99, 255, 0.15)",
    },
    "&.Mui-focused fieldset": {
      borderColor: "#6f63ff",
      borderWidth: "2px",
      boxShadow: "0 0 0 3px rgba(111, 99, 255, 0.2)",
      borderBottomLeftRadius: 0,
      borderBottomRightRadius: 0,
    },
  },
  "& .MuiInputLabel-root": {
    color: "#6b7280",
    paddingLeft: 30,
    fontWeight: 500,
    "&.Mui-focused": {
      color: "#6f63ff",
    },
  },
  "& .MuiOutlinedInput-input": {
    fontSize: "16px",
    color: "#1f2937",
    paddingLeft: "8px",
  },
}));

const ResultsContainer = styled(Paper)(({ theme, isOpen }) => ({
  position: "absolute",
  top: "100%",
  left: 0,
  right: 0,
  zIndex: 1000,
  background: "#ffffff",
  borderRadius: "0 0 16px 16px",
  border: "2px solid #6f63ff",
  borderTop: "none",
  maxHeight: isOpen ? "350px" : "0px",
  overflow: "hidden",
  transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
  boxShadow: isOpen ? "0 8px 25px rgba(111, 99, 255, 0.25)" : "none",
  "&::before": {
    content: '""',
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: "2px",
    background: "linear-gradient(90deg, #6f63ff 0%, #22c55e 50%, #f59e0b 100%)",
    opacity: isOpen ? 1 : 0,
    transition: "opacity 0.3s ease",
  },
}));

const ResultsList = styled(Box)(({ theme }) => ({
  maxHeight: "320px",
  overflowY: "auto",
  padding: "8px",
  scrollbarWidth: "thin",
  "&::-webkit-scrollbar": {
    width: "6px",
  },
  "&::-webkit-scrollbar-track": {
    background: "#f1f1f1",
    borderRadius: "10px",
  },
  "&::-webkit-scrollbar-thumb": {
    background: "#6f63ff40",
    borderRadius: "10px",
    "&:hover": {
      background: "#6f63ff60",
    },
  },
}));

const EventItem = styled(Box)(({ theme }) => ({
  padding: "16px 20px",
  borderRadius: "12px",
  margin: "4px 0",
  cursor: "pointer",
  transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
  border: "2px solid transparent",
  background: "#fafbfc",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  position: "relative",
  overflow: "hidden",
  "&::before": {
    content: '""',
    position: "absolute",
    top: 0,
    left: 0,
    width: "0%",
    height: "100%",
    background: "linear-gradient(135deg, #6f63ff10 0%, #6f63ff20 100%)",
    transition: "width 0.3s ease",
    zIndex: 0,
  },
  "&:hover": {
    background: "linear-gradient(135deg, #6f63ff08 0%, #6f63ff15 100%)",
    border: "2px solid #6f63ff40",
    transform: "translateY(-2px)",
    boxShadow: "0 4px 15px rgba(111, 99, 255, 0.25)",
    "&::before": {
      width: "100%",
    },
  },
  "&:active": {
    transform: "translateY(0)",
  },
}));

const EventInfo = styled(Box)(({ theme }) => ({
  display: "flex",
  flexDirection: "column",
  flex: 1,
  gap: "8px",
  position: "relative",
  zIndex: 1,
}));

const EventName = styled(Typography)(({ theme }) => ({
  color: "#1f2937",
  fontWeight: 600,
  fontSize: "16px",
  lineHeight: 1.2,
  transition: "color 0.3s ease",
}));

const EventMeta = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  gap: "12px",
}));

const ValueCountChip = styled(Chip)(({ theme }) => ({
  background: "linear-gradient(135deg, #22c55e15 0%, #22c55e25 100%)",
  color: "#16a34a",
  border: "1px solid #22c55e40",
  borderRadius: "8px",
  fontWeight: 600,
  fontSize: "12px",
  height: "24px",
  transition: "all 0.3s ease",
  "& .MuiChip-icon": {
    color: "#16a34a",
    fontSize: "16px",
  },
  "& .MuiChip-label": {
    padding: "0 8px",
  },
}));

const IconContainer = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: "40px",
  height: "40px",
  borderRadius: "10px",
  background: "linear-gradient(135deg, #6f63ff15 0%, #6f63ff25 100%)",
  color: "#6f63ff",
  border: "2px solid #6f63ff30",
  marginLeft: "12px",
  transition: "all 0.3s ease",
  position: "relative",
  zIndex: 1,
}));

const NoResults = styled(Box)(({ theme }) => ({
  padding: "32px 20px",
  textAlign: "center",
  color: "#6b7280",
  background: "linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)",
  borderRadius: "12px",
  margin: "8px",
  border: "2px dashed #d1d5db",
}));

function SearchEventField({ onTargetEventSelected, allEvents }) {
  const { game } = useGame();
  const { branch, environment } = useBranch();
  const { getAllAnalyticsEvents } = useApi();

  const [events, setEvents] = useState([]);
  const [eventMatches, setEventMatches] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState({});
  const [isInputFocused, setIsInputFocused] = useState(false);
  const resultsRef = useRef(null);
  const isHovered = useRef(false);
  const [currentPrompt, setCurrentPrompt] = useState("");

  const fetchEvents = async () => {
    if (allEvents) {
      setEvents(allEvents);
    } else {
      const response = await getAllAnalyticsEvents({
        gameID: game.gameID,
        branch: branch,
      });
      setEvents(response.events);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [allEvents]);

  useEffect(() => {
    onPromptChange("");
  }, [events]);

  function onPromptChange(text) {
    const searchText = text.toLowerCase();
    const matches = events.filter((event) => {
      const eventsMatch = event.eventName.toLowerCase().includes(searchText);
      return eventsMatch;
    });
    setCurrentPrompt(text);
    setEventMatches(matches);
  }

  function onEventSelected(event) {
    setSelectedEvent(event);
    setCurrentPrompt(`${event.eventName} (${event.eventCodeName})`);
    onTargetEventSelected(event);
    setIsInputFocused(false);
  }

  function handleInputFocus() {
    setIsInputFocused(true);
  }

  const handleInputBlur = () => {
    setTimeout(() => {
      setIsInputFocused(false);
      if (!isHovered.current) {
      }
    }, 150);
  };

  const handleResultsMouseEnter = () => {
    isHovered.current = true;
  };

  const handleResultsMouseLeave = () => {
    isHovered.current = false;
  };

  const shouldShowResults = isInputFocused && eventMatches.length >= 0;

  return (
    <SearchContainer
      isOpen={shouldShowResults}
      onMouseEnter={handleResultsMouseEnter}
      onMouseLeave={handleResultsMouseLeave}
    >
      <StyledTextField
        fullWidth
        label="Analytics Event"
        placeholder="Search for an analytics event..."
        value={currentPrompt}
        onFocus={handleInputFocus}
        onBlur={handleInputBlur}
        onChange={(event) => onPromptChange(event.target.value)}
        InputLabelProps={{
          shrink: currentPrompt ? true : false,
        }}
        InputProps={{
          startAdornment: (
            <SearchIcon isFocused={isInputFocused}>
              <SearchIcon />
            </SearchIcon>
          ),
        }}
        sx={{
          "& .MuiOutlinedInput-root": {
            borderBottomLeftRadius: shouldShowResults ? 0 : "16px",
            borderBottomRightRadius: shouldShowResults ? 0 : "16px",
          },
        }}
      />

      <ResultsContainer isOpen={shouldShowResults} ref={resultsRef} elevation={0}>
        <Fade in={shouldShowResults} timeout={300}>
          <ResultsList>
            {eventMatches.length > 0 ? (
              eventMatches.map((event, index) => (
                <Slide
                  key={event.eventID}
                  in={shouldShowResults}
                  timeout={300 + index * 50}
                  direction="down"
                >
                  <EventItem onClick={() => onEventSelected(event)}>
                    <EventInfo>
                      <EventName>{event.eventName}</EventName>
                      <EventMeta>
                        <ValueCountChip
                          icon={<AnalyticsIcon />}
                          label={`${event.values?.length || 0} values`}
                          size="small"
                        />
                        {event.eventCodeName && (
                          <Typography
                            variant="caption"
                            sx={{
                              color: "#6b7280",
                              fontFamily: "monospace",
                              background: "#f3f4f6",
                              padding: "2px 6px",
                              borderRadius: "4px",
                              fontSize: "11px",
                            }}
                          >
                            {event.eventCodeName}
                          </Typography>
                        )}
                      </EventMeta>
                    </EventInfo>
                    <IconContainer>
                      <AnalyticsIcon />
                    </IconContainer>
                  </EventItem>
                </Slide>
              ))
            ) : (
              <Fade in={shouldShowResults && currentPrompt.length > 0} timeout={400}>
                <NoResults>
                  <Typography
                    variant="body2"
                    sx={{ mb: 1, fontWeight: 500, color: "#374151" }}
                  >
                    No events found
                  </Typography>
                  <Typography variant="caption" sx={{ color: "#9ca3af" }}>
                    Try adjusting your search terms
                  </Typography>
                </NoResults>
                </Fade>
            )}
          </ResultsList>
        </Fade>
      </ResultsContainer>
    </SearchContainer>
  );
}

export default SearchEventField;