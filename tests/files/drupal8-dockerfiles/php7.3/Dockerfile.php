ARG CLI_IMAGE
ARG IMAGE_REPO
FROM ${CLI_IMAGE:-builder} as builder

FROM ${IMAGE_REPO:-amazeeio}/php:7.3-fpm

COPY --from=builder /app /app