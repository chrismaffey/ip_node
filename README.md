# Client IP Azure Function

Node.js 24, Azure Functions runtime 4, and the Node v4 programming model.
The supplied `template.html` is rendered with its `IP_ADDRESS` placeholder replaced.

## Run locally

Install Docker with Compose, then run:

```sh
docker compose up --build -d
```

Open http://localhost:7071/ in a browser to see the template. Try:

```sh
curl http://localhost:7071/
curl http://localhost:7071/anything
curl 'http://localhost:7071/?plain=1'
```

Each curl request returns only the IP, without a trailing newline. Browser requests
with any non-root path or any query string also return plain text. A browser is
identified by a Mozilla user agent and an Accept header containing `text/html`.
Responses are not cached.

```sh
docker compose logs -f
docker compose down
```

The local nginx proxy supplies the connection IP to the actual Azure Functions
host. Docker Desktop networking can expose a gateway address instead of your
machine's public IP. The function container is deliberately not published directly.
The Microsoft Functions image uses amd64; Compose enables emulation on Apple Silicon.
No storage emulator is needed for this HTTP-only function with file-based secrets.

## Test

```sh
npm ci
npm test
```

## Deploy to Azure

Create an Azure Function App using Functions runtime 4 and Node.js 24. With
Azure Functions Core Tools installed and authenticated:

```sh
npm ci --omit=dev
func azure functionapp publish YOUR_FUNCTION_APP_NAME
```

Configure `FUNCTIONS_WORKER_RUNTIME=node` and a real `AzureWebJobsStorage`
connection for your Azure hosting plan. Alternatively, build and push the
Dockerfile to your registry and deploy to an Azure Functions plan supporting
custom Linux containers. The image already specifies Node.js 24.

The HTTP trigger is anonymous and the route prefix is empty, so the application
is served at `/` rather than `/api`. All paths and HTTP methods reach the handler;
HTTP HEAD responses follow the host's usual body suppression behavior.

IP detection uses the last entry in `X-Forwarded-For`, which the trusted ingress
must append or replace (as the local nginx config does). If you add another proxy
or CDN, configure it accordingly: otherwise the returned IP can be a proxy's IP.
Missing or invalid ingress IPs produce HTTP 503 rather than an invented address.
Do not expose this application behind an ingress that forwards that header
unchanged from the client.

References: [Azure Functions Node developer guide](https://learn.microsoft.com/azure/azure-functions/functions-reference-node)
and [Microsoft Node runtime images](https://mcr.microsoft.com/en-us/artifact/mar/azure-functions/node/tags).
