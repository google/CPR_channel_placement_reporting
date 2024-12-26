FROM python:3.10-slim-buster
EXPOSE 5000
WORKDIR /app
RUN pip install --require-hashes -r requirements.txt --no-deps
COPY server.py .
COPY static static
ARG youtube_data_api_key
ENV GOOGLE_API_KEY=$youtube_data_api_key
ENTRYPOINT ["gunicorn" , "-b",  ":5000",  "ads_placement_guardian.server:app"]
