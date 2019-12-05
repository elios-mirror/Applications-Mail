# FROM alpine:latest
FROM node:12.13.0

# Create app directory
WORKDIR /opt/app

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
# where available (npm@5+)
COPY package*.json ./

# RUN npm -g config set user root
# RUN mkdir /root/node_modules
# RUN npm install --prefix /opt/ -g
RUN npm install

# If you are building your code for production
# RUN npm ci --only=production

# Bundle app source
COPY . /opt/app

RUN npm run-script build 

CMD ["npm", "start"]
