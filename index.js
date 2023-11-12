require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const dns = require('dns');

const app = express();

// Basic Configuration
const port = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));
app.use('/public', express.static(`${process.cwd()}/public`));

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });

const urlSchema = new mongoose.Schema({
  original_url: String,
  short_url: Number,
});

const Url = mongoose.model('Url', urlSchema);

app.get('/', function(req, res) {
  res.sendFile(process.cwd() + '/views/index.html');
});

app.post('/api/shorturl', function(req, res) {
  const originalUrl = req.body.url;

  // Verify the submitted URL using dns.lookup
  dns.lookup(new URL(originalUrl).hostname, (err) => {
    if (err) {
      return res.json({ error: 'invalid URL' });
    }

    // Check if the URL already exists in the database
    Url.findOne({ original_url: originalUrl })
      .exec()
      .then((data) => {
        if (data) {
          res.json({ original_url: data.original_url, short_url: data.short_url });
        } else {
          // Create a new short URL and save it to the database
          Url.estimatedDocumentCount()
            .exec()
            .then((count) => {
              const newUrl = new Url({ original_url: originalUrl, short_url: count + 1 });

              newUrl.save()
                .then((data) => {
                  res.json({ original_url: data.original_url, short_url: data.short_url });
                })
                .catch((err) => {
                  res.json({ error: 'Database error' });
                });
            })
            .catch((err) => {
              res.json({ error: 'Database error' });
            });
        }
      })
      .catch((err) => {
        res.json({ error: 'Database error' });
      });
  });
});


app.get('/api/shorturl/:short_url', function(req, res) {
  const shortUrl = parseInt(req.params.short_url);

  // Find the original URL based on the short URL
  Url.findOne({ short_url: shortUrl })
    .exec()
    .then((data) => {
      if (data) {
        res.redirect(data.original_url);
      } else {
        res.json({ error: 'Short URL not found' });
      }
    })
    .catch((err) => {
      res.json({ error: 'Database error' });
    });
});


app.listen(port, function() {
  console.log(`Listening on port ${port}`);
});
