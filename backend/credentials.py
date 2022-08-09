import logging
import os
import pickle

from google.auth.transport.requests import Request
from google_auth_oauthlib.flow import InstalledAppFlow

token_file = 'token.pickle'
client_secret_file = 'client.secret'
scopes_array = [
                    'https://www.googleapis.com/auth/youtube.readonly',
                    'https://www.googleapis.com/auth/adwords'
                ]
def get_oauth():
    credentials = None

    if os.path.exists(token_file):
        with open(token_file, 'rb') as token:
            credentials = pickle.load(token)

    if not credentials or not credentials.valid:
        if credentials and credentials.expired and credentials.refresh_token:
            credentials.refresh(Request())
        else:
            flow = InstalledAppFlow.from_client_secrets_file(
                client_secret_file,
                scopes=scopes_array
            )

            flow.run_local_server(port=5001, prompt='consent',
                                authorization_prompt_message='')
            credentials = flow.credentials

            # Save the credentials for the next run
            with open(token_file, 'wb') as f:
                pickle.dump(credentials, f)
    return credentials