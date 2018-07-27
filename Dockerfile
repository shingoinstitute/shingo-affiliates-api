FROM node:8.9-alpine
ENV NODE_ENV production
WORKDIR /usr/src/app
COPY ["package.json", "package-lock.json*", "npm-shrinkwrap.json*", "./"]
RUN npm install --production --silent
COPY . .
RUN npm run build
EXPOSE 80
ENV PORT 80
ENV LOG_PATH ./
ENV LOG_FILE shingo-affiliates-api.log
# the following may be overriden by run script
ENV LOG_LEVEL info
ENV GLOBAL_PREFIX /v2/affiliates
ENV CLIENT_HOST https://affiliates.shingo.org
CMD npm start
