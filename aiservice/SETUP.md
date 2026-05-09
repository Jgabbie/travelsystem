cd aiservice

Server will start on `http://localhost:5000`

Run locally:
```bash
pip install -r requirements.txt
cp .env.example .env
python main.py
```

On Render or other PaaS, use the `PORT` env variable in the start command:

```bash
uvicorn main:app --host 0.0.0.0 --port $PORT
```

API endpoints are identical to the previous location; update your Node.js `AI_SERVICE_URL` to the deployed URL when you push to Render.
