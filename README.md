# Chrome Dev Summit site

![cds-grab](https://cloud.githubusercontent.com/assets/617438/19014471/5a0fc0b2-87e5-11e6-9dc0-ad25b438aec6.png)

The site runs on Google App Engine, so you'll need the [Cloud SDK](https://cloud.google.com/appengine/docs/standard/python/download).

Once you have that, you'll need to:

1. Clone the project
2. Go to the folder and run `npm install` followed by `npm run build`
3. Run `dev_appserver.py app.yaml` (as part of `gcloud`)
  * this will prompt you to install the missing Python extensions if required
4. Go to `[http://localhost:8080/devsummit](http://localhost:8080/devsummit)`

To stage to the [staging server](https://stage-dot-chromedevsummit-site.appspot.com/devsummit/), run `npm run app:stage`.
You can also run `app:prepare` to deploy without promotion, or `app:deploy` to ship 🚢 immediately.

# License

Please see the LICENSE file.
