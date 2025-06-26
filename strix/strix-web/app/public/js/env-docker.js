(function (window) {
  window.__env = window.__env || {};
  window.__env.siteBaseUrl = "${SITE_BASE_URL}";
  window.__env.version = "${VERSION}";
  window.__env.fbApiKey = "${FB_API_KEY}";
  window.__env.fbAuthDomain = "${FB_AUTH_DOMAIN}";
  window.__env.fbProjectId = "${FB_PROJECT_ID}";
  window.__env.fbStorageBucket = "${FB_STORAGE_BUCKET}";
  window.__env.fbMessagingSenderId = "${FB_MESSAGING_SENDER_ID}";
  window.__env.fbAppId = "${FB_APP_ID}";
  window.__env.fbMeasurementId = "${FB_MEASUREMENT_ID}";
  window.__env.gtag = "${GTAG}";
  window.__env.environment = "${ENVIRONMENT}";
  window.__env.edition = "${EDITION}"; // enterprise / community
  window.__env.useFirebase = "${USE_FIREBASE}";
  window.__env.allowRegistration = "${ALLOW_REGISTRATION}";
})(this);