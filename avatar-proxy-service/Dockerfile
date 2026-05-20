FROM node:22-alpine AS api-base
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install --omit=dev
COPY src ./src
COPY entrypoint.sh ./entrypoint.sh
RUN chmod +x ./entrypoint.sh

FROM darthsim/imgproxy:latest
USER root
RUN apk add --no-cache nodejs npm
WORKDIR /app
COPY --from=api-base /app /app

ENV PORT=3000
ENV IMGPROXY_BIND=0.0.0.0:8080
ENV IMGPROXY_LOCAL_FILESYSTEM_ROOT=/tmp
ENV IMGPROXY_USE_ETAG=true
ENV IMGPROXY_TTL=31536000
ENV IMGPROXY_MAX_SRC_RESOLUTION=50

EXPOSE 3000 8080
CMD ["/app/entrypoint.sh"]
