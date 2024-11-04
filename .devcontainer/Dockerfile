FROM node:20

RUN npm install typescript @angular/cli sass sassdoc -g
RUN yes | npx jsr

RUN wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add -
RUN sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list'
  
# Including jq to filter json
RUN apt update
RUN apt install -y jq gnupg google-chrome-stable
RUN apt clean
RUN rm -rf /var/lib/apt/lists/*

# Install docker and docker-compose
RUN curl -sSL https://get.docker.com/ | sh
RUN curl -L "https://github.com/docker/compose/releases/download/1.29.2/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
RUN chmod +x /usr/local/bin/docker-compose

# Installing nak, the nostr army knife
RUN wget https://github.com/fiatjaf/nak/releases/download/v0.7.3/nak-v0.7.3-linux-amd64
RUN mv nak-v0.7.3-linux-amd64 /usr/bin/nak
RUN chmod +x /usr/bin/nak

# workdir
WORKDIR /ngx-parody-api

# teclado português com horário brasileiro
ENV LANG=C.UTF-8
ENV LANGUAGE=C.UTF-8
ENV LC_ALL=C.UTF-8
ENV TZ=America/Sao_Paulo
ENV DEBUG_COLORS=true
ENV FORCE_COLOR=true

EXPOSE 4204

# The run the start script
CMD [ "/bin/bash" ]
