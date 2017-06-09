FROM node

WORKDIR /code

RUN npm install -g typescript nodemon

ENV PORT=80

ENV SF_API=shingo-sf-api

ENV REDIS_URL="redis://shingo-redis:6379"

EXPOSE 80

ENTRYPOINT npm install && npm start