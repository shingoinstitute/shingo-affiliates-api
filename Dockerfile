FROM node:8.1

WORKDIR /code

COPY .dockerignore .dockerignore

COPY package.json package.json

COPY package-lock.json package-lock.json

COPY tsconfig.json tsconfig.json

RUN npm install -g typescript nodemon

RUN npm install

RUN tsc

ENV PORT=80

ENV SF_API=shingo-sf-api

ENV AUTH_API=shingo-auth-api

ENV GLOBAL_PREFIX='/'

ENV LOG_PATH='./'

ENV LOG_FILE='debug.log'

ENV DEBUG_ROUTES='true'

EXPOSE 80

ENTRYPOINT ["npm", "run"]

CMD ["start"]