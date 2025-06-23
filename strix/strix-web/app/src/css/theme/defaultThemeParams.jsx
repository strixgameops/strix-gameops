let themeParams = {
  breakpoints: {
    values: {
      xs: 0,
      sm: 600,
      md: 960,
      lg: 1280,
      xl: 1920,
      xxl: 2000,
      xxxl: 3000,
    },
  },
  typography: {
    fontFamily: [
      "-apple-system",
      "Inter",
      "Roboto",
      '"Helvetica Neue"',
      "Arial",
      "sans-serif",
      '"Apple Color Emoji"',
      '"Segoe UI Emoji"',
      '"Segoe UI Symbol"',
    ].join(","),
    color: "text.primary",
    fontWeightLight: 300,
    fontWeightRegular: 400,
    fontWeightMedium: 500,
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: "1rem",
        },
      },
    },
    MuiSvgIcon: {
      styleOverrides: {
        root: {},
      },
    },

    MuiTypography: {
      styleOverrides: {
        root: {
          //   color: "#e7e7e7",
        },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: "5rem",
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundColor: "var(--regular-card-bg-color)",
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderBottom: "1px solid rgb(196, 196, 196)",
        },
      },
    },
    MuiTimelineConnector: {
      styleOverrides: {
        root: {
          backgroundColor: "#5750d2",
        },
      },
    },

    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: "5rem",
          borderWidth: "2px",
          transition: "box-shadow 0.1s ease-in-out",

          "&:hover": {
            borderWidth: "2px",
            boxShadow: "0 0 0 1px #3c3893",
          },
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          borderRadius: "5rem",
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: "5rem",
          "& .MuiOutlinedInput-notchedOutline": {
            borderWidth: "2px",
          },
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          "& .MuiInputBase-root": {
            borderRadius: "5rem",
          },
        },
      },
    },
  },
};
export default themeParams;
