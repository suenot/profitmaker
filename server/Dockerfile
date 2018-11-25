# Use a lighter version of Node as a parent image
FROM mhart/alpine-node:8.11.4
# Set the working directory to /client
RUN mkdir /app && mkdir /app/server
WORKDIR /app/server
# copy package.json into the container at /client
COPY package*.json /app/server/
# install dependencies
RUN yarn
# Copy the current directory contents into the container at /server
COPY . /app/server/
# Make port 3000 available to the world outside this container
EXPOSE 8051
# Run the app when the container launches
CMD ["yarn", "start"]
