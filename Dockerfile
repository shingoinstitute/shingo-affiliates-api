FROM node:8.1

WORKDIR /code

COPY package.json package.json

RUN npm install -g typescript nodemon

RUN npm install

ENV PORT=80

ENV SF_API=shingo-sf-api

EXPOSE 80

ENTRYPOINT ["npm", "run"]

CMD ["start"]