import json
from google.ads.googleads.client import GoogleAdsClient

def make_client(mcc_id, developer_token, credentials: json) -> GoogleAdsClient:
    creds = {
        "developer_token": developer_token,
        "refresh_token": credentials["refresh_token"],
        "client_id": credentials["client_id"],
        "client_secret": credentials["client_secret"],
        "use_proto_plus": True
    }
    google_ads_client = GoogleAdsClient.load_from_dict(creds)
    if mcc_id != "":
        google_ads_client.login_customer_id = mcc_id
    return google_ads_client


    
