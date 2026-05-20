ARG TARGETARCH
FROM ghcr.io/imgproxy/imgproxy:latest-${TARGETARCH} AS imgproxy-package

USER root
RUN mkdir -p /dist && imgproxy-build-package deb /dist

FROM oven/bun:1.3.6-slim

WORKDIR /app

COPY --from=imgproxy-package /dist/*.deb /tmp/imgproxy.deb
RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates tini /tmp/imgproxy.deb \
  && rm -rf /var/lib/apt/lists/* /tmp/imgproxy.deb

COPY package.json bun.lock ./
RUN bun install --production --frozen-lockfile

COPY src ./src
COPY start.sh ./start.sh
RUN chmod +x ./start.sh

ENV PORT=3000
ENV IMGPROXY_BIND=127.0.0.1:8081
ENV IPFS_GATEWAY=https://ipfs.io
ENV MAX_AVATAR_DIMENSION=1024

EXPOSE 3000

ENTRYPOINT ["tini", "--"]
CMD ["./start.sh"]
