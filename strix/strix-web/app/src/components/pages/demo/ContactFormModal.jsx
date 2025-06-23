import React, { useState, useCallback, memo } from "react";
import {
  Modal,
  Box,
  Typography,
  TextField,
  Button,
  Alert,
} from "@mui/material";
import LoadingButton from "@mui/lab/LoadingButton";

const EMAIL_REGEX = /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/;

const modalStyle = {
  position: "absolute",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  width: 600,
  maxWidth: "90vw",
  height: "fit-content",
  maxHeight: "80vh",
  bgcolor: "var(--bg-color3)",
  border: "1px solid #625FF440",
  boxShadow: "0px 0px 5px 2px rgba(98, 95, 244, 0.2)",
  overflowY: "auto",
  scrollbarWidth: "thin",
  borderRadius: "2rem",
  p: 4,
};

const ContactFormModal = memo(({ open, onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    message: "",
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [apiError, setApiError] = useState("");

  const validateForm = useCallback(() => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = "Name is required";
    }

    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!EMAIL_REGEX.test(formData.email)) {
      newErrors.email = "Please enter a valid email address";
    }

    if (!formData.message.trim()) {
      newErrors.message = "Message is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  const handleInputChange = useCallback((field) => (e) => {
    const value = e.target.value;
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear field error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: "" }));
    }
    
    // Clear API error when user makes changes
    if (apiError) {
      setApiError("");
    }
  }, [errors, apiError]);

  const handleSubmit = useCallback(async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    setApiError("");

    try {
      const result = await onSubmit(formData);
      
      if (result?.success) {
        setSubmitted(true);
        setTimeout(() => {
          handleClose();
        }, 2500);
      } else {
        setApiError(result?.message || "Failed to send message. Please try again.");
      }
    } catch (error) {
      setApiError(error.message || "An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  }, [formData, validateForm, onSubmit]);

  const handleClose = useCallback(() => {
    if (isLoading) return;
    
    setFormData({ name: "", email: "", message: "" });
    setErrors({});
    setApiError("");
    setSubmitted(false);
    onClose();
  }, [isLoading, onClose]);

  const renderSuccessContent = () => (
    <Box sx={{ textAlign: "center" }}>
      <Typography variant="h6" sx={{ mb: 2, color: "success.main" }}>
        Message Sent Successfully!
      </Typography>
      <Typography sx={{ color: "text.secondary" }}>
        Thank you for your interest in our platform. We'll contact you back as soon as possible.
      </Typography>
    </Box>
  );

  const renderFormContent = () => (
    <Box component="form" sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <Typography variant="h6" sx={{ mb: 1 }}>
        Contact Us
      </Typography>
      
      <Typography variant="body2" sx={{ mb: 2, color: "text.secondary" }}>
        Send us a message and we'll get back to you through email as soon as possible.
      </Typography>

      {apiError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {apiError}
        </Alert>
      )}

      <TextField
        label="Your Name"
        value={formData.name}
        onChange={handleInputChange("name")}
        error={!!errors.name}
        helperText={errors.name}
        disabled={isLoading}
        required
        fullWidth
      />

      <TextField
        label="Email Address"
        type="email"
        value={formData.email}
        onChange={handleInputChange("email")}
        error={!!errors.email}
        helperText={errors.email}
        disabled={isLoading}
        required
        fullWidth
      />

      <TextField
        label="Message"
        multiline
        rows={6}
        value={formData.message}
        onChange={handleInputChange("message")}
        error={!!errors.message}
        helperText={errors.message}
        disabled={isLoading}
        required
        fullWidth
      />

      <Box sx={{ display: "flex", gap: 2, justifyContent: "flex-end", mt: 2 }}>
        <Button
          variant="outlined"
          onClick={handleClose}
          disabled={isLoading}
          sx={{ minWidth: 100 }}
        >
          Cancel
        </Button>
        
        <LoadingButton
          variant="contained"
          onClick={handleSubmit}
          loading={isLoading}
          sx={{ minWidth: 120 }}
        >
          Send Message
        </LoadingButton>
      </Box>
    </Box>
  );

  return (
    <Modal open={open} onClose={handleClose}>
      <Box sx={modalStyle}>
        {submitted ? renderSuccessContent() : renderFormContent()}
      </Box>
    </Modal>
  );
});

ContactFormModal.displayName = "ContactFormModal";

export default ContactFormModal;