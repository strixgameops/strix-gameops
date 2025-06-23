import React, { memo, useMemo } from "react";
import List from "@mui/material/List";
import Box from "@mui/material/Box";
import CategoryButton from "./CategoryButton";
import NavbarButton from "./NavbarButton";
import { 
  ANALYTICS_CATEGORIES, 
  LIVEOPS_CATEGORIES, 
  NAVBAR_ASPECTS 
} from "./utils/navbarConstants";
import { shouldShowItem } from "./utils/navbarUtils";

const NavigationSection = memo(
  ({
    navbarDisabled,
    currentOpenedPage,
    setOpenedPage,
    navigate,
    currentAspect,
  }) => {
    const categoriesConfig = useMemo(() => {
      return currentAspect === NAVBAR_ASPECTS.ANALYTICS 
        ? ANALYTICS_CATEGORIES 
        : LIVEOPS_CATEGORIES;
    }, [currentAspect]);

    return (
      <List
        sx={{
          width: "100%",
          maxWidth: 360,
          paddingLeft: "1rem",
          paddingRight: "1rem",
          boxSizing: "border-box",
          transition: "opacity 0.3s ease-in-out",
        }}
        component="nav"
      >
        {categoriesConfig.map((category, categoryIndex) => (
          <Box 
            key={`${currentAspect}-${category.id}`}
            sx={{
              mb: categoryIndex < categoriesConfig.length - 1 ? "24px" : "0px",
            }}
          >
            {/* Static Category Header */}
            <CategoryButton
              category={category.id}
              name={category.name}
              icon={category.icon}
            />

            {/* Always Expanded Items List */}
            <List
              component="div"
              disablePadding
              sx={{
                ml: "10%",
                borderLeft: "2px solid",
                borderImage: "linear-gradient(to bottom, rgba(105, 98, 234, 0.3), rgba(105, 98, 234, 0.1), transparent) 1 95%",
                pl: 0,
                position: "relative",
                "&::before": {
                  content: '""',
                  position: "absolute",
                  left: "-1px",
                  top: 0,
                  bottom: 0,
                  width: "1px",
                  background: "linear-gradient(to bottom, rgba(231, 231, 231, 0.1), transparent)",
                },
                // Add subtle animation for items
                "& > *": {
                  animation: "slideInLeft 0.3s ease-out forwards",
                  opacity: 0,
                },
                "& > *:nth-of-type(1)": {
                  animationDelay: "0.1s",
                },
                "& > *:nth-of-type(2)": {
                  animationDelay: "0.15s",
                },
                "& > *:nth-of-type(3)": {
                  animationDelay: "0.2s",
                },
                "& > *:nth-of-type(4)": {
                  animationDelay: "0.25s",
                },
                "& > *:nth-of-type(5)": {
                  animationDelay: "0.3s",
                },
                "@keyframes slideInLeft": {
                  "0%": {
                    opacity: 0,
                    transform: "translateX(-10px)",
                  },
                  "100%": {
                    opacity: 1,
                    transform: "translateX(0)",
                  },
                },
              }}
            >
              {category.items.filter(shouldShowItem).map((item) => (
                <NavbarButton
                  key={item.path}
                  padding={item.padding || 1.6}
                  name={item.name}
                  pageLink={item.path}
                  icon={item.icon}
                  disabled={navbarDisabled}
                  currentOpenedPage={currentOpenedPage}
                  setOpenedPage={setOpenedPage}
                  navigate={navigate}
                />
              ))}
            </List>
          </Box>
        ))}
      </List>
    );
  }
);

NavigationSection.displayName = "NavigationSection";

export default NavigationSection;