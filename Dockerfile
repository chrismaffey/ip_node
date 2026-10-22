FROM mcr.microsoft.com/azure-functions/node:4-node24
ENV AzureWebJobsScriptRoot=/home/site/wwwroot \
    AzureFunctionsJobHost__Logging__Console__IsEnabled=true \
    FUNCTIONS_WORKER_RUNTIME=node \
    AzureWebJobsSecretStorageType=files
WORKDIR /home/site/wwwroot
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY host.json template.html ./
COPY src ./src
