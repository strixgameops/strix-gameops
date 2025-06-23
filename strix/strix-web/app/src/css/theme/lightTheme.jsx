import {
  ThemeProvider as ThemeProviderMUI,
  createTheme,
  responsiveFontSizes,
} from "@mui/material/styles";
import themeParams from "./defaultThemeParams.jsx";

let lightTheme = createTheme({
  cssVariables: true,
  palette: {
    type: "light",
    mode: "light",
    primary: {
      main: "#5750d2",
    },
    secondary: {
      main: "#9667ff",
    },
    text: {
      primary: "#151720",
      secondary: "#1a2033",
      grey: "#6E758E",
      disabled: "#646464",
      offersSectionTitle: "#929292",
    },
    background: {
      paper: "rgb(187, 190, 216)",
      default: "rgb(187, 190, 216)",
    },
    liveops: {
      offers: "#D48610",
    },
    arrow: "black",
    cta2_button_text_color: "#3f3bf7",
    bgcolor_get_demo: "rgb(240, 240, 255)",
    icon_color: "#121120",
    burger_color: "#171721",
    sidebar_bg: "var(--navbar-background-color)",
    contact_modal_bgcolor: "var(--contact-modal-bgcolor)",
    docs_title: "var(--docs-title)",
    docs_search_modal_bg: "rgb(240, 240, 255)",
    docs_search_results_modal_bg: "#cecbd8",
  },
  ...themeParams,
});
lightTheme.components.MuiSvgIcon.styleOverrides.root = {
  colorPrimary: {
    color: ["rgba(0, 0, 0, 0.54)", "!important"],
  },
  colorSecondary: {
    color: ["rgba(0, 0, 0, 0.54)", "!important"],
  },
};
lightTheme.components.MuiButton.variants = [
  {
    props: { variant: "text", color: "primary" },
    style: {
      color: lightTheme.palette.text.primary,
      "&:hover": {
        backgroundColor: "rgba(131, 132, 177, 0.5)"
      },
    }
  },
  {
    props: { variant: "outlined", color: "primary" },
    style: {
      color: lightTheme.palette.text.primary,
      "&:hover": {
        backgroundColor: "#cdcde5"
      },
      "&.Mui-disabled": {
        borderWidth: "2px",
        color: lightTheme.palette.text.disabled
      }
    }
  }
]
// lightTheme = responsiveFontSizes(lightTheme);

export default lightTheme;
