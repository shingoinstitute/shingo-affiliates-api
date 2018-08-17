### STEP 1: Build ###
FROM node:8-alpine as build
COPY ["package.json", "package-lock.json*", "npm-shrinkwrap.json*", "./"]
RUN npm install --silent
COPY . .
RUN npm run build

### STEP 2: Run Production ##
FROM node:8-alpine as prod
COPY --from=build /build/ build
COPY --from=build /package.json package.json
# install production modules instead of full
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

FROM prod as debug
# copy the full development node_modules
COPY --from=build /node_modules/ /node_modules
ENV NODE_ENV development
CMD npm run debug

# end with prod layer so it is default
FROM prod