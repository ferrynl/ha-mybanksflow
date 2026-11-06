# The package script creates this Dockerfile's complete build context.
# Only amd64 is offered until the complete appliance has been validated on ARM.
FROM supabase/gotrue:v2.172.1 AS auth
FROM postgrest/postgrest:v12.2.8 AS rest

FROM node:20-alpine3.20 AS storage
RUN apk add --no-cache curl python3 make g++
WORKDIR /opt/storage
RUN curl -fsSL https://github.com/supabase/storage/archive/refs/tags/v1.14.6.tar.gz | tar xz --strip-components=1 \
    && npm ci && npm run build && npm prune --omit=dev

FROM node:20-alpine3.20 AS frontend
WORKDIR /web
COPY web/ ./
# The app manifest can change independently of the exported npm lockfile.
# Reconcile only this isolated build context before the clean installation.
RUN npm install --package-lock-only --ignore-scripts --no-audit --no-fund \
    && npm ci --no-audit --no-fund && npm run build -- --base=./

FROM alpine:3.20
RUN apk add --no-cache postgresql15 postgresql15-contrib nginx python3 py3-psycopg2 libstdc++ libgcc ca-certificates \
    && mkdir -p /run/postgresql /opt/mybanksflow/migrations /web
COPY --from=auth /usr/local/bin/auth /usr/local/bin/auth
COPY --from=auth /usr/local/etc/auth/migrations /opt/auth/migrations
COPY --from=rest /bin/postgrest /usr/local/bin/postgrest
COPY --from=storage /usr/local/bin/node /usr/local/bin/node
COPY --from=storage /opt/storage /opt/storage
COPY --from=frontend /web/dist /web
COPY rootfs/ /
ARG BUILD_VERSION=1.0.1
ARG BUILD_ARCH=amd64
RUN printf '%s' "$BUILD_VERSION" > /opt/mybanksflow/version
LABEL io.hass.type="addon" io.hass.version="${BUILD_VERSION}" io.hass.arch="${BUILD_ARCH}"
ENV PYTHONUNBUFFERED=1
ENV PATH="/usr/libexec/postgresql15:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"
EXPOSE 8099
CMD ["python3", "/opt/mybanksflow/run.py"]