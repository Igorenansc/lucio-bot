FROM node:18.20.3

WORKDIR /usr/src/app

COPY package*.json ./

RUN apt update

RUN apt install ffmpeg -y

RUN npm install

COPY . .

RUN npm install pm2@latest -g

RUN echo "alias start='pm2 start ~/../usr/src/app/src/index.js --max-memory-restart 400M --name Lucio'" >> ~/.bashrc
RUN echo "alias restart='pm2 delete Lucio && start'" >> ~/.bashrc

# ENTRYPOINT ["/bin/bash"]
CMD ["/bin/bash", "-c", "pm2-runtime start ~/../usr/src/app/src/index.js --max-memory-restart 400M --name Lucio"]
