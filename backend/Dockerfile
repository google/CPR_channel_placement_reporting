FROM python:3.10-slim-buster
EXPOSE 5000
WORKDIR /app
ADD requirements.txt .
RUN pip install -r requirements.txt
COPY server.py .
COPY static static
ARG youtube_data_api_key
ENV YOUTUBE_DATA_API_KEY=$youtube_data_api_key
ENTRYPOINT ["gunicorn" , "-b",  ":5000",  "server:app"]
