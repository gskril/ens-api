# ENS API

## Avatar Transformer

This is a Cloudflare Worker that transforms and caches ENS avatars to be safe and performant for use in web applications.

In order to host this API, you will need to configure Cloudflare in a few ways:

- Under "Images" > "Transformations", navigate to the zone you want to use and enable transformations.
- Deploy this Worker to your Cloudflare account and set the environment variables as described in [`wrangler.tom`](./wrangler.toml).
- Make your Worker accessible from the zone (domain) you enabled in step 1.
  - In the domain's DNS page, create an `A` record that points to `192.0.2.0` with any name you want as a subdomain.
  - Under "Worker Routes", add a route that matches the subdomain you created and points to the Worker you deployed.
