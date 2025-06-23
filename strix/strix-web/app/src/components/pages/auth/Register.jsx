import React, { useRef, useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet";
import {
  Typography,
  TextField,
  Button,
  FormControl,
  Input,
  InputLabel,
  InputAdornment,
  IconButton,
  FormHelperText,
} from "@mui/material";
import { LoadingButton } from "@mui/lab";
import { Visibility, VisibilityOff } from "@mui/icons-material";
import { getAuthInstance, signInWithCustomToken, isUsingFirebase } from "../../firebase/firebase.jsx";
import useApi from "@strix/hooks/useApi";
import { useUser } from "@strix/userContext";
import { checkEmail } from "../../shared/sharedFunctions";
import titles from "titles";
import styles from "./css/authPages.module.css";

const EMAIL_REGEX = /^[\w-\.]+@([\w-]+\.)+[\w-]{1,10}$/;
const PWD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%]).{8,250}$/;

const Register = () => {
  const { register, startRegistrationProcess, finishRegistrationProcess } =
    useApi();
  const auth = getAuthInstance();
  const { isAuthenticated, isLoading: authLoading } = useUser();
  const navigate = useNavigate();

  const userRef = useRef();
  const errRef = useRef();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [verificationCode, setVerificationCode] = useState("");

  const [validEmail, setValidEmail] = useState(false);
  const [validPassword, setValidPassword] = useState(false);
  const [passwordsMatch, setPasswordsMatch] = useState(false);

  const [errMsg, setErrMsg] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [step, setStep] = useState("register"); // 'register', 'verify', 'success'

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && !authLoading) {
      navigate("/overview", { replace: true });
    }
  }, [isAuthenticated, authLoading, navigate]);

  useEffect(() => {
    userRef.current?.focus();
  }, []);

  useEffect(() => {
    setValidEmail(EMAIL_REGEX.test(email));
  }, [email]);

  useEffect(() => {
    setValidPassword(PWD_REGEX.test(password));
    setPasswordsMatch(password === confirmPassword && password.length > 0);
  }, [password, confirmPassword]);

  useEffect(() => {
    setErrMsg("");
  }, [email, password, confirmPassword, verificationCode]);

  const handleStartRegistration = useCallback(
    async (e) => {
      e.preventDefault();

      if (!validEmail || !validPassword || !passwordsMatch) {
        setErrMsg("Please fix the form errors before continuing");
        return;
      }

      if (!checkEmail(email)) {
        setErrMsg("Please use a work email address");
        return;
      }

      setIsLoading(true);
      setErrMsg("");

      try {
        // For local auth, we might skip email verification in development
        if (!isUsingFirebase() && window.__env.environment === 'development') {
          // Skip verification step for local auth in development
          const registerResponse = await register(
            { showErrorAlert: false },
            { email, password }
          );

          if (registerResponse.success) {
            await signInWithCustomToken(auth, registerResponse.token);
            setStep("success");
          } else {
            setErrMsg(registerResponse.error || registerResponse.message || "Registration failed");
          }
        } else {
          // Use email verification for Firebase or production
          const response = await startRegistrationProcess(
            { showErrorAlert: false },
            { email }
          );

          if (response.success) {
            setStep("verify");
          } else {
            setErrMsg(response.error || response.message || "Failed to start registration");
          }
        }
      } catch (error) {
        console.error("Registration start error:", error);
        setErrMsg("Registration failed. Please try again.");
      } finally {
        setIsLoading(false);
      }
    },
    [
      email,
      password,
      validEmail,
      validPassword,
      passwordsMatch,
      startRegistrationProcess,
      register,
      auth
    ]
  );

  const handleFinishRegistration = useCallback(
    async (e) => {
      e.preventDefault();

      if (!verificationCode.trim()) {
        setErrMsg("Please enter the verification code");
        return;
      }

      setIsLoading(true);
      setErrMsg("");

      try {
        const codeResponse = await finishRegistrationProcess(
          { showErrorAlert: false },
          { email, code: verificationCode.trim() }
        );

        if (!codeResponse.success) {
          setErrMsg(codeResponse.error || codeResponse.message || "Invalid verification code");
          return;
        }

        const registerResponse = await register(
          { showErrorAlert: false },
          { email, password }
        );

        if (registerResponse.success) {
          await signInWithCustomToken(auth, registerResponse.token);
          setStep("success");
        } else {
          setErrMsg(registerResponse.error || registerResponse.message || "Registration failed");
        }
      } catch (error) {
        console.error("Registration finish error:", error);

        if (error.response?.status === 409) {
          setErrMsg("Email is already registered");
        } else {
          setErrMsg("Registration failed. Please try again.");
        }
      } finally {
        setIsLoading(false);
      }
    },
    [
      email,
      password,
      verificationCode,
      finishRegistrationProcess,
      register,
      auth,
    ]
  );

  if (authLoading) {
    return (
      <div className={styles.authPageContainer}>
        <div className={styles.animatedBackground} />
        <section className={styles.section}>
          <Typography variant="h4">Loading...</Typography>
        </section>
      </div>
    );
  }

  const renderRegisterForm = () => (
    <>
      <Typography variant="h4" sx={{ mb: 3 }}>
        Create Account
      </Typography>

      <form className={styles.form} onSubmit={handleStartRegistration}>
        <FormControl
          error={email.length > 0 && !validEmail}
          fullWidth
          sx={{ mb: 2 }}
        >
          <InputLabel htmlFor="email">Work Email *</InputLabel>
          <Input
            ref={userRef}
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isLoading}
            spellCheck={false}
          />
          {email.length > 0 && !validEmail && (
            <FormHelperText>Please enter a valid email address</FormHelperText>
          )}
        </FormControl>

        <FormControl
          error={password.length > 0 && !validPassword}
          fullWidth
          sx={{ mb: 2 }}
        >
          <InputLabel htmlFor="password">Password *</InputLabel>
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={isLoading}
            spellCheck={false}
            endAdornment={
              <InputAdornment position="end">
                <IconButton
                  onClick={() => setShowPassword(!showPassword)}
                  edge="end"
                >
                  {showPassword ? <VisibilityOff /> : <Visibility />}
                </IconButton>
              </InputAdornment>
            }
          />
          <FormHelperText>
            8+ characters with uppercase, lowercase, number, and special
            character (!@#$%)
          </FormHelperText>
        </FormControl>

        <FormControl
          error={confirmPassword.length > 0 && !passwordsMatch}
          fullWidth
          sx={{ mb: 2 }}
        >
          <InputLabel htmlFor="confirmPassword">Confirm Password *</InputLabel>
          <Input
            id="confirmPassword"
            type={showConfirmPassword ? "text" : "password"}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            disabled={isLoading}
            spellCheck={false}
            endAdornment={
              <InputAdornment position="end">
                <IconButton
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  edge="end"
                >
                  {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                </IconButton>
              </InputAdornment>
            }
          />
          {confirmPassword.length > 0 && !passwordsMatch && (
            <FormHelperText>Passwords must match</FormHelperText>
          )}
        </FormControl>

        {errMsg && (
          <Typography color="error" sx={{ mb: 2, textAlign: "center" }}>
            {errMsg}
          </Typography>
        )}

        <LoadingButton
          type="submit"
          variant="contained"
          loading={isLoading}
          disabled={!validEmail || !validPassword || !passwordsMatch}
          fullWidth
          sx={{ mb: 2 }}
        >
          {!isUsingFirebase() && window.__env.environment === 'development' 
            ? "Create Account" 
            : "Send Verification Code"
          }
        </LoadingButton>
      </form>

      <Button onClick={() => navigate("/login")} disabled={isLoading}>
        Already have an account? Sign In
      </Button>
    </>
  );

  const renderVerificationForm = () => (
    <>
      <Typography variant="h4" sx={{ mb: 2 }}>
        Verify Email
      </Typography>

      <Typography color="text.secondary" sx={{ mb: 3, textAlign: "center" }}>
        Enter the verification code sent to {email}
      </Typography>

      <form className={styles.form} onSubmit={handleFinishRegistration}>
        <TextField
          label="Verification Code"
          value={verificationCode}
          onChange={(e) => setVerificationCode(e.target.value)}
          disabled={isLoading}
          required
          fullWidth
          sx={{ mb: 2 }}
        />

        {errMsg && (
          <Typography color="error" sx={{ mb: 2, textAlign: "center" }}>
            {errMsg}
          </Typography>
        )}

        <LoadingButton
          type="submit"
          variant="contained"
          loading={isLoading}
          disabled={!verificationCode.trim()}
          fullWidth
          sx={{ mb: 2 }}
        >
          Complete Registration
        </LoadingButton>
      </form>

      <Button onClick={() => setStep("register")} disabled={isLoading}>
        Back to Registration
      </Button>
    </>
  );

  const renderSuccess = () => (
    <>
      <Typography variant="h4" sx={{ mb: 2 }}>
        Welcome!
      </Typography>

      <Typography sx={{ mb: 3, textAlign: "center" }}>
        Your account has been created successfully.
      </Typography>

      <Button
        variant="contained"
        onClick={() => navigate("/overview")}
        fullWidth
      >
        Get Started
      </Button>
    </>
  );

  return (
    <div className={styles.authPageContainer}>
      <Helmet>
        <title>{titles.register}</title>
      </Helmet>

      <div className={styles.animatedBackground} />

      <section className={styles.section}>
        {step === "register" && renderRegisterForm()}
        {step === "verify" && renderVerificationForm()}
        {step === "success" && renderSuccess()}
      </section>
    </div>
  );
};

export default Register;