#!/bin/sh
#Algorithm
# 1. set default values
set -e
DEFAULT_API_URL=""
DEFAULT_API_ENV=""
DEFAULT_SITE_BASE_URL=""
DEFAULT_NGINX_AUTH_BASIC_ENABLED='false'
DEFAULT_VERSION=""
DEFAULT_FQDN=""
DEFAULT_FB_API_KEY=""
DEFAULT_FB_AUTH_DOMAIN=""
DEFAULT_FB_PROJECT_ID=""
DEFAULT_FB_STORAGE_BUCKET=""
DEFAULT_FB_MESSAGING_SENDER_ID=""
DEFAULT_FB_APP_ID=""
DEFAULT_FB_MEASUREMENT_ID=""
DEFAULT_EDITION=""
DEFAULT_USE_FIREBASE=""
DEFAULT_ALLOW_REGISTRATION=""
DEFAULT_GTAG=""

# 2. read from environment variables and overwrite the default values, if env variable is set
[ -n "$API_URL" ] && DEFAULT_API_URL=$API_URL
[ -n "$API_ENV" ] && DEFAULT_API_ENV=$API_ENV
[ -n "$SITE_BASE_URL" ] && DEFAULT_SITE_BASE_URL=$SITE_BASE_URL
[ -n "$VERSION" ] && DEFAULT_VERSION=$VERSION
[ -n "$NGINX_AUTH_BASIC_ENABLED" ] && DEFAULT_NGINX_AUTH_BASIC_ENABLED=$NGINX_AUTH_BASIC_ENABLED
[ -n "$FQDN" ] && DEFAULT_FQDN=$FQDN
[ -n "$FB_API_KEY" ] && DEFAULT_FB_API_KEY=$FB_API_KEY
[ -n "$FB_AUTH_DOMAIN" ] && DEFAULT_FB_AUTH_DOMAIN=$FB_AUTH_DOMAIN
[ -n "$FB_PROJECT_ID" ] && DEFAULT_FB_PROJECT_ID=$FB_PROJECT_ID
[ -n "$FB_STORAGE_BUCKET" ] && DEFAULT_FB_STORAGE_BUCKET=$FB_STORAGE_BUCKET
[ -n "$FB_MESSAGING_SENDER_ID" ] && DEFAULT_FB_MESSAGING_SENDER_ID=$FB_MESSAGING_SENDER_ID
[ -n "$FB_APP_ID" ] && DEFAULT_FB_APP_ID=$FB_APP_ID
[ -n "$FB_MEASUREMENT_ID" ] && DEFAULT_FB_MEASUREMENT_ID=$FB_MEASUREMENT_ID
[ -n "$EDITION" ] && DEFAULT_EDITION=$EDITION
[ -n "$USE_FIREBASE" ] && DEFAULT_USE_FIREBASE=$USE_FIREBASE
[ -n "$ALLOW_REGISTRATION" ] && DEFAULT_ALLOW_REGISTRATION=$ALLOW_REGISTRATION
[ -n "$GTAG" ] && DEFAULT_GTAG=$GTAG

# 3. replace the variables in the template
#configure env.js global settings
PATH_TO_SETTINGS_FILE=/usr/share/nginx/html/js/env.community.js
cp /usr/share/nginx/html/js/env-docker.js ${PATH_TO_SETTINGS_FILE}
sed -i -e "s#\${SITE_BASE_URL}#$DEFAULT_SITE_BASE_URL#" ${PATH_TO_SETTINGS_FILE}
sed -i -e "s#\${VERSION}#$DEFAULT_VERSION#" ${PATH_TO_SETTINGS_FILE}
sed -i -e "s#\${FQDN}#$DEFAULT_FQDN#" ${PATH_TO_SETTINGS_FILE}
sed -i -e "s#\${FB_API_KEY}#$DEFAULT_FB_API_KEY#" ${PATH_TO_SETTINGS_FILE}
sed -i -e "s#\${FB_AUTH_DOMAIN}#$DEFAULT_FB_AUTH_DOMAIN#" ${PATH_TO_SETTINGS_FILE}
sed -i -e "s#\${FB_PROJECT_ID}#$DEFAULT_FB_PROJECT_ID#" ${PATH_TO_SETTINGS_FILE}
sed -i -e "s#\${FB_STORAGE_BUCKET}#$DEFAULT_FB_STORAGE_BUCKET#" ${PATH_TO_SETTINGS_FILE}
sed -i -e "s#\${FB_MESSAGING_SENDER_ID}#$DEFAULT_FB_MESSAGING_SENDER_ID#" ${PATH_TO_SETTINGS_FILE}
sed -i -e "s#\${FB_APP_ID}#$DEFAULT_FB_APP_ID#" ${PATH_TO_SETTINGS_FILE}
sed -i -e "s#\${FB_MEASUREMENT_ID}#$DEFAULT_FB_MEASUREMENT_ID#" ${PATH_TO_SETTINGS_FILE}
sed -i -e "s#\${EDITION}#$DEFAULT_EDITION#" ${PATH_TO_SETTINGS_FILE}
sed -i -e "s#\${USE_FIREBASE}#$DEFAULT_USE_FIREBASE#" ${PATH_TO_SETTINGS_FILE}
sed -i -e "s#\${ALLOW_REGISTRATION}#$DEFAULT_ALLOW_REGISTRATION#" ${PATH_TO_SETTINGS_FILE}
sed -i -e "s#\${GTAG}#$DEFAULT_GTAG#" ${PATH_TO_SETTINGS_FILE}


#nginx basic auth
cp /etc/nginx/conf.d/default.conf-template /etc/nginx/conf.d/default.conf
if [[ $DEFAULT_NGINX_AUTH_BASIC_ENABLED == 'true' ]]; then
  sed -i -e "s#\${AUTH_ENABLED}#'Restricted Content'#" /etc/nginx/conf.d/default.conf
  envsubst < /etc/nginx/.htpasswd-template > /etc/nginx/.htpasswd
  htpasswd -c -b /etc/nginx/.htpasswd $USER $PASS
else
  sed -i -e "s#\${AUTH_ENABLED}#off#" /etc/nginx/conf.d/default.conf
fi


exec "$@"
