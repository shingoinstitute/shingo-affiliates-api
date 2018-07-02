FROM node:8.9-alpine
ENV NODE_ENV production
WORKDIR /usr/src/app
COPY ["package.json", "package-lock.json*", "npm-shrinkwrap.json*", "./"]
RUN npm install --production --silent && mv node_modules ../
COPY . .
ENV PORT 80
ENV LOG_PATH ./
ENV GLOBAL_PREFIX /v2/affiliates
ENV LOG_FILE shingo-affiliates-api.log
ENV LOG_LEVEL info
ENV CLIENT_HOST https://affiliates.shingo.org
RUN npm build
EXPOSE 80
CMD npm start
