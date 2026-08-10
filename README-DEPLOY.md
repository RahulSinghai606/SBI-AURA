# SBI AURA — InnoHub Sandbox Deploy

Self-contained Next.js standalone build (v2: ops console + live SBI APIs). No npm install needed.

## Run on the sandbox

```bash
git clone -b deploy https://github.com/RahulSinghai606/SBI-AURA.git aura
cd aura
cp .env.example .env    # fill in the values
nohup node server.js > aura.log 2>&1 &
```

Default port 3000. If the InnoHub proxy expects another port:
`PORT=8080 nohup node server.js > aura.log 2>&1 &`

Health check: `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/`
Then open: https://amit-shrivastav-kellton-com.solutions.innohub.sbi
