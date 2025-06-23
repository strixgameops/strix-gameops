import React, { useState } from "react";
import GroupAddIcon from "@mui/icons-material/GroupAdd";
import IconButton from "@mui/material/IconButton";
import Box from "@mui/material/Box";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import Modal from "@mui/material/Modal";
import Button from "@mui/material/Button";
import LoadingButton from "@mui/lab/LoadingButton";

function ProfileCompositionStaticSegmentBuilder({
  count = 0,
  onCommit,
  isLoading,
}) {
  const [open, setOpen] = useState(false);
  const modalBGstyle = {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    minWidth: 650,
    width: "40%",
    bgcolor: "var(--navbar-bg-color)",
    border: "1px solid #615ff449",
    boxShadow: "0px 1px 10px 2px rgba(98, 95, 244, 0.1)",
    borderRadius: "2rem",
    p: 4,
  };
  const [chosenName, setChosenName] = useState("");
  const [comment, setComment] = useState(``);

  return (
    <>
      <IconButton
        onClick={() => setOpen(true)}
        sx={{ position: "absolute", bottom: "5%", right: "0%", zIndex: 1 }}
      >
        <GroupAddIcon />
      </IconButton>
      <Modal open={open} onClose={() => setOpen(false)}>
        <Box sx={modalBGstyle}>
          {count && count > 0 ? (
            <>
              <Typography variant="h6" sx={{ mb: 2 }}>
                You're going to create a static segment of {count} players.
              </Typography>
              <Typography sx={{ mb: 2 }}>
                Static segments cannot be modified and only consist of the currently selected players. You can use such segments to
                send targeted push notifications or make targeted LiveOps
                campaigns.
              </Typography>
              <TextField
                sx={{ m: 2, ml: 0, mb: 4, width: "100%" }}
                size="small"
                spellCheck={false}
                id="modal-modal-title"
                value={chosenName}
                onChange={(e) => {
                  setChosenName(e.target.value);
                }}
                label="New segment name"
                variant="outlined"
              />

              <TextField
                margin="dense"
                type="text"
                fullWidth
                multiline
                rows={2}
                variant="outlined"
                sx={{
                  "& fieldset": {
                    borderRadius: "1rem",
                  },
                }}
                value={comment}
                onChange={(e) => {
                  setComment(e.target.value);
                }}
                label="Segment comment"
              />

              <Box
                sx={{ mt: 2, display: "flex", justifyContent: "space-between" }}
              >
                <LoadingButton
                  loading={isLoading}
                  variant="contained"
                  disabled={chosenName === ""}
                  onClick={async () => {
                    await onCommit(chosenName, comment);
                    setOpen(false)
                  }}
                >
                  Create
                </LoadingButton>
                <Button onClick={() => setOpen(false)}>Close</Button>
              </Box>
            </>
          ) : (
            <Box sx={{ width: "100%" }}>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Cannot build segment out of 0 players
              </Typography>
              <Box
                sx={{
                  display: "flex",
                  width: "100%",
                  justifyContent: "flex-end",
                }}
              >
                <Button sx={{ ml: "auto" }} onClick={() => setOpen(false)}>
                  OK
                </Button>
              </Box>
            </Box>
          )}
        </Box>
      </Modal>
    </>
  );
}

export default ProfileCompositionStaticSegmentBuilder;
