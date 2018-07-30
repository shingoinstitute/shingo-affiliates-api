### STEP 1: Build ###
FROM node:8.9-alpine as builder
WORKDIR /usr/src/app
COPY ["package.json", "package-lock.json*", "npm-shrinkwrap.json*", "./"]
RUN npm install --silent
COPY . .
RUN npm run build

### STEP 2: Run Production ##
FROM node:8.9-alpine
COPY --from=builder /usr/src/app/build/ build
COPY --from=builder /usr/src/app/package.json package.json
RUN npm install --production --silent
EXPOSE 80
ENV PORT 80
ENV LOG_PATH ./
ENV LOG_FILE shingo-affiliates-api.log
ENV NODE_ENV production
# the following may be overriden by run script
ENV LOG_LEVEL info
ENV GLOBAL_PREFIX /v2/affiliates
ENV CLIENT_HOST https://affiliates.shingo.org
CMD npm start
