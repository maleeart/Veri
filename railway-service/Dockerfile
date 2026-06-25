FROM node:20-slim

# ติดตั้ง LibreOffice + font ภาษาไทย
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
      libreoffice \
      fonts-thai-tlwg \
      fonts-noto-cjk \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package.json .
RUN npm install --omit=dev
COPY server.js .

EXPOSE 3001
CMD ["node", "server.js"]
