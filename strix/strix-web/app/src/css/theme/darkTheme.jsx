import {
  ThemeProvider as ThemeProviderMUI,
  createTheme,
  responsiveFontSizes,
} from "@mui/material/styles";
import themeParams from "./defaultThemeParams.jsx";

import "@fontsource/inter/300.css";
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/700.css";
let darkTheme = createTheme({
  palette: {
    mode: "dark",
    primary: {
      main: "#6a69bd",
    },
    secondary: {
      main: "#f50057",
    },
    text: {
      primary: "#e7e7e7",
      secondary: "#CCD1E3",
      grey: "#6E758E",
      disabled: "#979797",
      offersSectionTitle: "#929292",
    },
    background: {
      paper: "#161420",
      default: "#161420",
    },
    liveops: {
      offers: "#D48610",
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
    fontSize: 14,
    fontWeightLight: 300,
    fontWeightRegular: 400,
    fontWeightMedium: 500,
  },
  components: {
    MuiSvgIcon: {
      styleOverrides: {
        root: {},
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          backgroundColor: "#332e4b",
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: "5rem",
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
    MuiTypography: {
      styleOverrides: {
        root: {
          color: "#e7e7e7",
        },
      },
    },
  },
  ...themeParams,
});

// let darkTheme = createTheme({
//   cssVariables: true,
//   palette: {
//     mode: "dark",
//     primary: {
//       main: "#6a69bd",
//     },
//     secondary: {
//       main: "#f50057",
//     },
//     text: {
//       primary: "#e7e7e7",
//       secondary: "#CCD1E3",
//       grey: "#6E758E",
//       disabled: "#979797",
//     },
//     background: {
//       paper: "var(--sidebar-background-color-mobile)",
//       default: "var(--sidebar-background-color-mobile)",
//     },
//     arrow: "white",
//     cta2_button_text_color: "white",
//     bgcolor_get_demo: "var(--bg-color3)",
//     icon_color: "#e7e7e7",
//     contact_modal_bgcolor: "var(--contact-modal-bgcolor)",
//     docs_title: "var(--docs-title)",
//     docs_search_modal_bg: "var(--bg-color3)",
//     docs_search_results_modal_bg: "#110f19",
//   },
//   ...themeParams,
// });
darkTheme.components.MuiTypography.styleOverrides.root = {
  ...darkTheme.components.MuiTypography.styleOverrides.root,
  color: darkTheme.palette.text.primary,
};
darkTheme.components.MuiSvgIcon.styleOverrides.root = {
  colorPrimary: {
    color: ["#e7e7e7", "!important"],
  },
  colorSecondary: {
    color: ["#e7e7e7", "!important"],
  },
};
// darkTheme = responsiveFontSizes(darkTheme);
// darkTheme.typography.subtitle1 = {
//   fontSize: '1.2rem',
//   '@media (min-width:600px)': {
//     fontSize: '1.5rem',
//   },
//   [darkTheme.breakpoints.up('lg')]: {
//     fontSize: '2rem',
//   },
// };

export default darkTheme;
