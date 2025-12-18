FROM node:16.20.2-bullseye

LABEL maintainer="Miners World Coin"
LABEL description="MWC NOMP Pool (Node 16 Locked)"

# System deps (bignum + crypto safe)
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    git \
    ca-certificates \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /opt/nomp

# Copy package files first (better caching)
COPY package*.json ./

RUN npm install --production

# Copy rest of the pool
COPY . .

# Redis default
ENV REDIS_HOST=redis
ENV REDIS_PORT=6379
ENV NODE_ENV=production

EXPOSE 8080 3333 3334 3335

CMD ["node", "init.js"]
