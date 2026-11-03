import {loadEnvFiles} from '../src/lib/env';
loadEnvFiles();
const {getAllConfigs}=await import('../src/modules/config/service');
const config=await getAllConfigs();
const checks={
  seeapiKey:!!config.seeapi_api_key,
  stripeKey:!!(config.stripe_secret_key||config.stripe_api_key),
  stripeWebhookSecret:!!(config.stripe_signing_secret||config.stripe_webhook_secret),
  privateBucket:!!config.screenshots_bucket,
  storageAccessKey:!!config.r2_access_key,
  storageSecret:!!config.r2_secret_key,
  storageEndpoint:!!(config.r2_account_id||config.r2_endpoint),
};
console.log(JSON.stringify(checks,null,2));
if(Object.values(checks).some(value=>!value))process.exitCode=1;
