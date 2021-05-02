FROM node:12-alpine


# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
# where available (npm@5+)
#COPY package*.json ./
RUN apk update && apk add --no-cache libc6-compat  gcompat git

# If you are building your code for production
# RUN npm ci --only=production

# Bundle app source
COPY . .
RUN rm -rf node_modules
RUN npm install
RUN npm run build

EXPOSE 8000 8433
CMD [ "node", "./dist/run-uws-tracker.js" ]
