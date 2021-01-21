const express = require('express')
const path = require('path')
const {google} = require('googleapis');
const session = require('express-session')
const cookieParser = require('cookie-parser')

const app = express()
app.use(cookieParser())
app.use(session({
  secret: 'keyboard cat',
  resave: false,
  saveUninitialized: true
}));

const port = process.env.PORT || 3000;
// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
//setup public folder
app.use(express.static('./public'));

/*******************/
/** CONFIGURATION **/
/*******************/
const analytics = google.analytics('v3');

const googleConfig = {
  clientId: '995066866741-a7i47umnhdm46fkb7lsruf5vo9eoek6u.apps.googleusercontent.com', // e.g. asdfghjkljhgfdsghjk.apps.googleusercontent.com
  clientSecret: '90sd0KtVIXPOOyMs0JM5Z9rr', // e.g. _ASDFA%DFASDFASDFASD#FAD-
  redirect: 'https://blooming-spire-209161.herokuapp.com/callback', // this must match your google api settings
};

const defaultScope = [
  'https://www.googleapis.com/auth/analytics',
  'https://www.googleapis.com/auth/analytics.readonly',
  'https://www.googleapis.com/auth/userinfo.email',
];

/*************/
/** HELPERS **/
/*************/

function createConnection() {
  return new google.auth.OAuth2(
    googleConfig.clientId,
    googleConfig.clientSecret,
    googleConfig.redirect
  );
}

function getConnectionUrl(auth) {
  return auth.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: defaultScope
  });
}


/**********/
/** MAIN **/
/**********/

/**
 * Part 1: Create a Google URL and send to the client to log in the user.
 */
function urlGoogle() {
  const auth = createConnection();
  const url = getConnectionUrl(auth);
  return url;
}
app.get('/', function (req, res) {
    res.render('index', {googleUrl: urlGoogle()})
});
app.get('/views/:viewId', async function (req, res) {
  const viewId = req.params.viewId;
  const startDate = req.query.start_date;
  const endDate = req.query.end_date;
  const metrics = req.query.metrics;
  const dimensions = req.query.dimensions;
  const filters  = 'ga%3AadwordsCampaignID!%3D(not%20set)';
  if (req.session.tokens) {
    const auth = createConnection();
    auth.setCredentials(JSON.parse(req.session.tokens));
    const result = await analytics.data.ga.get({
      'auth': auth,
      'ids': 'ga:'+viewId,
      'start-date': startDate,
      'end-date': endDate,
      'metrics': metrics,
      'dimensions': dimensions,
      'filters': filters
    });
    res.send(JSON.stringify({ results: result}));
  } else {
    res.send(req.session.tokens);
  }
});
app.get('/data', async function (req, res) {
  if (req.session.tokens) {
    const auth = createConnection();
    auth.setCredentials(JSON.parse(req.session.tokens));
    analytics.management.profiles.list(
      {
        accountId: '~all',
        webPropertyId: '~all',
        auth: auth
      },
      (err, data) => {
        if (err) {
          console.error('Error: ' + err)
          res.send('An error occurred: '+ err)
        } else if (data) {
          console.log(data);
          // let views = []
          // data.items.forEach(view => {
          //   views.push({
          //     name: view.webPropertyId + ' - ' + view.name + ' (' + view.websiteUrl + ')',
          //     id: view.id
          //   })
          // })
          // res.send(JSON.stringify({ results: data}));
          res.render('data', {data: data})
        }
      }
    )
  } else {
    res.send(req.session.tokens);
  }
  
});
app.get('/callback', async function (req, res) {
    const auth = createConnection();
    const data = await auth.getToken(req.query.code);
    const tokens = data.tokens;
    
    auth.setCredentials(tokens);
    // console.log('tokens', tokens);
    req.session.tokens = JSON.stringify(tokens);
    req.session.save(function(err) {
      // session saved
      if(!err) {
          //Data get lost here
          res.redirect('/data');
      }
      console.log('error', err)
      
    })
    
    
});

app.listen(port, function () {
    console.log(`Example app listening on port !`);
});