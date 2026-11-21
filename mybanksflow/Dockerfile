# The package script creates this Dockerfile's complete build context.
# Only amd64 is offered until the complete appliance has been validated on ARM.
FROM supabase/gotrue:v2.172.1 AS auth
FROM postgrest/postgrest:v12.2.8 AS rest

# Use the same Node.js and musl packages for building and running Storage.
FROM alpine:3.22 AS node_runtime
RUN apk add --no-cache nodejs=22.23.5-r0 \
    && test "$(node --version)" = v22.23.5

FROM node_runtime AS storage
RUN apk add --no-cache npm curl python3 make g++
WORKDIR /opt/storage
# pg returns SELECT EXISTS as a boolean. Keep Storage on its own schema
# instead of granting database-wide CREATE for a redundant CREATE SCHEMA.
RUN curl -fsSL https://github.com/supabase/storage/archive/refs/tags/v1.14.6.tar.gz | tar xz --strip-components=1 \
    && grep -Fq "result.rows[0].exists === 'true'" src/internal/database/migrations/migrate.ts \
    && sed -i "s/result\.rows\[0\]\.exists === 'true'/result.rows[0].exists === true/" src/internal/database/migrations/migrate.ts \
    && npm ci && npm run build && npm prune --omit=dev

FROM node_runtime AS frontend
RUN apk add --no-cache npm
WORKDIR /web
COPY web/ ./
# The app manifest can change independently of the exported npm lockfile.
# Reconcile only this isolated build context before the clean installation.
RUN npm install --package-lock-only --ignore-scripts --no-audit --no-fund \
    && npm ci --no-audit --no-fund && npm run build -- --base=./

FROM node_runtime
RUN apk add --no-cache postgresql15 postgresql15-contrib nginx python3 py3-psycopg2 libstdc++ libgcc ca-certificates \
    && mkdir -p /run/postgresql /opt/mybanksflow/migrations /web
COPY --from=auth /usr/local/bin/auth /usr/local/bin/auth
COPY --from=auth /usr/local/etc/auth/migrations /opt/auth/migrations
COPY --from=rest /bin/postgrest /usr/local/bin/postgrest
COPY --from=storage /opt/storage /opt/storage
COPY --from=frontend /web/dist /web
COPY rootfs/ /
ARG BUILD_VERSION=1.0.2
ARG BUILD_ARCH=amd64
RUN printf '%s' "$BUILD_VERSION" > /opt/mybanksflow/version
LABEL io.hass.type="addon" io.hass.version="${BUILD_VERSION}" io.hass.arch="${BUILD_ARCH}"
ENV PYTHONUNBUFFERED=1
ENV PATH="/usr/libexec/postgresql15:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"
EXPOSE 8099
CMD ["python3", "/opt/mybanksflow/run.py"]