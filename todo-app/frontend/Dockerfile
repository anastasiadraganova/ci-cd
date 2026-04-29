FROM nginx:alpine

RUN apk add --no-cache curl

COPY . /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=10s --timeout=5s --retries=5 \
  CMD curl -f http://localhost/ || exit 1
