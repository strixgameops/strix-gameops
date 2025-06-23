import React, { useRef, useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Helmet } from "react-helmet";
import {
  TextField,
  Button,
  Typography,
  FormControl,
  OutlinedInput,
  InputLabel,
  InputAdornment,
  IconButton,
} from "@mui/material";
import { LoadingButton } from "@mui/lab";
import { Visibility, VisibilityOff } from "@mui/icons-material";
import { getAuthInstance, signInWithCustomToken, isUsingFirebase } from "../../firebase/firebase.jsx";
import useApi from "@strix/hooks/useApi";
import { useUser } from "@strix/userContext";
import titles from "titles";
import styles from "./css/authPages.module.css";

const Login = () => {
  const { login } = useApi();
  const auth = getAuthInstance();
  const { isAuthenticated, isLoading: authLoading } = useUser();
  const navigate = useNavigate();
  const location = useLocation();

  const userRef = useRef();
  const errRef = useRef();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [errMsg, setErrMsg] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && !authLoading) {
      const redirectTo = location.state?.from?.pathname || "/overview";
      navigate(redirectTo, { replace: true });
    }
  }, [isAuthenticated, authLoading, navigate, location.state]);

  useEffect(() => {
    userRef.current?.focus();
  }, []);

  useEffect(() => {
    setErrMsg("");
  }, [username, password]);

  const handlePasswordToggle = useCallback(() => {
    setShowPassword((prev) => !prev);
  }, []);

  const handleSubmit = useCallback(
  async (e) => {
    console.log("Login button pressed")
    e.preventDefault();

    if (!username.trim() || !password.trim()) {
      setErrMsg("Please enter both email and password");
      return;
    }

    setIsLoggingIn(true);
    setErrMsg("");

    try {
      const response = await login(
        { showErrorAlert: false },
        { email: username.trim(), password }
      );

      if (response.success) {
        // Sign in with the returned token
        await signInWithCustomToken(auth, response.token);
        
        console.log(`Successfully logged in with ${isUsingFirebase() ? 'Firebase' : 'local'} auth`);
        
        // Explicit redirect to overview after successful login
        const redirectTo = location.state?.from?.pathname || "/overview";
        navigate(redirectTo, { replace: true });
        
      } else {
        setErrMsg(response.error || response.message || "Invalid credentials");
        errRef.current?.focus();
      }
    } catch (error) {
      console.error("Login error:", error);

      if (!error.response) {
        setErrMsg("No server response. Please check your connection.");
      } else {
        switch (error.response?.status) {
          case 400:
            setErrMsg("Missing email or password");
            break;
          case 401:
            setErrMsg("Invalid credentials");
            break;
          case 429:
            setErrMsg("Too many login attempts. Please try again later.");
            break;
          default:
            setErrMsg("Login failed. Please try again.");
        }
      }

      errRef.current?.focus();
    } finally {
      setIsLoggingIn(false);
    }
  },
  [username, password, login, auth, navigate, location.state]
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

  return (
    <div className={styles.authPageContainer}>
      <Helmet>
        <title>{titles.login}</title>
      </Helmet>

      <div className={styles.animatedBackground} />

      <section className={styles.section}>
        <Typography variant="h4" sx={{ mb: 3 }}>
          Sign In
        </Typography>

        <form className={styles.form}>
          <TextField
            ref={userRef}
            id="username"
            label="Email"
            variant="outlined"
            type="email"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            disabled={isLoggingIn}
            required
            fullWidth
            spellCheck={false}
            sx={{ mb: 2 }}
          />

          <FormControl variant="outlined" fullWidth sx={{ mb: 2 }}>
            <InputLabel htmlFor="password">Password *</InputLabel>
            <OutlinedInput
              id="password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoggingIn}
              spellCheck={false}
              endAdornment={
                <InputAdornment position="end">
                  <IconButton
                    aria-label="toggle password visibility"
                    onClick={handlePasswordToggle}
                    edge="end"
                  >
                    {showPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              }
              label="Password *"
            />
          </FormControl>

          {errMsg && (
            <Typography
              ref={errRef}
              color="error"
              sx={{ mb: 2, textAlign: "center" }}
              tabIndex={-1}
            >
              {errMsg}
            </Typography>
          )}

          <LoadingButton
            type="submit"
            variant="contained"
            loading={isLoggingIn}
            loadingIndicator="Signing in..."
            disabled={!username.trim() || !password.trim()}
            fullWidth
            onClick={handleSubmit}
            sx={{ mb: 2 }}
          >
            Sign In
          </LoadingButton>
        </form>

        <Button onClick={() => navigate("/register")} disabled={isLoggingIn}>
          Don't have an account? Sign Up
        </Button>
      </section>
    </div>
  );
};

export default Login;