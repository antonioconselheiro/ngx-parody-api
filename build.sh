#bin/bash

rm -rf dist;
ng build --project ngx-parody-api --configuration production;

cd ./dist/ngx-parody-api;
npm pack;

cd ../..;
chmod 777 -R dist;
mv ./dist/ngx-parody-api/belomonte-ngx-parody-api-1.0.0.tgz ./dist/belomonte-ngx-parody-api-1.0.0.tgz
