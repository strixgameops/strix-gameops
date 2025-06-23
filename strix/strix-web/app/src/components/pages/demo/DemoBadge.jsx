import React, { useState, useCallback, memo } from "react";
import { Typography } from "@mui/material";
import useApi from "@strix/api";
import ContactFormModal from "./ContactFormModal";
import s from "./demoBadge.module.css";

const DemoBadge = memo(() => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { sendContactUs } = useApi();

  const handleOpenModal = useCallback(() => {
    setIsModalOpen(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
  }, []);

  const handleSubmitContact = useCallback(async (formData) => {
    try {
      const response = await sendContactUs(
        { showErrorAlert: false },
        formData
      );
      return response;
    } catch (error) {
      console.error("Failed to send contact form:", error);
      return { success: false, message: error.message };
    }
  }, [sendContactUs]);

  return (
    <>
      <div className={s.badgeBody}>
        <Typography color="text.primary" fontSize={14} sx={{ pt: 0.15 }}>
          You are in demo mode, where only demo games can be edited. You can{" "}
          <Typography
            component="span"
            onClick={handleOpenModal}
            sx={{
              textDecoration: "underline",
              cursor: "pointer",
              "&:hover": { color: "primary.main" },
            }}
          >
            contact us
          </Typography>{" "}
          to get full access to the service
        </Typography>
      </div>

      <ContactFormModal
        open={isModalOpen}
        onClose={handleCloseModal}
        onSubmit={handleSubmitContact}
      />
    </>
  );
});

DemoBadge.displayName = "DemoBadge";

export default DemoBadge;