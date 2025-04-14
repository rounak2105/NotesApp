var express = require('express');
var router = express.Router();
var bcrypt = require('bcrypt');

/* GET home page. */

router.get('/:uid', function(req, res, next) {
  const { uid } = req.params;
  req.collection.find({uid:uid})
    .toArray()
    .then(results => {
      if (results.length === 0) {
        return res.json([]);
      }
      console.log(results);
      const note = results[0];
      if (note.locked) {
        // If note is locked, only return minimal info
        return res.json([{
          uid: note.uid,
          locked: true
        }]);
      }
      // If not locked, return full note
      return res.json(results);
    })
    .catch(error => res.send(error));
});

router.post('/', function(req, res, next){
  const { uid , note } = req.body;
  const payload = { 
    uid, 
    note,
    locked: false
  };
  req.collection.insertOne(payload)
    .then(result => res.json({
      success: true,
      message: 'Note created successfully',
      uid: uid
    }))
    .catch(error => res.status(500).json({
      success: false,
      error: error.message
    }));
});

router.post('/lock', function(req, res, next) {
  const { uid, password, note } = req.body;
  const saltRounds = 10;
  
  // First check if note exists
  req.collection.find({uid: uid})
    .toArray()
    .then(results => {
      if (results.length === 0) {
        // Create new note if doesn't exist
        return bcrypt.hash(password, saltRounds)
          .then(hashedPassword => {
            const payload = {
              uid,
              note: note || '',  // Default to empty string if no note provided
              locked: true,
              password: hashedPassword
            };
            return req.collection.insertOne(payload);
          });
      } else {
        // Update existing note
        return bcrypt.hash(password, saltRounds)
          .then(hashedPassword => {
            return req.collection.updateOne(
              { uid: uid },
              { 
                $set: { 
                  locked: true,
                  password: hashedPassword
                }
              }
            );
          });
      }
    })
    .then(result => {
      res.json({ 
        success: true,
        locked: true,
        message: 'Note locked successfully'
      });
    })
    .catch(error => res.status(500).json({
      success: false,
      error: error.message
    }));
});

router.post('/unlock/:uid', function(req, res, next) {
  const { uid } = req.params;
  const { password } = req.body;

  req.collection.find({uid: uid})
    .toArray()
    .then(results => {
      if (results.length === 0) {
        return res.status(404).json({ error: 'Note not found' });
      }

      const note = results[0];
      if (!note.locked) {
        return res.status(400).json({ error: 'Note is not locked' });
      }

      // Compare provided password with stored hash
      return bcrypt.compare(password, note.password)
        .then(isMatch => {
          if (!isMatch) {
            return res.status(401).json({ error: 'Invalid password' });
          }
          // If password matches, return all matching notes
          return req.collection.find({uid: uid})
            .toArray()
            .then(allMatches => res.json(allMatches));
        });
    })
    .catch(error => res.status(500).json({
      success: false,
      error: error.message
    }));
});

router.delete('/', (req, res, next) => {
  const { uid } = req.body;
  req.collection.deleteMany({uid})  // Changed from deleteOne to deleteMany
    .then(result => {
      if (result.deletedCount === 0) {
        return res.status(404).json({
          success: false,
          message: 'No notes found with this uid'
        });
      }
      return res.json({
        success: true,
        message: `Successfully deleted ${result.deletedCount} notes`,
        uid: uid,
        deletedCount: result.deletedCount
      });
    })
    .catch(error => res.status(500).json({
      success: false,
      error: error.message
    }));
});

module.exports = router;
