# tvseri.es

This is a NextJS application that interacts with multiple APIs (but mostly TMDb), to help you discover and track your favourite TV series.

_Partial Prerendering FTW 🔥_

## Required Environment Variables to run the project locally

```
TMDB_API_KEY=
TMDB_API_ACCESS_TOKEN=
GOOGLE_CLOUD_API_KEY=
KV_REST_API_READ_ONLY_TOKEN=
KV_REST_API_TOKEN=
KV_REST_API_URL=
KV_URL=
MDBLIST_API_KEY=
# openssl rand -base64 32
SECRET_KEY=
```

- To obtain TMDB keys, log into your account and visit [this link](https://www.themoviedb.org/settings/api).
- To generate a Google Cloud key, go to [this page](https://console.cloud.google.com/apis/credentials) and ensure that the Google Vision service is enabled for the API key.
- For Vercel KV, follow [this quickstart guide](https://vercel.com/docs/storage/vercel-kv/quickstart#create-a-kv-database).
- To obtain a mdblist.com API key, visit [this link](https://mdblist.com/preferences/).
