import React, { memo } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Avatar from "@mui/material/Avatar";
import Typography from "@mui/material/Typography";
import Tooltip from "@mui/material/Tooltip";
import ExitToAppSharpIcon from "@mui/icons-material/ExitToAppSharp";
import { useTheme } from "@mui/material/styles";
import { trimStr, openPage } from "./utils/navbarUtils";
import s from "./css/navbar.module.css";

const UserMenu = memo(({ userProfile, setOpenedPage, navigate }) => {
  const theme = useTheme();

  const handleProfileClick = (e) => {
    openPage(e, "/profile", navigate, setOpenedPage);
  };

  const handleSignoutClick = (e) => {
    openPage(e, "/signout", navigate, setOpenedPage);
  };

  return (
    <Box className={s.userMenu}>
      <Tooltip title="Open profile" disableInteractive>
        <Button
          onClick={handleProfileClick}
          sx={{
            p: "10px",
            pb: "10px",
            pl: "25px",
            width: "100%",
            textTransform: "none",
            justifyContent: "start",
          }}
        >
          <Avatar
            sx={{ width: 30, height: 30, color: theme.palette.text.primary }}
            src={userProfile?.avatar ? userProfile.avatar : "/broken-image.jpg"}
          />
          <Typography sx={{ ml: 2, userSelect: "none" }} variant="body1">
            {trimStr(userProfile?.username, 16)}
          </Typography>
        </Button>
      </Tooltip>

      <Tooltip title="Sign out" disableInteractive>
        <Button
          sx={{
            height: "100%",
            minWidth: "50px",
          }}
          onClick={handleSignoutClick}
        >
          <ExitToAppSharpIcon />
        </Button>
      </Tooltip>
    </Box>
  );
});

UserMenu.displayName = "UserMenu";

export default UserMenu;
