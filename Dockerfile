FROM node:18

WORKDIR /app

COPY package*.json ./
COPY main.js ./
COPY db.csv ./

RUN npm install

EXPOSE 3000

CMD ["npm", "start"] 