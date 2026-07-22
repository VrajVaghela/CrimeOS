FROM postgres:16-alpine

# Install build dependencies
RUN apk add --no-cache --virtual .build-deps \
    git \
    make \
    gcc \
    musl-dev

# Clone and compile pgvector
RUN git clone --branch v0.6.0 https://github.com/pgvector/pgvector.git /tmp/pgvector \
    && cd /tmp/pgvector \
    && make with_llvm=no \
    && make with_llvm=no install

# Clean up build dependencies and tmp files
RUN apk del .build-deps \
    && rm -rf /tmp/pgvector
