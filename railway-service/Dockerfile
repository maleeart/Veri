FROM node:20-slim

RUN apt-get update && \
    apt-get install -y --no-install-recommends \
      libreoffice \
      python3 \
      python3-uno \
      fonts-thai-tlwg \
      fonts-noto-cjk \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package.json .
RUN npm install --omit=dev
COPY server.js convert.py ./

EXPOSE 3001
CMD ["node", "server.js"]
