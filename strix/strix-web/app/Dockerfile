### STAGE 1: Build ###

FROM node:20.10.0-alpine as builder

WORKDIR /app

ENV IMAGE_INLINE_SIZE_LIMIT=0
ENV INLINE_RUNTIME_CHUNK="false"
ENV NODE_OPTIONS="--max-old-space-size=4096"

COPY package*.json ./
ADD patches ./patches
RUN npm install
RUN npx patch-package

# Bundle app source
COPY . .

RUN npm run build

### STAGE 2: Setup ###
FROM nginx:1.25.2-alpine

RUN apk update && apk upgrade \
    && apk add apache2-utils \
    && rm -rf /var/lib/apl/lists/*


COPY --from=builder /app/build /usr/share/nginx/html

COPY --from=builder /app/nginx/nginx.conf /etc/nginx/conf.d/default.conf-template
COPY --from=builder /app/nginx/.htpasswd /etc/nginx/.htpasswd-template

COPY ./docker-entrypoint.sh .
RUN ["chmod", "+x", "./docker-entrypoint.sh"]

EXPOSE 80

ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]
