FROM node:lts-alpine
ENV NODE_ENV=production
WORKDIR /usr/src/app
# 依存ファイルのみ先にコピーし、キャッシュを活用
COPY package.json package-lock.json* npm-shrinkwrap.json* ./
RUN npm install --production --silent && mv node_modules ../
# アプリ本体をコピー
COPY . .
EXPOSE 3000
# chownはビルド時のみ必要な場合に限定
# USER node
CMD ["npm", "start"]
