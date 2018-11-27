FROM node:8-alpine
RUN mkdir /app && mkdir /app/server
WORKDIR /app/server
COPY package.json /app/server/
RUN yarn
EXPOSE 8051
CMD ["yarn", "start"]
