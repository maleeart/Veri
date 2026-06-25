FROM node:20-slim

# ติดตั้ง LibreOffice + Python + openpyxl + font ภาษาไทย
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
      libreoffice \
      python3 \
      python3-pip \
      fonts-thai-tlwg \
      fonts-noto-cjk \
    && pip3 install --no-cache-dir openpyxl --break-system-packages \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package.json .
RUN npm install --omit=dev
COPY server.js .
COPY convert.py .

EXPOSE 3001
CMD ["node", "server.js"]
