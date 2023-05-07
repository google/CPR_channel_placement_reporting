FROM debian:stable-slim
RUN apt-get update \
    && apt-get install cron jq curl -y \
    && rm -rf /var/lib/apt/lists/*
ADD scheduler.sh .
RUN chmod 755 scheduler.sh

CMD ["/scheduler.sh"]
