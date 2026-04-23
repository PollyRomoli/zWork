FROM node:24-bookworm-slim AS web-build
WORKDIR /src/app

COPY app/package*.json ./
RUN npm ci

COPY app/ ./
RUN npm run build

FROM python:3.12-slim AS runtime

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    ZWORK_HOST=0.0.0.0 \
    ZWORK_PORT=8787

WORKDIR /src

COPY pyproject.toml README.md ./
COPY sidecar ./sidecar
COPY zWork-Skills ./zWork-Skills

RUN pip install --no-cache-dir .

COPY --from=web-build /src/app/dist ./app/dist

EXPOSE 8787

CMD ["python", "-m", "sidecar.server"]
